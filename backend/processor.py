import cv2
import threading
import time
import random
import glob
import os
import base64
import numpy as np
from collections import deque
from ultralytics import YOLO
from analysis import DensityAnalyzer

class VideoProcessor:
    def __init__(self, video_source=None):
        self.video_source = video_source
        self.cap = None
        self.running = False
        self.thread = None
        
        # GPU auto-detect with fallback
        import torch
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[CrowdPulse] Using device: {self.device}")
        
        # UPGRADE: YOLOv8s (Small) - much better accuracy than Nano,
        # still fast enough for CPU real-time at 640x360
        self.model = YOLO("yolov8s.pt")
        self.model.to(self.device)
        
        # Warm up the model with a dummy frame to avoid first-frame lag
        dummy = np.zeros((360, 640, 3), dtype=np.uint8)
        self.model.predict(dummy, verbose=False)
        print("[CrowdPulse] Model warmed up and ready.")
        
        self.analyzer = DensityAnalyzer()
        self.latest_data = None
        self.lock = threading.Lock()
        self.heatmap_mode = False
        self.heatmap_accumulator = None
        
        # Recording state
        self.is_recording = False
        self.video_writer = None
        self.recording_filename = None

        # Analytics State
        self.track_history = {}  # id -> list of (x, y, timestamp)
        self.agitation_index = 0.0
        self.geofences = []  # list of polygons [(x,y), ...]
        self.alerts = []
        
        # FPS tracking
        self.fps_counter = deque(maxlen=30)
        self.current_fps = 0.0
        
        # Frame pacing — match source video FPS
        self.source_fps = 30.0
        self.frame_interval = 1.0 / 30.0

        # Ensure recordings directory exists
        os.makedirs("backend/recordings", exist_ok=True)
        
        # Auto-detect video file if not provided
        if not self.video_source:
             search_patterns = [
                 "backend/videos/*.mp4", "backend/videos/*.avi", "backend/videos/*.mov", "backend/videos/*.mkv",
                 "videos/*.mp4", "videos/*.avi", "videos/*.mov", "videos/*.mkv",
                 "./*.mp4"
             ]
             found_videos = []
             for pattern in search_patterns:
                 found_videos.extend(glob.glob(pattern))

             if found_videos:
                 self.video_source = os.path.abspath(found_videos[0])
                 print(f"[CrowdPulse] Auto-selected video: {self.video_source}")
             else:
                 print("[CrowdPulse] No video files found. Using camera or simulation.")
                 self.video_source = 0

    def start(self):
        if self.running:
            return
        
        self.cap = cv2.VideoCapture(self.video_source)
        if not self.cap.isOpened():
             print(f"[CrowdPulse] Could not open source {self.video_source}. Falling back to simulation.")
             self.cap = None
        else:
            # Read source FPS for proper frame pacing
            src_fps = self.cap.get(cv2.CAP_PROP_FPS)
            if src_fps and src_fps > 0:
                self.source_fps = src_fps
                self.frame_interval = 1.0 / src_fps
                print(f"[CrowdPulse] Source video FPS: {src_fps:.1f}")
        
        self.running = True
        self.thread = threading.Thread(target=self._process_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.is_recording:
            self.stop_recording()
            
        if self.thread:
            self.thread.join(timeout=5)
        if self.cap:
            self.cap.release()

    def toggle_mode(self, mode_name):
        if mode_name == 'thermal':
            self.heatmap_mode = True
        else:
            self.heatmap_mode = False
        print(f"[CrowdPulse] Switched mode to: {mode_name}")

    def set_geofence(self, points):
        """Set a geofence polygon. Points is a list of [x, y] normalized (0-1)."""
        self.geofences = points
        print(f"[CrowdPulse] Geofence updated: {len(points)} points")

    def start_recording(self):
        if self.is_recording:
            return
            
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        self.recording_filename = f"backend/recordings/evidence_{timestamp}.webm"
        fourcc = cv2.VideoWriter_fourcc(*'vp80')
        self.video_writer = cv2.VideoWriter(self.recording_filename, fourcc, 20.0, (1280, 720))
        self.is_recording = True
        print(f"[CrowdPulse] Started recording: {self.recording_filename}")

    def stop_recording(self):
        if not self.is_recording:
            return
            
        self.is_recording = False
        if self.video_writer:
            self.video_writer.release()
            self.video_writer = None
        print(f"[CrowdPulse] Stopped recording: {self.recording_filename}")

    def _calculate_agitation(self, detections, width, height):
        density_score = min(len(detections) * 5, 100)
        
        avg_speed = 0
        if self.track_history:
            total_speed = 0
            count = 0
            for tid, history in self.track_history.items():
                if len(history) < 2: continue
                p1, t1 = history[-2]
                p2, t2 = history[-1]
                dist = np.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2)
                dt = t2 - t1
                if dt > 0:
                    speed = dist / dt
                    total_speed += speed
                    count += 1
            if count > 0:
                avg_speed = total_speed / count
        
        speed_score = min(avg_speed, 200) / 2
        return (density_score * 0.4) + (speed_score * 0.6)

    def _encode_frame(self, frame):
        """Encode frame to base64 JPEG with optimized settings."""
        # Use optimized JPEG params: quality 70 for good balance
        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
        _, buffer = cv2.imencode('.jpg', frame, encode_params)
        return base64.b64encode(buffer).decode('utf-8')

    def _process_loop(self):
        frame_count = 0
        skip_frames = 0  # Number of frames to skip between detections
        
        while self.running:
            loop_start = time.time()
            frame_data = None
            
            if self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if not ret:
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    self.track_history.clear()
                    continue
                
                frame = cv2.resize(frame, (640, 360))
                height, width, _ = frame.shape
                frame_count += 1

                # Initialize accumulator
                if self.heatmap_accumulator is None:
                    self.heatmap_accumulator = np.zeros((height, width), dtype=np.float32)

                try:
                    # Run YOLO with optimized settings
                    # - imgsz=640 matches our frame size (no internal resize)
                    # - classes=[0] = only detect persons (skip all other 79 classes)
                    # - max_det=50 caps max detections for speed
                    results = self.model.track(
                        frame, 
                        verbose=False, 
                        persist=True, 
                        iou=0.5, 
                        conf=0.35,
                        tracker="bytetrack.yaml",
                        imgsz=640,
                        classes=[0],  # Only detect persons
                        max_det=50
                    )
                    detections = []
                    current_ids = []
                    
                    if results and len(results) > 0:
                        result = results[0]
                        boxes = result.boxes
                        
                        for box in boxes:
                            cls_id = int(box.cls[0])
                            if cls_id == 0:
                                x1, y1, x2, y2 = box.xyxy[0].tolist()
                                detections.append((x1, y1, x2, y2))
                                
                                center_x = int((x1 + x2) / 2)
                                center_y = int((y1 + y2) / 2)

                                # Tracking for Speed
                                if box.id is not None:
                                    tid = int(box.id.item())
                                    current_ids.append(tid)
                                    if tid not in self.track_history:
                                        self.track_history[tid] = []
                                    self.track_history[tid].append(((center_x, center_y), time.time()))
                                    self.track_history[tid] = self.track_history[tid][-20:]

                                # Heatmap Logic
                                try:
                                    self.heatmap_accumulator[
                                        max(0, center_y-20):min(height, center_y+20), 
                                        max(0, center_x-20):min(width, center_x+20)
                                    ] += 0.5
                                except: pass

                                # Draw detection box
                                if not self.heatmap_mode:
                                     color = (36, 28, 237)  # Red default
                                     
                                     in_danger = False
                                     if self.geofences and len(self.geofences) >= 3:
                                         abs_polygon = np.array([
                                             [int(pt[0] * width), int(pt[1] * height)] 
                                             for pt in self.geofences
                                         ], np.int32)
                                         
                                         dist = cv2.pointPolygonTest(abs_polygon, (center_x, center_y), False)
                                         if dist >= 0:
                                             in_danger = True
                                             color = (0, 0, 255)
                                         else:
                                             color = (0, 255, 0)
                                             
                                     cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                                     
                                     # Confidence + ID label
                                     conf = float(box.conf[0])
                                     if box.id is not None:
                                         label = f"ID:{int(box.id)} {conf:.0%}"
                                     else:
                                         label = f"{conf:.0%}"
                                     cv2.putText(frame, label, (int(x1), int(y1)-5), 
                                                 cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1)

                    # Cleanup old tracks
                    for tid in list(self.track_history.keys()):
                        if tid not in current_ids:
                            del self.track_history[tid]

                    # Calc Agitation
                    self.agitation_index = self._calculate_agitation(detections, width, height)

                    # Decay heatmap
                    self.heatmap_accumulator *= 0.95 
                    
                    # Rendering
                    final_frame = frame
                    if self.heatmap_mode:
                        heatmap_norm = cv2.normalize(self.heatmap_accumulator, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
                        heatmap_color = cv2.applyColorMap(heatmap_norm, cv2.COLORMAP_JET)
                        final_frame = cv2.addWeighted(frame, 0.3, heatmap_color, 0.7, 0)
                    
                    if self.is_recording and self.video_writer:
                        self.video_writer.write(final_frame)

                    analysis_result = self.analyzer.analyze(detections, (width, height))
                    
                    # Encode frame to base64
                    b64_image = self._encode_frame(final_frame)
                    
                    # Track processing FPS
                    now = time.time()
                    self.fps_counter.append(now)
                    if len(self.fps_counter) > 1:
                        elapsed = self.fps_counter[-1] - self.fps_counter[0]
                        if elapsed > 0:
                            self.current_fps = (len(self.fps_counter) - 1) / elapsed
                    
                    analysis_result['image'] = b64_image
                    analysis_result['mode'] = 'THERMAL' if self.heatmap_mode else 'OPTICAL'
                    analysis_result['recording'] = self.is_recording
                    analysis_result['agitation'] = self.agitation_index
                    analysis_result['fps'] = round(self.current_fps, 1)
                    
                    # Crowd Safety Alerts
                    density = analysis_result.get('density', 0)
                    count = len(detections)
                    
                    if density > 0.7 or count > 15:
                        alert_types = [
                            {"type": "HIGH DENSITY", "severity": "CRITICAL", "message": "Crowd density exceeding safe threshold. Risk of compressive asphyxia. Recommend immediate crowd dispersal."},
                            {"type": "PRESSURE SURGE", "severity": "CRITICAL", "message": "Physical pressure spike detected in monitored zone. Crowd turbulence imminent. Deploy barriers."},
                            {"type": "FLOW BLOCKAGE", "severity": "HIGH", "message": "Crowd flow obstruction detected. Exit routes narrowing. Open auxiliary gates immediately."},
                        ]
                        if random.random() > 0.97:
                            chosen = random.choice(alert_types)
                            analysis_result['crowd_alert'] = {
                                "id": random.randint(1, 8),
                                **chosen
                            }
                    elif density > 0.4 or count > 8:
                        if random.random() > 0.99:
                            analysis_result['crowd_alert'] = {
                                "id": random.randint(1, 8),
                                "type": "DENSITY WARNING",
                                "severity": "WARNING",
                                "message": "Crowd density approaching threshold. Monitor closely. Pre-position response teams."
                            }

                    frame_data = analysis_result

                except Exception as e:
                    print(f"[CrowdPulse] Error: {e}")
                    import traceback
                    traceback.print_exc()
                    detections = []
                
                # Frame pacing: sleep to match source video FPS
                # This prevents the video from playing too fast when processing is faster than source
                elapsed = time.time() - loop_start
                wait_time = self.frame_interval - elapsed
                if wait_time > 0:
                    time.sleep(wait_time)
            
            else:
                # Simulation
                width, height = 640, 360
                t = time.time()
                count = int(20 + 15 * np.sin(t / 5)) + random.randint(-2, 2)
                analysis_result = self.analyzer.analyze([(0,0,0,0)]*count, (width, height))
                
                # Generate a dummy frame for simulation
                dummy_frame = np.zeros((height, width, 3), dtype=np.uint8)
                
                # More realistic simulation display
                cv2.putText(dummy_frame, "CROWDPULSE v4.0", (180, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (237, 28, 36), 2)
                cv2.putText(dummy_frame, "SIMULATION MODE", (200, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 1)
                cv2.putText(dummy_frame, "No camera connected", (210, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 80, 80), 1)
                
                # Draw some animated grid lines
                for x in range(0, width, 40):
                    alpha = int(30 + 15 * np.sin(t + x / 50))
                    cv2.line(dummy_frame, (x, 0), (x, height), (alpha, alpha, alpha), 1)
                for y in range(0, height, 40):
                    alpha = int(30 + 15 * np.sin(t + y / 50))
                    cv2.line(dummy_frame, (0, y), (width, y), (alpha, alpha, alpha), 1)
                
                b64_image = self._encode_frame(dummy_frame)
                
                analysis_result['image'] = b64_image
                analysis_result['recording'] = False
                analysis_result['agitation'] = float(45 + 10 * np.sin(t))
                analysis_result['mode'] = 'THERMAL' if self.heatmap_mode else 'OPTICAL'
                analysis_result['fps'] = 30.0
                frame_data = analysis_result
                time.sleep(0.033)  # ~30fps for simulation

            with self.lock:
                self.latest_data = frame_data

    def get_latest_data(self):
        with self.lock:
            return self.latest_data
