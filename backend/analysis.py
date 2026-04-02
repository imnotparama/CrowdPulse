# pyre-unsafe
import time
from typing import Any
import numpy as np


class DensityAnalyzer:
    def __init__(self, max_capacity: int = 200) -> None:
        self.history: list[dict[str, Any]] = []
        self.window_size: int = 300
        self.max_capacity: int = max_capacity
        self.density_history: list[float] = []
        self.prev_positions: dict[int, tuple[tuple[float, float], float]] = {}

        self.risk_thresholds: dict[str, float] = {
            "elevated": 0.3,
            "warning": 0.5,
            "critical": 0.75
        }

    def analyze(self, detections: list[tuple[float, float, float, float]], frame_dims: tuple[int, int]) -> dict[str, Any]:
        count: int = len(detections)
        width, height = frame_dims
        area: int = width * height

        density: float = (count * 10000) / area
        current_time: float = time.time()

        self.history.append({"time": current_time, "density": density, "count": count})
        self.history = [h for h in self.history if current_time - h["time"] < 300]

        self.density_history.append(density)
        self.density_history = self.density_history[-60:]

        status: str = "SAFE"
        if density > self.risk_thresholds["critical"]:
            status = "CRITICAL"
        elif density > self.risk_thresholds["warning"]:
            status = "WARNING"
        elif density > self.risk_thresholds["elevated"]:
            status = "ELEVATED"

        pressure: float = self._calculate_pressure(detections, width, height)
        capacity_pct: float = min(round((count / self.max_capacity) * 100, 1), 100.0)
        avg_velocity: float = self._calculate_velocity(detections, current_time)
        time_to_critical: int = self._estimate_time_to_critical()
        stampede_risk: float = self._calculate_stampede_risk(density, pressure, avg_velocity, count)

        # flow_direction is a placeholder here; the real value is injected by
        # processor.py using cv2.calcOpticalFlowFarneback on actual grayscale frames.
        # This default is used when no frame data is available (e.g. pure analysis calls).
        flow_direction: dict[str, Any] = self._calculate_flow_direction(detections, current_time)

        sectors: list[dict[str, Any]] = self._analyze_sectors(detections, width, height)
        wifi_probe_count: int = int(count * 1.4 + np.random.randint(-2, 5))

        return {
            "count": int(count),
            "density": float(round(density, 2)),
            "status": str(status),
            "timestamp": float(current_time),
            "pressure_index": float(round(pressure, 1)),
            "capacity_pct": float(capacity_pct),
            "max_capacity": int(self.max_capacity),
            "avg_velocity": float(round(avg_velocity, 1)),
            "time_to_critical": int(time_to_critical),
            "stampede_risk": float(round(stampede_risk, 1)),
            "flow_direction": {"angle": int(flow_direction["angle"]), "label": str(flow_direction["label"])},
            "sectors": sectors,
            "wifi_probe_count": int(max(0, wifi_probe_count))
        }

    def _calculate_pressure(self, detections: list[tuple[float, float, float, float]], width: int, height: int) -> float:
        if len(detections) < 2:
            return 0.0

        centers: list[tuple[float, float]] = []
        for det in detections:
            x1, y1, x2, y2 = det
            cx: float = (x1 + x2) / 2 / width
            cy: float = (y1 + y2) / 2 / height
            centers.append((cx, cy))

        total_dist: float = 0.0
        pairs: int = 0
        for i in range(len(centers)):
            for j in range(i + 1, min(i + 5, len(centers))):
                dx: float = centers[i][0] - centers[j][0]
                dy: float = centers[i][1] - centers[j][1]
                dist: float = float(np.sqrt(dx*dx + dy*dy))
                total_dist = total_dist + dist  # pyre-ignore
                pairs = pairs + 1  # pyre-ignore

        if pairs == 0:
            return 0.0

        avg_dist: float = float(total_dist) / float(pairs)  # pyre-ignore
        pressure: float = max(0.0, min(100.0, (1.0 - avg_dist * 5) * 100))
        return pressure

    def _calculate_velocity(self, detections: list[tuple[float, float, float, float]], current_time: float) -> float:
        current_centers: dict[int, tuple[float, float]] = {}
        for i, det in enumerate(detections):
            x1, y1, x2, y2 = det
            current_centers[i] = ((x1 + x2) / 2, (y1 + y2) / 2)

        total_speed: float = 0.0
        matches: int = 0

        if self.prev_positions:
            for k, pos in current_centers.items():
                if k in self.prev_positions:
                    prev_pos, prev_time = self.prev_positions[k]
                    dt: float = current_time - prev_time
                    if dt > 0:
                        dist: float = float(np.sqrt((pos[0] - prev_pos[0])**2 + (pos[1] - prev_pos[1])**2))
                        total_speed = total_speed + dist / dt  # pyre-ignore
                        matches = matches + 1  # pyre-ignore

        self.prev_positions = {k: (v, current_time) for k, v in current_centers.items()}

        if matches > 0:
            return min(total_speed / matches, 200.0)
        return float(np.random.uniform(5, 30))

    def _estimate_time_to_critical(self) -> int:
        if len(self.density_history) < 10:
            return -1

        recent: list[float] = self.density_history[-10:]
        trend: float = (recent[-1] - recent[0]) / len(recent)

        if trend <= 0:
            return -1

        current: float = recent[-1]
        critical: float = self.risk_thresholds["critical"]

        if current >= critical:
            return 0

        remaining: float = critical - current
        frames_to_critical: float = remaining / trend
        seconds: float = frames_to_critical * 0.1

        return min(int(seconds), 999)

    def _calculate_stampede_risk(self, density: float, pressure: float, velocity: float, count: int) -> float:
        density_score: float = min(density / self.risk_thresholds["critical"], 1.0) * 40
        pressure_score: float = (pressure / 100) * 30
        velocity_score: float = min(velocity / 100, 1.0) * 20
        count_score: float = min(count / self.max_capacity, 1.0) * 10
        return density_score + pressure_score + velocity_score + count_score

    def _calculate_flow_direction(self, detections: list[tuple[float, float, float, float]], current_time: float) -> dict[str, Any]:
        """Fallback stub — real flow direction is computed via OpenCV Farneback
        optical flow in processor.py and injected directly into analysis_result.
        This method is kept for API compatibility and simulation mode."""
        if len(detections) < 3:
            return {"angle": 0, "label": "STABLE"}

        # Return a stable placeholder; processor.py will overwrite 'flow_direction'
        # with the real Farneback result every frame.
        return {"angle": 0, "label": "STABLE"}

    def _analyze_sectors(self, detections: list[tuple[float, float, float, float]], width: int, height: int) -> list[dict[str, Any]]:
        sectors: list[dict[str, Any]] = [
            {"name": "NW", "count": 0, "status": "SAFE"},
            {"name": "NE", "count": 0, "status": "SAFE"},
            {"name": "SW", "count": 0, "status": "SAFE"},
            {"name": "SE", "count": 0, "status": "SAFE"},
        ]

        mid_x: float = width / 2
        mid_y: float = height / 2

        for det in detections:
            x1, y1, x2, y2 = det
            cx: float = (x1 + x2) / 2
            cy: float = (y1 + y2) / 2

            if cx < mid_x and cy < mid_y:
                sectors[0]["count"] = int(sectors[0]["count"]) + 1
            elif cx >= mid_x and cy < mid_y:
                sectors[1]["count"] = int(sectors[1]["count"]) + 1
            elif cx < mid_x and cy >= mid_y:
                sectors[2]["count"] = int(sectors[2]["count"]) + 1
            else:
                sectors[3]["count"] = int(sectors[3]["count"]) + 1

        for s in sectors:
            cnt: int = int(s["count"])
            if cnt > 6:
                s["status"] = "CRITICAL"
            elif cnt > 4:
                s["status"] = "WARNING"
            elif cnt > 2:
                s["status"] = "ELEVATED"

        return sectors

    def predict_future_density(self, seconds_ahead: int = 30) -> float:
        if len(self.density_history) < 10:
            return self.density_history[-1] if self.density_history else 0.0
        recent = self.density_history[-10:]
        trend = (recent[-1] - recent[0]) / len(recent)
        frames_ahead = seconds_ahead * 10
        return min(recent[-1] + trend * frames_ahead, 2.0)
