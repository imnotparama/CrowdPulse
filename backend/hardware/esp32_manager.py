# pyre-unsafe
"""
CrowdPulse Enterprise v4.1 - ESP32 Hardware Manager
Maintains connection lifecycle, heartbeat tracking, thread-safe telemetry caching,
actuator dispatch, and realistic fallback simulation for ESP32-S3 nodes.
"""

import math
import random
import threading
import time
from typing import Optional
from hardware.hardware_models import ESP32TelemetryPacket, HardwareState, ActuatorControl
from hardware.sensor_processor import SensorProcessor


class ESP32Manager:
    """Manages physical ESP32-S3 telemetry ingestion and hardware states."""

    def __init__(self, timeout_seconds: float = 10.0) -> None:
        self.timeout_seconds: float = timeout_seconds
        self.processor: SensorProcessor = SensorProcessor()
        self.lock: threading.Lock = threading.Lock()

        # Telemetry storage
        self.last_packet: Optional[ESP32TelemetryPacket] = None
        self.last_packet_time: float = 0.0
        self.has_physical_device: bool = False

        # Actuators
        self.buzzer_override: Optional[bool] = None
        self.led_override: Optional[str] = None
        self.actuator_control: ActuatorControl = ActuatorControl(buzzer=False, led_color="GREEN")

    def ingest_packet(self, packet: ESP32TelemetryPacket) -> dict[str, str]:
        """Receives a telemetry packet from physical ESP32-S3 over Wi-Fi."""
        with self.lock:
            self.last_packet = packet
            self.last_packet_time = time.time()
            self.has_physical_device = True

            # Return actuator feedback to ESP32
            return {
                "status": "ok",
                "buzzer": "ON" if self.actuator_control.buzzer else "OFF",
                "led": self.actuator_control.led_color
            }

    def set_actuators(self, buzzer: bool, led_color: str) -> None:
        """Sets current actuator command to be dispatched to ESP32."""
        with self.lock:
            final_buzzer = self.buzzer_override if self.buzzer_override is not None else buzzer
            final_led = self.led_override if self.led_override is not None else led_color
            self.actuator_control = ActuatorControl(buzzer=final_buzzer, led_color=final_led)

    def get_hardware_state(self) -> HardwareState:
        """
        Retrieves the latest processed HardwareState.
        Uses physical ESP32 packet if active and fresh (<10s).
        Otherwise seamlessly provides high-fidelity simulation so dashboard never shows blank telemetry.
        """
        now = time.time()

        with self.lock:
            if self.has_physical_device and (now - self.last_packet_time <= self.timeout_seconds):
                # Physical hardware connected and sending fresh data
                state = self.processor.process_packet(
                    packet=self.last_packet,
                    current_time=now,
                    latency_ms=max(8.0, (now - self.last_packet_time) * 1000.0)
                )
                state.hardware_status = "CONNECTED"
                state.buzzer_state = self.actuator_control.buzzer
                state.led_state = self.actuator_control.led_color
                return state

            elif self.has_physical_device and (now - self.last_packet_time > self.timeout_seconds):
                # Physical hardware dropped connection
                state = self.processor.process_packet(
                    packet=self.last_packet,
                    current_time=now,
                    latency_ms=999.0
                )
                state.hardware_status = "TIMEOUT"
                state.sensor_health = "DEGRADED"
                state.buzzer_state = self.actuator_control.buzzer
                state.led_state = self.actuator_control.led_color
                return state

            else:
                # Simulation Mode (Provides realistic drifting physical metrics out-of-the-box)
                sim_temp = 26.5 + 2.0 * math.sin(now / 45.0) + random.uniform(-0.15, 0.15)
                sim_humidity = 58.0 + 8.0 * math.cos(now / 60.0) + random.uniform(-0.5, 0.5)
                # Realistic crowd acoustic baseline with occasional bursts
                sim_noise = 62.0 + 10.0 * math.sin(now / 20.0) + random.uniform(-2.0, 3.0)
                sim_motion = (math.sin(now / 5.0) > -0.2) and (random.random() > 0.25)

                sim_packet = ESP32TelemetryPacket(
                    temperature=round(sim_temp, 1),
                    humidity=round(sim_humidity, 1),
                    noise_db=round(sim_noise, 1),
                    motion=sim_motion,
                    device_id="ESP32-S3-SIM",
                    timestamp=now
                )

                state = self.processor.process_packet(
                    packet=sim_packet,
                    current_time=now,
                    latency_ms=12.0 + random.uniform(-1.5, 2.5)
                )
                state.hardware_status = "SIMULATED"
                state.buzzer_state = self.actuator_control.buzzer
                state.led_state = self.actuator_control.led_color
                return state


# Singleton instance for system-wide access
esp32_manager = ESP32Manager()
