# CrowdPulse Enterprise v4.0 — Technical Codebase & Architectural Reference

This document is the exhaustive, method-by-method technical specification of **CrowdPulse Enterprise**. It details every file, class, method, hook, formula, and data flow across both the backend and frontend so that any AI assistant or engineer can understand, maintain, and extend the system with complete precision.

----------- 

## 1. Project Directory Structure

```
CrowdPulse/
├── CLAUDE.md                           # This authoritative architecture & code reference
├── README.md                           # High-level product overview & setup guide
├── package.json                        # Root npm proxy scripts (dev, build, lint)
├── backend/
│   ├── main.py                         # FastAPI server, WebSocket broker, ESP32 API endpoints
│   ├── processor.py                    # VideoProcessor engine (YOLO, optical flow, frame pipeline)
│   ├── analysis.py                     # DensityAnalyzer (mathematical models, risk formulas)
│   ├── hardware/                       # Physical Hardware Subsystem (ESP32-S3 IoT Node)
│   │   ├── __init__.py                 # Subsystem exports & package definitions
│   │   ├── hardware_models.py          # Pydantic telemetry, actuator & fusion schemas
│   │   ├── sensor_processor.py         # INMP441, AM2302 & PIR DSP algorithms
│   │   ├── sensor_fusion.py            # Dynamic weighting, threat scoring & false positive reduction
│   │   ├── esp32_manager.py            # Async packet ingestion, state cache & simulated fallback
│   │   └── hardware_api.py             # FastAPI APIRouters for /api/hardware and /api/esp32
│   ├── requirements.txt                # Python dependencies (fastapi, uvicorn, opencv, torch, etc.)
│   ├── recordings/                     # Output directory for WebM/MP4 evidence captures
│   ├── videos/                         # Local video files used for simulation/testing
│   ├── yolov8m.pt                      # Pre-trained YOLOv8 medium model weights
│   └── yolov8n.pt / yolov8s.pt         # Optional lightweight weights
└── frontend/
    ├── index.html                      # Entry HTML, Google Fonts (Space Grotesk, Inter, Tech Mono)
    ├── package.json                    # Frontend dependencies (React 19, Vite 7, Recharts, Leaflet)
    ├── tsconfig.json / tsconfig.app.json # Strict TS config (noUnusedLocals, noUnusedParameters)
    ├── vite.config.ts                  # Vite build and bundling configuration
    └── src/
        ├── main.tsx                    # React DOM entry point
        ├── App.tsx                     # Main dashboard container, layout, state & WebSocket client
        ├── App.css                     # Minimal root style overrides
        ├── index.css                   # Design system tokens, 3-tier card classes, glowing pills
        └── components/
            ├── Header.tsx              # Executive SOC header, vitals, SOS, sound & vault triggers
            ├── VideoFeed.tsx           # Hero 70% camera viewport, thumbnail tabs, rich HUD overlays
            ├── StatusCardsRow.tsx      # Top Level-2 KPI cards with AnimatedNumber transitions
            ├── LiveStatusPanel.tsx     # Left Level-2 scannable status metrics
            ├── HardwareSensorWidget.tsx # Left Level-2 ESP32-S3 sensor vitals & actuator monitor
            ├── AIInsightsCard.tsx      # Left Level-1 AI narrative, Predictive Mode (+3m/+5m/+10m)
            ├── RecentEvents.tsx        # Left Level-3 chronological operational event feed
            ├── Timeline.tsx            # Center Level-3 timeline with Crowd Replay Scrubber Mode
            ├── RiskGauge.tsx           # Right Level-2 semicircle 180° arc risk gauge
            ├── ActiveAlertsPanel.tsx   # Right Level-1 active alerts & warm empty state
            ├── LiveMap.tsx             # Right Level-3 dark CartoDB tactical map & camera FOV cone
            ├── AIChatSidebar.tsx       # Slide-out CrowdPulse AI Assistant drawer
            ├── EvidenceLocker.tsx      # Cryptographic Hold-to-Decrypt secure evidence vault modal
            ├── SplashScreen.tsx        # Diagnostic system boot sequence with 5.5s safety timeout
            ├── AlertTimeline.tsx       # Historical alert component
            ├── StatsCard.tsx           # Legacy individual stats card helper
            ├── FaceID.tsx              # Facial feature recognition demonstration component
            ├── PAAnnouncements.tsx     # PA broadcast synthesis component
            └── VoiceCommand.tsx        # Voice command transcription component
```

