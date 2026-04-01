# CrowdPulse Project Documentation (Memory Dump)

This document serves as an exhaustive knowledge base and snapshot of the **CrowdPulse** system architecture and logic, serving as a rapid onboarding context file.

## Core Purpose
CrowdPulse is a real-time, AI-powered crowd safety and monitoring platform designed to detect risks, monitor capacities, and predict stampede possibilities before they turn dangerous.

## Technology Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Recharts (for live analytics charting), React-Leaflet (for tactical drone/map visualizations), and Vite.
- **Backend:** Python, FastAPI, WebSockets.
- **Computer Vision:** Ultralytics (YOLOv8m), ByteTrack tracking, OpenCV (optical flow, heatmaps, object manipulations), PyTorch.

## Backend Architecture

### `main.py`
- Serves as the central API framework and WebSocket broker.
- Connects to the primary worker process (`VideoProcessor`).
- Listens to HTTP endpoints (e.g., `/api/status`, `/api/recordings`).
- Relays real-time event updates and frontend commands over WebSocket (`/ws`).
- CORS is restricted to defined demo origins for security.

### `processor.py` (`VideoProcessor`)
- Executes computer vision inference using **YOLOv8m**.
- Computes Optical Flow using `cv2.calcOpticalFlowFarneback` to understand true crowd movement directly on raw gray scale frames.
- Automatically handles frame-pacing to gracefully track detection intervals and optimize frame generation (running at ~30FPS while inferencing every Nth frame depending on CPU/GPU capabilities).
- Controls thermal visual accumulations (`heatmap_mode`) and recording instances.

### `analysis.py` (`DensityAnalyzer`)
Houses the complex domain logic for risk estimation:
- **`analyze_sectors`**: Understands crowd breakdowns dynamically across spatial quadrants on the screen (e.g. NW, NE, SW, SE). 
- **`predict_future_density`**: An ad-hoc mechanism that looks at the trailing density history to estimate trend trajectories and project crowd volumes 30-seconds ahead.
- **`_calculate_stampede_risk`**: Forms a compounded index by rating Density, Pressure Index, Velocity, and Max Capacity metrics against critical threshold percentages.
- **`_calculate_pressure`**: Evaluates coordinate distances between subjects to calculate the physical compaction/crush probability.

## Frontend Architecture

### `App.tsx`
- Functions as the tactical command center.
- Contains the overall dashboard layout and active states (`stats`, WebSocket handlers, etc.).
- Orchestrates Emergency SOS and various system modes.
- Utilizes `SpeechSynthesis` to audibly broadcast system alerts to operators.
- Features nested widgets reflecting components like `RiskGauge`, `PAAnnouncements`, and `StatsCard`.

### Visual Components
- **`VideoFeed.tsx`**: Renders base64-generated bounding-boxed optical or thermal camera views and overlays directional intelligence.
- **`LiveMap.tsx`**: Integrated with Leaflet bounding to `[13.0827, 80.2707]` (Chennai) mapping, complete with interactive aerial units and dynamically scaled alert zones dynamically plotted over evacuation routes.
- **`AlertTimeline.tsx` / `EvidenceLocker.tsx`**: Keeps persistent traces of event logs and archived recordings for post-incident review.

## Internal Mechanics & Rules
- **Alert System**: Critical risks issue visual Pings across the DOM (`CrowdAlert`) plus localized audio playback and spoken synthesis.
- **Frame Transport**: The backend sends base64 image strings attached alongside the data dictionaries every loop, eliminating dual websocket streams or HTTP streaming synchronization lag.
- **State Thresholds**: "CRITICAL" warnings emerge when the derived density value exceeds 0.75, immediately scaling UI borders to pulse red.

## Hackathon Updates & Optimizations
- Corrected model naming convention to valid `yolov8m.pt`.
- Integrated `torch` bindings cleanly.
- Overhauled the core navigation components from generic dummy mock data to authentic algorithms (e.g., actual OpenCV Farneback algorithms substituted previous sine wave flow direction mock).
- Repositioned the geographical context fully towards India / Chennai for better relevancy.
