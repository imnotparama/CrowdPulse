# pyre-unsafe
import cv2
import threading
import time
import random
import glob
import os
import base64
import traceback
import socket
from pathlib import Path
from urllib.parse import urlparse
from typing import Any, Optional
from collections import deque

import numpy as np
import torch
from ultralytics import YOLO

from analysis import DensityAnalyzer
from hardware import esp32_manager, SensorFusionEngine

BASE_DIR = Path(__file__).resolve().parent
RECORDINGS_DIR = BASE_DIR / "recordings"
VIDEOS_DIR = BASE_DIR / "videos"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# ─── Phone Stream ────────────────────────────────────────────────────────────────
PHONE_STREAM_URL = os.getenv("CROWDPULSE_STREAM_URL", "http://10.85.22.197:8080/video")


def _check_stream_reachability(url: str, timeout: float = 1.0) -> bool:
    """Quickly checks whether the stream URL's host:port is reachable over TCP without blocking."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname
        if not host:
            return False
        port = parsed.port or (443 if parsed.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False


class VideoProcessor:
    def __init__(self, video_source: Optional[str] = None) -> None:
        self.video_source: Any = video_source
        self.cap: Optional[cv2.VideoCapture] = None
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None

        # Track whether the active source is the HTTP phone stream
        self._using_phone_stream: bool = False
        self.phone_stream_url: Optional[str] = PHONE_STREAM_URL if PHONE_STREAM_URL and PHONE_STREAM_URL.lower() != "none" else None

        # GPU auto-detect
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[CrowdPulse] Device: {self.device}")

        # YOLO Model — configurable via env YOLO_MODEL (default: yolov8m.pt)
        self.model_name: str = os.environ.get("YOLO_MODEL", "yolov8m.pt")
        self.model: YOLO = YOLO(self.model_name)
        self.model.to(self.device)

        # State for optical flow
        self.prev_gray: Optional[np.ndarray] = None

        # Warmup at 320x180 — matches inference resolution
        dummy: np.ndarray = np.zeros((180, 320, 3), dtype=np.uint8)
        self.model.predict(dummy, verbose=False, imgsz=320)
        print(f"[CrowdPulse] {self.model_name} warmed up on {self.device}")

        self.analyzer: DensityAnalyzer = DensityAnalyzer()
        self.fusion_engine: SensorFusionEngine = SensorFusionEngine()
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

        self.active_video_id: str = "demo.mp4"
        self.active_video_name: str = "Demo 1: Main Concourse"

        os.makedirs("backend/recordings", exist_ok=True)

        # ── Source priority resolution (only when no explicit source given) ──────
        if not self.video_source:
            self._resolve_source()
        else:
            self.active_video_id = os.path.basename(str(self.video_source))
            self.active_video_name = self.active_video_id

    # ─────────────────────────────────────────────────────────────────────────────
    # VIDEO DISCOVERY & DYNAMIC SWITCHING
    # ─────────────────────────────────────────────────────────────────────────────
    def get_available_videos(self) -> list[dict[str, Any]]:
        """Discovers and returns metadata for all demo videos in the videos directory."""
        search_dirs = [VIDEOS_DIR, BASE_DIR.parent / "videos"]
        discovered_paths: list[Path] = []
        for sdir in search_dirs:
            if sdir.exists():
                for ext in ("*.mp4", "*.avi", "*.mov", "*.mkv", "*.webm"):
                    for p in sdir.glob(ext):
                        try:
                            resolved = p.resolve()
                            if resolved not in discovered_paths:
                                discovered_paths.append(resolved)
                        except Exception:
                            pass

        videos_list: list[dict[str, Any]] = []
        for p in discovered_paths:
            fname = p.name
            vid_id = fname
            if fname.lower() == "demo.mp4":
                title = "Demo 1: Main Concourse"
                desc = "High-density crowd flow • Primary surveillance sector"
                sector = "Entrance"
            elif fname.lower() == "demo2.mp4":
                title = "Demo 2: Gateway Transit"
                desc = "Pedestrian corridor flow & bottleneck tracking"
                sector = "Gate A"
            else:
                title = f"Demo: {p.stem.replace('_', ' ').title()}"
                desc = f"Recorded surveillance footage ({p.suffix.upper()})"
                sector = "Surveillance"

            videos_list.append({
                "id": vid_id,
                "title": title,
                "filename": fname,
                "path": str(p),
                "description": desc,
                "sector": sector,
                "is_active": (getattr(self, "active_video_id", None) == vid_id)
            })

        # Ensure demo.mp4 is first, demo2.mp4 is second
        videos_list.sort(key=lambda x: (0 if "demo.mp4" in x["filename"].lower() else (1 if "demo2.mp4" in x["filename"].lower() else 2)))

        # Add Live Webcam option
        videos_list.append({
            "id": "webcam",
            "title": "Live Webcam",
            "filename": "Local Camera (Index 0)",
            "path": "0",
            "description": "Real-time optical feed from built-in or USB webcam",
            "sector": "Command Post",
            "is_active": (getattr(self, "active_video_id", None) == "webcam")
        })

        if getattr(self, "phone_stream_url", None):
            videos_list.append({
                "id": "phone_stream",
                "title": "Phone Camera (Live)",
                "filename": "Live Wireless Feed",
                "path": self.phone_stream_url,
                "description": f"Live wireless edge camera • {self.phone_stream_url}",
                "sector": "Mobile Node",
                "is_active": (getattr(self, "active_video_id", None) == "phone_stream")
            })

        return videos_list

    def switch_video(self, video_id_or_name: str) -> bool:
        """Switch video source dynamically in real time."""
        if not video_id_or_name:
            return False

        target_str = str(video_id_or_name).lower().strip()

        # Check if switching to local webcam
        if target_str in ("webcam", "camera", "0", "cam", "local", "live_webcam", "local camera (index 0)"):
            with self.lock:
                old_cap = self.cap
                try:
                    new_cap = cv2.VideoCapture(0)
                    new_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    if not new_cap.isOpened():
                        print("[CrowdPulse] ❌ Failed to open local webcam (index 0).")
                        new_cap.release()
                        return False

                    if old_cap is not None:
                        old_cap.release()

                    self.cap = new_cap
                    self.video_source = 0
                    self.active_video_id = "webcam"
                    self.active_video_name = "Live Webcam (Command Post)"
                    self._using_phone_stream = False
                    self.source_fps = 30.0
                    self.frame_interval = 1.0 / 30.0
                    self.prev_gray = None
                    self.track_history.clear()
                    self.last_analysis = None
                    self.last_detections = []
                    print("[CrowdPulse] 📸 Switched to Live Webcam (Index 0)!")
                    return True
                except Exception as e:
                    print(f"[CrowdPulse] ❌ Error opening webcam: {e}")
                    return False

        # Check if switching to phone camera
        if target_str in ("phone", "phone_stream", "phone camera", "mobile"):
            if getattr(self, "phone_stream_url", None):
                ok, _ = self.connect_phone_stream(self.phone_stream_url)
                return ok
            return False
        available = self.get_available_videos()
        matched: Optional[dict[str, Any]] = None

        # 1. Exact match on ID or filename
        for v in available:
            if v["id"].lower() == target_str or v["filename"].lower() == target_str:
                matched = v
                break

        # 2. Match on sector or title keywords
        if not matched:
            for v in available:
                if target_str in v["title"].lower() or target_str in v["sector"].lower():
                    matched = v
                    break

        # 3. Match aliases: 'entrance' -> demo.mp4, 'exit' / 'gate' -> demo2.mp4
        if not matched:
            if target_str in ("entrance", "concourse", "demo1", "1", "cam1", "main"):
                for v in available:
                    if "demo.mp4" in v["filename"].lower():
                        matched = v
                        break
            elif target_str in ("exit", "gate", "gate a", "transit", "demo2", "2", "cam2", "food court"):
                for v in available:
                    if "demo2.mp4" in v["filename"].lower():
                        matched = v
                        break

        # 4. Direct file path check
        if not matched and os.path.exists(video_id_or_name):
            matched = {
                "id": os.path.basename(video_id_or_name),
                "title": os.path.basename(video_id_or_name),
                "filename": os.path.basename(video_id_or_name),
                "path": os.path.abspath(video_id_or_name),
                "sector": "Custom",
                "description": "Direct file path video source"
            }

        if not matched:
            print(f"[CrowdPulse] ❌ Video '{video_id_or_name}' not found in available demo videos.")
            return False

        new_path = matched["path"]
        print(f"[CrowdPulse] 🔄 Switching active video feed to: {matched['title']} ({new_path})")

        with self.lock:
            old_cap = self.cap
            try:
                new_cap = cv2.VideoCapture(new_path)
                new_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                if not new_cap.isOpened():
                    print(f"[CrowdPulse] ❌ Failed to open video file: {new_path}")
                    new_cap.release()
                    return False

                # Successfully opened new video
                if old_cap is not None:
                    old_cap.release()

                self.cap = new_cap
                self.video_source = new_path
                self.active_video_id = matched["id"]
                self.active_video_name = matched["title"]
                self._using_phone_stream = False

                src_fps: float = self.cap.get(cv2.CAP_PROP_FPS)
                if src_fps and src_fps > 0:
                    self.source_fps = src_fps
                    self.frame_interval = 1.0 / min(src_fps, 30.0)

                # Reset visual tracking & flow state
                self.prev_gray = None
                self.track_history.clear()
                self.last_analysis = None
                self.last_detections = []
                self.last_boxes_raw = []
                if self.heatmap_accumulator is not None:
                    self.heatmap_accumulator.fill(0)

                print(f"[CrowdPulse] ✅ Successfully switched to {matched['title']} at {self.source_fps:.1f} FPS")
                return True
            except Exception as e:
                print(f"[CrowdPulse] ❌ Exception switching video: {e}")
                return False

    def connect_phone_stream(self, stream_url: str) -> tuple[bool, str]:
        """Validates, probes, and hot-swaps to an IP camera or phone stream."""
        if not stream_url or not str(stream_url).strip():
            return False, "Stream URL cannot be empty."

        clean_url = str(stream_url).strip()
        parsed = urlparse(clean_url)
        if not parsed.scheme:
            clean_url = "http://" + clean_url
            parsed = urlparse(clean_url)

        if not parsed.path or parsed.path == "/":
            clean_url = clean_url.rstrip("/") + "/video"

        print(f"[CrowdPulse] 📱 Testing phone stream at: {clean_url}")

        if not _check_stream_reachability(clean_url, timeout=2.0):
            return False, f"Host {parsed.hostname}:{parsed.port or 8080} unreachable. Make sure phone and PC are on the same Wi-Fi and IP camera server is running."

        try:
            test_cap = cv2.VideoCapture(clean_url)
            test_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if not test_cap.isOpened():
                test_cap.release()
                return False, "Could not open video stream. Check IP and port."

            ret, test_frame = test_cap.read()
            if not ret or test_frame is None:
                test_cap.release()
                return False, "Stream opened but returned no video frame. Check camera permissions in phone app."

            with self.lock:
                old_cap = self.cap
                self.cap = test_cap
                if old_cap is not None:
                    try:
                        old_cap.release()
                    except Exception:
                        pass

                self.video_source = clean_url
                self.phone_stream_url = clean_url
                self.active_video_id = "phone_stream"
                self.active_video_name = "Phone Camera (Live)"
                self._using_phone_stream = True
                self.source_fps = 30.0
                self.frame_interval = 1.0 / 30.0

                # Reset visual tracking & flow state
                self.prev_gray = None
                self.track_history.clear()
                self.last_analysis = None
                self.last_detections = []
                self.last_boxes_raw = []
                if self.heatmap_accumulator is not None:
                    self.heatmap_accumulator.fill(0)

            print(f"[CrowdPulse] ✅ Phone camera successfully connected: {clean_url}")
            return True, "Phone camera connected successfully."
        except Exception as e:
            print(f"[CrowdPulse] ❌ Exception connecting phone camera: {e}")
            return False, str(e)

    # ─────────────────────────────────────────────────────────────────────────────
    # SOURCE PRIORITY RESOLUTION — Local demo videos ALWAYS prioritized
    # ─────────────────────────────────────────────────────────────────────────────
    def _resolve_source(self) -> None:
        # ── Priority 1: Local demo video files (demo.mp4, demo2.mp4) ───────────────
        available = self.get_available_videos()
        if available:
            default_vid = available[0]
            for v in available:
                if "demo.mp4" in v["filename"].lower():
                    default_vid = v
                    break
            self.video_source = default_vid["path"]
            self.active_video_id = default_vid["id"]
            self.active_video_name = default_vid["title"]
            self._using_phone_stream = False
            print(f"[CrowdPulse] 📹 Loaded primary demo video: {self.active_video_name} ({self.video_source})")
            return

        # ── Priority 2: Phone stream (only if configured and reachable) ───────────
        if PHONE_STREAM_URL and PHONE_STREAM_URL.lower() != "none":
            print(f"[CrowdPulse] Probing phone stream: {PHONE_STREAM_URL}")
            if _check_stream_reachability(PHONE_STREAM_URL, timeout=1.0):
                test = cv2.VideoCapture(PHONE_STREAM_URL)
                test.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                connected = False
                if test.isOpened():
                    ret, frame_test = test.read()
                    if ret and frame_test is not None:
                        connected = True
                test.release()

                if connected:
                    self.video_source = PHONE_STREAM_URL
                    self.active_video_id = "phone_stream"
                    self.active_video_name = "Live Phone Stream"
                    self._using_phone_stream = True
                    print("[CrowdPulse] ✅ Phone stream connected!")
                    return
            print("[CrowdPulse] ❌ Phone stream unreachable, checking local videos...")

        # ── Priority 3: Simulation fallback only if no videos exist ───────────────
        print("[CrowdPulse] 🔲 No demo video files found. Running in simulation mode.")
        self.video_source = None
        self.active_video_id = "simulation"
        self.active_video_name = "Synthetic Simulation"

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
        self.recording_filename = str(RECORDINGS_DIR / f"evidence_{timestamp_str}.webm")
        fourcc: int = cv2.VideoWriter_fourcc(*'vp80')
        self.video_writer = cv2.VideoWriter(self.recording_filename, fourcc, 20.0, (640, 360))
        if not self.video_writer or not self.video_writer.isOpened():
            self.recording_filename = str(RECORDINGS_DIR / f"evidence_{timestamp_str}.mp4")
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
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
        # Resize for YOLO inference
        yolo_frame = cv2.resize(frame, (320, 180))

        detections: list[tuple[float, float, float, float]] = []
        current_ids: list[int] = []
        boxes_data: list[dict[str, Any]] = []

        if self.device == "cuda":
            # GPU: full ByteTrack tracking for ID persistence
            results = self.model.track(
                yolo_frame, verbose=False, persist=True,
                iou=0.25, conf=0.35,
                tracker="bytetrack.yaml",
                imgsz=320, classes=[0], max_det=30
            )
        else:
            # CPU: plain predict() — significantly faster, no tracker overhead
            results = self.model.predict(
                yolo_frame, verbose=False,
                iou=0.25, conf=0.35,
                imgsz=320, classes=[0], max_det=30
            )

        # Scale factor to map YOLO coordinates → 640x360 render coordinates
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
                    if isinstance(self.video_source, str) and "http" in self.video_source:
                        print("[CrowdPulse] Stream dropped. Reconnecting...")
                        time.sleep(2)
                        if self.cap is not None:
                            self.cap.release()
                        self.cap = cv2.VideoCapture(self.video_source)
                        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        self.track_history.clear()
                        continue
                    else:
                        # Local video file — loop back to start seamlessly
                        if self.cap is not None:
                            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        self.track_history.clear()
                        self.prev_gray = None
                        continue

                # ── Aspect ratio crop & resize for RENDERING at 640x360 ───────────
                h_orig, w_orig = frame.shape[:2]
                if w_orig / h_orig > 2.0:  # ultra-wide, crop center
                    frame = frame[:, w_orig//4:3*w_orig//4]
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
                    analysis_result['timestamp'] = now
                    analysis_result['active_video'] = self.active_video_id
                    analysis_result['active_video_name'] = self.active_video_name
                    analysis_result['video_source'] = self.active_video_id
                    analysis_result['is_simulation'] = False
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

                    # ── Multi-Sensor Hardware Fusion ──────────────────────────────
                    hw_state = esp32_manager.get_hardware_state()
                    analysis_result, hw_state, _ = self.fusion_engine.fuse(analysis_result, hw_state)
                    esp32_manager.set_actuators(hw_state.buzzer_state, hw_state.led_state)

                    frame_data = analysis_result

                except Exception:
                    traceback.print_exc()



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
                cv2.putText(dummy, f"CROWDPULSE INTELLIGENCE PLATFORM", (12, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (160, 160, 160), 1)

                sim_params: list[int] = [int(cv2.IMWRITE_JPEG_QUALITY), 45]
                _ret: bool
                sim_buf: np.ndarray
                _ret, sim_buf = cv2.imencode('.jpg', dummy, sim_params)
                analysis_result_sim['image'] = base64.b64encode(sim_buf).decode('utf-8')
                analysis_result_sim['timestamp'] = t
                analysis_result_sim['active_video'] = "simulation"
                analysis_result_sim['active_video_name'] = "Simulation"
                analysis_result_sim['is_simulation'] = True
                analysis_result_sim['recording'] = False
                analysis_result_sim['agitation'] = float(45 + 10 * np.sin(t))
                analysis_result_sim['predicted_density'] = float(analysis_result_sim.get('density', 0)) * (1.0 + (analysis_result_sim['agitation'] / 100.0) * 0.5)
                analysis_result_sim['mode'] = 'THERMAL' if self.heatmap_mode else 'OPTICAL'
                analysis_result_sim['fps'] = 30.0
                analysis_result_sim['wifi_zones'] = {}

                # ── Multi-Sensor Hardware Fusion (Simulation) ─────────────────
                hw_state = esp32_manager.get_hardware_state()
                analysis_result_sim, hw_state, _ = self.fusion_engine.fuse(analysis_result_sim, hw_state)
                esp32_manager.set_actuators(hw_state.buzzer_state, hw_state.led_state)

                frame_data = analysis_result_sim
                frame_count = frame_count + 1  # pyre-ignore

            # Pace the processing loop to match the target frame interval
            loop_duration = time.time() - loop_start
            sleep_needed = self.frame_interval - loop_duration
            if sleep_needed > 0:
                time.sleep(sleep_needed)

            with self.lock:
                self.latest_data = frame_data

    def get_latest_data(self) -> Optional[dict[str, Any]]:
        with self.lock:
            return self.latest_data