---

## 2. Backend Architecture (`backend/`)

### 2.1 `backend/main.py`
The FastAPI application acts as the REST API host, static media server, and bidirectional WebSocket broker.

#### Key Variables & Module State:
- `BASE_DIR = Path(__file__).resolve().parent`: Absolute backend directory.
- `RECORDINGS_DIR = BASE_DIR / "recordings"`: Storage directory for `.webm` and `.mp4` video captures.
- `wifi_zones: dict[str, Any] = defaultdict(dict)`: In-memory store for ESP32 sniffing data: `{zone_name: {"count": int, "rssi": float, "timestamp": float}}`.
- `processor: VideoProcessor = VideoProcessor()`: Singleton video processing engine.
- `start_time: float`: Uptime epoch baseline.

#### Lifespan Management:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    processor.start()   # Starts the background processing thread
    yield
    processor.stop()    # Safely releases cameras, writers, and joins threads
```

#### REST Endpoints:
- `GET /`: Returns `{"status": "CrowdPulse Backend Online"}`.
- `GET /api/status`: Computes backend uptime, FPS, model identity (`YOLOv8m`), and active ESP32 zone count (zones updated within $\le 10$ seconds).
- `GET /api/recordings`: Scans `RECORDINGS_DIR` for `.mp4` and `.webm` files, sorted by `st_mtime` descending.
- `POST /api/wifi`: Receives `WifiZonePayload(zone: str, count: int, rssi: float)` from physical ESP32 nodes and stores in `wifi_zones` with the current epoch timestamp.
- `GET /api/wifi/status`: Calculates total device count across all `ACTIVE` zones, marks zones older than 10s as `OFFLINE`.
- `StaticFiles`: Mounted at `/recordings` to serve raw video captures to the frontend Evidence Vault.

#### WebSocket Broker (`/ws`):
- `websocket_endpoint(websocket: WebSocket)`:
  - Spawns two concurrent asynchronous tasks via `asyncio.create_task`:
    1. `reader()`: Listens for incoming client JSON commands:
       - `{"action": "set_mode", "mode": "thermal"|"optical"}` $\rightarrow$ invokes `processor.toggle_mode()`.
       - `{"action": "start_recording"}` $\rightarrow$ invokes `processor.start_recording()`.
       - `{"action": "stop_recording"}` $\rightarrow$ invokes `processor.stop_recording()`.
       - `{"action": "set_geofence", "points": [...]}` $\rightarrow$ invokes `processor.set_geofence()`.
    2. `writer()`: Polls `processor.get_latest_data()` at ~30Hz (`asyncio.sleep(0.033)`). If timestamp has advanced, sends the telemetry payload as JSON.

---

### 2.2 `backend/processor.py` (`VideoProcessor`)
Encapsulates real-time video capture, inference, optical flow, geofencing, HUD drawing, and JPEG encoding.

#### Initialization & Hardware Optimization (`__init__`):
- **Device Selection**: `self.device = "cuda" if torch.cuda.is_available() else "cpu"`.
- **Model Loading**: Loads `yolov8m.pt` onto `self.device`. Warmed up with a dummy zero array (`180x320x3`).
- **CPU vs GPU Performance Divergence**:
  - `self.detect_interval = 10` on CPU vs `1` on GPU (runs YOLO inference every 10th frame on CPU to prevent throttling).
  - `self._ws_skip = 2` on CPU vs `1` on GPU (pushes every 2nd processed frame over WS to halve bandwidth).
  - On CPU: Uses `model.predict()` (no ByteTrack tracker overhead $\rightarrow$ 3x faster).
  - On GPU: Uses `model.track(tracker="bytetrack.yaml")` for full persistent ID tracking.

#### Source Priority Resolution (`_resolve_source()`):
1. **Priority 1: Phone IP Camera**: Tests `PHONE_STREAM_URL` (default `http://10.85.22.197:8080/video`) via `_check_stream_reachability()` non-blocking socket check on port 8080.
2. **Priority 2: Local Video**: Scans `backend/videos/*.mp4`, `*.avi`, `*.mov`.
3. **Priority 3: Synthetic Simulation**: Generates simulated crowd frames if no video feed exists.

