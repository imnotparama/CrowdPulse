# pyre-unsafe
"""
CrowdPulse Enterprise v4.1 - Hardware REST API Endpoints
Provides HTTP endpoints for ESP32-S3 ingestion, actuator polling, and hardware diagnostics.
"""

import socket
from fastapi import APIRouter, HTTPException
from typing import Any, Optional
from pydantic import BaseModel
from hardware.hardware_models import ESP32TelemetryPacket, HardwareState, ActuatorControl
from hardware.esp32_manager import esp32_manager
from hardware.serial_manager import serial_manager

router: APIRouter = APIRouter(prefix="/api/hardware", tags=["Hardware Telemetry"])


class ActuatorOverridePayload(BaseModel):
    buzzer: Optional[bool] = None
    led: Optional[str] = None
    reset: Optional[bool] = False


class SerialConnectPayload(BaseModel):
    port: str
    baudrate: Optional[int] = 115200


@router.post("/telemetry")
async def ingest_telemetry(packet: ESP32TelemetryPacket) -> dict[str, Any]:
    """
    Ingests continuous telemetry packets from ESP32-S3 over Wi-Fi.
    Returns real-time actuator directives (Buzzer and RGB LED states).
    """
    response = esp32_manager.ingest_packet(packet)
    return response


@router.get("/status")
async def get_hardware_status() -> HardwareState:
    """Returns the latest processed hardware state, sensor metrics, and latency."""
    return esp32_manager.get_hardware_state()


@router.get("/actuators")
async def get_actuator_state() -> ActuatorControl:
    """Returns current active actuator commands for ESP32 polling."""
    return esp32_manager.actuator_control


@router.post("/actuators/override")
async def override_actuators(payload: ActuatorOverridePayload) -> dict[str, str]:
    """Allows manual diagnostic testing and emergency dispatch of buzzer and RGB LED."""
    if payload.reset:
        return esp32_manager.reset_overrides()

    valid_leds = ("GREEN", "YELLOW", "RED", "OFF", "STROBE", "POLICE", "AUTO")
    if payload.led and payload.led.upper() not in valid_leds:
        raise HTTPException(status_code=400, detail=f"Invalid LED state. Valid options: {valid_leds}")

    if payload.led and payload.led.upper() == "AUTO":
        return esp32_manager.reset_overrides()

    return esp32_manager.override_actuators(buzzer=payload.buzzer, led=payload.led)


@router.post("/actuators/reset")
async def reset_actuators() -> dict[str, str]:
    """Resets actuators back to closed-loop AI fused automatic mode."""
    return esp32_manager.reset_overrides()


@router.post("/self-test")
async def run_hardware_self_test() -> dict[str, Any]:
    """
    Executes a high-precision multi-sensor diagnostic self-test:
    checks INMP441 MEMS, AM2302 (DHT22), PIR Motion, RGB LED, and Active Buzzer.
    """
    return esp32_manager.run_self_test()


@router.post("/calibrate")
async def calibrate_hardware_environment() -> dict[str, Any]:
    """
    Triggers ambient environmental acoustic calibration on physical IoT hardware node.
    Profiles the room's noise floor for 3 seconds and updates dynamic thresholds.
    """
    return esp32_manager.calibrate_environment()


# ── Serial Port Management Endpoints (USB COM Port) ──

@router.get("/serial/ports")
async def list_serial_ports() -> list[dict[str, str]]:
    """Lists available USB serial COM ports detected on the host system."""
    return serial_manager.list_ports()


@router.post("/serial/connect")
async def connect_serial_port(payload: SerialConnectPayload) -> dict[str, Any]:
    """Connects to a USB serial COM port for microcontroller telemetry streaming."""
    baud = payload.baudrate or 115200
    res = serial_manager.connect(port=payload.port, baudrate=baud)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message", "Failed to connect to serial port"))
    return res


@router.post("/serial/disconnect")
async def disconnect_serial_port() -> dict[str, Any]:
    """Disconnects the active USB serial COM port."""
    return serial_manager.disconnect()


@router.get("/serial/status")
async def get_serial_status() -> dict[str, Any]:
    """Returns real-time status of USB serial connection and packets received."""
    return serial_manager.get_status()


# ── Network Setup Info Endpoint (For ESP32 Wi-Fi Config) ──

@router.get("/network/info")
async def get_network_info() -> dict[str, Any]:
    """Returns local host IP and endpoint paths to configure physical ESP32 Wi-Fi firmware."""
    host_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        host_ip = s.getsockname()[0]
        s.close()
    except Exception:
        try:
            host_ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            pass

    return {
        "host_ip": host_ip,
        "port": 8000,
        "telemetry_url": f"http://{host_ip}:8000/api/hardware/telemetry",
        "esp32_alias_url": f"http://{host_ip}:8000/api/esp32/telemetry",
        "status_url": f"http://{host_ip}:8000/api/hardware/status",
        "ws_url": f"ws://{host_ip}:8000/ws"
    }


# Additional alias router mounted at /api/esp32 for firmware convenience
esp32_alias_router: APIRouter = APIRouter(prefix="/api/esp32", tags=["ESP32 Direct"])


@esp32_alias_router.post("")
@esp32_alias_router.post("/telemetry")
async def esp32_direct_ingest(packet: ESP32TelemetryPacket) -> dict[str, Any]:
    """Convenience alias endpoint matching standard micro-controller HTTP paths."""
    return esp32_manager.ingest_packet(packet)


