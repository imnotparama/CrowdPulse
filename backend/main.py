from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import asyncio
import json
import threading
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
# Note: In production, Nginx would handle this, but for local hackathon demo, this is great.
app.mount("/recordings", StaticFiles(directory="backend/recordings"), name="recordings")

processor = VideoProcessor()

@app.on_event("startup")
def startup_event():
    processor.start()

@app.on_event("shutdown")
async def shutdown_event():
    processor.stop()

@app.get("/")
def read_root():
    return {"status": "CrowdPulse Backend Online"}

@app.get("/api/recordings")
async def get_recordings():
    # List all video files in record directory, sorted by newest
    # Support both mp4 and webm
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
                # Use a short timeout to check for messages, then send data
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
            if data:
                try:
                    await websocket.send_json(data)
                except RuntimeError:
                    break # Connection closed
            await asyncio.sleep(0.1) # limit update rate
    except WebSocketDisconnect:
        print("Client disconnected")

@app.on_event("startup")
async def startup_event():
    # Start processing thread
    processor.start()

@app.on_event("shutdown")
async def shutdown_event():
    processor.stop()