#### Core Processing Loop (`_process_loop()`):
1. Reads raw frame from `cv2.VideoCapture` with `CAP_PROP_BUFFERSIZE = 1` to eliminate latency.
2. Resizes frame to standard render dimensions: `640x360`.
3. **Inference Execution (`_run_detection()`)**:
   - Resizes frame to `320x180` for high-speed YOLO processing.
   - Filters detections for class `0` (person) with `conf = 0.35`, `iou = 0.25`.
   - Scales bounding box coordinates back to `640x360`:
     $$\text{scale}_x = \frac{640}{320} = 2.0, \quad \text{scale}_y = \frac{360}{180} = 2.0$$
4. **Farneback Optical Flow (`_calculate_real_flow()`):**
   - Converts frame to grayscale.
   - Executes `cv2.calcOpticalFlowFarneback(prev_gray, curr_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)`.
   - Computes global flow angle in degrees:
     $$\theta = \text{degrees}(\text{arctan2}(\text{mean}(flow_y), \text{mean}(flow_x))) \pmod{360}$$
   - Maps angle to compass directions (`NORTH`, `SOUTH`, `EAST`, `WEST`, `STABLE`).
5. **Agitation Index (`_calculate_agitation()`):**
   - Combines crowd density score with average track displacement velocity:
     $$\text{Agitation} = (0.4 \cdot \text{density\_score}) + (0.6 \cdot \text{speed\_score})$$
6. **Geofencing**:
   - Uses `cv2.pointPolygonTest` against user-defined polygon coordinates to detect boundary intrusions.
7. **Encoding & Transport**:
   - Compresses frame to JPEG (`cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 50])`).
   - Base64 encodes to string and attaches to telemetry dictionary.
8. **Evidence Capture**:
   - When `self.is_recording` is True, writes `640x360` frames at 20 FPS using VP80 (`.webm`) with fallback to MP4V (`.mp4`).

---

### 2.3 `backend/analysis.py` (`DensityAnalyzer`)
Implements the crowd dynamics formulas and predictive mathematical models.

#### Mathematical Models & Formulas:

1. **Crowd Density ($D$):**
   $$D = \frac{\text{count} \times 10000}{\text{width} \times \text{height}}$$
   - Thresholds: $D > 0.50 \rightarrow \text{CRITICAL}$, $D > 0.30 \rightarrow \text{WARNING}$, $D > 0.15 \rightarrow \text{ELEVATED}$, else $\text{SAFE}$.

2. **Physical Crowd Pressure ($P$):**
   - Evaluates inter-person Euclidean distances between detection centroids $(c_x, c_y)$:
     $$\bar{d} = \frac{1}{N_{\text{pairs}}} \sum_{i} \sum_{j} \sqrt{(c_{x,i} - c_{x,j})^2 + (c_{y,i} - c_{y,j})^2}$$
     $$P = \max\left(0.0, \min\left(100.0, (1.0 - 5 \cdot \bar{d}) \times 100\right)\right)$$

3. **Average Flow Velocity ($V$):**
   - Measures displacement of matched track centroids over time delta $\Delta t$:
     $$V = \frac{\Delta \text{distance}}{\Delta t}$$

4. **Compound Stampede Risk Index ($R$):**
   $$R = \left(\min\left(\frac{D}{D_{\text{crit}}}, 1.0\right) \times 40\right) + \left(\frac{P}{100} \times 30\right) + \left(\min\left(\frac{V}{100}, 1.0\right) \times 20\right) + \left(\min\left(\frac{\text{count}}{C_{\max}}, 1.0\right) \times 10\right)$$
   - Scale: $0$ to $100$.

