/*
 * ==============================================================================
 * CrowdPulse Enterprise v4.1 - Ultimate Master ESP32-S3 Physical Edge Node
 * Target Microcontroller: ESP32-S3 WROOM (N16R8)
 * 
 * Hardware Peripherals & Pinout:
 *   1. DHT11 Climate Sensor:      GPIO 4
 *   2. INMP441 I2S Digital Mic:   SD=7, SCK=15, WS=16, L/R=GND, VDD=3.3V
 *   3. 4-Pin RGB Status LED:      Red=1, Green=2, Blue=3, Common=GND (220 Ohm resistors)
 *   4. 5V Buzzer Driver (2N2222): GPIO 10 (1k Ohm to Base, 1N4148 flyback diode)
 *   5. 0.96" I2C OLED (SSD1306):  SDA=8, SCL=9, VDD=3.3V, GND=GND
 *   6. Emergency SOS Push Button: GPIO 11 (Internal Pullup, other leg to GND)
 *   7. 802.11 Wi-Fi Sniffer:      Built-in 2.4GHz Radio (Promiscuous Mode, Ch 1..13)
 * 
 * Communication:
 *   - Continuous 115200 baud JSON Telemetry streaming over USB Serial.
 *   - Real-time bidirectional closed-loop actuator control (Buzzer & RGB LED).
 * ==============================================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <driver/i2s.h>
#include <math.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ---------------- PIN DEFINITIONS ----------------
#define PIN_DHT          4   // DHT11 Data pin
#define PIN_LED_RED      1   // RGB Red channel
#define PIN_LED_GREEN    2   // RGB Green channel
#define PIN_LED_BLUE     3   // RGB Blue channel
#define PIN_BUZZER      10   // 2N2222 Transistor Base
#define PIN_BUTTON_SOS  11   // Emergency Push Button

// Set to true only once physical push button is wired between GPIO 11 and GND
#define ENABLE_SOS_BUTTON false

// I2S Microphone Pins (INMP441)
#define I2S_SD           7
#define I2S_SCK         15
#define I2S_WS          16
#define I2S_PORT        I2S_NUM_0
#define SAMPLE_RATE     16000
#define SAMPLES_NUM     256

// I2C OLED Display
#define SCREEN_WIDTH    128
#define SCREEN_HEIGHT    64
#define OLED_RESET       -1
#define SCREEN_ADDRESS 0x3C
#define I2C_SDA          8
#define I2C_SCL          9

// ---------------- SENSOR & DISPLAY OBJECTS ----------------
DHT dht(PIN_DHT, DHT11);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledReady = false;

const bool COMMON_ANODE = false; // false = Common Cathode

// ---------------- WI-FI SNIFFER TRACKING TABLE ----------------
struct TrackedDevice {
  uint8_t mac[6];
  int8_t rssi;
  unsigned long lastSeen;
};

#define MAX_TRACKED_DEVICES 128
TrackedDevice trackedDevices[MAX_TRACKED_DEVICES];
int totalDevicesKnown = 0;

volatile unsigned long totalPacketsCaptured = 0;
volatile unsigned long probeRequestsCaptured = 0;
int activeDevicesRolling = 0;
int currentChannel = 1;

unsigned long lastHopTime = 0;
unsigned long lastPacketRateCalcTime = 0;
unsigned long packetsInLastSec = 0;
float currentPacketRate = 0.0;

// ---------------- SYSTEM STATE VARIABLES ----------------
String currentStatus = "NORMAL";
String currentLedColor = "GREEN";
bool currentBuzzer = false;
bool sosActive = false;

// Remote command tracking from CrowdPulse backend
String remoteLed = "GREEN";
bool remoteBuzzer = false;
bool hasRemoteCommand = false;

float currentTemp = 25.0;
float currentHum = 50.0;
float currentDb = 42.0;

unsigned long lastTelemetryTime = 0;
unsigned long lastDhtTime = 0;
unsigned long lastSerialCmdTime = 0;
const unsigned long TELEMETRY_INTERVAL = 500; // Emit JSON every 500ms
const unsigned long DHT_INTERVAL = 2000;       // Read DHT every 2s

// ---------------- WI-FI PROMISCUOUS RX CALLBACK ----------------
void wifi_promiscuous_rx_cb(void* buf, wifi_promiscuous_pkt_type_t type) {
  totalPacketsCaptured++;
  packetsInLastSec++;

  // We filter specifically for 802.11 Management packets (Probe Requests)
  if (type != WIFI_PKT_MGMT) return;

  const wifi_promiscuous_pkt_t* pkt = (wifi_promiscuous_pkt_t*)buf;
  const uint8_t* payload = pkt->payload;
  int8_t rssi = pkt->rx_ctrl.rssi;

  // Frame Control byte 0: 0x40 is 802.11 Subtype Probe Request
  if (payload[0] != 0x40) return;

  probeRequestsCaptured++;
  const uint8_t* srcMac = &payload[10];
  if (srcMac[0] & 0x01) return; // Skip multicast/broadcast

  unsigned long now = millis();
  bool found = false;

  for (int i = 0; i < totalDevicesKnown; i++) {
    if (memcmp(trackedDevices[i].mac, srcMac, 6) == 0) {
      trackedDevices[i].rssi = rssi;
      trackedDevices[i].lastSeen = now;
      found = true;
      break;
    }
  }

  if (!found) {
    int insertIndex = -1;
    if (totalDevicesKnown < MAX_TRACKED_DEVICES) {
      insertIndex = totalDevicesKnown++;
    } else {
      // Evict oldest stale device
      unsigned long oldest = now;
      for (int i = 0; i < MAX_TRACKED_DEVICES; i++) {
        if (trackedDevices[i].lastSeen < oldest) {
          oldest = trackedDevices[i].lastSeen;
          insertIndex = i;
        }
      }
    }

    if (insertIndex >= 0) {
      memcpy(trackedDevices[insertIndex].mac, srcMac, 6);
      trackedDevices[insertIndex].rssi = rssi;
      trackedDevices[insertIndex].lastSeen = now;
    }
  }
}

// ---------------- HARDWARE INITIALIZERS ----------------
void setupI2S() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = (i2s_comm_format_t)(I2S_COMM_FORMAT_STAND_I2S),
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 4,
    .dma_buf_len = SAMPLES_NUM,
    .use_apll = false,
    .tx_desc_auto_clear = false,
    .fixed_mclk = 0
  };

  const i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SCK,
    .ws_io_num = I2S_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_SD
  };

  i2s_driver_install(I2S_PORT, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_PORT, &pin_config);
  i2s_zero_dma_buffer(I2S_PORT);
}

void setRGB(bool r, bool g, bool b) {
  digitalWrite(PIN_LED_RED,   COMMON_ANODE ? !r : r);
  digitalWrite(PIN_LED_GREEN, COMMON_ANODE ? !g : g);
  digitalWrite(PIN_LED_BLUE,  COMMON_ANODE ? !b : b);
}

void applyActuators(String color, bool buzzer) {
  currentLedColor = color;
  currentBuzzer = buzzer;

  if (color == "RED") {
    setRGB(true, false, false);
    currentStatus = "SURGE RISK";
  } else if (color == "YELLOW" || color == "AMBER") {
    setRGB(true, true, false);
    currentStatus = "CAUTION";
  } else if (color == "BLUE") {
    setRGB(false, false, true);
    currentStatus = "SYSTEM SYNC";
  } else { // GREEN
    setRGB(false, true, false);
    currentStatus = "NORMAL";
  }

  if (buzzer) {
    // Pulsing urgent alarm chirp (100ms ON / 100ms OFF) - highly audible & unmistakable
    bool beepPhase = ((millis() / 100) % 2 == 0);
    digitalWrite(PIN_BUZZER, beepPhase ? HIGH : LOW);
  } else {
    digitalWrite(PIN_BUZZER, LOW);
  }
}

// ---------------- SENSING & ACOUSTIC FUNCTIONS ----------------
float readMicrophoneDb() {
  int32_t samples[SAMPLES_NUM];
  size_t bytes_read = 0;
  esp_err_t result = i2s_read(I2S_PORT, (char*)samples, sizeof(samples), &bytes_read, 20);

  if (result == ESP_OK && bytes_read > 0) {
    int count = bytes_read / sizeof(int32_t);
    if (count <= 0) return currentDb;

    // 1. Calculate DC bias offset across buffer
    double sum = 0.0;
    for (int i = 0; i < count; i++) {
      int32_t s = samples[i] >> 8;
      sum += (double)s;
    }
    double mean = sum / (double)count;

    // 2. Subtract DC bias and compute normalized AC energy
    double sum_sq = 0.0;
    for (int i = 0; i < count; i++) {
      int32_t s = samples[i] >> 8;
      double ac = ((double)s - mean) / 8388608.0; // Normalized against 24-bit full scale
      sum_sq += ac * ac;
    }

    double rms_norm = sqrt(sum_sq / (double)count);

    // If microphone is silent or disconnected
    if (rms_norm < 0.00008) {
      return (float)(0.80 * currentDb + 0.20 * 42.0);
    }

    // Convert normalized RMS to dBFS, then map to Sound Pressure Level (dB SPL)
    double dbfs = 20.0 * log10(rms_norm);
    double spl = dbfs + 106.0;

    if (spl < 38.0) spl = 38.0;
    if (spl > 110.0) spl = 110.0;

    // Fast-Attack (instant peak capture on claps/shouts), Smooth-Decay (ambient recovery)
    if (spl > currentDb) {
      return (float)(0.15 * currentDb + 0.85 * spl); // Fast attack on loud sound
    } else {
      return (float)(0.70 * currentDb + 0.30 * spl); // Smooth decay back to ambient
    }
  }
  return currentDb;
}

// ---------------- OLED GRAPHICS DASHBOARD ----------------
void updateOledDisplay() {
  if (!oledReady) return;
  display.clearDisplay();

  // 1. Header Bar
  display.fillRect(0, 0, 128, 11, SSD1306_WHITE);
  display.setTextSize(1);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setCursor(4, 2);
  display.print("CROWDPULSE");
  display.setCursor(82, 2);
  display.print("[ONLINE]");

  // 2. Status Banner
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(2, 14);
  display.print("STATUS: ");
  if (sosActive) {
    display.print("🚨 SOS ALARM!");
  } else {
    display.print(currentStatus);
  }

  // 3. Noise Decibels & Visual Meter Bar
  display.setCursor(2, 25);
  display.print("NOISE : ");
  display.print(currentDb, 1);
  display.print(" dB");

  // Visual Volume Bar (scale 40dB to 95dB across 120 pixels)
  int barWidth = map((int)currentDb, 40, 95, 0, 120);
  if (barWidth < 0) barWidth = 0;
  if (barWidth > 120) barWidth = 120;
  display.drawRect(2, 34, 124, 6, SSD1306_WHITE);
  display.fillRect(4, 36, barWidth, 2, SSD1306_WHITE);

  // 4. Climate (DHT11)
  display.setCursor(2, 43);
  display.print("T:");
  display.print(currentTemp, 1);
  display.print("C H:");
  display.print(currentHum, 0);
  display.print("%");

  display.setCursor(80, 43);
  display.print("LED:");
  display.print(currentLedColor.substring(0, 3));

  // 5. Wi-Fi Sniffer Active Phone Count
  display.setCursor(2, 54);
  display.print("PHONES: ");
  display.print(activeDevicesRolling);
  display.print(" (CH:");
  display.print(currentChannel);
  display.print(")");

  display.display();
}

// ---------------- SERIAL COMMAND PARSER ----------------
void parseSerialCommands() {
  while (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      if (line.indexOf("\"buzzer\": 1") > 0 || line.indexOf("\"buzzer\":1") > 0 || line.indexOf("\"buzzer\": true") > 0) {
        remoteBuzzer = true;
      } else if (line.indexOf("\"buzzer\": 0") > 0 || line.indexOf("\"buzzer\":0") > 0 || line.indexOf("\"buzzer\": false") > 0) {
        remoteBuzzer = false;
      }

      if (line.indexOf("\"RED\"") > 0 || line.indexOf("\"red\"") > 0) {
        remoteLed = "RED";
      } else if (line.indexOf("\"YELLOW\"") > 0 || line.indexOf("\"yellow\"") > 0) {
        remoteLed = "YELLOW";
      } else if (line.indexOf("\"GREEN\"") > 0 || line.indexOf("\"green\"") > 0) {
        remoteLed = "GREEN";
      } else if (line.indexOf("\"BLUE\"") > 0 || line.indexOf("\"blue\"") > 0) {
        remoteLed = "BLUE";
      }

      lastSerialCmdTime = millis();
      hasRemoteCommand = true;
    }
  }
}

// ---------------- SETUP & INITIALIZATION ----------------
void setup() {
  // 1. Disable hardware brownout detector to prevent reboot loops from USB voltage dips
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(500);

  // GPIO Pins
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  #if ENABLE_SOS_BUTTON
  pinMode(PIN_BUTTON_SOS, INPUT_PULLUP);
  #endif

  // Ensure buzzer starts completely OFF
  digitalWrite(PIN_BUZZER, LOW);
  applyActuators("GREEN", false);

  // Initialize Sensors
  dht.begin();
  setupI2S();

  // Initialize OLED Display
  Wire.begin(I2C_SDA, I2C_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    oledReady = true;
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(14, 16);
    display.println("CROWDPULSE AI");
    display.setCursor(10, 32);
    display.println("Master Edge Node");
    display.setCursor(14, 48);
    display.println("All Sensors Booted");
    display.display();
    delay(500);
  }

  // Initialize 802.11 Wi-Fi Promiscuous Sniffer
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  // Reduce TX power for sniffer: saves ~120mA and eliminates power rail dips
  WiFi.setTxPower(WIFI_POWER_11dBm);

  wifi_promiscuous_filter_t filt = {
    .filter_mask = WIFI_PROMIS_FILTER_MASK_MGMT
  };
  esp_wifi_set_promiscuous_filter(&filt);
  esp_wifi_set_promiscuous_rx_cb(&wifi_promiscuous_rx_cb);
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(currentChannel, WIFI_SECOND_CHAN_NONE);

  Serial.println("\n[CrowdPulse Node] Physical Edge Sensing Node Ready! Streaming Telemetry...");
}

// ---------------- MAIN LOOP ----------------
void loop() {
  unsigned long now = millis();

  // 1. Process incoming actuator commands from CrowdPulse backend
  parseSerialCommands();

  // 2. Sample INMP441 Microphone continuously via I2S DMA
  currentDb = readMicrophoneDb();

  // 3. Wi-Fi Channel Hopping (every 200ms across channels 1..13)
  if (now - lastHopTime >= 200) {
    lastHopTime = now;
    currentChannel++;
    if (currentChannel > 13) currentChannel = 1;
    esp_wifi_set_channel(currentChannel, WIFI_SECOND_CHAN_NONE);
  }

  // 4. Wi-Fi Packet Rate Computation (every 1 second)
  if (now - lastPacketRateCalcTime >= 1000) {
    lastPacketRateCalcTime = now;
    currentPacketRate = (float)packetsInLastSec;
    packetsInLastSec = 0;
  }

  // 5. Sample DHT11 Climate Sensor every 2 seconds
  if (now - lastDhtTime >= DHT_INTERVAL) {
    lastDhtTime = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentTemp = t;
    if (!isnan(h)) currentHum = h;
  }

  // 6. Check Emergency SOS Push Button (Active LOW)
  #if ENABLE_SOS_BUTTON
  sosActive = (digitalRead(PIN_BUTTON_SOS) == LOW);
  #else
  sosActive = false;
  #endif

  // 7. Multi-Tier Actuator Decision Logic (Immediate Local & Cloud Safety Hierarchy):
  if (sosActive) {
    // 🚨 Priority 1: Physical SOS Panic Button pressed
    applyActuators("RED", true);
  } else if (currentDb >= 78.0) {
    // 🚨 Priority 2: Immediate Local Acoustic Emergency (Shouting, clapping, loud sound >= 78 dB)
    applyActuators("RED", true);
  } else if (hasRemoteCommand && (now - lastSerialCmdTime <= 3000) && (remoteLed == "RED" || remoteBuzzer)) {
    // 🚨 Priority 3: Backend Computer Vision detected critical crowd stampede
    applyActuators("RED", remoteBuzzer);
  } else if (currentDb >= 68.0) {
    // ⚠️ Priority 4: Moderate noise / crowd buildup (68–77 dB)
    applyActuators("YELLOW", false);
  } else if (hasRemoteCommand && (now - lastSerialCmdTime <= 3000)) {
    // 💻 Priority 5: Backend nominal command (e.g. Yellow from camera density, Green from nominal)
    applyActuators(remoteLed, remoteBuzzer);
  } else {
    // 🟢 Priority 6: Safe Room Ambient (<68 dB)
    applyActuators("GREEN", false);
  }

  // 8. Transmit Telemetry JSON to CrowdPulse Backend (every 500ms)
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;

    // Prune active devices table (30-second rolling window)
    int activeCount = 0;
    for (int i = 0; i < totalDevicesKnown; i++) {
      if (now - trackedDevices[i].lastSeen <= 30000) {
        activeCount++;
      }
    }
    activeDevicesRolling = activeCount;

    // Emits Unified CrowdPulse JSON Packet
    Serial.print("{\"temperature\":");
    Serial.print(currentTemp, 1);
    Serial.print(",\"humidity\":");
    Serial.print(currentHum, 1);
    Serial.print(",\"noise_db\":");
    Serial.print(currentDb, 1);
    Serial.print(",\"motion\":");
    Serial.print(sosActive ? "true" : "false");
    Serial.print(",\"sos\":");
    Serial.print(sosActive ? "true" : "false");
    Serial.print(",\"active_devices\":");
    Serial.print(activeDevicesRolling);
    Serial.print(",\"probe_rate\":");
    Serial.print(currentPacketRate, 1);
    Serial.print(",\"channel\":");
    Serial.print(currentChannel);
    Serial.print(",\"device_id\":\"ESP32-S3-CROWDPULSE\"}\n");

    // Refresh 0.96" OLED Display
    updateOledDisplay();
  }

  delay(15);
}