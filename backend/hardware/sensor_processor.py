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
        self.ambient_baseline_db: float = 55.0

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
        heat_stress_score = max(0.0, min(100.0, (apparent_temp - 18.0) * 3.5))
        return round(heat_stress_score, 1)

    def calculate_noise_index(self, noise_db: float, baseline_db: Optional[float] = None) -> tuple[float, float, float]:
        """
        Normalizes acoustic decibel readings relative to the calibrated ambient baseline:
        - baseline_db: Calibrated room background noise (e.g., 55 dB in library, 75 dB in active lab)
        - acoustic_surge: Decibels above ambient room background
        - Normal ambient room noise -> index 0-15% (Status SAFE / Green)
        - Moderate agitation / crowd murmur (+10 dB surge) -> index 45-65% (Status CAUTION / Yellow)
        - Panic shout / distress scream / crush roar (+18 dB surge) -> index 80-100% (Status SURGE RISK / Red Siren)
        """
        if baseline_db is not None and baseline_db >= 35.0:
            self.ambient_baseline_db = baseline_db

        self.noise_history.append(noise_db)
        smoothed_db = sum(self.noise_history) / len(self.noise_history)

        # Adaptive background baseline tracking during calm periods
        if smoothed_db < (self.ambient_baseline_db + 4.0) and baseline_db is None and smoothed_db > 35.0:
            self.ambient_baseline_db = (0.995 * self.ambient_baseline_db) + (0.005 * smoothed_db)

        # Decibel surge above ambient room background
        acoustic_surge = max(0.0, smoothed_db - self.ambient_baseline_db)

        # Normalize relative to ambient surge (+24 dB surge = 100% agitation)
        normalized = min(100.0, (acoustic_surge / 24.0) * 95.0)

        # Absolute safeguard for genuinely loud sound pressure levels regardless of baseline
        if smoothed_db >= 94.0:
            normalized = max(normalized, 85.0)

        return round(normalized, 1), round(self.ambient_baseline_db, 1), round(acoustic_surge, 1)

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
        noise_idx, base_db, surge_db = self.calculate_noise_index(packet.noise_db, packet.baseline_db)
        motion_score = self.calculate_motion_activity(packet.motion)
        health = self.evaluate_sensor_health(packet, age)

        # Dynamic ambient thresholds for UI & Actuators
        caution_th = round(max(70.0, base_db + 10.0), 1)
        surge_th = round(max(82.0, base_db + 18.0), 1)

        # Composite hardware sensor threat score (weighted acoustic, motion, environmental)
        sensor_score = (0.45 * noise_idx) + (0.35 * motion_score) + (0.20 * heat_stress)

        status = "CONNECTED" if age <= 10.0 else "TIMEOUT"

        return HardwareState(
            temperature=round(packet.temperature, 1),
            humidity=round(packet.humidity, 1),
            noise_db=round(packet.noise_db, 1),
            ambient_baseline_db=base_db,
            acoustic_surge_db=surge_db,
            caution_threshold_db=caution_th,
            surge_threshold_db=surge_th,
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