5. **Time to Critical Estimation ($T_{\text{crit}}$):**
   - Computes linear trend from trailing 10 density measurements:
     $$\text{trend} = \frac{D_{\text{latest}} - D_{\text{first}}}{N}$$
     $$T_{\text{crit}} = \frac{D_{\text{crit}} - D_{\text{latest}}}{\text{trend}} \times 0.1 \quad \text{(seconds)}$$

6. **Sector Quadrant Analysis (`_analyze_sectors()`):**
   - Splits camera bounds into quadrants: NW, NE, SW, SE based on $(\text{mid}_x, \text{mid}_y)$.
   - Counts persons per sector and marks $\text{CRITICAL}$ if count $> 15$, $\text{WARNING}$ if count $> 8$.

---

### 2.4 Physical Hardware Subsystem & Multi-Sensor Fusion (`backend/hardware/`)
The hardware subsystem integrates physical edge IoT telemetry (ESP32-S3) with computer vision to create a multi-sensor crowd intelligence platform. The camera remains the PRIMARY source (nominal 70% weighting), while hardware provides physical redundancy, acoustic validation, and false-positive suppression.

#### Physical Sensors & Actuators:
1. **ESP32-S3 IoT Node**: Dual-core Xtensa LX7 processor communicating continuously with FastAPI over Wi-Fi.
2. **INMP441 Digital MEMS Microphone**: I2S 24-bit audio interface measuring ambient sound pressure level in decibels ($40$–$110$ dB).
3. **AM2302 (DHT22) Sensor**: High-accuracy digital temperature ($-40$ to $+80$°C) and relative humidity ($0$–$100$% RH).
4. **PIR Motion Sensor**: Digital passive infrared kinematic motion trigger detecting physical movement in node proximity.
5. **Active Buzzer**: Controlled actuator triggered exclusively during multi-sensor confirmed `CRITICAL` stampede hazards.
6. **RGB Status LED**: Hardware tri-color visual indicator (`GREEN` = Normal, `YELLOW` = Warning/Elevated, `RED` = Critical).

#### Modules & Methods:

1. **`hardware_models.py`**:
   - `ESP32TelemetryPacket`: Typed Pydantic model for incoming JSON packets: `temperature` (float), `humidity` (float), `noise_db` (float), `motion` (bool), `device_id` (str), `timestamp` (float).
   - `ActuatorControl`: Actuator response model dispatched back to ESP32: `buzzer` (bool), `led_color` (`"GREEN" | "YELLOW" | "RED" | "OFF"`).
   - `HardwareState`: Internal normalized hardware state including `heat_stress_index`, `noise_index`, `motion_activity_score`, `sensor_score`, `sensor_health` (`OPTIMAL | DEGRADED | OFFLINE`), `hardware_status` (`CONNECTED | TIMEOUT | SIMULATED`), `latency_ms`.
   - `FusionResult`: Fused multi-modal evaluation outputting `fusion_confidence`, `environment_risk`, `combined_threat_score`, `threat_level`, `vision_weight`, `hardware_weight`, `fusion_narrative`, `crowd_alert`.

2. **`sensor_processor.py` (`SensorProcessor`)**:
   - `calculate_heat_stress_index(temp, humidity)`: Calculates Steadman Heat Stress Index formula:
     $$\text{heat\_idx} = -8.784695 + 1.61139411 \cdot T + 2.338549 \cdot H - 0.14611605 \cdot T \cdot H - 0.012308094 \cdot T^2 - 0.016424828 \cdot H^2 + \dots$$
   - `normalize_noise_db(noise_db)`: Scales acoustic decibel reading into normalized range $[0, 100]$:
     $$\text{noise\_index} = \max\left(0.0, \min\left(100.0, \frac{\text{noise\_db} - 55.0}{40.0} \times 100\right)\right)$$
   - `update_motion_history(motion_detected)`: Rolling window of trailing 30 samples computing duty cycle activity percentage.
   - `evaluate_sensor_health(packet)`: Validates physical limits (temp $-20$ to $65$, humidity $0$–$100$, noise $30$–$120$). Returns `OPTIMAL`, `DEGRADED`, or `OFFLINE`.
   - `process_telemetry(packet, latency_ms)`: Combines all DSP steps into updated `HardwareState`.

