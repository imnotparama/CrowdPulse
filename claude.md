# CrowdPulse Enterprise v4.0 - Architecture & AI Context Memory

This document is the authoritative knowledge base and architectural blueprint for **CrowdPulse Enterprise**. It is structured so that any AI agent, coding assistant, or engineer can immediately understand the system architecture, design decisions, component contracts, data pipelines, and operational constraints.

---

## 1. Executive Summary & Design Philosophy

**CrowdPulse Enterprise** is an autonomous crowd safety and surveillance intelligence platform designed for high-density venues (stadiums, transport hubs, festivals, pilgrimage sites). It transforms raw video and sensor telemetry into actionable operational decisions to predict and prevent stampedes, bottlenecks, and hazardous density surges.

### Core Philosophy: "Intelligent Operations, Not Just Bounding Boxes"
Traditional surveillance systems merely draw boxes around people. CrowdPulse operates at an executive decision-making level:
- **Visual Calm**: Inspired by Palantir Gotham and Tesla Fleet telemetry. A dark `#09090b` charcoal canvas with curated accent colors (`#00e0ff` cyan, `#00ff88` emerald, `#ffc107` amber, `#ff1744` crimson). No visual noise, CRT scanlines, or distracting neon grids.
- **Hero Camera Dominance (~70%)**: The live camera feed is the product and commands the center of the operator's viewport.
- **3-Tier Visual Hierarchy**: Cards are not identical rectangles. Level 1 (Hero/Critical), Level 2 (Metrics/KPIs), and Level 3 (Secondary/Utility) guide operator attention instantly.
- **Predictive AI Mode**: Forecasting crowd occupancy at `+3m`, `+5m`, and `+10m` horizons with quantified smart recommendations (e.g. *"Open Gate B: -37% congestion reduction"*).
- **Interactive Crowd Replay**: Time scrubber allowing operators to scrub through recent history (`14:20` to `14:30`) to analyze how bottlenecks formed.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Core** | React 19, TypeScript 5.8+, Vite 7.3 |
| **Styling & Design System** | Tailwind CSS v4, Vanilla CSS Custom Tokens (`index.css`), PostCSS |
| **Data Visualization** | Recharts (area charts), Custom SVG rings & 180° semicircle gauges |
| **Tactical Mapping** | React-Leaflet 5, Leaflet 1.9, CartoDB Dark Matter tiles |
| **Icons & Typography** | Lucide React, Google Fonts (`Space Grotesk`, `Inter`, `Share Tech Mono`) |
| **Backend Framework** | Python 3.11+, FastAPI, Starlette WebSockets, Pydantic v2 |
| **Computer Vision & AI** | Ultralytics YOLOv8 / YOLOv11, OpenCV (Farneback optical flow), PyTorch |
| **Hardware Sniffing** | ESP32 promiscuous Wi-Fi RSSI probe network (`/api/wifi`) |

---

## 3. Frontend Architecture & Component Directory

### Layout Hierarchy (`frontend/src/App.tsx`)
The dashboard uses a 3-column flex layout optimized for widescreen and 1080p surveillance workstations:
```
+-----------------------------------------------------------------------------------------------+
|                                      HEADER (Level 1)                                         |
+-----------------------------------------------------------------------------------------------+
|                                   TOP STATUS CARDS ROW (Level 2)                              |
+--------------------------+------------------------------------------+-------------------------+
|   LEFT COLUMN (~290px)   |       CENTER HERO (~70% flex-1)          |  RIGHT COLUMN (~310px)  |
|                          |                                          |                         |
|  - Live Status Panel     |  - VideoFeed Hero (Camera Viewport)      |  - Semicircle Risk      |
|    (Level 2 Metrics)     |    * Thumbnail Previews Tabs             |    (Level 2 Gauge)      |
|                          |    * Rich Person HUD Tags                |                         |
|  - AI Insights Card      |    * Optical Flow Vectors                |  - Active Alerts Panel  |
|    (Level 1 Narrative &  |    * AI Heatmap & Edge Vitals            |    (Level 1 Alerts &    |
|     Predictive Horizon)  |    * Floating Glass Toolbar              |     Warm Empty State)   |
|                          |                                          |                         |
|  - Recent Events Log     |  - Operational Event Timeline (Level 3)  |  - Density Telemetry    |
|    (Level 3 History)     |    * Interactive Crowd Replay Scrubber   |    (Level 2 Area Chart) |
|                          |    * Status Nodes (Spike, Queue, OK)     |                         |
|                          |                                          |  - Tactical Radar Map   |
|                          |                                          |    (Level 3 Leaflet &   |
|                          |                                          |     Camera FOV Cone)    |
|                          |                                          |                         |
|                          |                                          |  - AI Assistant Trigger |
+--------------------------+------------------------------------------+-------------------------+
```

