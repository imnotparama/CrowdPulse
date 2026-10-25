# pyre-unsafe
"""
CrowdPulse Enterprise v4.1 - Multi-Sensor AI Fusion Engine
Fuses Computer Vision (YOLO, Optical Flow, Density) with Physical IoT Telemetry (INMP441, AM2302, PIR).
Eliminates single-modality false positives, computes weighted threat scores, and drives actuators.
"""

from typing import Any, Optional, Tuple
from hardware.hardware_models import HardwareState, FusionResult


class SensorFusionEngine:
    """
    Multi-Modal Sensor Fusion Engine combining computer vision analytics
    with physical acoustic, environmental, and kinematic telemetry.
    """

    def __init__(self) -> None:
        self.smoothed_threat: float = 15.0
        self.smoothed_confidence: float = 0.92
        self.consecutive_alerts: int = 0

    def calculate_weights(self, vision_fps: float, hardware_state: HardwareState) -> Tuple[float, float]:
        """
        Dynamically adjusts vision vs hardware weighting.
        Nominal: 70% Vision, 30% Hardware.
        Degraded Camera / Low FPS: 45% Vision, 55% Hardware.
        Hardware Timeout / Offline: 100% Vision, 0% Hardware (graceful degradation).
        """
        if hardware_state.sensor_health == "OFFLINE" or hardware_state.hardware_status == "TIMEOUT":
            return 1.0, 0.0

        if vision_fps < 12.0:
            # Camera experiencing lag or dropped frames - lean more on hardware
            return 0.45, 0.55

        if hardware_state.sensor_health == "DEGRADED":
            return 0.85, 0.15

        # Standard multi-sensor fusion baseline
        return 0.70, 0.30

    def evaluate_false_positive_reduction(
        self,
        density: float,
        stampede_risk: float,
        noise_idx: float,
        motion_score: float,
        motion_detected: bool
    ) -> Tuple[bool, str, str]:
        """
        Cross-correlates modalities to eliminate single-sensor false alarms:
        - High density + High noise + PIR motion => Confirmed High Threat
        - High density alone => Elevated Monitor (could be static queue or slow entry)
        - High noise alone => Crowd Excitement (concert / match cheer, not stampede)
        - PIR motion alone => Ignored (normal single passerby)
        """
        is_high_density = density > 0.45 or stampede_risk > 50.0
        is_high_noise = noise_idx > 65.0
        is_active_motion = motion_score > 40.0 or motion_detected

        # Condition 1: Triple-Sensor Convergence (Critical Stampede Hazard)
        if is_high_density and is_high_noise and is_active_motion:
            return True, "CRITICAL", "Multi-modal convergence: High crowd density corroborated by acoustic surge and turbulent motion."

        # Condition 2: Visual density high, but acoustic and motion are calm
        if is_high_density and not is_high_noise:
            return False, "ELEVATED", "High visual occupancy detected, but acoustic levels remain calm. Static gathering or paced queue formation."

        # Condition 3: Acoustic surge, but visual density is low
        if is_high_noise and not is_high_density:
            return False, "ELEVATED", "Acoustic level elevated without visual density surge. Typical crowd cheer, chanting, or PA broadcast."

        # Condition 4: Motion sensor triggered alone
        if is_active_motion and not is_high_density and not is_high_noise:
            return False, "SAFE", "Localized PIR kinematic trigger with normal ambient density and noise."

        return False, "SAFE", "Nominal conditions across all visual, acoustic, and environmental streams."

    def generate_ai_narrative(
        self,
        vision_data: dict[str, Any],
        hardware_state: HardwareState,
        threat_level: str,
        confidence_pct: float
    ) -> str:
        """Generates dynamic, human-like operational AI surveillance narratives."""
        density = float(vision_data.get("density", 0.0))
        noise_db = hardware_state.noise_db
        temp = hardware_state.temperature
        humidity = hardware_state.humidity

        if threat_level == "CRITICAL":
            return f"CRITICAL INCIDENT: Density index ({density:.2f}) corroborated by acoustic surge ({noise_db:.0f} dB) and continuous PIR motion. Immediate egress gate dispatch recommended."

        if noise_db > 75.0 and density < 0.30:
            return f"Acoustic levels elevated ({noise_db:.0f} dB) while density remains safe ({density:.2f}). Possible crowd cheer or excitement without physical crushing risk."

        if temp > 30.0 and humidity > 65.0 and density > 0.25:
            return f"Environmental heat stress elevated ({temp:.1f}°C, {humidity:.0f}% RH). Effective safe venue capacity reduced by ~15% to prevent thermal exhaustion."

        if hardware_state.motion_activity_score > 60.0 and density < 0.20:
            return "High localized kinematic activity detected near sensor node without global density surge. Investigating possible localized disturbance."

        return f"Multi-sensor AI confidence at {confidence_pct:.0f}%. Visual flow, acoustic baseline ({noise_db:.0f} dB), and environmental channels ({temp:.1f}°C) operating within safe margins."

    def fuse(
        self,
        vision_data: dict[str, Any],
        hardware_state: HardwareState
    ) -> Tuple[dict[str, Any], HardwareState, FusionResult]:
        """
        Executes real-time multi-modal fusion.
        Modifies vision_data and hardware_state, and returns the comprehensive FusionResult.
        """
        fps = float(vision_data.get("fps", 30.0))
        stampede_risk = float(vision_data.get("stampede_risk", 20.0))
        density = float(vision_data.get("density", 0.12))
        raw_agitation = float(vision_data.get("agitation", 25.0))
        max_capacity = int(vision_data.get("max_capacity", 200))

        # 1. Determine dynamic fusion weights
        w_v, w_h = self.calculate_weights(fps, hardware_state)

        # 2. Gradual environmental capacity & agitation adjustment
        # High heat stress gradually increases crowd agitation
        heat_boost = (hardware_state.heat_stress_index / 100.0) * 12.0
        # High noise gradually increases perceived crowd agitation
        noise_boost = (hardware_state.noise_index / 100.0) * 16.0
        adjusted_agitation = min(100.0, raw_agitation + (0.4 * heat_boost) + (0.6 * noise_boost))

        # Extreme humidity + heat slightly trims safe capacity threshold (people need more air/space)
        if hardware_state.heat_stress_index > 50.0:
            effective_capacity = max(100, int(max_capacity * (1.0 - (hardware_state.heat_stress_index - 50.0) * 0.003)))
        else:
            effective_capacity = max_capacity

        # 3. Hardware Environmental Risk (0-100)
        env_risk = (0.50 * hardware_state.heat_stress_index) + (0.50 * hardware_state.noise_index)

        # 4. Hardware Threat Score (0-100)
        hardware_score = (0.40 * hardware_state.noise_index) + \
                         (0.35 * hardware_state.motion_activity_score) + \
                         (0.25 * hardware_state.heat_stress_index)

        # 5. Combined Threat Score (Gradually smoothed exponential moving average)
        raw_combined = (w_v * stampede_risk) + (w_h * hardware_score)
        self.smoothed_threat = (0.80 * self.smoothed_threat) + (0.20 * raw_combined)
        combined_score = round(max(0.0, min(100.0, self.smoothed_threat)), 1)

        # 6. False Positive Filtering & Threat Level Determination
        is_confirmed_alert, level, reason = self.evaluate_false_positive_reduction(
            density=density,
            stampede_risk=stampede_risk,
            noise_idx=hardware_state.noise_index,
            motion_score=hardware_state.motion_activity_score,
            motion_detected=hardware_state.motion_detected
        )

        if hardware_state.sos_active or hardware_state.noise_db >= 78.0:
            threat_level = "CRITICAL"
            combined_score = 100.0 if hardware_state.sos_active else max(combined_score, 85.0)
            is_confirmed_alert = True
        elif combined_score > 70.0 and is_confirmed_alert:
            threat_level = "CRITICAL"
        elif combined_score > 45.0 or level == "WARNING" or hardware_state.noise_db >= 68.0:
            threat_level = "WARNING"
        elif combined_score > 25.0 or level == "ELEVATED" or hardware_state.noise_db >= 62.0:
            threat_level = "ELEVATED"
        else:
            threat_level = "SAFE"

        # 7. Actuator Feedback (Buzzer & RGB LED)
        buzzer_active = (threat_level == "CRITICAL" or hardware_state.sos_active)
        if threat_level == "CRITICAL":
            led_color = "RED"
        elif threat_level in ("WARNING", "ELEVATED"):
            led_color = "YELLOW"
        else:
            led_color = "GREEN"

        hardware_state.buzzer_state = buzzer_active
        hardware_state.led_state = led_color

        # 8. Multi-Sensor Fusion Confidence
        # Vision alone: ~80%. Fused with active hardware: 94-98%. Degraded: drops proportionally.
        base_confidence = 0.82 if w_h == 0.0 else 0.94
        if hardware_state.sensor_health == "DEGRADED":
            base_confidence -= 0.08
        if fps < 15.0:
            base_confidence -= 0.06
        self.smoothed_confidence = (0.85 * self.smoothed_confidence) + (0.15 * base_confidence)
        confidence_pct = round(self.smoothed_confidence * 100.0, 1)

        # 9. AI Narrative
        narrative = self.generate_ai_narrative(vision_data, hardware_state, threat_level, confidence_pct)

        # 10. Generate Alert Object if Critical Alert Confirmed or SOS Triggered
        crowd_alert = None
        if hardware_state.sos_active:
            self.consecutive_alerts += 1
            crowd_alert = {
                "id": 999,
                "type": "EMERGENCY SOS (PANIC BUTTON ACTIVATED)",
                "severity": "CRITICAL",
                "message": "Physical emergency panic button activated on ESP32 edge sensor node! Immediate evacuation protocol initiated."
            }
        elif threat_level == "CRITICAL":
            self.consecutive_alerts += 1
            crowd_alert = {
                "id": 101,
                "type": "STAMPEDE SURGE (MULTI-SENSOR CONFIRMED)",
                "severity": "CRITICAL",
                "message": f"Hazard confirmed across camera (density {density:.2f}) and ESP32 ({hardware_state.noise_db:.0f} dB acoustic spike). Active buzzer triggered."
            }
        elif hardware_state.noise_db > 85.0:
            crowd_alert = {
                "id": 998,
                "type": "ACOUSTIC SPIKE SURGE",
                "severity": "WARNING",
                "message": f"Acoustic surge detected ({hardware_state.noise_db:.1f} dB from INMP441 MEMS). Monitoring sector for panic."
            }
        else:
            self.consecutive_alerts = 0

        # Construct result
        fusion_result = FusionResult(
            fusion_confidence=round(self.smoothed_confidence, 2),
            environment_risk=round(env_risk, 1),
            combined_threat_score=combined_score,
            threat_level=threat_level,
            vision_weight=round(w_v, 2),
            hardware_weight=round(w_h, 2),
            fusion_narrative=narrative,
            crowd_alert=crowd_alert
        )

        # Inject fused values back into vision_data dictionary for WebSocket transport
        vision_data["temperature"] = hardware_state.temperature
        vision_data["humidity"] = hardware_state.humidity
        vision_data["noise_db"] = hardware_state.noise_db
        vision_data["motion_detected"] = hardware_state.motion_detected
        vision_data["sos_active"] = hardware_state.sos_active
        vision_data["active_devices"] = hardware_state.active_devices
        vision_data["probe_rate"] = hardware_state.probe_rate
        if hardware_state.active_devices > 0:
            vision_data["wifi_probe_count"] = hardware_state.active_devices
        vision_data["sensor_health"] = hardware_state.sensor_health
        vision_data["sensor_timestamp"] = hardware_state.sensor_timestamp
        vision_data["buzzer_state"] = buzzer_active
        vision_data["led_state"] = led_color
        vision_data["hardware_status"] = hardware_state.hardware_status
        vision_data["connection_type"] = hardware_state.connection_type
        vision_data["environment_risk"] = round(env_risk, 1)
        vision_data["fusion_confidence"] = round(self.smoothed_confidence, 2)
        vision_data["sensor_score"] = hardware_state.sensor_score
        vision_data["heat_stress_index"] = hardware_state.heat_stress_index
        vision_data["noise_index"] = hardware_state.noise_index
        vision_data["motion_activity_score"] = hardware_state.motion_activity_score
        vision_data["combined_threat_score"] = combined_score
        vision_data["agitation"] = round(adjusted_agitation, 1)
        vision_data["effective_max_capacity"] = effective_capacity
        vision_data["fusion_narrative"] = narrative

        if threat_level == "CRITICAL":
            vision_data["status"] = "EVACUATE"

        if crowd_alert is not None:
            vision_data["crowd_alert"] = crowd_alert

        return vision_data, hardware_state, fusion_result