3. **`sensor_fusion.py` (`SensorFusionEngine`)**:
   - `calculate_weights(fps, hardware_state)`: Dynamic weighting calculation:
     - Baseline: Vision $W_V = 0.70$, Hardware $W_H = 0.30$.
     - Hardware Offline / Timeout: $W_V = 1.0$, $W_H = 0.0$.
     - Camera Degraded ($FPS < 15$): Shifts dynamically to $W_V = 0.40, W_H = 0.60$.
     - Hardware Degraded: $W_V = 0.85, W_H = 0.15$.
   - `evaluate_false_positive_reduction(density, stampede_risk, noise_idx, motion_score, motion_detected)`:
     Implements multi-sensor convergence matrix:
     - High Density ($>0.4$) + High Noise ($>70$) + Motion Detected $\rightarrow$ **High Confidence Alert (Confirmed)**.
     - High Density only ($>0.4$), normal acoustic $\rightarrow$ **Monitor Only (Warning)**.
     - High Noise only ($>70$), normal density $\rightarrow$ **Monitor Only (Excitement / Event sound)**.
     - PIR Motion only, normal density $\rightarrow$ **Ignore / Nominal (Localized passage)**.
   - `fuse(vision_data, hardware_state)`: Computes:
     $$\text{EnvRisk} = 0.50 \cdot \text{heat\_stress\_index} + 0.50 \cdot \text{noise\_index}$$
     $$\text{HwScore} = 0.40 \cdot \text{noise\_index} + 0.35 \cdot \text{motion\_activity} + 0.25 \cdot \text{heat\_stress}$$
     $$\text{CombinedScore} = W_V \cdot \text{stampede\_risk} + W_H \cdot \text{HwScore}$$
     Smooths output with exponential moving average ($0.80 \cdot \text{prev} + 0.20 \cdot \text{current}$), sets actuator states (Buzzer=ON only for CRITICAL, LED=Green/Yellow/Red), generates AI narrative, and injects all fields into `vision_data`.

4. **`esp32_manager.py` (`ESP32Manager`)**:
   - Ingests raw telemetry packets thread-safely via `threading.Lock`.
   - Tracks packet reception timestamp; triggers `TIMEOUT` status if no packet arrives within 10 seconds.
   - Implements high-fidelity fallback simulator when physical hardware is not broadcasting: realistic diurnal temperature drift, ambient acoustics, simulated PIR kinematic pulses.
   - Dispatches actuator commands (`buzzer`, `led`) back to ESP32 on subsequent telemetry HTTP POST or actuator polling.

5. **`hardware_api.py`**:
   - `POST /api/hardware/telemetry`: ESP32 continuously POSTs JSON telemetry packets; receives immediate actuator control JSON response: `{"status": "ok", "actuators": {"buzzer": false, "led_color": "GREEN"}}`.
   - `GET /api/hardware/status`: Returns comprehensive node telemetry, health status, and actuator states.
   - `GET /api/hardware/actuators`: Returns current buzzer and RGB LED status for ESP32 polling.
   - `POST /api/hardware/actuators`: Manual SOC actuator override endpoint.
   - `POST /api/esp32`: Backward-compatible alias for existing ESP32 firmware flashes.

---

## 3. Frontend Architecture (`frontend/src/`)

### 3.1 `App.tsx` (State Management & Master Layout)
The central orchestrator connecting WebSockets, audio synthesis, keyboard shortcuts, and component hierarchy.

#### Key Patterns & Performance Strategies:
- **`imageRef` Decoupling Pattern**:
  ```typescript
  const imageRef = useRef<string | null>(null);
  ```
  Instead of saving base64 video frames in React state (which causes 30 full-tree re-renders per second), frames are written directly to `imageRef.current`. `VideoFeed.tsx` polls this ref via `requestAnimationFrame`.
- **Telemetry Throttle (`STATS_UPDATE_INTERVAL = 3`)**:
  `wsMessageCount.current % 3 === 0` controls `setStats()`, reducing component re-render frequency by 66% while keeping video rendering at full 30 FPS.
- **WebSocket Reconnection with Exponential Backoff**:
  ```typescript
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 10000);
  reconnectTimer.current = setTimeout(connectWebSocket, delay);
  ```
