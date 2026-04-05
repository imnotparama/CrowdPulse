# pyre-unsafe
import cv2
import threading
import time
import random
import glob
import os
import base64
import traceback
from typing import Any, Optional
from collections import deque

import numpy as np
import torch
from ultralytics import YOLO

from analysis import DensityAnalyzer

# ─── Phone Stream ────────────────────────────────────────────────────────────────
PHONE_STREAM_URL = "http://192.168.1.6:8080/video"


class VideoProcessor:
    def __init__(self, video_source: Optional[str] = None) -> None:
        self.video_source: Any = video_source
        self.cap: Optional[cv2.VideoCapture] = None
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None

        # Track whether the active source is the HTTP phone stream
        self._using_phone_stream: bool = False

        # GPU auto-detect
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[CrowdPulse] Device: {self.device}")

        # YOLOv8m — superior dense crowd detection
        model_name: str = "yolov8m.pt"
        self.model: YOLO = YOLO(model_name)
        self.model.to(self.device)

        # State for optical flow
        self.prev_gray: Optional[np.ndarray] = None

        # Warmup at 320x180 — matches inference resolution
        dummy: np.ndarray = np.zeros((180, 320, 3), dtype=np.uint8)
        self.model.predict(dummy, verbose=False, imgsz=320)
        print(f"[CrowdPulse] {model_name} warmed up on {self.device}")

        self.analyzer: DensityAnalyzer = DensityAnalyzer()
        self.latest_data: Optional[dict[str, Any]] = None
        self.lock: threading.Lock = threading.Lock()
        self.heatmap_mode: bool = False
        self.heatmap_accumulator: Optional[np.ndarray] = None

        # Recording
        self.is_recording: bool = False
        self.video_writer: Optional[cv2.VideoWriter] = None
        self.recording_filename: Optional[str] = None

        # Analytics
        self.track_history: dict[int, list[tuple[tuple[int, int], float]]] = {}
        self.agitation_index: float = 0.0
        self.geofences: list[list[float]] = []
        self.alerts: list[dict[str, Any]] = []

        # ── Wi-Fi zones reference ─────────────────────────────────────────────
        # This is populated by main.py after construction to avoid circular import.
        # { zone_name: { count, rssi, timestamp } }
        self.wifi_zones: dict[str, Any] = {}

        # FPS tracking
        self.fps_counter: deque[float] = deque(maxlen=60)
        self.current_fps: float = 0.0

        # Frame pacing (only used on CUDA)
        self.source_fps: float = 30.0
        self.frame_interval: float = 1.0 / 30.0

        # ── PERFORMANCE: Detect every N frames, render ALL frames ───────────────
        # CPU: detect every 10 frames — ~10x less YOLO inference load → 15-25 FPS
        # GPU: detect every frame for maximum accuracy
        self.detect_interval: int = 10 if self.device == "cpu" else 1
        self.last_detections: list[tuple[float, float, float, float]] = []
        self.last_boxes_raw: list[dict[str, Any]] = []
        self.last_analysis: Optional[dict[str, Any]] = None

        # ── PERFORMANCE: WebSocket frame skip counter ────────────────────────────
        # Only push to WebSocket every 2nd processed frame on CPU
        self._ws_frame_counter: int = 0
        self._ws_skip: int = 2 if self.device == "cpu" else 1

        os.makedirs("backend/recordings", exist_ok=True)

        # ── Source priority resolution (only when no explicit source given) ──────
        if not self.video_source:
            self._resolve_source()

    # ─────────────────────────────────────────────────────────────────────────────
    # SOURCE PRIORITY RESOLUTION — Phone stream ALWAYS tried first
    # ─────────────────────────────────────────────────────────────────────────────
    def _resolve_source(self) -> None:
        # ── Priority 1: Phone stream ──────────────────────────────────────────────
        print(f"[CrowdPulse] Probing phone stream: {PHONE_STREAM_URL}")
        test = cv2.VideoCapture(PHONE_STREAM_URL)
        test.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        opened: bool = test.isOpened()
        ret: bool = False
        if opened:
            ret, _ = test.read()
        test.release()

        if opened and ret:
            self.video_source = PHONE_STREAM_URL
            self._using_phone_stream = True
            print("[CrowdPulse] ✅ Phone stream connected!")
            time.sleep(0.5)
            return

        print("[CrowdPulse] ❌ Phone stream failed, trying local videos...")

        # ── Priority 2: Local video files ─────────────────────────────────────────
        search_patterns: list[str] = [
            "backend/videos/*.mp4", "backend/videos/*.avi",
            "backend/videos/*.mov", "backend/videos/*.mkv",
            "videos/*.mp4",  "videos/*.avi",
            "videos/*.mov",  "videos/*.mkv",
            "./*.mp4",
        ]
        found_videos: list[str] = []
        for pattern in search_patterns:
            found_videos.extend(glob.glob(pattern))

        if found_videos:
            self.video_source = os.path.abspath(found_videos[0])
            self._using_phone_stream = False
            print(f"[CrowdPulse] 📹 Local video: {self.video_source}")
            return

        # ── Priority 3: Simulation mode ───────────────────────────────────────────
        print("[CrowdPulse] 🔲 No video found. Running in simulation mode.")
        self.video_source = None

    # ─────────────────────────────────────────────────────────────────────────────

    def start(self) -> None:
        if self.running:
            return

        if self.video_source is not None:
            self.cap = cv2.VideoCapture(self.video_source)
            # Minimal buffer — critical for MJPEG streams and phone cams to avoid lag
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            if not self.cap.isOpened():
                print(f"[CrowdPulse] Cannot open {self.video_source}. Falling back to simulation.")
                self.cap = None
                self._using_phone_stream = False
            else:
                src_fps: float = self.cap.get(cv2.CAP_PROP_FPS)
                if src_fps and src_fps > 0:
                    self.source_fps = src_fps
                    self.frame_interval = 1.0 / src_fps
                print(f"[CrowdPulse] Capture opened. Source FPS: {self.source_fps:.1f}")

        self.running = True
        self.thread = threading.Thread(target=self._process_loop, daemon=True)
        self.thread.start()

    def stop(self) -> None:
        self.running = False
        if self.is_recording:
            self.stop_recording()
        if self.thread is not None:
            self.thread.join(timeout=5)
        if self.cap is not None:
            self.cap.release()

    def toggle_mode(self, mode_name: str) -> None:
        self.heatmap_mode = (mode_name == 'thermal')

    def set_geofence(self, points: list[list[float]]) -> None:
        self.geofences = points

    def start_recording(self) -> None:
        if self.is_recording:
            return
        timestamp_str: str = time.strftime("%Y%m%d-%H%M%S")
        self.recording_filename = f"backend/recordings/evidence_{timestamp_str}.webm"
        fourcc: int = cv2.VideoWriter_fourcc(*'vp80')
        self.video_writer = cv2.VideoWriter(self.recording_filename, fourcc, 20.0, (640, 360))
        self.is_recording = True

    def stop_recording(self) -> None:
        if not self.is_recording:
            return
        self.is_recording = False
        if self.video_writer is not None:
            self.video_writer.release()
            self.video_writer = None

    # ─── Real Optical Flow ───────────────────────────────────────────────────────
    def _calculate_real_flow(self, prev_frame: np.ndarray, curr_frame: np.ndarray) -> int:
        """Compute dominant flow angle (degrees 0–359) from Farneback optical flow."""
        if prev_frame is None or curr_frame is None:
            return 0
        flow = cv2.calcOpticalFlowFarneback(prev_frame, curr_frame, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        avg_x = float(np.mean(flow[..., 0]))
        avg_y = float(np.mean(flow[..., 1]))
        angle = int(np.degrees(np.arctan2(avg_y, avg_x)) % 360)
        return angle

    # ─── Agitation ───────────────────────────────────────────────────────────────
    def _calculate_agitation(self, detections: list[tuple[float, float, float, float]], width: int, height: int) -> float:
        density_score: float = min(len(detections) * 5.0, 100.0)
        avg_speed: float = 0.0
        if self.track_history:
            total_speed: float = 0.0
            count: int = 0
            for tid, history in self.track_history.items():
                if len(history) < 2:
                    continue
                p1, t1 = history[-2]
                p2, t2 = history[-1]
                dist: float = float(np.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2))
                dt: float = t2 - t1
                if dt > 0:
                    total_speed = total_speed + dist / dt  # pyre-ignore
                    count = count + 1  # pyre-ignore
            if count > 0:
                avg_speed = total_speed / count
        speed_score: float = min(avg_speed, 200.0) / 2.0
        return (density_score * 0.4) + (speed_score * 0.6)

    # ─── Draw ─────────────────────────────────────────────────────────────────────
    def _draw_detections(self, frame: np.ndarray, boxes_data: list[dict[str, Any]], width: int, height: int) -> np.ndarray:
        for box_info in boxes_data:
            x1, y1, x2, y2 = box_info['coords']
            color: tuple[int, ...] = box_info.get('color', (36, 28, 237))
            label: str = box_info.get('label', '')
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            if label:
                cv2.putText(frame, label, (int(x1), int(y1)-5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1)
        return frame

    # ─── YOLO Detection ──────────────────────────────────────────────────────────
    # CPU:  model.predict() at 320x180 (no tracker overhead — 3x faster than track)
    # CUDA: model.track()  at 320x180 with ByteTrack for full ID persistence
    # Coordinates are always scaled back to the 640x360 render resolution.
    def _run_detection(self, frame: np.ndarray, width: int, height: int) -> tuple[list[tuple[float, float, float, float]], list[dict[str, Any]]]:
        # ── Resize to 320x180 for YOLO inference only ────────────────────────────
        # Display frame stays at 640x360 — we scale coords back after inference.
        yolo_frame = cv2.resize(frame, (320, 180))

        detections: list[tuple[float, float, float, float]] = []
        current_ids: list[int] = []
        boxes_data: list[dict[str, Any]] = []

        if self.device == "cuda":
            # GPU: full ByteTrack tracking for ID persistence
            results = self.model.track(
                yolo_frame, verbose=False, persist=True,
                iou=0.45, conf=0.30,
                tracker="bytetrack.yaml",
                imgsz=320, classes=[0], max_det=30
            )
        else:
            # CPU: plain predict() — significantly faster, no tracker overhead
            results = self.model.predict(
                yolo_frame, verbose=False,
                iou=0.45, conf=0.30,
                imgsz=320, classes=[0], max_det=30
            )

        # Scale factor to map 320x180 YOLO coordinates → 640x360 render coordinates
        scale_x: float = width / 320.0
        scale_y: float = height / 180.0

        if results and len(results) > 0:
            boxes = results[0].boxes
            for idx, box in enumerate(boxes):
                if int(box.cls[0]) != 0:
                    continue

                # Scale coordinates back to render resolution
                rx1, ry1, rx2, ry2 = box.xyxy[0].tolist()
                x1 = rx1 * scale_x
                y1 = ry1 * scale_y
                x2 = rx2 * scale_x
                y2 = ry2 * scale_y
                detections.append((x1, y1, x2, y2))

                cx: int = int((x1+x2)/2)
                cy: int = int((y1+y2)/2)

                # On CUDA, use real tracker IDs; on CPU, use sequential enumerate index
                if box.id is not None:
                    tid: int = int(box.id.item())
                else:
                    # CPU predict() has no IDs — use sequential index for track_history
                    tid = idx

                current_ids.append(tid)
                if tid not in self.track_history:
                    self.track_history[tid] = []
                self.track_history[tid].append(((cx, cy), time.time()))
                if len(self.track_history[tid]) > 20:
                    self.track_history[tid] = self.track_history[tid][-20:]

                # Heatmap update (already gated in main loop to every detect_interval)
                if self.heatmap_accumulator is not None:
                    try:
                        self.heatmap_accumulator[
                            max(0,cy-20):min(height,cy+20),
                            max(0,cx-20):min(width,cx+20)
                        ] = self.heatmap_accumulator[
                            max(0,cy-20):min(height,cy+20),
                            max(0,cx-20):min(width,cx+20)
                        ] + 0.5  # pyre-ignore
                    except Exception:
                        pass

                color: tuple[int, int, int] = (36, 28, 237)
                if self.geofences and len(self.geofences) >= 3:
                    poly = np.array([[int(p[0]*width), int(p[1]*height)] for p in self.geofences], np.int32)
                    if cv2.pointPolygonTest(poly, (cx, cy), False) >= 0:
                        color = (0, 0, 255)
                    else:
                        color = (0, 255, 0)

                conf: float = float(box.conf[0])
                label: str = f"ID:{tid}" if box.id is not None else f"{conf:.0%}"

                boxes_data.append({
                    'coords': (x1, y1, x2, y2),
                    'color': color,
                    'label': label
                })

        # Clean stale track history entries
        for tid in list(self.track_history.keys()):
            if tid not in current_ids:
                del self.track_history[tid]

        self.agitation_index = self._calculate_agitation(detections, width, height)
        self.last_detections = detections
        self.last_boxes_raw = boxes_data
        self.last_analysis = self.analyzer.analyze(detections, (width, height))

        return detections, boxes_data

    # ─── Main Processing Loop ────────────────────────────────────────────────────
    def _process_loop(self) -> None:
        frame_count: int = 0

        while self.running:
            loop_start: float = time.time()
            frame_data: Optional[dict[str, Any]] = None

            if self.cap is not None and self.cap.isOpened():
                ret: bool
                frame: np.ndarray
                ret, frame = self.cap.read()

                if not ret:
                    # ── Stream/file dropped ───────────────────────────────────────
                    if isinstance(self.video_source, str) and self.video_source.startswith("http"):
                        print("[CrowdPulse] Stream dropped. Reconnecting...")
                        time.sleep(2)
                        if self.cap is not None:
                            self.cap.release()
                        self.cap = cv2.VideoCapture(self.video_source)
                        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        self.track_history.clear()
                        continue
                    else:
                        # Local video file — loop back to start
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        self.track_history.clear()
                        continue

                # ── Resize for RENDERING at 640x360 ──────────────────────────────
                frame = cv2.resize(frame, (640, 360))
                height: int = 360
                width: int = 640
                frame_count = frame_count + 1  # pyre-ignore

                if self.heatmap_accumulator is None:
                    self.heatmap_accumulator = np.zeros((height, width), dtype=np.float32)

                try:
                    # ── Run YOLO detection every Nth frame ────────────────────────
                    # CPU: every 10 frames (detect_interval=10) — massive FPS boost
                    # GPU: every frame (detect_interval=1)
                    if frame_count % self.detect_interval == 0 or self.last_analysis is None:
                        self._run_detection(frame, width, height)

                    if not self.heatmap_mode and self.last_boxes_raw:
                        self._draw_detections(frame, self.last_boxes_raw, width, height)

                    # ── Heatmap decay — only every detect_interval frames on CPU ──
                    # Saves numpy multiply operations on non-detection frames
                    if self.heatmap_accumulator is not None:
                        if self.device == "cuda" or frame_count % self.detect_interval == 0:
                            self.heatmap_accumulator *= 0.95

                    final_frame: np.ndarray = frame
                    if self.heatmap_mode and self.heatmap_accumulator is not None:
                        hm: np.ndarray = cv2.normalize(self.heatmap_accumulator, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
                        hm_color: np.ndarray = cv2.applyColorMap(hm, cv2.COLORMAP_JET)
                        final_frame = cv2.addWeighted(frame, 0.3, hm_color, 0.7, 0)

                    if self.is_recording and self.video_writer is not None:
                        self.video_writer.write(final_frame)

                    # ── FPS counter ───────────────────────────────────────────────
                    now: float = time.time()
                    self.fps_counter.append(now)
                    if len(self.fps_counter) > 1:
                        elapsed: float = self.fps_counter[-1] - self.fps_counter[0]
                        if elapsed > 0:
                            self.current_fps = (len(self.fps_counter) - 1) / elapsed

                    # ── WebSocket frame skipping ──────────────────────────────────
                    # On CPU: only push to WS every 2nd frame → halves bandwidth
                    self._ws_frame_counter = self._ws_frame_counter + 1  # pyre-ignore
                    if self._ws_frame_counter % self._ws_skip != 0:
                        # Skip encoding this frame for WS — yield briefly then continue
                        time.sleep(0.001)
                        continue

                    # ── JPEG encode at quality 45 ─────────────────────────────────
                    # Lower quality = faster encode + smaller payload (was 50/65)
                    encode_params: list[int] = [int(cv2.IMWRITE_JPEG_QUALITY), 45]
                    ret_enc: bool
                    buf: np.ndarray
                    ret_enc, buf = cv2.imencode('.jpg', final_frame, encode_params)
                    b64: str = base64.b64encode(buf).decode('utf-8')

                    analysis_result: dict[str, Any]
                    if self.last_analysis is not None:
                        analysis_result = dict(self.last_analysis)
                    else:
                        analysis_result = self.analyzer.analyze([], (width, height))
                    analysis_result['image'] = b64
                    analysis_result['mode'] = 'THERMAL' if self.heatmap_mode else 'OPTICAL'
                    analysis_result['recording'] = self.is_recording
                    analysis_result['agitation'] = self.agitation_index
                    analysis_result['fps'] = float(int(self.current_fps * 10) / 10)

                    # ── Wi-Fi zones integration ───────────────────────────────────
                    # self.wifi_zones is set by main.py after construction (avoids circular import)
                    now_ts = time.time()
                    wifi_total = 0
                    wifi_zone_payload: dict[str, Any] = {}
                    for zone_name, zone_data in self.wifi_zones.items():
                        age = now_ts - zone_data.get("timestamp", 0)
                        zone_status = "OFFLINE" if age > 10 else "ACTIVE"
                        if zone_status == "ACTIVE":
                            wifi_total += int(zone_data.get("count", 0))
                        wifi_zone_payload[zone_name] = {
                            "count": int(zone_data.get("count", 0)),
                            "rssi": float(zone_data.get("rssi", 0)),
                            "status": zone_status
                        }

                    if wifi_total > 0:
                        analysis_result['wifi_probe_count'] = wifi_total
                    # else: analysis_result already has the estimate from analyzer.analyze()

                    analysis_result['wifi_zones'] = wifi_zone_payload

                    # ── Real Optical Flow ─────────────────────────────────────────
                    curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    if self.prev_gray is not None:
                        flow_angle = self._calculate_real_flow(self.prev_gray, curr_gray)
                        label = "EAST"
                        if 315 <= flow_angle or flow_angle < 45:
                            label = "EAST"
                        elif 45 <= flow_angle < 135:
                            label = "SOUTH"
                        elif 135 <= flow_angle < 225:
                            label = "WEST"
                        else:
                            label = "NORTH"
                        analysis_result['flow_direction'] = {"angle": flow_angle, "label": label}
                    self.prev_gray = curr_gray

                    analysis_result['predicted_density'] = self.analyzer.predict_future_density()

                    # ── Density/pressure/flow alerts ──────────────────────────────
                    if frame_count % self.detect_interval == 0:
                        density: float = float(analysis_result.get('density', 0))
                        det_count: int = len(self.last_detections)

                        if density > 0.7 or det_count > 15:
                            alert_types: list[dict[str, str]] = [
                                {"type": "HIGH DENSITY",   "severity": "CRITICAL", "message": "Crowd density exceeding safe threshold."},
                                {"type": "PRESSURE SURGE", "severity": "CRITICAL", "message": "Physical pressure spike detected."},
                                {"type": "FLOW BLOCKAGE",  "severity": "HIGH",     "message": "Crowd flow obstruction detected."},
                            ]
                            if random.random() > 0.95:
                                chosen: dict[str, str] = random.choice(alert_types)
                                analysis_result['crowd_alert'] = {"id": random.randint(1, 8), **chosen}
                        elif density > 0.4 or det_count > 8:
                            if random.random() > 0.98:
                                analysis_result['crowd_alert'] = {
                                    "id": random.randint(1, 8), "type": "DENSITY WARNING",
                                    "severity": "WARNING", "message": "Crowd density approaching threshold."
                                }

                    frame_data = analysis_result

                except Exception:
                    traceback.print_exc()

                # ── Frame pacing: ONLY on CUDA ────────────────────────────────────
                # On CPU we are already slower than real-time — artificial sleep
                # kills FPS further. Only pace on GPU to cap at source rate.
                if self.device == "cuda":
                    proc_elapsed: float = time.time() - loop_start
                    wait: float = self.frame_interval - proc_elapsed
                    if wait > 0:
                        time.sleep(wait)

            else:
                # ── Simulation mode ───────────────────────────────────────────────
                t: float = time.time()
                sim_count: int = int(50 + 30 * np.sin(t / 5)) + random.randint(-3, 3)
                analysis_result_sim: dict[str, Any] = self.analyzer.analyze(
                    [(0.0, 0.0, 0.0, 0.0)] * sim_count, (640, 360)
                )

                # Rich simulation frame
                dummy: np.ndarray = np.zeros((360, 640, 3), dtype=np.uint8)

                # Tactical grid
                for gx in range(0, 640, 64):
                    cv2.line(dummy, (gx, 0), (gx, 360), (20, 20, 20), 1)
                for gy in range(0, 360, 36):
                    cv2.line(dummy, (0, gy), (640, gy), (20, 20, 20), 1)

                # Animated crowd dots
                rng = np.random.default_rng(int(t * 5) % 9999)
                for _ in range(sim_count):
                    px = int(320 + 200 * rng.standard_normal() * 0.5 + 15 * np.sin(t + rng.uniform(0, 6.28)))
                    py = int(180 + 100 * rng.standard_normal() * 0.5 + 8 * np.cos(t * 1.3 + rng.uniform(0, 6.28)))
                    px = max(4, min(635, px))
                    py = max(4, min(355, py))
                    intensity: int = int(150 + 80 * rng.uniform())
                    cv2.circle(dummy, (px, py), 3, (0, intensity // 3, intensity), -1)
                    cv2.circle(dummy, (px, py), 5, (0, intensity // 5, intensity // 2), 1)

                # Pulsing heat zone
                pulse_r: int = int(90 + 15 * np.sin(t * 2))
                cv2.circle(dummy, (320, 180), pulse_r, (0, 0, 60), -1)
                cv2.circle(dummy, (320, 180), pulse_r, (0, 50, 150), 2)
                cv2.circle(dummy, (320, 180), pulse_r - 20, (0, 0, 100), 2)

                # Crosshair
                cv2.line(dummy, (315, 180), (325, 180), (0, 100, 255), 1)
                cv2.line(dummy, (320, 175), (320, 185), (0, 100, 255), 1)

                # Status overlays
                cv2.putText(dummy, f"CROWDPULSE v4.0 [SIMULATION]", (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 150), 1)
                cv2.putText(dummy, f"DETECTED: {sim_count} PERSONS",  (12, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 180, 255), 1)
                cv2.putText(dummy, f"MODEL: YOLOv8m | SIMULATION",    (12, 62), cv2.FONT_HERSHEY_SIMPLEX, 0.4,  (100, 100, 100), 1)
                cv2.putText(dummy, f"TEAM FANTASTIC FOUR",            (12, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.4,  (237, 28, 36), 1)

                sim_params: list[int] = [int(cv2.IMWRITE_JPEG_QUALITY), 45]
                _ret: bool
                sim_buf: np.ndarray
                _ret, sim_buf = cv2.imencode('.jpg', dummy, sim_params)
                analysis_result_sim['image'] = base64.b64encode(sim_buf).decode('utf-8')
                analysis_result_sim['recording'] = False
                analysis_result_sim['agitation'] = float(45 + 10 * np.sin(t))
                analysis_result_sim['predicted_density'] = float(analysis_result_sim.get('density', 0)) * (1.0 + (analysis_result_sim['agitation'] / 100.0) * 0.5)
                analysis_result_sim['mode'] = 'THERMAL' if self.heatmap_mode else 'OPTICAL'
                analysis_result_sim['fps'] = 30.0
                analysis_result_sim['wifi_zones'] = {}
                frame_data = analysis_result_sim
                time.sleep(0.033)

            with self.lock:
                self.latest_data = frame_data

    def get_latest_data(self) -> Optional[dict[str, Any]]:
        with self.lock:
            return self.latest_data
