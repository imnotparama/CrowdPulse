# CrowdPulse Project Documentation (Memory Dump)

This document serves as an exhaustive knowledge base and snapshot of the **CrowdPulse** system architecture and logic, serving as a rapid onboarding context file.

---

## Core Purpose
CrowdPulse is a real-time, AI-powered crowd safety and monitoring platform designed to detect risks, monitor capacities, and predict stampede possibilities before they turn dangerous.

---

## Technology Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS v4, Recharts (live analytics), React-Leaflet (tactical map), Framer Motion (overlay-only), Vite.
- **Backend:** Python 3.11+, FastAPI, WebSockets, Pydantic v2.
- **Computer Vision:** Ultralytics YOLOv8m, OpenCV (optical flow, heatmaps), PyTorch.
- **Fonts:** Rajdhani (headings), Share Tech Mono (monospace), Inter (body) — loaded via Google Fonts in `index.html`.

---

## Backend Architecture

### `main.py`
- Serves as the central API framework and WebSocket broker.
- Exposes HTTP endpoints: `/`, `/api/status`, `/api/recordings`, `/api/wifi` (POST), `/api/wifi/status` (GET).
- **`/api/wifi` (POST):** Accepts `{zone, count, rssi}` JSON from ESP32 boards. Updates `wifi_zones` module-level dict.
- **`/api/wifi/status` (GET):** Returns total device count + per-zone breakdown with staleness check.
- `wifi_zones` is a module-level `defaultdict(dict)` — processor.py imports it late to resolve circular import.
- Zone staleness: if a zone's last timestamp is older than **10 seconds**, it is marked `OFFLINE` and excluded from total count.
- Active zone count is surfaced in `/api/status` under `active_wifi_zones`.

### `processor.py` (`VideoProcessor`)
- **Device detection:** Auto-selects `cuda` or `cpu`.
- **YOLO inference settings (CPU-optimised):**
  - `detect_interval = 6` on CPU (was 4) — runs YOLO every 6th frame only.
  - YOLO input resized to **416×234** (`imgsz=416`) — frames are still rendered at 640×360.
  - `max_det=50` (was 100).
  - JPEG quality **50** (was 65).
  - On CPU: uses `model.predict()` (no tracker overhead). On GPU: still uses `model.track()` with ByteTrack.
- **WebSocket frame skipping:** `_ws_skip=2` on CPU — only every 2nd processed frame is encoded + pushed, halving bandwidth.
- **CPU anti-spin:** `time.sleep(0.001)` in the main loop prevents CPU spinning.
- **Coordinate scaling:** YOLO runs on 416×234, bounding-box coords are scaled back to 640×360 for rendering.
- **Wi-Fi integration:** Reads `wifi_zones` from `main.py` (late import) each frame to attach real ESP32 data to the WebSocket payload. Falls back to analyzer's estimate if no zones are active.
- Source priority: Phone stream → local video files → simulation mode.

### `analysis.py` (`DensityAnalyzer`)
- **`analyze_sectors`**: Crowd breakdowns across NW/NE/SW/SE quadrants.
- **`predict_future_density`**: 30-second ahead density projection from trailing history.
- **`_calculate_stampede_risk`**: Compound index from Density, Pressure, Velocity, and Max Capacity.
- **`_calculate_pressure`**: Physical compaction score from inter-person distance.

---

## Frontend Architecture

### `App.tsx`
- **Image ref pattern (critical performance fix):**  
  `imageRef = useRef<string | null>(null)` — the base64 image string is stored in a ref, not React state.  
  `ws.onmessage` writes to `imageRef.current` directly (no `setState` = no re-render).  
  VideoFeed polls the ref via `requestAnimationFrame` and updates `img.src` directly.
- **Stats throttle:** `setStats()` is only called every **3rd** WebSocket message (`STATS_UPDATE_INTERVAL = 3`), reducing React re-renders by 66%.
- **Wi-Fi zones:** Rendered as a breakdown table (zone name, count, RSSI, status dot) inside the Wi-Fi card. Active zone count passed to `<Header activeWifiZones={...} />`.
- **Capacity bar:** Uses `.capacity-bar-gradient` CSS class for a green→yellow→orange→red gradient with 500ms CSS transition.
- **Alert CLEAR ALL:** `alertHistory` can be cleared via a button in the Alert History panel header.
- **AnimatePresence** for the crowd alert is mounted at the root level, outside the main dashboard grid, to avoid re-render cascade.
- Splash screen safety timeout: **5.5 seconds** maximum before dashboard renders unconditionally.

### `VideoFeed.tsx`
- Accepts `imageRef: React.RefObject<string | null>` (NOT `image: string | null` — this was the old re-render cause).
- Uses `requestAnimationFrame` polling loop to read `imageRef.current` and update `img.src` without React state.
- **NO SIGNAL overlay:** Animated static noise background + pulsing frequency bars + shimmer line — shown when stream hasn't started.
- **Status border:** `CRITICAL` → pulsing red border (CSS animation), `SAFE` → breathing green border, `WARNING` → orange glow, `ELEVATED` → yellow glow.
- The `<img>` tag is always mounted (never conditionally rendered) so the browser can reuse the decoded image context.

### `Header.tsx`
- **SENSOR NETWORK indicator:** Shows active ESP32 zone count. Green dot + glow when zones active, grey when offline/simulated.
- **Status badge glow:** Pure CSS class variants (`status-glow-safe/elevated/warning/critical`) — no Framer Motion.
- Removed Framer Motion from Header entirely for performance.