- **Web Audio API Synthesizer (`playSound`)**:
  Generates client-side zero-latency audio without external sound assets:
  - `'beep'`: 600Hz $\rightarrow$ 300Hz exponential ramp (100ms).
  - `'click'`: 1000Hz short pulse (40ms).
  - `'alert'`: 450Hz $\rightarrow$ 150Hz sawtooth siren sweep (800ms).
- **Speech Synthesis (`speakText`)**:
  Dispatches browser `SpeechSynthesisUtterance` for emergency alerts and camera switches.
- **Keyboard Shortcuts (`handleKeyDown`)**:
  - `S`: Emergency SOS toggle with voice broadcast.
  - `T`: Toggle Thermal/Optical vision mode.
  - `R`: Start/Stop video recording.

---

### 3.2 `components/VideoFeed.tsx` (Hero Camera Viewport)
Occupies ~70% of the center section, rendering the video canvas, rich HUD overlays, and camera tabs.

#### State & Props:
- `CAMERAS`: Array containing camera definitions (`Entrance`, `Exit`, `Food Court`, `Gate A`, `Parking`) with status and preview gradient colors.
- `showHeatmap`, `showHudBoxes`, `showFlowVectors`, `snapshotEffect`, `drawingMode`, `points`, `fps`.

#### Render Layers & Overlays:
1. **Camera Miniature Preview Tabs**: Displays miniature thumbnail cards with status indicators (`optimal` / `warning`) and active cyan glowing borders.
2. **Video Element**: Managed through `imgRef` with `requestAnimationFrame` update loop.
3. **Rich Person Overlays**:
   - Person #18 (Center): `Person 18 | ↓ 1.2 m/s | 94% | Normal` with corner bracket styling.
   - Person #08 (Right): `Person 08 | → 1.8 m/s | 96% | Rapid`.
   - Person #24 (Left): `Person 24 | • 0.4 m/s | 91% | Queue`.
4. **Optical Flow Vectors**: 3-tier animated directional arrows (`→ → → → →`) with CSS `flow-drift` animation simulating crowd movement currents.
5. **Simulated AI Heatmap**: Multi-stop radial gradient with screen blend mode:
   `radial-gradient(circle at 45% 55%, rgba(255,23,68,0.55) 0%, rgba(255,193,7,0.35) 35%, rgba(0,255,136,0.18) 65%, transparent 85%)`
6. **Edge AI Diagnostics HUD**: Displays `YOLOv11`, `18ms` latency, `NVIDIA RTX 3050`, and accuracy telemetry.
7. **Floating Glass Toolbar**:
   - `Snapshot`: Triggers visual screen flash.
   - `Record`: Toggles backend WebM video recording.
   - `Heatmap`: Toggles radial heatmap overlay.
   - `Flow Vectors`: Toggles directional optical flow vectors.
   - `Tracking HUD`: Toggles person bounding boxes and tags.
   - `Zones`: Activates polygon geofence drawing mode.
   - `Thermal`: Sends WebSocket mode command.
   - `Fullscreen`: Triggers HTML5 Fullscreen API on container.

---

### 3.3 `components/StatusCardsRow.tsx` (Top KPI Cards)
Displays high-contrast Level-2 metric cards across the top of the dashboard.

#### `AnimatedNumber` Component:
- Custom micro-interpolator implemented via `requestAnimationFrame`:
  ```typescript
  const frame = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - (1 - progress) * (1 - progress); // easeOutQuad
    setDisplayValue(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(frame);
  };
  ```
- Ensures values smoothly glide between numbers (`4 → 5 → 6`) instead of jumping.

#### Cards Rendered:
1. **PEOPLE DETECTED**: `count` / `maxCapacity` with capacity percentage pill.
2. **CROWD DENSITY**: `density` index with glowing status pill (`OPTIMAL`, `ELEVATED`, `WARNING`, `CRITICAL`).
3. **STAMPEDE RISK**: `stampedeRisk` / 100 with dynamic SVG circular progress ring:
   $$\text{offset} = 2\pi r - \left(\frac{\text{risk}}{100}\right) \times 2\pi r, \quad r = 13$$