### Component Breakdown

#### 1. `Header.tsx`
- **Identity**: Platform title `CrowdPulse Enterprise v4.0`, `AI INFERENCE ENGINE` badge.
- **Telemetry Pill**: Real-time status pill (`SYS SAFE`, `5 FEEDS`, active sensor counts).
- **Actions**:
  - Live system vitals (CPU usage with jitter, network latency in ms, real-time clock).
  - Secure **VAULT** button (opens Evidence Locker modal directly).
  - Audio mute/unmute toggle.
  - Fullscreen **EMERGENCY SOS** button (triggers full-screen flashing boundary and voice alerts).

#### 2. `VideoFeed.tsx` (Hero Component)
- **Viewport**: Dominates center space (`min-h-[480px] lg:min-h-[580px]`).
- **Camera Thumbnail Tabs**: Top tab bar with miniature preview boxes (`Entrance`, `Exit`, `Food Court`, `Gate A`, `Parking`) featuring glowing cyan borders and live status dots.
- **Overlays**:
  - **Person HUD Tags**: Rounded boxes with Person ID (`Person 18`), velocity arrow & speed (`↓ 1.2 m/s`), confidence pill (`94%`), and movement tag (`Normal` / `Rapid` / `Queue`).
  - **Optical Flow Vectors**: Dynamic directional arrow grid (`→ → → → →`) indicating pedestrian optical currents.
  - **AI Heatmap**: Multi-stop radial gradient overlay (Red hotspot, Yellow transition, Green flow).
  - **Edge AI Diagnostics HUD**: `YOLOv11 | 18ms | NVIDIA RTX 3050 | 98.7% Accuracy | 96% Tracking`.
- **Floating Toolbar**: Icon + label tooltips for `Snapshot`, `Record`, `Heatmap`, `Flow Vectors`, `Tracking HUD`, `Zones` (polygon geofencing), `Thermal`, and `Fullscreen`.
- **High-Performance Image Ref Pattern**: Decoupled from React state using `imageRef.current` and `requestAnimationFrame` polling to eliminate 30 FPS full-tree re-renders.

#### 3. `AIInsightsCard.tsx` (Level 1 Intelligence)
- **Narrative**: High-level situation assessment (*"Current crowd occupancy is 18%. Average walking speed increased 12% over the last minute. Flow vectors show smooth clearance toward main exits."*).
- **Predictive Mode Switcher (Killer Feature)**: Horizon buttons `+3m`, `+5m`, `+10m` showing forecasted crowd occupancy percentages.
- **Quantified Recommendations**: Actionable dispatch guidance with predicted impact (*"Open Gate B — Estimated congestion reduction: 37%"*).
- **Evacuation Vitals**: Estimated clearance time and Time to Critical countdown.

#### 4. `StatusCardsRow.tsx` (Level 2 Metrics)
- Top KPI cards: People Detected, Crowd Density, Stampede Risk, Devices Active, and Flow Velocity.
- **Smooth Number Transitions (`AnimatedNumber`)**: Micro-interpolator using `requestAnimationFrame` and ease-out quad curve so numbers glide smoothly between updates (`4 → 5 → 6`).
- **Glowing Status Pills**: `.pill-glowing-safe`, `.pill-glowing-warning`, `.pill-glowing-critical`.
- **Mini Risk Ring**: Scalable SVG circular ring progress bar with dynamic threshold colors.

#### 5. `Timeline.tsx` (Level 3 Operational Timeline)
- Event nodes with operational status icons: `Density ↑` (TrendUp), `Alert ⚠️` (AlertTriangle), `Queue ⏳` (Users), `Resolved ✓` (CheckCircle2).
- **Crowd Replay Scrubber Mode**:
  - `CROWD REPLAY` button toggles between live monitoring and historical inspection mode.
  - Interactive playback bar with **Play / Pause** auto-advancement and a time slider from `14:20` to `14:30`.
  - Frame-by-frame event annotations (*"Gate A turnstile bottleneck detected. Pre-alert broadcasted"*).

