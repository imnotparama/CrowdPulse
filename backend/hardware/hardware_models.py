# pyre-unsafe
"""
CrowdPulse Enterprise v4.1 - Physical Hardware Models
Defines typed models for ESP32-S3 telemetry, sensor state, actuator commands, and sensor fusion outputs.
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field
import time


class ESP32TelemetryPacket(BaseModel):
    """Raw telemetry payload sent continuously by physical ESP32-S3 over Wi-Fi or USB Serial."""
    temperature: Optional[float] = Field(25.0, description="Ambient temperature in degrees Celsius from AM2302 (DHT22)")
    humidity: Optional[float] = Field(50.0, description="Relative humidity percentage from AM2302 (DHT22)")
    noise_db: Optional[float] = Field(45.0, description="Noise level in decibels from INMP441 MEMS microphone")
    motion: Optional[bool] = Field(False, description="Digital motion detection trigger from PIR sensor or SOS button")
    sos: Optional[bool] = Field(False, description="Emergency SOS panic button trigger")
    active_devices: Optional[int] = Field(None, description="Number of unique smartphone probe requests sniffed in window")
    probe_rate: Optional[float] = Field(None, description="Probe requests captured per second")
    device_id: Optional[str] = Field("ESP32-S3-01", description="Unique identifier of the IoT sensing node")
    timestamp: Optional[float] = Field(default_factory=time.time, description="Epoch timestamp of sampling")


class ActuatorControl(BaseModel):
    """Actuator feedback sent to physical ESP32-S3."""
    buzzer: bool = Field(False, description="Active buzzer triggered on CRITICAL threat")
    led_color: Literal["GREEN", "YELLOW", "RED", "OFF"] = Field("GREEN", description="RGB Status LED mode")


class HardwareState(BaseModel):
    """Standardized and processed hardware telemetry representation."""
    temperature: float = 24.5
    humidity: float = 52.0
    noise_db: float = 58.0
    motion_detected: bool = False
    sos_active: bool = False
    active_devices: int = 0
    probe_rate: float = 0.0
    sensor_health: Literal["OPTIMAL", "DEGRADED", "OFFLINE"] = "OPTIMAL"
    sensor_timestamp: float = Field(default_factory=time.time)
    buzzer_state: bool = False
    led_state: Literal["GREEN", "YELLOW", "RED"] = "GREEN"
    hardware_status: Literal["CONNECTED", "TIMEOUT", "SIMULATED"] = "SIMULATED"
    heat_stress_index: float = 24.8
    noise_index: float = 28.0
    motion_activity_score: float = 15.0
    sensor_score: float = 22.0
    latency_ms: float = 12.0
    device_id: str = "ESP32-S3-01"
    connection_type: str = "SIMULATED"


class FusionResult(BaseModel):
    """Result of combining computer vision models with physical hardware inputs."""
    fusion_confidence: float = Field(0.92, description="Combined multi-sensor confidence score (0.0 to 1.0)")
    environment_risk: float = Field(18.0, description="Risk attributed to heat stress, humidity, and acoustic surge (0-100)")
    combined_threat_score: float = Field(20.0, description="Fused threat index across vision and hardware (0-100)")
    threat_level: Literal["SAFE", "ELEVATED", "WARNING", "CRITICAL"] = "SAFE"
    vision_weight: float = Field(0.70, description="Dynamic weighting of computer vision inputs")
    hardware_weight: float = Field(0.30, description="Dynamic weighting of physical sensor inputs")
    fusion_narrative: str = Field("Nominal conditions across all visual and environmental channels.", description="AI operator narrative")
    crowd_alert: Optional[dict] = None