4. **CONNECTED DEVICES**: `wifiProbeCount` with active ESP32 zone badge.
5. **FLOW VELOCITY**: Pedestrian speed calculated in meters per second (`avgVelocity / 25`).

---

### 3.4 `components/AIInsightsCard.tsx` (Predictive AI Horizon)
Level-1 elevated card providing operational decision intelligence.

#### Predictive Mode Horizon Switcher:
- Switcher state: `'+3m' | '+5m' | '+10m'`.
- Computes forecasted density projection and risk multiplier:
  - `+3m`: $+15\%$ expected occupancy surge.
  - `+5m`: $+32\%$ expected occupancy surge.
  - `+10m`: $+48\%$ expected occupancy surge.
- Operational Situation Narrative: Dynamic text assessing walking speeds, corridor bottlenecks, and queue build-up.
- Smart Recommendation Engine: Quantified dispatch advice (e.g., *"Open Gate B — Estimated congestion reduction: 37%"*).
- Real-time clearance time and Time to Critical countdown display.

---

### 3.5 `components/Timeline.tsx` (Event Timeline & Crowd Replay)
Level-3 bottom scrubber tracking operational events with historical replay capabilities.

#### Components & Replay Logic:
- **Operational Event Nodes**: Time intervals paired with icons (`Density ↑`, `Alert ⚠️`, `Queue ⏳`, `Resolved ✓`).
- **Crowd Replay Scrubber Mode**:
  - `replayActive`: Toggles between live telemetry and historical playback.
  - `replayIndex`: Current historical frame index ($0$ to $5$).
  - `isPlaying`: Auto-playback loop using `setInterval(..., 1400)` advancing frames automatically.
  - Interactive range slider: Scrubbing across timestamps (`14:20` to `14:30`) displays frame-specific incident context.

---

### 3.6 `components/RiskGauge.tsx` (Semicircle Arc Gauge)
Level-2 risk visualization using a clean 180° semicircle arc.

#### Mathematical Arc Calculation:
```typescript
const radius = 42;
const circumference = Math.PI * radius; // 180-degree half circumference
const strokeDashoffset = circumference - (clampedRisk / 100) * circumference;
```
- Rendered via SVG path: `M 8 50 A 42 42 0 0 1 92 50`.
- Includes segmented sub-indicators: Density (40%), Physical Pressure (35%), Agitation (25%).

---

### 3.7 `components/LiveMap.tsx` (Tactical Radar Map)
Integrated tactical Leaflet map rendered with CartoDB Dark Matter tiles.

#### Features:
- Evacuation Routes: Dashed green (`#00ff88`) polylines guiding flow to North, East, and South exits.
- **Camera FOV Cone**: Animated semi-transparent cyan circle showing the active camera's viewing field from the Command Hub.
- **Drone Aerial Unit**: Autonomous drone icon interpolating toward alert coordinates using a distance step loop:
  $$d_{\text{lat}} = \text{target}_{\text{lat}} - \text{curr}_{\text{lat}}, \quad \text{step} = 0.05 \times d_{\text{lat}}$$
- Pulsing red alert zones indicating geographical alert clusters.

---

### 3.8 `components/ActiveAlertsPanel.tsx` (Alert Management & Empty State)
Level-1 alert triage component.
- Active alert: Displays pulsing Crimson card (`card-level-1-alert`) with priority tags and severity level.
- **Warm Empty State**: Displays friendly operational status (*"✓ All sectors operating normally. Last incident resolved 28 minutes ago (Gate A queue cleared). Coverage: 100% active"*).
- Resolved incidents log with resolution timestamps.

---

### 3.9 `components/EvidenceLocker.tsx` (Secure Evidence Vault Modal)
Cryptographic modal for reviewing and exporting captured security video sessions.

#### Hold to Decrypt Mechanism:
- Prevents accidental exposure of security footage.
- Operator must hold mouse down / touch for ~1 second.
- `holdTimer`: Increments `decryptProgress` by $+5\%$ every 50ms.
- Releasing button early automatically drains progress by $-3\%$ every 50ms.
- Reaching $100\%$ unlocks the HTML5 `<video>` player and direct footage export link.

