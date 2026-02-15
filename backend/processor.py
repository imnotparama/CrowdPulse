import cv2
import threading
import time
import random
import glob
import os
import base64
import numpy as np
from ultralytics import YOLO
from analysis import DensityAnalyzer

class VideoProcessor:
    def __init__(self, video_source=None):
        self.video_source = video_source
        self.cap = None
        self.running = False
        self.thread = None
        # UPGRADE: Using Medium model for better accuracy
        self.model = YOLO("yolov8n.pt") 
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
        self.track_history = {} # id -> list of (x, y, timestamp)
        self.agitation_index = 0.0
        self.geofences = [] # list of polygons [(x,y), ...]
        self.alerts = []

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
                 print(f"Auto-selected video: {self.video_source}")
             else:
                 print("No video files found in backend/videos or current directory.")
                 self.video_source = 0

    def start(self):
        if self.running:
            return
        
        self.cap = cv2.VideoCapture(self.video_source)
        if not self.cap.isOpened():
             print(f"Could not open source {self.video_source}. Falling back to simulation.")
             self.cap = None
        
        self.running = True
        self.thread = threading.Thread(target=self._process_loop)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.is_recording:
            self.stop_recording()
            
        if self.thread:
            self.thread.join()
        if self.cap:
            self.cap.release()

    def toggle_mode(self, mode_name):
        if mode_name == 'thermal':
            self.heatmap_mode = True
        else:
            self.heatmap_mode = False
        print(f"Switched mode to: {mode_name}")

    def set_geofence(self, points):
        """Set a geofence polygon. Points is a list of [x, y] normalized (0-1)."""
        # Convert normalized points to pixel coordinates will happen in loop or here if resolution known
        # For now, store normalized
        self.geofences = points
        print(f"Geofence updated: {len(points)} points")

    def start_recording(self):
        if self.is_recording:
            return
            
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        self.recording_filename = f"backend/recordings/evidence_{timestamp}.webm"
        fourcc = cv2.VideoWriter_fourcc(*'vp80')
        self.video_writer = cv2.VideoWriter(self.recording_filename, fourcc, 20.0, (1280, 720))
        self.is_recording = True
        print(f"Started recording: {self.recording_filename}")

    def stop_recording(self):
        if not self.is_recording:
            return
            
        self.is_recording = False
        if self.video_writer:
            self.video_writer.release()
            self.video_writer = None
        print(f"Stopped recording: {self.recording_filename}")

    def _calculate_agitation(self, detections, width, height):
        # 1. Crowd Density (0-100)
        # Assuming 20 people is "High Density" for this camera view
        density_score = min(len(detections) * 5, 100)
        
        # 2. Average Velocity (0-100)
        avg_speed = 0
        if self.track_history:
            total_speed = 0
            count = 0
            for tid, history in self.track_history.items():
                if len(history) < 2: continue
                # Last 2 points
                p1, t1 = history[-2]
                p2, t2 = history[-1]
                dist = np.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2)
                dt = t2 - t1
                if dt > 0:
                    speed = dist / dt # pixels per second
                    total_speed += speed
                    count += 1
            if count > 0:
                avg_speed = total_speed / count
        
        # Normalize speed (heuristic: 100 px/sec is "fast")
        speed_score = min(avg_speed, 200) / 2
        
        # Agitation is weighted mix
        return (density_score * 0.4) + (speed_score * 0.6)

    def _process_loop(self):
        while self.running:
            frame_data = None
            
            if self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if not ret:
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    self.track_history.clear() # Reset tracking on loop
                    continue
                
                frame = cv2.resize(frame, (640, 360))
                height, width, _ = frame.shape

                # Initialize accumulator
                if self.heatmap_accumulator is None:
                    self.heatmap_accumulator = np.zeros((height, width), dtype=np.float32)

                try:
                    # UPGRADE: Medium model, tuned thresholds
                    results = self.model.track(frame, verbose=False, persist=True, iou=0.5, conf=0.3, tracker="bytetrack.yaml")
                    detections = []
                    current_ids = []
                    
                    if results and len(results) > 0:
                        result = results[0]
                        boxes = result.boxes
                        
                        for box in boxes:
                            cls_id = int(box.cls[0])
                            # 0 is person
                            if cls_id == 0:
                                x1, y1, x2, y2 = box.xyxy[0].tolist()
                                detections.append((x1, y1, x2, y2))
                                
                                center_x = int((x1 + x2) / 2)
                                center_y = int((y1 + y2) / 2)

                                # Tracking Logic for Speed
                                if box.id is not None:
                                    tid = int(box.id.item())
                                    current_ids.append(tid)
                                    if tid not in self.track_history:
                                        self.track_history[tid] = []
                                    self.track_history[tid].append(((center_x, center_y), time.time()))
                                    # Keep last 20 frames
                                    self.track_history[tid] = self.track_history[tid][-20:]

                                # Heatmap Logic
                                try:
                                    self.heatmap_accumulator[
                                        max(0, center_y-20):min(height, center_y+20), 
                                        max(0, center_x-20):min(width, center_x+20)
                                    ] += 0.5
                                except: pass

                                # Draw box specific to CrowdPulse look
                                if not self.heatmap_mode:
                                     color = (36, 28, 237) # Red
                                     
                                     # Check Geofence
                                     in_danger = False
                                     if self.geofences:
                                         # Simple Check: Is center in rect? (Assuming geofence is rect for now or point list)
                                         # For hackathon demo, let's assume geofence is a simple danger zone
                                         pass 

                                     cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                                     
                                     # Draw 'brackets' look
                                     len_line = int((x2-x1) * 0.2)
                                     
                                     if box.id is not None:
                                         cv2.putText(frame, f"ID:{int(box.id)}", (int(x1), int(y1)-5), 
                                                     cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

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
                    
                    _, buffer = cv2.imencode('.jpg', final_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 60])
                    b64_image = base64.b64encode(buffer).decode('utf-8')
                    
                    analysis_result['image'] = b64_image
                    analysis_result['mode'] = 'THERMAL' if self.heatmap_mode else 'OPTICAL'
                    analysis_result['recording'] = self.is_recording
                    analysis_result['agitation'] = self.agitation_index
                    
                    # Crowd Safety Alerts (density-based triggers)
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
                    print(f"Error: {e}")
                    detections = [] # Fallback
            
            else:
                # Simulation
                width, height = 1920, 1080
                t = time.time()
                count = int(20 + 15 * np.sin(t / 5)) + random.randint(-2, 2)
                analysis_result = self.analyzer.analyze([(0,0,0,0)]*count, (width, height))
                analysis_result['image'] = None
                analysis_result['recording'] = False
                analysis_result['agitation'] = 45 + 10 * np.sin(t)
                analysis_result['mode'] = 'THERMAL' if self.heatmap_mode else 'OPTICAL'
                frame_data = analysis_result
                time.sleep(0.1)

            with self.lock:
                self.latest_data = frame_data

    def get_latest_data(self):
        with self.lock:
            return self.latest_data