#### 6. `RiskGauge.tsx` (Level 2 Semicircle Arc Gauge)
- Semicircle 180° SVG arc gauge replacing generic full circle.
- Glowing status indicator pill with live pulse.
- Sub-breakdown indicators: Crowd Density (40%), Physical Pressure (35%), Agitation (25%).

#### 7. `LiveMap.tsx` (Level 3 Tactical Map)
- Dark CartoDB Matter tile map centered on venue hub (`[13.0827, 80.2707]`).
- **Camera FOV Cone**: Animated semi-transparent radar field-of-view cone radiating in active camera direction.
- Moving tactical pedestrian dots, dashed green evacuation polylines, and pulsing alert zone circles.
- Deployable aerial drone unit simulation with automated waypoint flight.

#### 8. `ActiveAlertsPanel.tsx` (Level 1 Alert Management)
- **Active State**: Pulsing `.card-level-1-alert` with priority warning and audio trigger.
- **Warm & Informative Empty State**: Friendly confirmation when nominal (*"✓ All sectors operating normally. Last incident resolved 28 minutes ago (Gate A queue cleared). Coverage: 100% active"*).
- Resolved incidents log with timestamps.

#### 9. `EvidenceLocker.tsx` (Secure Vault Modal)
- Secure evidence vault styled in enterprise `#121216` dark surface.
- **Hold to Decrypt Mechanism**: Cryptographic verification requiring holding the button for 1 second with smooth animated progress bar before unlocking playback.
- Integrated HTML5 video playback and one-click footage export.

#### 10. `AIChatSidebar.tsx` & `SplashScreen.tsx`
- **AIChatSidebar**: Slide-out assistant drawer with proactive operational advice and quick query chips.
- **SplashScreen**: Enterprise diagnostic boot sequence (initializing neural models, calibrating optical flow, securing WebSocket link) with a 5.5s safety timeout.

---

## 4. Design System & CSS Tokens (`frontend/src/index.css`)

### 3 Visual Hierarchy Tiers
```css
/* Level 1: Hero & Critical (Camera, AI Insights, Priority Alerts) */
.card-level-1 {
  background: #141418;
  border: 1px solid rgba(0, 224, 255, 0.18);
  border-radius: 1rem;
  box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.6), 0 0 20px -2px rgba(0, 224, 255, 0.05);
}

/* Level 2: Core Metrics & KPIs (Status Cards, Risk Gauge, Live Status) */
.card-level-2 {
  background: #101013;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.875rem;
  box-shadow: 0 6px 24px -2px rgba(0, 0, 0, 0.45);
}

/* Level 3: Secondary & Utility (Timeline, Tactical Map, Events) */
.card-level-3 {
  background: #0c0c0f;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 0.75rem;
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.35);
}
```

### Glowing Pills & Badges
- `.pill-glowing-safe`: Emerald `#00ff88` glow pill with `box-shadow: 0 0 12px rgba(0, 255, 136, 0.18)`.
- `.pill-glowing-warning`: Amber `#ff9800` glow pill with `box-shadow: 0 0 12px rgba(255, 152, 0, 0.18)`.
- `.pill-glowing-critical`: Crimson `#ff1744` pulsing glow pill with `box-shadow: 0 0 16px rgba(255, 23, 68, 0.3)`.

### Color Palette Tokens
- Background: `#09090b` (Deep Charcoal)
- Card Surfaces: `#141418` (Level 1), `#101013` (Level 2), `#0c0c0f` (Level 3)
- Accents: Cyan `#00e0ff`, Emerald `#00ff88`, Amber `#ffc107`, Crimson `#ff1744`
- Borders: `rgba(255, 255, 255, 0.06)` standard, `rgba(0, 224, 255, 0.2)` focused

---

## 5. Backend Architecture & Sensor Pipeline

### `backend/main.py`
- Central FastAPI application and WebSocket router (`ws://127.0.0.1:8000/ws`).
- HTTP Endpoints:
  - `GET /`: Platform health and version status.
  - `GET /api/status`: Active camera, model device (CPU/GPU), FPS, active Wi-Fi zones.
  - `GET /api/recordings`: List of recorded `.webm` evidence files.
  - `POST /api/wifi`: Ingestion endpoint for ESP32 promiscuous Wi-Fi nodes (`{ "zone": "ZONE_A", "count": 18, "rssi": -65 }`).
  - `GET /api/wifi/status`: Active ESP32 zone count and stale node detection (nodes older than 10s marked `OFFLINE`).

