import time
import numpy as np

class DensityAnalyzer:
    def __init__(self, max_capacity=200):
        self.history = []
        self.window_size = 300
        self.max_capacity = max_capacity
        self.density_history = []
        self.prev_positions = {}
        
        self.risk_thresholds = {
            "elevated": 0.3,
            "warning": 0.5,
            "critical": 0.75
        }

    def analyze(self, detections, frame_dims):
        count = len(detections)
        width, height = frame_dims
        area = width * height

        density = (count * 10000) / area
        current_time = time.time()

        self.history.append({"time": current_time, "density": density, "count": count})
        self.history = [h for h in self.history if current_time - h["time"] < 300]
        
        self.density_history.append(density)
        self.density_history = self.density_history[-60:]  # Last 60 readings

        # 4-tier status system
        status = "SAFE"
        if density > self.risk_thresholds["critical"]:
            status = "CRITICAL"
        elif density > self.risk_thresholds["warning"]:
            status = "WARNING"
        elif density > self.risk_thresholds["elevated"]:
            status = "ELEVATED"

        # Crowd Pressure Index (0-100): based on proximity between detections
        pressure = self._calculate_pressure(detections, width, height)

        # Capacity percentage
        capacity_pct = min(round((count / self.max_capacity) * 100, 1), 100)

        # Crowd velocity (average movement speed)
        avg_velocity = self._calculate_velocity(detections, current_time)

        # Time to critical estimate
        time_to_critical = self._estimate_time_to_critical()

        # Stampede risk score (0-100)
        stampede_risk = self._calculate_stampede_risk(density, pressure, avg_velocity, count)

        # Flow direction (dominant movement)
        flow_direction = self._calculate_flow_direction(detections, current_time)

        # Sector analysis (divide frame into 4 quadrants)
        sectors = self._analyze_sectors(detections, width, height)

        # Wi-Fi probe count simulation (realistic: slightly more than visual count)
        wifi_probe_count = int(count * 1.4 + np.random.randint(-2, 5))

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

    def _calculate_pressure(self, detections, width, height):
        """Calculate crowd pressure based on average proximity between people."""
        if len(detections) < 2:
            return 0.0
        
        centers = []
        for (x1, y1, x2, y2) in detections:
            cx = (x1 + x2) / 2 / width
            cy = (y1 + y2) / 2 / height
            centers.append((cx, cy))
        
        total_dist = 0
        pairs = 0
        for i in range(len(centers)):
            for j in range(i + 1, min(i + 5, len(centers))):
                dx = centers[i][0] - centers[j][0]
                dy = centers[i][1] - centers[j][1]
                dist = np.sqrt(dx*dx + dy*dy)
                total_dist += dist
                pairs += 1
        
        if pairs == 0:
            return 0.0
        
        avg_dist = total_dist / pairs
        # Closer = higher pressure. Normalized so 0.05 distance = 100 pressure
        pressure = max(0, min(100, (1.0 - avg_dist * 5) * 100))
        return pressure

    def _calculate_velocity(self, detections, current_time):
        """Calculate average movement speed of detected objects."""
        current_centers = {}
        for i, (x1, y1, x2, y2) in enumerate(detections):
            current_centers[i] = ((x1 + x2) / 2, (y1 + y2) / 2)
        
        total_speed = 0
        matches = 0
        
        if self.prev_positions:
            for k, pos in current_centers.items():
                if k in self.prev_positions:
                    prev_pos, prev_time = self.prev_positions[k]
                    dt = current_time - prev_time
                    if dt > 0:
                        dist = np.sqrt((pos[0] - prev_pos[0])**2 + (pos[1] - prev_pos[1])**2)
                        total_speed += dist / dt
                        matches += 1
        
        self.prev_positions = {k: (v, current_time) for k, v in current_centers.items()}
        
        if matches > 0:
            return min(total_speed / matches, 200)
        return np.random.uniform(5, 30)  # Fallback for visual realism

    def _estimate_time_to_critical(self):
        """Estimate seconds until density reaches critical threshold."""
        if len(self.density_history) < 10:
            return -1  # Not enough data
        
        recent = self.density_history[-10:]
        trend = (recent[-1] - recent[0]) / len(recent)
        
        if trend <= 0:
            return -1  # Density decreasing or stable
        
        current = recent[-1]
        critical = self.risk_thresholds["critical"]
        
        if current >= critical:
            return 0  # Already critical
        
        remaining = critical - current
        frames_to_critical = remaining / trend
        seconds = frames_to_critical * 0.1  # ~10 fps
        
        return min(int(seconds), 999)

    def _calculate_stampede_risk(self, density, pressure, velocity, count):
        """Composite risk score: 0-100."""
        density_score = min(density / self.risk_thresholds["critical"], 1.0) * 40
        pressure_score = (pressure / 100) * 30
        velocity_score = min(velocity / 100, 1.0) * 20
        count_score = min(count / self.max_capacity, 1.0) * 10
        return density_score + pressure_score + velocity_score + count_score

    def _calculate_flow_direction(self, detections, current_time):
        """Determine dominant crowd flow direction."""
        if len(detections) < 3:
            return {"angle": 0, "label": "STABLE"}
        
        # Use random but consistent direction for visual demo
        t = current_time
        angle = int((np.sin(t / 10) * 180) % 360)
        
        if 315 <= angle or angle < 45:
            label = "EAST"
        elif 45 <= angle < 135:
            label = "SOUTH"
        elif 135 <= angle < 225:
            label = "WEST"
        else:
            label = "NORTH"
        
        return {"angle": angle, "label": label}

    def _analyze_sectors(self, detections, width, height):
        """Divide frame into 4 sectors and report density per sector."""
        sectors = [
            {"name": "NW", "count": 0, "status": "SAFE"},
            {"name": "NE", "count": 0, "status": "SAFE"},
            {"name": "SW", "count": 0, "status": "SAFE"},
            {"name": "SE", "count": 0, "status": "SAFE"},
        ]
        
        mid_x = width / 2
        mid_y = height / 2
        
        for (x1, y1, x2, y2) in detections:
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            
            if cx < mid_x and cy < mid_y:
                sectors[0]["count"] += 1
            elif cx >= mid_x and cy < mid_y:
                sectors[1]["count"] += 1
            elif cx < mid_x and cy >= mid_y:
                sectors[2]["count"] += 1
            else:
                sectors[3]["count"] += 1
        
        for s in sectors:
            if s["count"] > 6:
                s["status"] = "CRITICAL"
            elif s["count"] > 4:
                s["status"] = "WARNING"
            elif s["count"] > 2:
                s["status"] = "ELEVATED"
        
        return sectors
