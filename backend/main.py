from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import time
import glob
import os
from processor import VideoProcessor

app = FastAPI()

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

processor = VideoProcessor()
start_time = time.time()

@app.on_event("startup")
def startup_event():
    processor.start()

@app.on_event("shutdown")
async def shutdown_event():
    processor.stop()

@app.get("/")
def read_root():
    return {"status": "CrowdPulse Backend Online"}

@app.get("/api/status")
async def get_status():
    """Real system status endpoint for the frontend Header."""
    uptime = int(time.time() - start_time)
    data = processor.get_latest_data()
    return {
        "uptime_seconds": uptime,
        "model": "YOLOv8n",
        "backend_fps": data.get("fps", 0) if data else 0,
        "ws_clients": 1,  # Could track this properly later
        "recording": processor.is_recording,
        "mode": "THERMAL" if processor.heatmap_mode else "OPTICAL"
    }

@app.get("/api/recordings")
async def get_recordings():
    files = glob.glob("backend/recordings/*.mp4") + glob.glob("backend/recordings/*.webm")
    files.sort(key=os.path.getmtime, reverse=True)
    return [os.path.basename(f) for f in files]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Check for incoming messages (commands)
            try:
                data_task = asyncio.create_task(websocket.receive_text())
                done, pending = await asyncio.wait({data_task}, timeout=0.01)

                if data_task in done:
                    command = data_task.result()
                    cmd_data = json.loads(command)
                    
                    if "action" in cmd_data:
                        if cmd_data["action"] == "set_mode":
                            processor.toggle_mode(cmd_data.get("mode", "optical"))
                        elif cmd_data["action"] == "start_recording":
                            processor.start_recording()
                        elif cmd_data["action"] == "stop_recording":
                            processor.stop_recording()
                        elif cmd_data["action"] == "set_geofence":
                            processor.set_geofence(cmd_data.get("points", []))
                else:
                    data_task.cancel()
            except Exception:
                pass

            # Send latest data
            data = processor.get_latest_data()
            if data and data.get("timestamp") != getattr(websocket, "_last_ts", None):
                try:
                    await websocket.send_json(data)
                    websocket._last_ts = data.get("timestamp")
                except RuntimeError:
                    break
            await asyncio.sleep(0.03)
    except WebSocketDisconnect:
        print("Client disconnected")
