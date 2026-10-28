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
from hardware.hardware_api import router as hardware_router, esp32_alias_router
from hardware.esp32_manager import esp32_manager

BASE_DIR = Path(__file__).resolve().parent
RECORDINGS_DIR = BASE_DIR / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# ── Wi-Fi Sensor Network ──────────────────────────────────────────────────────
# Stores live ESP32 zone data: {zone_name: {count, rssi, timestamp}}
wifi_zones: dict[str, Any] = defaultdict(dict)

processor: VideoProcessor = VideoProcessor()
processor.wifi_zones = wifi_zones
esp32_manager.wifi_zones = wifi_zones
start_time: float = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    processor.start()
    yield
    processor.stop()


app: FastAPI = FastAPI(lifespan=lifespan)

# Mount Hardware IoT Routers
app.include_router(hardware_router)
app.include_router(esp32_alias_router)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
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

    hw_state = esp32_manager.get_hardware_state()

    return {
        "uptime_seconds": uptime,
        "model": getattr(processor, "model_name", "yolov8m.pt").replace(".pt", "").upper(),
        "backend_fps": backend_fps,
        "ws_clients": 1,
        "recording": processor.is_recording,
        "mode": "THERMAL" if processor.heatmap_mode else "OPTICAL",
        "active_wifi_zones": active_zones,
        "active_video": getattr(processor, "active_video_id", "demo.mp4"),
        "active_video_name": getattr(processor, "active_video_name", "Demo 1: Main Concourse"),
        "is_simulation": False,
        "hardware_status": hw_state.hardware_status,
        "sensor_health": hw_state.sensor_health,
        "temperature": hw_state.temperature,
        "noise_db": hw_state.noise_db
    }


@app.get("/api/recordings")
async def get_recordings() -> list[str]:
    files = list(RECORDINGS_DIR.glob("*.mp4")) + list(RECORDINGS_DIR.glob("*.webm"))
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    return [f.name for f in files]


# ── Demo Video Management Endpoints ──────────────────────────────────────────

class VideoSelectPayload(BaseModel):
    video_id: str


@app.get("/api/videos")
async def get_videos() -> list[dict[str, Any]]:
    """Returns list of all available real demo videos with metadata and active status."""
    return processor.get_available_videos()


@app.post("/api/videos/select")
async def select_video(payload: VideoSelectPayload) -> dict[str, Any]:
    """Switch active video feed to the specified video ID or sector name."""
    success = processor.switch_video(payload.video_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Video '{payload.video_id}' not found or could not be opened.")
    return {
        "status": "ok",
        "active_video": processor.active_video_id,
        "active_video_name": processor.active_video_name,
    }


# ── Phone Camera Stream Endpoints ─────────────────────────────────────────────

class PhoneConnectPayload(BaseModel):
    url: str


@app.post("/api/phone/connect")
async def connect_phone(payload: PhoneConnectPayload) -> dict[str, Any]:
    """Connect to a phone camera stream (IP Webcam, DroidCam, IP Camera Lite, etc.)."""
    success, msg = processor.connect_phone_stream(payload.url)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {
        "status": "ok",
        "message": msg,
        "active_video": processor.active_video_id,
        "active_video_name": processor.active_video_name,
        "stream_url": getattr(processor, "phone_stream_url", payload.url),
    }


@app.get("/api/phone/status")
async def get_phone_status() -> dict[str, Any]:
    """Returns phone stream connection status."""
    return {
        "is_connected": getattr(processor, "_using_phone_stream", False),
        "stream_url": getattr(processor, "phone_stream_url", None),
        "active_video": processor.active_video_id,
        "active_video_name": processor.active_video_name,
    }


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
                elif action in ("switch_video", "set_video_source", "set_camera", "select_camera"):
                    vid_target = cmd_data.get("video_id") or cmd_data.get("camera") or cmd_data.get("cam") or cmd_data.get("source")
                    if vid_target:
                        processor.switch_video(str(vid_target))
                elif action in ("connect_phone", "set_phone_stream"):
                    phone_url = cmd_data.get("url")
                    if phone_url:
                        ok, msg = processor.connect_phone_stream(phone_url)
                        await websocket.send_json({"type": "phone_connect_result", "success": ok, "message": msg})
                elif action == "hardware_override":
                    buzzer = cmd_data.get("buzzer")
                    led = cmd_data.get("led")
                    esp32_manager.override_actuators(buzzer=buzzer, led=led)
                elif action == "hardware_reset":
                    esp32_manager.reset_overrides()
                elif action == "hardware_selftest":
                    report = esp32_manager.run_self_test()
                    await websocket.send_json({"type": "selftest_result", "report": report})
                elif action in ("calibrate_hardware", "calibrate_environment", "calibrate"):
                    res = esp32_manager.calibrate_environment()
                    await websocket.send_json({"type": "calibration_result", "status": "ok", "report": res})
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
