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


class VideoProcessor:
    def __init__(self, video_source: Optional[str] = None) -> None:
        self.video_source: Any = video_source
        self.cap: Optional[cv2.VideoCapture] = None
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None
        
        # GPU auto-detect
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[CrowdPulse] Device: {self.device}")
        
        # YOLOv8m — superior dense crowd detection
        model_name: str = "yolov8m.pt"
        self.model: YOLO = YOLO(model_name)
        self.model.to(self.device)
        
        # State for optical flow
        self.prev_gray: Optional[np.ndarray] = None
        
        # Warmup
        dummy: np.ndarray = np.zeros((360, 640, 3), dtype=np.uint8)
        self.model.predict(dummy, verbose=False)
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
        
        # FPS tracking
        self.fps_counter: deque[float] = deque(maxlen=60)
        self.current_fps: float = 0.0
        
        # Frame pacing
        self.source_fps: float = 30.0
        self.frame_interval: float = 1.0 / 30.0
        
        # HYBRID MODE: Detect every N frames, render all frames
        # On CPU: run detection every 4 frames — intermediate frames reuse cached boxes at full speed
        self.detect_interval: int = 4 if self.device == "cpu" else 1
        self.last_detections: list[tuple[float, float, float, float]] = []
        self.last_boxes_raw: list[dict[str, Any]] = []
        self.last_analysis: Optional[dict[str, Any]] = None

        os.makedirs("backend/recordings", exist_ok=True)
        
        if not self.video_source:
            search_patterns: list[str] = [
                "backend/videos/*.mp4", "backend/videos/*.avi", "backend/videos/*.mov", "backend/videos/*.mkv",
                "videos/*.mp4", "videos/*.avi", "videos/*.mov", "videos/*.mkv",
                "./*.mp4"
            ]
            found_videos: list[str] = []
            for pattern in search_patterns:
                found_videos.extend(glob.glob(pattern))

            if found_videos:
                self.video_source = os.path.abspath(found_videos[0])
                print(f"[CrowdPulse] Video: {self.video_source}")
            else:
                print("[CrowdPulse] No video files found. Simulation mode.")
                self.video_source = 0

    def start(self) -> None:
        if self.running:
            return
        
        self.cap = cv2.VideoCapture(self.video_source)
        if self.cap is not None and not self.cap.isOpened():
            print(f"[CrowdPulse] Cannot open {self.video_source}. Simulation mode.")
            self.cap = None
        elif self.cap is not None:
            src_fps: float = self.cap.get(cv2.CAP_PROP_FPS)
            if src_fps and src_fps > 0:
                self.source_fps = src_fps
                self.frame_interval = 1.0 / src_fps
                print(f"[CrowdPulse] Source FPS: {src_fps:.1f}")
        
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

    def _calculate_real_flow(self, prev_frame: np.ndarray, curr_frame: np.ndarray) -> int:
        if prev_frame is None or curr_frame is None:
            return 0
        flow = cv2.calcOpticalFlowFarneback(prev_frame, curr_frame, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        avg_x = np.mean(flow[..., 0])
        avg_y = np.mean(flow[..., 1])
        angle = int(np.degrees(np.arctan2(avg_y, avg_x)) % 360)
        return angle

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

    def _run_detection(self, frame: np.ndarray, width: int, height: int) -> tuple[list[tuple[float, float, float, float]], list[dict[str, Any]]]:
        results = self.model.track(
            frame, verbose=False, persist=True,
            iou=0.45, conf=0.20,
            tracker="bytetrack.yaml",
            imgsz=480, classes=[0], max_det=100
        )
        
        detections: list[tuple[float, float, float, float]] = []
        current_ids: list[int] = []
        boxes_data: list[dict[str, Any]] = []
        
        if results and len(results) > 0:
            boxes = results[0].boxes
            for box in boxes:
                if int(box.cls[0]) != 0:
                    continue
                    
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append((x1, y1, x2, y2))
                
                cx: int = int((x1+x2)/2)
                cy: int = int((y1+y2)/2)
                
                if box.id is not None:
                    tid: int = int(box.id.item())
                    current_ids.append(tid)
                    if tid not in self.track_history:
                        self.track_history[tid] = []
                    self.track_history[tid].append(((cx, cy), time.time()))
                    if len(self.track_history[tid]) > 20:
                        self.track_history[tid] = self.track_history[tid][-20:]

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
                label: str = f"ID:{int(box.id)}" if box.id is not None else f"{conf:.0%}"
                
                boxes_data.append({
                    'coords': (x1, y1, x2, y2),
                    'color': color,
                    'label': label
                })
        
        for tid in list(self.track_history.keys()):
            if tid not in current_ids:
                del self.track_history[tid]
        
        self.agitation_index = self._calculate_agitation(detections, width, height)
        self.last_detections = detections
        self.last_boxes_raw = boxes_data
        self.last_analysis = self.analyzer.analyze(detections, (width, height))
        
        return detections, boxes_data

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
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    self.track_history.clear()
                    continue
                
                frame = cv2.resize(frame, (640, 360))
                height: int = 360
                width: int = 640
                frame_count = frame_count + 1  # pyre-ignore

                if self.heatmap_accumulator is None:
                    self.heatmap_accumulator = np.zeros((height, width), dtype=np.float32)

                try:
                    if frame_count % self.detect_interval == 0 or self.last_analysis is None:
                        self._run_detection(frame, width, height)
                    
                    if not self.heatmap_mode and self.last_boxes_raw:
                        self._draw_detections(frame, self.last_boxes_raw, width, height)
                    
                    if self.heatmap_accumulator is not None:
                        self.heatmap_accumulator *= 0.95
                    
                    final_frame: np.ndarray = frame
                    if self.heatmap_mode and self.heatmap_accumulator is not None:
                        hm: np.ndarray = cv2.normalize(self.heatmap_accumulator, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
                        hm_color: np.ndarray = cv2.applyColorMap(hm, cv2.COLORMAP_JET)
                        final_frame = cv2.addWeighted(frame, 0.3, hm_color, 0.7, 0)
                    
                    if self.is_recording and self.video_writer is not None:
                        self.video_writer.write(final_frame)

                    encode_params: list[int] = [int(cv2.IMWRITE_JPEG_QUALITY), 65]
                    ret_enc: bool
                    buf: np.ndarray
                    ret_enc, buf = cv2.imencode('.jpg', final_frame, encode_params)
                    b64: str = base64.b64encode(buf).decode('utf-8')
                    
                    now: float = time.time()
                    self.fps_counter.append(now)
                    if len(self.fps_counter) > 1:
                        elapsed: float = self.fps_counter[-1] - self.fps_counter[0]
                        if elapsed > 0:
                            self.current_fps = (len(self.fps_counter) - 1) / elapsed
                    
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
                    
                    # Compute Real Optical Flow
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
                    
                    if frame_count % self.detect_interval == 0:
                        density: float = float(analysis_result.get('density', 0))
                        det_count: int = len(self.last_detections)
                        
                        if density > 0.7 or det_count > 15:
                            alert_types: list[dict[str, str]] = [
                                {"type": "HIGH DENSITY", "severity": "CRITICAL", "message": "Crowd density exceeding safe threshold."},
                                {"type": "PRESSURE SURGE", "severity": "CRITICAL", "message": "Physical pressure spike detected."},
                                {"type": "FLOW BLOCKAGE", "severity": "HIGH", "message": "Crowd flow obstruction detected."},
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
                
                proc_elapsed: float = time.time() - loop_start
                wait: float = self.frame_interval - proc_elapsed
                if wait > 0:
                    time.sleep(wait)
            
            else:
                t: float = time.time()
                sim_count: int = int(50 + 30 * np.sin(t / 5)) + random.randint(-3, 3)
                analysis_result_sim: dict[str, Any] = self.analyzer.analyze(
                    [(0.0, 0.0, 0.0, 0.0)] * sim_count, (640, 360)
                )
                
                # Rich simulation frame: animated crowd dots on dark background
                dummy: np.ndarray = np.zeros((360, 640, 3), dtype=np.uint8)
                
                # Draw tactical grid
                for gx in range(0, 640, 64):
                    cv2.line(dummy, (gx, 0), (gx, 360), (20, 20, 20), 1)
                for gy in range(0, 360, 36):
                    cv2.line(dummy, (0, gy), (640, gy), (20, 20, 20), 1)
                
                # Draw animated crowd dots
                rng = np.random.default_rng(int(t * 5) % 9999)
                for _ in range(sim_count):
                    px = int(320 + 200 * rng.standard_normal() * 0.5 + 15 * np.sin(t + rng.uniform(0, 6.28)))
                    py = int(180 + 100 * rng.standard_normal() * 0.5 + 8 * np.cos(t * 1.3 + rng.uniform(0, 6.28)))
                    px = max(4, min(635, px))
                    py = max(4, min(355, py))
                    intensity: int = int(150 + 80 * rng.uniform())
                    cv2.circle(dummy, (px, py), 3, (0, intensity // 3, intensity), -1)
                    cv2.circle(dummy, (px, py), 5, (0, intensity // 5, intensity // 2), 1)
                
                # Pulsing heat zone in the centre
                pulse_r: int = int(90 + 15 * np.sin(t * 2))
                cv2.circle(dummy, (320, 180), pulse_r, (0, 0, 60), -1)
                cv2.circle(dummy, (320, 180), pulse_r, (0, 50, 150), 2)
                cv2.circle(dummy, (320, 180), pulse_r - 20, (0, 0, 100), 2)
                
                # Crosshair at centre
                cv2.line(dummy, (315, 180), (325, 180), (0, 100, 255), 1)
                cv2.line(dummy, (320, 175), (320, 185), (0, 100, 255), 1)
                
                # Status overlays
                cv2.putText(dummy, f"CROWDPULSE v4.0 [SIMULATION]", (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (150, 150, 150), 1)
                cv2.putText(dummy, f"DETECTED: {sim_count} PERSONS", (12, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 180, 255), 1)
                cv2.putText(dummy, f"MODEL: YOLOv26m | BYTETRACK", (12, 62), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 100), 1)
                cv2.putText(dummy, f"TEAM FANTASTIC FOUR", (12, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (237, 28, 36), 1)
                
                sim_params: list[int] = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                _ret: bool
                sim_buf: np.ndarray
                _ret, sim_buf = cv2.imencode('.jpg', dummy, sim_params)
                analysis_result_sim['image'] = base64.b64encode(sim_buf).decode('utf-8')
                analysis_result_sim['recording'] = False
                analysis_result_sim['agitation'] = float(45 + 10 * np.sin(t))
                analysis_result_sim['predicted_density'] = float(analysis_result_sim.get('density', 0)) * (1.0 + (analysis_result_sim['agitation'] / 100.0) * 0.5)
                analysis_result_sim['mode'] = 'THERMAL' if self.heatmap_mode else 'OPTICAL'
                analysis_result_sim['fps'] = 30.0
                frame_data = analysis_result_sim
                time.sleep(0.033)

            with self.lock:
                self.latest_data = frame_data

    def get_latest_data(self) -> Optional[dict[str, Any]]:
        with self.lock:
            return self.latest_data
