# pyre-unsafe
from typing import Any
from collections import defaultdict
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
import json
import time

from processor import VideoProcessor

BASE_DIR = Path(__file__).resolve().parent
RECORDINGS_DIR = BASE_DIR / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# ── Wi-Fi Sensor Network ──────────────────────────────────────────────────────
# Stores live ESP32 zone data: {zone_name: {count, rssi, timestamp}}
wifi_zones: dict[str, Any] = defaultdict(dict)

processor: VideoProcessor = VideoProcessor()
processor.wifi_zones = wifi_zones
start_time: float = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    processor.start()
    yield
    processor.stop()


app: FastAPI = FastAPI(lifespan=lifespan)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount recordings directory to serve files
app.mount("/recordings", StaticFiles(directory=str(RECORDINGS_DIR)), name="recordings")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"status": "CrowdPulse Backend Online"}


@app.get("/api/status")
async def get_status() -> dict[str, Any]:
    """Real system status endpoint for the frontend Header."""
    uptime: int = int(time.time() - start_time)
    data = processor.get_latest_data()
    backend_fps: float = 0.0
    if data is not None:
        backend_fps = float(data.get("fps", 0))

    # Count active ESP32 zones
    now_ts = time.time()
    active_zones = sum(
        1 for z in list(wifi_zones.values())
        if now_ts - z.get("timestamp", 0) <= 10
    )

    return {
        "uptime_seconds": uptime,
        "model": "YOLOv8m",
        "backend_fps": backend_fps,
        "ws_clients": 1,
        "recording": processor.is_recording,
        "mode": "THERMAL" if processor.heatmap_mode else "OPTICAL",
        "active_wifi_zones": active_zones
    }


@app.get("/api/recordings")
async def get_recordings() -> list[str]:
    files = list(RECORDINGS_DIR.glob("*.mp4")) + list(RECORDINGS_DIR.glob("*.webm"))
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    return [f.name for f in files]


# ── Wi-Fi ESP32 Endpoints ─────────────────────────────────────────────────────

class WifiZonePayload(BaseModel):
    zone: str
    count: int
    rssi: float


@app.post("/api/wifi")
async def receive_wifi_data(payload: WifiZonePayload) -> dict[str, Any]:
    """Receive data from ESP32 sniffing nodes."""
    wifi_zones[payload.zone] = {
        "count": payload.count,
        "rssi": payload.rssi,
        "timestamp": time.time()
    }
    return {"status": "ok", "zone": payload.zone}


@app.get("/api/wifi/status")
async def get_wifi_status() -> dict[str, Any]:
    """Returns total device count and per-zone breakdown."""
    now_ts = time.time()
    total = 0
    zones_out: dict[str, Any] = {}

    for zone_name, zone_data in list(wifi_zones.items()):
        age = now_ts - zone_data.get("timestamp", 0)
        status = "OFFLINE" if age > 10 else "ACTIVE"
        count = int(zone_data.get("count", 0))
        if status == "ACTIVE":
            total += count
        zones_out[zone_name] = {
            "count": count,
            "rssi": float(zone_data.get("rssi", 0)),
            "status": status
        }

    return {
        "total_devices": total,
        "zones": zones_out,
        "active_zone_count": sum(1 for z in zones_out.values() if z["status"] == "ACTIVE")
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()

    async def reader():
        while True:
            try:
                command = await websocket.receive_text()
                cmd_data = json.loads(command)
                action = cmd_data.get("action")
                if action == "set_mode":
                    processor.toggle_mode(cmd_data.get("mode", "optical"))
                elif action == "start_recording":
                    processor.start_recording()
                elif action == "stop_recording":
                    processor.stop_recording()
                elif action == "set_geofence":
                    processor.set_geofence(cmd_data.get("points", []))
            except WebSocketDisconnect:
                break
            except Exception:
                pass

    async def writer():
        last_ts = None
        while True:
            try:
                data = processor.get_latest_data()
                if data is not None and data.get("timestamp") != last_ts:
                    await websocket.send_json(data)
                    last_ts = data.get("timestamp")
                await asyncio.sleep(0.033)
            except WebSocketDisconnect:
                break
            except RuntimeError:
                break
            except Exception:
                break

    try:
        reader_task = asyncio.create_task(reader())
        writer_task = asyncio.create_task(writer())
        done, pending = await asyncio.wait(
            {reader_task, writer_task},
            return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
    except WebSocketDisconnect:
        print("[CrowdPulse] Client disconnected")
