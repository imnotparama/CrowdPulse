# pyre-unsafe
"""
CrowdPulse Enterprise v4.1 - Hardware REST API Endpoints
Provides HTTP endpoints for ESP32-S3 ingestion, actuator polling, and hardware diagnostics.
"""

from fastapi import APIRouter, HTTPException
from typing import Any, dict
from hardware.hardware_models import ESP32TelemetryPacket, HardwareState, ActuatorControl
from hardware.esp32_manager import esp32_manager

router: APIRouter = APIRouter(prefix="/api/hardware", tags=["Hardware Telemetry"])


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
async def override_actuators(buzzer: bool, led: str) -> dict[str, str]:
    """Allows manual diagnostic testing of buzzer and RGB LED."""
    if led.upper() not in ("GREEN", "YELLOW", "RED", "OFF"):
        raise HTTPException(status_code=400, detail="Invalid LED color state")
    esp32_manager.buzzer_override = buzzer
    esp32_manager.led_override = led.upper()
    return {"status": "override_applied", "buzzer": str(buzzer), "led": led.upper()}


# Additional alias router mounted at /api/esp32 for firmware convenience
esp32_alias_router: APIRouter = APIRouter(prefix="/api/esp32", tags=["ESP32 Direct"])


@esp32_alias_router.post("")
@esp32_alias_router.post("/telemetry")
async def esp32_direct_ingest(packet: ESP32TelemetryPacket) -> dict[str, Any]:
    """Convenience alias endpoint matching standard micro-controller HTTP paths."""
    return esp32_manager.ingest_packet(packet)