### `backend/processor.py` (`VideoProcessor`)
- Video capture loop supporting webcam, IP camera stream, local test video, or synthetic simulation.
- **YOLO Detection Engine**:
  - Auto-selects `cuda` (NVIDIA GPU) or `cpu`.
  - CPU optimization: `detect_interval = 6` (inference every 6th frame), `imgsz = 416`, `max_det = 50`.
  - GPU acceleration: Full ByteTrack multi-object tracking (`model.track()`).
- **Optical Flow & Direction**:
  - Calculates Farneback optical flow vectors between consecutive grayscale frames.
  - Computes global flow angle and compass label (`NORTH`, `SOUTH`, `EAST`, `WEST`, `STABLE`).
- **Evidence Recording**:
  - Captures high-priority incidents in WebM format to `backend/recordings/`.

### `backend/analysis.py` (`DensityAnalyzer`)
- **Quadrant Analysis**: Splits scene into NW, NE, SW, SE sectors to locate localized congestion.
- **Stampede Risk Formulation**: Compound index incorporating:
  $$\text{Risk} = w_1 \cdot \text{Density} + w_2 \cdot \text{Pressure} + w_3 \cdot \text{Agitation} + w_4 \cdot \text{CapacityPercentage}$$
- **Time to Critical**: Linear projection estimating seconds until density exceeds dangerous threshold (0.75).

---

## 6. WebSocket Protocol Specification

### Server-to-Client Telemetry Payload (`ws://127.0.0.1:8000/ws`)
Pushed continuously from `processor.py`:
```json
{
  "image": "<base64_encoded_jpeg>",
  "count": 4,
  "density": 0.12,
  "status": "SAFE",
  "timestamp": 1729000000.12,
  "mode": "OPTICAL",
  "recording": false,
  "predicted_density": 0.14,
  "pressure_index": 18.0,
  "capacity_pct": 2.0,
  "max_capacity": 200,
  "avg_velocity": 32.0,
  "time_to_critical": -1,
  "stampede_risk": 18.0,
  "flow_direction": { "angle": 45, "label": "EAST" },
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
  "fps": 30,
  "crowd_alert": null
}
```

### Client-to-Server Command Protocol
Sent over the WebSocket from frontend controls:
```json
{ "action": "set_mode", "mode": "thermal" }
{ "action": "start_recording" }
{ "action": "stop_recording" }
{ "action": "set_geofence", "points": [{ "x": 0.2, "y": 0.3 }, ...] }
```

---

## 7. Developer Rules & Operational Constraints

> [!CRITICAL]
> **MANDATORY RULES FOR ALL FUTURE AI AGENTS & CONTRIBUTORS:**
> 1. **DO NOT PERFORM BROWSER TESTING / DO NOT USE BROWSER SUBAGENT**:
>    - The user has strictly instructed: **Never open a browser window or launch browser verification tools**.
>    - All verification must be terminal-based: `npm run build` in `frontend/` and `python -m py_compile` in `backend/`.
> 2. **CONTINUOUS GIT PUSH**:
>    - The user has strictly instructed: **Commit and push to GitHub `origin/master` after every meaningful set of changes**.
> 3. **STRICT TYPESCRIPT ENFORCEMENT**:
>    - `tsconfig.app.json` has `noUnusedLocals: true` and `noUnusedParameters: true`.
>    - Never leave unused imports or unreferenced variables. Every component must compile cleanly under `tsc -b`.
> 4. **PRESERVE ENTERPRISE CALM AESTHETICS**:
>    - Do not re-introduce neon scanlines, CRT glitch effects, or cluttered equal-sized boxes.
>    - Maintain the 3-tier card hierarchy, glowing pills, and Space Grotesk / Inter typography.
> 5. **ZERO HACKATHON / THIRD-PARTY BRANDING**:
>    - All branding must remain strictly **CrowdPulse Enterprise v4.0** (no "Team Fantastic Four" or placeholder university names).

---

## 8. Verification & Build Commands

### Frontend Build Verification
```powershell
cd c:\Users\hunte\CrowdPulse\frontend
npm run build
# Expected output: tsc -b && vite build -> built in ~10-15s with exit code 0
```

### Backend Syntax Verification
```powershell
cd c:\Users\hunte\CrowdPulse\backend
..\venv\Scripts\python.exe -m py_compile main.py processor.py analysis.py
# Expected output: Clean exit code 0
```

### Git Commit & Push Workflow
```powershell
cd c:\Users\hunte\CrowdPulse
git add .
git commit -m "feat(<scope>): <description>"
git push origin master
```
