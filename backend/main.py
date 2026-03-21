# pyre-unsafe
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import time
import glob
import os

from processor import VideoProcessor

app: FastAPI = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure recordings directory exists
if not os.path.exists("backend/recordings"):
    os.makedirs("backend/recordings")

# Mount recordings directory to serve files
app.mount("/recordings", StaticFiles(directory="backend/recordings"), name="recordings")

processor: VideoProcessor = VideoProcessor()
start_time: float = time.time()


@app.on_event("startup")
def startup_event() -> None:
    processor.start()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    processor.stop()


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
    return {
        "uptime_seconds": uptime,
        "model": "YOLOv8n",
        "backend_fps": backend_fps,
        "ws_clients": 1,
        "recording": processor.is_recording,
        "mode": "THERMAL" if processor.heatmap_mode else "OPTICAL"
    }


@app.get("/api/recordings")
async def get_recordings() -> list[str]:
    files: list[str] = glob.glob("backend/recordings/*.mp4") + glob.glob("backend/recordings/*.webm")
    files.sort(key=os.path.getmtime, reverse=True)
    return [os.path.basename(f) for f in files]


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    last_ts: Any = None
    try:
        while True:
            try:
                data_task = asyncio.create_task(websocket.receive_text())
                done, pending = await asyncio.wait({data_task}, timeout=0.01)

                if data_task in done:
                    command: str = data_task.result()
                    cmd_data: dict[str, Any] = json.loads(command)
                    
                    if "action" in cmd_data:
                        action: str = cmd_data["action"]
                        if action == "set_mode":
                            processor.toggle_mode(cmd_data.get("mode", "optical"))
                        elif action == "start_recording":
                            processor.start_recording()
                        elif action == "stop_recording":
                            processor.stop_recording()
                        elif action == "set_geofence":
                            processor.set_geofence(cmd_data.get("points", []))
                else:
                    data_task.cancel()
            except Exception:
                pass

            data = processor.get_latest_data()
            if data is not None and data.get("timestamp") != last_ts:
                try:
                    await websocket.send_json(data)
                    last_ts = data.get("timestamp")
                except RuntimeError:
                    break
            await asyncio.sleep(0.03)
    except WebSocketDisconnect:
        print("Client disconnected")
