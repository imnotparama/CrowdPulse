# pyre-unsafe
"""
CrowdPulse Enterprise v4.1 - Physical Sensor Processor
Normalizes raw telemetry from INMP441, AM2302 (DHT22), and PIR sensors into standardized indices.
"""

import math
import time
from collections import deque
from typing import Optional
from hardware.hardware_models import ESP32TelemetryPacket, HardwareState


class SensorProcessor:
    """Processes, filters, and standardizes physical IoT sensor signals."""

    def __init__(self, history_window: int = 30) -> None:
        self.motion_history: deque[bool] = deque(maxlen=history_window)
        self.noise_history: deque[float] = deque(maxlen=history_window)
        self.temp_history: deque[float] = deque(maxlen=history_window)
        self.humidity_history: deque[float] = deque(maxlen=history_window)

    def calculate_heat_stress(self, temp_c: float, humidity_pct: float) -> float:
        """
        Computes Heat Stress Index (apparent temperature) using simplified Steadman/NOAA equation.
        High temperature + high humidity drastically lowers safe venue capacity.
        """
        # Clamp inputs
        t = max(10.0, min(50.0, temp_c))
        rh = max(5.0, min(100.0, humidity_pct))

        # Steadman apparent temperature approximation in Celsius
        e = (rh / 100.0) * 6.105 * math.exp((17.27 * t) / (237.7 + t))
        apparent_temp = t + 0.33 * e - 4.0

        # Normalize to 0-100 environmental heat stress score
        # 20C apparent -> score 10; 30C apparent -> score 40; 40C apparent -> score 85+
        heat_stress_score = max(0.0, min(100.0, (apparent_temp - 18.0) * 3.5))
        return round(heat_stress_score, 1)

    def calculate_noise_index(self, noise_db: float) -> float:
        """
        Normalizes acoustic decibel readings from INMP441 MEMS microphone.
        Ambient quiet: 40-50 dB -> index 0-15
        Moderate crowd murmur: 55-70 dB -> index 20-50
        Loud chanting / elevated agitation: 70-85 dB -> index 50-80
        Severe scream / panic / acoustic surge: 85-105 dB -> index 80-100
        """
        self.noise_history.append(noise_db)
        # 3-sample rolling smoothed noise to filter transient microphone pops
        smoothed_db = sum(self.noise_history) / len(self.noise_history)

        # Baseline 45 dB = 0%, 95 dB = 100%
        normalized = (smoothed_db - 45.0) / (95.0 - 45.0) * 100.0
        return round(max(0.0, min(100.0, normalized)), 1)

    def calculate_motion_activity(self, motion: bool) -> float:
        """
        Computes persistent motion activity percentage from PIR digital output.
        Single passerby -> low score (0-20)
        Rapid turbulent passage / stampede flow -> high persistence score (60-100)
        """
        self.motion_history.append(motion)
        if not self.motion_history:
            return 0.0

        active_ratio = sum(1 for m in self.motion_history if m) / len(self.motion_history)
        return round(active_ratio * 100.0, 1)

    def evaluate_sensor_health(self, packet: ESP32TelemetryPacket, age_seconds: float) -> str:
        """Determines health status based on validity ranges and freshness."""
        if age_seconds > 10.0:
            return "OFFLINE"

        # Validate electrical and physical sensor bounds
        if not (-10.0 <= packet.temperature <= 60.0):
            return "DEGRADED"
        if not (0.0 <= packet.humidity <= 100.0):
            return "DEGRADED"
        if not (30.0 <= packet.noise_db <= 130.0):
            return "DEGRADED"

        return "OPTIMAL"

    def process_packet(
        self,
        packet: ESP32TelemetryPacket,
        current_time: Optional[float] = None,
        latency_ms: float = 15.0
    ) -> HardwareState:
        """Transforms a raw telemetry packet into a standardized HardwareState."""
        now = current_time or time.time()
        pkt_time = packet.timestamp or now
        age = max(0.0, now - pkt_time)

        heat_stress = self.calculate_heat_stress(packet.temperature, packet.humidity)
        noise_idx = self.calculate_noise_index(packet.noise_db)
        motion_score = self.calculate_motion_activity(packet.motion)
        health = self.evaluate_sensor_health(packet, age)

        # Composite hardware sensor threat score (weighted acoustic, motion, environmental)
        sensor_score = (0.45 * noise_idx) + (0.35 * motion_score) + (0.20 * heat_stress)

        status = "CONNECTED" if age <= 10.0 else "TIMEOUT"

        return HardwareState(
            temperature=round(packet.temperature, 1),
            humidity=round(packet.humidity, 1),
            noise_db=round(packet.noise_db, 1),
            motion_detected=packet.motion,
            sos_active=bool(packet.sos or False),
            active_devices=int(packet.active_devices or 0),
            probe_rate=round(float(packet.probe_rate or 0.0), 1),
            sensor_health=health,
            sensor_timestamp=pkt_time,
            buzzer_state=False,  # Updated by fusion engine
            led_state="GREEN",   # Updated by fusion engine
            hardware_status=status,
            heat_stress_index=heat_stress,
            noise_index=noise_idx,
            motion_activity_score=motion_score,
            sensor_score=round(sensor_score, 1),
            latency_ms=round(latency_ms, 1),
            device_id=packet.device_id or "ESP32-S3-01"
        )
