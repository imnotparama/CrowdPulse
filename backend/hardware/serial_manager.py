# pyre-unsafe
"""
CrowdPulse Enterprise v4.1 - USB Serial Hardware Manager
Enables plug-and-play USB Serial / COM port communication for ESP32, ESP32-S3,
Arduino, and 8051 microcontroller boards.
"""

import json
import logging
import threading
import time
from typing import Any, Optional

try:
    import serial
    import serial.tools.list_ports as list_ports
    HAS_SERIAL = True
except ImportError:
    HAS_SERIAL = False
    serial = None
    list_ports = None

from hardware.hardware_models import ESP32TelemetryPacket

logger = logging.getLogger("CrowdPulse.SerialManager")


class SerialHardwareManager:
    """Manages USB COM port lifecycle, telemetry streaming, and actuator dispatch."""

    def __init__(self, on_packet_callback=None) -> None:
        self.on_packet_callback = on_packet_callback
        self.serial_conn: Optional[Any] = None
        self.active_port: Optional[str] = None
        self.active_baud: int = 115200
        self.is_connected: bool = False
        self.stop_signal: threading.Event = threading.Event()
        self.thread: Optional[threading.Thread] = None
        self.lock: threading.Lock = threading.Lock()

        # Telemetry metrics
        self.packets_received: int = 0
        self.last_packet_raw: Optional[str] = None
        self.last_packet_time: float = 0.0
        self.last_error: Optional[str] = None

    def list_ports(self) -> list[dict[str, str]]:
        """Returns all currently enumerated serial / COM ports on the host system."""
        if not HAS_SERIAL or list_ports is None:
            return []

        results = []
        for p in list_ports.comports():
            results.append({
                "port": p.device,
                "description": p.description or p.device,
                "hardware_id": p.hwid or "",
                "manufacturer": getattr(p, "manufacturer", None) or "Unknown",
            })
        return results

    def connect(self, port: str, baudrate: int = 115200) -> dict[str, Any]:
        """Connects to a specific serial port and launches reader thread."""
        if not HAS_SERIAL:
            return {"status": "error", "message": "pyserial not installed"}

        with self.lock:
            if self.is_connected and self.active_port == port:
                return {"status": "already_connected", "port": port, "baudrate": baudrate}

            # Disconnect previous if open
            self._disconnect_internal()

            try:
                conn = serial.Serial(
                    port=port,
                    baudrate=baudrate,
                    timeout=1.0,
                    write_timeout=1.0
                )
                self.serial_conn = conn
                self.active_port = port
                self.active_baud = baudrate
                self.is_connected = True
                self.last_error = None
                self.stop_signal.clear()

                self.thread = threading.Thread(target=self._read_loop, daemon=True)
                self.thread.start()

                logger.info(f"[CrowdPulse Serial] ✅ Connected to {port} @ {baudrate} baud")
                return {
                    "status": "connected",
                    "port": port,
                    "baudrate": baudrate
                }
            except Exception as e:
                self.last_error = str(e)
                logger.error(f"[CrowdPulse Serial] ❌ Failed to open {port}: {e}")
                return {
                    "status": "error",
                    "port": port,
                    "message": str(e)
                }

    def disconnect(self) -> dict[str, Any]:
        """Gracefully disconnects serial port."""
        with self.lock:
            return self._disconnect_internal()

    def _disconnect_internal(self) -> dict[str, Any]:
        self.stop_signal.set()
        old_port = self.active_port
        if self.serial_conn is not None:
            try:
                self.serial_conn.close()
            except Exception:
                pass
            self.serial_conn = None

        self.is_connected = False
        self.active_port = None
        return {"status": "disconnected", "previous_port": old_port}

    def write_actuator_state(self, buzzer: bool, led_color: str) -> bool:
        """Sends command JSON to physical microcontroller across serial port."""
        with self.lock:
            if not self.is_connected or self.serial_conn is None:
                return False

            cmd = json.dumps({
                "buzzer": 1 if buzzer else 0,
                "led": led_color.upper()
            }) + "\n"

            try:
                self.serial_conn.write(cmd.encode("utf-8"))
                self.serial_conn.flush()
                return True
            except Exception as e:
                logger.warning(f"[CrowdPulse Serial] Write failed: {e}")
                return False

    def get_status(self) -> dict[str, Any]:
        """Returns live status of the serial hardware interface."""
        with self.lock:
            return {
                "available": HAS_SERIAL,
                "connected": self.is_connected,
                "port": self.active_port,
                "baudrate": self.active_baud,
                "packets_received": self.packets_received,
                "last_packet_raw": self.last_packet_raw,
                "last_packet_time": self.last_packet_time,
                "last_error": self.last_error,
                "available_ports": self.list_ports()
            }

    def _read_loop(self) -> None:
        """Continuous serial listener decoding lines and passing to telemetry ingest."""
        logger.info(f"[CrowdPulse Serial] Reader started for {self.active_port}")

        while not self.stop_signal.is_set():
            if self.serial_conn is None or not self.serial_conn.is_open:
                break

            try:
                raw_line = self.serial_conn.readline()
                if not raw_line:
                    continue

                line_str = raw_line.decode("utf-8", errors="ignore").strip()
                if not line_str:
                    continue

                # Filter out pure debug strings unless valid JSON
                if line_str.startswith("{") and line_str.endswith("}"):
                    packet = self._parse_telemetry_line(line_str)
                    if packet:
                        with self.lock:
                            self.packets_received += 1
                            self.last_packet_raw = line_str
                            self.last_packet_time = time.time()

                        if self.on_packet_callback:
                            try:
                                feedback = self.on_packet_callback(packet, source="SERIAL")
                                if feedback and isinstance(feedback, dict):
                                    # Optional immediate echo
                                    pass
                            except Exception as cb_err:
                                logger.error(f"[CrowdPulse Serial] Callback error: {cb_err}")

            except Exception as err:
                if not self.stop_signal.is_set():
                    logger.warning(f"[CrowdPulse Serial] Read loop warning: {err}")
                    time.sleep(0.5)

        with self.lock:
            self.is_connected = False
            self.serial_conn = None
        logger.info("[CrowdPulse Serial] Reader loop exited.")

    def _parse_telemetry_line(self, json_str: str) -> Optional[ESP32TelemetryPacket]:
        """Tolerant parser supporting diverse key variations from Arduino sketches."""
        try:
            data = json.loads(json_str)
            if not isinstance(data, dict):
                return None

            # Temperature resolution
            temp = float(data.get("temperature", data.get("temp", data.get("celsius", 25.0))))
            # Humidity resolution
            hum = float(data.get("humidity", data.get("hum", data.get("rh", 50.0))))
            # Noise resolution
            noise = float(data.get("noise_db", data.get("noise", data.get("sound", data.get("db", 55.0)))))
            # Motion & Emergency SOS resolution
            motion_raw = data.get("motion", data.get("pir", data.get("pir_motion", False)))
            motion = bool(motion_raw) if not isinstance(motion_raw, str) else (motion_raw.lower() in ("true", "1", "yes", "active"))
            sos_raw = data.get("sos", data.get("emergency", data.get("panic", None)))
            sos = bool(sos_raw) if not isinstance(sos_raw, str) else (sos_raw.lower() in ("true", "1", "yes", "active"))
            if not sos and motion and ("ESP32" in str(data.get("device_id", ""))):
                sos = motion

            # Device ID
            dev_id = str(data.get("device_id", data.get("device", data.get("id", "ESP32-USB"))))

            # Wi-Fi Sniffing RF resolution
            active_devs = None
            if "active_devices" in data or "devices" in data or "phones" in data:
                try:
                    active_devs = int(data.get("active_devices", data.get("devices", data.get("phones", 0))))
                except (ValueError, TypeError):
                    active_devs = None

            probe_rate = None
            if "probe_rate" in data or "rate" in data:
                try:
                    probe_rate = float(data.get("probe_rate", data.get("rate", 0.0)))
                except (ValueError, TypeError):
                    probe_rate = None

            return ESP32TelemetryPacket(
                temperature=temp,
                humidity=hum,
                noise_db=noise,
                motion=motion,
                sos=sos,
                active_devices=active_devs,
                probe_rate=probe_rate,
                device_id=dev_id,
                timestamp=time.time()
            )
        except Exception as e:
            logger.debug(f"[CrowdPulse Serial] Failed to parse line '{json_str}': {e}")
            return None


# Global Serial Manager Instance
serial_manager = SerialHardwareManager()
