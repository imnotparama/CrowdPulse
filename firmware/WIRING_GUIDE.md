# CrowdPulse Real Hardware Interfacing & Wiring Guide

This guide details how to physically wire and flash your microcontroller (**ESP32 / ESP32-S3 / Arduino Uno**) to stream real sensor telemetry into the CrowdPulse dashboard and receive real-time actuator feedback (Buzzer & RGB Status LED).

---

## 1. Supported Connection Modes

| Mode | Connection Method | Best For | Latency |
| :--- | :--- | :--- | :--- |
| **USB Serial** | USB Data Cable directly into PC | Zero setup, labs, offline demos | **< 10ms** |
| **Wi-Fi HTTP** | 2.4 GHz Wi-Fi / Phone Hotspot | Wireless edge deployment | **15–35ms** |

---

## 2. Visual Breadboard Circuit Diagram

A complete breadboard circuit schematic is provided in:
- Local file: [`firmware/circuit_diagram.jpg`](file:///c:/Users/hunte/CrowdPulse/firmware/circuit_diagram.jpg)
- Comprehensive documentation: [`circuit_schematic.md`](file:///C:/Users/hunte/.gemini/antigravity-ide/brain/4ea82d98-1d8d-4ab2-a175-ba188c43a30b/circuit_schematic.md)

---

## 2. Pinout & Interfacing Schematic

### ESP32 / ESP32-S3 Board Pinout

| Peripheral / Component | Sensor Model | ESP32-S3 Pin | ESP32 (Standard) Pin | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Microclimate Sensor** | AM2302 (DHT22) Data | **GPIO 4** | **GPIO 4** | 10kΩ pull-up to 3.3V recommended |
| **Acoustic Noise Sensor** | Analog Mic / KY-038 / LM393 | **GPIO 34 (ADC1)** | **GPIO 34 (ADC1)** | Reads 0–3.3V analog RMS sound pressure |
| **Kinematic Motion** | HC-SR501 PIR Out | **GPIO 13** | **GPIO 13** | High logic (3.3V) on movement |
| **Piezo Resonance Siren** | Active 5V Buzzer | **GPIO 12** | **GPIO 12** | Direct or via 2N2222 NPN driver |
| **RGB LED — Red** | Common Cathode Red | **GPIO 18** | **GPIO 18** | 220Ω current-limiting resistor |
| **RGB LED — Green** | Common Cathode Green | **GPIO 19** | **GPIO 19** | 220Ω current-limiting resistor |
| **RGB LED — Blue** | Common Cathode Blue | **GPIO 23** | **GPIO 23** | 220Ω current-limiting resistor |
| **Power Supply** | 3.3V & 5V | **3V3 & 5V / VIN** | **3V3 & VIN** | Common Ground (GND) across all |

---

### Arduino Uno / Nano Pinout (USB Serial Mode)

| Component | Sensor Pin | Arduino Pin | Notes |
| :--- | :--- | :--- | :--- |
| **AM2302 / DHT11** | Data | **Digital Pin 4** | 10kΩ pull-up to 5V |
| **Acoustic Sensor** | Analog Out (A0) | **Analog Pin A0** | Reads analog noise envelope |
| **PIR Motion** | Out | **Digital Pin 2** | Uses hardware INT0 |
| **Active Buzzer** | (+) Positive | **Digital Pin 8** | Digital output |
| **RGB LED Red** | Red Anode | **Digital Pin 9** | PWM 220Ω |
| **RGB LED Green** | Green Anode | **Digital Pin 10** | PWM 220Ω |
| **RGB LED Blue** | Blue Anode | **Digital Pin 11** | PWM 220Ω |
| **Common GND** | Cathode | **GND** | Ground bus |

---

## 3. Required Arduino IDE Libraries

Install these from **Arduino IDE -> Tools -> Manage Libraries...**:
1. **ArduinoJson** (by Benoît Blanchon) — Version 6.x or 7.x
2. **DHT sensor library** (by Adafruit) — Version 1.4.x
3. **Adafruit Unified Sensor** (dependency for DHT)

---

## 4. How to Flash and Connect

### Step A: Flashing the ESP32
1. Open [`firmware/esp32_crowdpulse/esp32_crowdpulse.ino`](file:///c:/Users/hunte/CrowdPulse/firmware/esp32_crowdpulse/esp32_crowdpulse.ino) in Arduino IDE.
2. If using Wi-Fi:
   - Edit lines 34–35 with your Wi-Fi SSID and Password:
     ```cpp
     const char* WIFI_SSID     = "MyNetwork";
     const char* WIFI_PASSWORD = "MyPassword";
     ```
   - Update `SERVER_URL` with your computer's local IP (e.g. `http://192.168.1.8:8000/api/hardware/telemetry`).
3. Select your board (**ESP32 Dev Module** or **ESP32S3 Dev Module**) under **Tools -> Board**.
4. Select the COM port under **Tools -> Port** and click **Upload**.

### Step B: Connecting to CrowdPulse
- **If using USB Serial:**
  - Keep the USB cable plugged in.
  - In CrowdPulse dashboard, open the **Hardware Connection Modal** (or click the **Hardware Card**).
  - Select your COM port from the dropdown (e.g., `COM3`, `COM4`) and click **Connect**.
  - Telemetry will instantly turn from `SIMULATED` to `CONNECTED (USB COMx)`.
- **If using Wi-Fi:**
  - As soon as the ESP32 boots and connects to Wi-Fi, it will start sending HTTP POST requests to `http://192.168.1.8:8000/api/hardware/telemetry`.
  - The CrowdPulse dashboard will automatically recognize the live physical device (`CONNECTED (Wi-Fi)`).
