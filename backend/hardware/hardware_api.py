# pyre-unsafe
"""
CrowdPulse Enterprise v4.1 - Hardware REST API Endpoints
Provides HTTP endpoints for ESP32-S3 ingestion, actuator polling, and hardware diagnostics.
"""

from fastapi import APIRouter, HTTPException
from typing import Any, Optional
from pydantic import BaseModel
from hardware.hardware_models import ESP32TelemetryPacket, HardwareState, ActuatorControl
from hardware.esp32_manager import esp32_manager

router: APIRouter = APIRouter(prefix="/api/hardware", tags=["Hardware Telemetry"])


class ActuatorOverridePayload(BaseModel):
    buzzer: Optional[bool] = None
    led: Optional[str] = None
    reset: Optional[bool] = False


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


# Additional alias router mounted at /api/esp32 for firmware convenience
esp32_alias_router: APIRouter = APIRouter(prefix="/api/esp32", tags=["ESP32 Direct"])


@esp32_alias_router.post("")
@esp32_alias_router.post("/telemetry")
async def esp32_direct_ingest(packet: ESP32TelemetryPacket) -> dict[str, Any]:
    """Convenience alias endpoint matching standard micro-controller HTTP paths."""
    return esp32_manager.ingest_packet(packet)