---

### 3.10 `components/LiveStatusPanel.tsx` & `Header.tsx`
- **`LiveStatusPanel.tsx`**: Left column high-readability list (People, Density, Devices, Risk, Average Speed) with status badges.
- **`Header.tsx`**: Header bar displaying brand identity, `ENTERPRISE v4.0`, active telemetry pill (`SYS SAFE`, `5 FEEDS`, `SENSORS`), CPU and latency vitals, direct `VAULT` launcher button, and `EMERGENCY SOS` button.

---

## 4. WebSocket Payload Protocol Specification

### 4.1 Server-to-Client Telemetry Schema (`ws://127.0.0.1:8000/ws`)
```json
{
  "image": "<base64_jpeg_string>",
  "count": 4,
  "density": 0.12,
  "status": "SAFE",
  "timestamp": 1729000000.123,
  "mode": "OPTICAL",
  "recording": false,
  "predicted_density": 0.14,
  "pressure_index": 18.0,
  "capacity_pct": 2.0,
  "max_capacity": 200,
  "avg_velocity": 32.0,
  "time_to_critical": -1,
  "stampede_risk": 18.0,
  "flow_direction": {
    "angle": 45,
    "label": "EAST"
  },
  "sectors": [
    { "name": "NW", "count": 1, "status": "SAFE" },
    { "name": "NE", "count": 1, "status": "SAFE" },
    { "name": "SW", "count": 1, "status": "SAFE" },
    { "name": "SE", "count": 1, "status": "SAFE" }
  ],
  "wifi_probe_count": 9,
  "wifi_zones": {
    "ZONE_A": { "count": 9, "rssi": -68.0, "status": "ACTIVE" }
  },
  "fps": 30.0,
  "crowd_alert": null,
  "temperature": 24.5,
  "humidity": 52.0,
  "noise_db": 58.0,
  "motion_detected": false,
  "sensor_health": "OPTIMAL",
  "sensor_timestamp": 1729000000.120,
  "buzzer_state": false,
  "led_state": "GREEN",
  "hardware_status": "CONNECTED",
  "environment_risk": 18.0,
  "fusion_confidence": 0.94,
  "sensor_score": 22.0,
  "heat_stress_index": 24.8,
  "noise_index": 28.0,
  "motion_activity_score": 15.0,
  "combined_threat_score": 20.0,
  "fusion_narrative": "Nominal conditions across all visual and environmental channels."
}
```

### 4.2 Client-to-Server Command Schema
```json
// Toggle vision mode
{ "action": "set_mode", "mode": "thermal" }

// Evidence recording controls
{ "action": "start_recording" }
{ "action": "stop_recording" }

// Custom geofence boundary coordinates
{ "action": "set_geofence", "points": [{ "x": 0.25, "y": 0.35 }, ...] }
```

---

## 5. Developer Rules & Operational Constraints

> [!CRITICAL]
> **MANDATORY CONSTRAINTS FOR ALL AI AGENTS & DEVELOPERS:**
> 1. **DO NOT PERFORM BROWSER TESTING / DO NOT USE BROWSER SUBAGENTS**:
>    - The user has strictly instructed: **Never open browser windows or launch browser verification tools**.
>    - All verification must be terminal-based: `npm run build` in `frontend/` and `py_compile` in `backend/`.
> 2. **CONTINUOUS GIT PUSH**:
>    - The user has strictly instructed: **Commit and push to GitHub `origin/master` after every change**.
> 3. **STRICT TYPESCRIPT COMPLIANCE**:
>    - `tsconfig.app.json` has `noUnusedLocals: true` and `noUnusedParameters: true`.
>    - Any unused import or unreferenced local variable will break the build with exit code 1.
> 4. **ENTERPRISE DESIGN INTEGRITY**:
>    - Preserve the 3-tier card hierarchy (`card-level-1`, `card-level-2`, `card-level-3`), glowing pills, and Space Grotesk / Inter typography.
>    - Do not re-introduce scanline shaders, glitch effects, or cluttered layouts.
> 5. **STRICT BRANDING**:
>    - Retain platform identity as **CrowdPulse Enterprise v4.0**.