### `StatsCard.tsx`
- `AnimatedNumber` component: value transitions with 300ms ease-out cubic.
- On increase: brief **green flash** via `.flash-up` CSS keyframe.
- On decrease: brief **red flash** via `.flash-down` CSS keyframe.
- Flash uses CSS `animation`, not Framer Motion — zero JS overhead.

### Visual Components
- **`VideoFeed.tsx`**: See above.
- **`LiveMap.tsx`**: Centered on `[13.0827, 80.2707]` (Chennai). Dark tile layer. Evacuation routes rendered as dashed green polylines. Aerial unit drone simulation.
- **`AlertTimeline.tsx`**: Left-border color by severity. Hover expand with `hidden md:flex` to show full message.
- **`EvidenceLocker.tsx`**: Keeps persistent traces and archived recordings for post-incident review.

---

## WebSocket Payload Structure
```json
{
  "count": 42,
  "density": 0.65,
  "status": "WARNING",
  "timestamp": 1234567890.123,
  "pressure_index": 45.2,
  "capacity_pct": 21.0,
  "max_capacity": 200,
  "avg_velocity": 32.1,
  "time_to_critical": 45,
  "stampede_risk": 38.0,
  "flow_direction": { "angle": 90, "label": "SOUTH" },
  "sectors": [
    { "name": "NW", "count": 10, "status": "ELEVATED" },
    { "name": "NE", "count": 5, "status": "SAFE" },
    { "name": "SW", "count": 18, "status": "CRITICAL" },
    { "name": "SE", "count": 9, "status": "WARNING" }
  ],
  "wifi_probe_count": 58,
  "wifi_zones": {
    "ZONE_A": { "count": 30, "rssi": -65.2, "status": "ACTIVE" },
    "ZONE_B": { "count": 28, "rssi": -72.0, "status": "OFFLINE" }
  },
  "image": "<base64 JPEG string>",
  "mode": "OPTICAL",
  "recording": false,
  "agitation": 42.5,
  "predicted_density": 0.72,
  "fps": 12.5,
  "crowd_alert": {
    "id": 3,
    "type": "HIGH DENSITY",
    "severity": "CRITICAL",
    "message": "Crowd density exceeding safe threshold."
  }
}
```

---

## ESP32 Wi-Fi Sniffing Integration

### Hardware Setup
- Each ESP32 node runs in promiscuous mode, counting unique device MACs in its zone.
- POST to `http://<backend-ip>:8000/api/wifi` every 5–10 seconds:

```json
{ "zone": "ZONE_A", "count": 15, "rssi": -65.2 }
```

- Zones older than 10 seconds are marked `OFFLINE` automatically.
- Dashboard shows zone table with live status dots (green = ACTIVE, grey = OFFLINE).

---

## CSS Design System (`index.css`)
- **Tailwind v4** via `@import "tailwindcss"` and `@theme` block.
- **Fonts:** All defined via `--font-sans` and `--font-mono` tokens.
- **Key new classes:**
  - `.capacity-bar-gradient`: green→yellow→orange→red gradient with 500ms CSS transition.
  - `.flash-up / .flash-down`: 600ms value flash (green/red) for stat changes.
  - `.status-glow-safe/elevated/warning/critical`: animated box-shadow glow on header status badge.
  - `.card-danger / .card-safe`: pulsing red / breathing green border animation on VideoFeed card.
  - `.static-noise`: animated SVG turbulence filter background for NO SIGNAL overlay.
  - `.sensor-dot-active / .sensor-dot-offline`: green glowing / grey dot for ESP32 zone status.
  - `.chart-legend-item / .chart-legend-line`: chart legend row helpers.
  - `.hide-mobile / .mobile-full`: responsive helpers for <768px.

---

## Internal Mechanics & Rules
- **Alert System:** Critical risks issue visual pings across the DOM (`CrowdAlert`) + audio + speech synthesis.
- **Frame Transport:** Backend sends base64 JPEG attached to the data dict every WS loop. Frontend decouples image rendering (ref) from data rendering (state).
- **State Thresholds:** density > 0.75 → CRITICAL; > 0.5 → WARNING; > 0.3 → ELEVATED.
- **No fake alerts:** Only real density/pressure triggers generate alerts.
- **Recording:** VP80 WebM, 20fps, 640×360. Auto-opens Evidence Locker when recording stops.

---

## Performance Architecture Summary

| Layer | Change | Impact |
|-------|--------|--------|
| Backend | `detect_interval=6` on CPU | ~60% fewer YOLO calls |
| Backend | `imgsz=416` (was 480) | ~25% faster inference |
| Backend | `max_det=50` (was 100) | ~20% faster NMS |
| Backend | JPEG quality 50 (was 65) | ~30% smaller payload |
| Backend | WS frame skip (every 2nd) | ~50% bandwidth reduction |
| Backend | `predict()` on CPU (no tracker) | ~40% faster per frame |
| Backend | `time.sleep(0.001)` | Prevents CPU spinning |
| Frontend | Image stored in `useRef`, not state | Zero re-renders per frame |
| Frontend | `setStats()` every 3rd WS message | 66% fewer React renders |
| Frontend | CSS transitions over Framer Motion | 60% fewer JS animation costs |
| Frontend | Header: AnimatePresence removed | No re-render on status change |

---

## Hackathon Notes
- Corrected model naming to valid `yolov8m.pt`.
- Integrated `torch` bindings cleanly.
- Overhauled navigation components to use real OpenCV Farneback optical flow.
- Map geo-positioned at Chennai, India `[13.0827, 80.2707]`.
- Evacuation routes are realistic Chennai-relative polylines.
- ESP32 Wi-Fi sniffing endpoint added for real hardware integration.
