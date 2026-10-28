/*
 * ==============================================================================
 * CrowdPulse Enterprise v4.4 - Master ESP32-S3 Physical Edge Node (Full Suite)
 * Target Microcontroller: ESP32-S3 WROOM (N16R8)
 * 
 * Hardware Peripherals & Pinout:
 *   1. DHT Sensor:                GPIO 4 (DHT11 / DHT22 Data pin)
 *   2. INMP441 I2S Digital Mic:   SD=7, SCK=15, WS=16, L/R=GND, VDD=3.3V
 *   3. 4-Pin RGB Status LED:      Red=1, Green=2, Blue=3, Common=GND (220 Ohm)
 *   4. 5V Buzzer Driver (2N2222): GPIO 10 (1k Ohm to Base, 1N4148 flyback diode)
 *   5. 0.96" I2C OLED (SSD1306):  SDA=8, SCL=9, VDD=3.3V, GND=GND (0x3C)
 *   6. Push Button:               GPIO 11 (Internal Pullup, other leg to GND)
 *        - Short Press (< 1.5s):  Instant Environmental Ambient Re-Calibration
 *        - Long Press (> 2.0s):   Emergency SOS Panic Alarm Toggle
 *   7. 802.11 Wi-Fi Sniffer:      Built-in 2.4GHz Radio (Promiscuous Mode, Ch 1..13)
 *   8. Decoupling Capacitor:      100 µF across Power Rail (smooths inrush/switching)
 * 
 * Key Features:
 *   - Overridden esp_brownout_init + WRITE_PERI_REG: Zero BOD resets!
 *   - Wi-Fi TX power set to 8.5 dBm: Ultra-stable breadboard operation
 *   - Auto Ambient Noise Calibration on boot (3s progress bar on OLED)
 *   - Dynamic Relative Thresholds: CAUTION at (Baseline + 14 dB), SURGE at (Baseline + 24 dB, min 84 dB)
 *   - Triple-sample persistence filter: Normal conversation ignored, only true loud surges trigger
 *   - Pulsed Siren Buzzer + Red LED on genuine panic / sound surge / SOS
 *   - Telemetry Stream: JSON over Serial at 115200 baud
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

// Override ESP-IDF internal brownout initialization so the detector never turns on
extern "C" void esp_brownout_init(void) {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
}

// Early constructor as secondary protection before setup()
__attribute__((constructor)) static void earlyDisableBrownout(void) {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
}

// ---------------- PIN DEFINITIONS ----------------
#define PIN_DHT          4   // DHT11 / DHT22 Data pin
#define PIN_LED_RED      1   // RGB Red channel
#define PIN_LED_GREEN    2   // RGB Green channel
#define PIN_LED_BLUE     3   // RGB Blue channel
#define PIN_BUZZER      10   // 2N2222 Transistor Base
#define PIN_BUTTON_SOS  11   // Push Button (Short press = Calibrate, Long press = SOS)

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

const bool COMMON_ANODE = false; // false = Common Cathode (GND), true = Common Anode (3.3V)

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

// ---------------- ADAPTIVE AMBIENT CALIBRATION ----------------
float ambientBaselineDb  = 52.0; // Calibrated room noise floor
float cautionDeltaDb     = 14.0; // Decibels above baseline for CAUTION (+14 dB) -> ~72-76 dB
float surgeDeltaDb       = 24.0; // Decibels above baseline for SURGE RISK (+24 dB) -> ~84-88 dB (LOUD panic/scream)

// ---------------- SYSTEM STATE VARIABLES ----------------
String currentStatus   = "NORMAL";
String currentLedColor = "GREEN";
bool currentBuzzer     = false;
bool sosActive         = false;

// Remote command tracking from CrowdPulse backend
String remoteLed       = "GREEN";
bool remoteBuzzer      = false;
bool hasRemoteCommand  = false;

float currentTemp      = 25.0;
float currentHum       = 50.0;
float currentDb        = 50.0;

unsigned long lastTelemetryTime = 0;
unsigned long lastDhtTime       = 0;
unsigned long lastSerialCmdTime = 0;
const unsigned long TELEMETRY_INTERVAL = 500; // Emit JSON every 500ms
const unsigned long DHT_INTERVAL       = 2000; // Read DHT every 2s

// ---------------- FORWARD DECLARATIONS ----------------
float readMicrophoneDb();
void setRGB(bool r, bool g, bool b);
void applyActuators(String color, bool buzzer);
void runAmbientCalibration();
void updateOledDisplay();
void parseSerialCommands();

// ---------------- WI-FI PROMISCUOUS RX CALLBACK ----------------
void wifi_promiscuous_rx_cb(void* buf, wifi_promiscuous_pkt_type_t type) {
  totalPacketsCaptured++;
  packetsInLastSec++;

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
    currentStatus = "CALIBRATING";
  } else { // GREEN
    setRGB(false, true, false);
    currentStatus = "NORMAL";
  }

  if (buzzer) {
    // Distinct loud alarm cadence: 250ms ON / 150ms OFF
    bool beepPhase = ((millis() % 400) < 250);
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

    double sum = 0.0;
    for (int i = 0; i < count; i++) {
      int32_t s = samples[i] >> 8;
      sum += (double)s;
    }
    double mean = sum / (double)count;

    double sum_sq = 0.0;
    for (int i = 0; i < count; i++) {
      int32_t s = samples[i] >> 8;
      double ac = ((double)s - mean) / 8388608.0;
      sum_sq += ac * ac;
    }

    double rms_norm = sqrt(sum_sq / (double)count);

    if (rms_norm < 0.00008) {
      return (float)(0.85 * currentDb + 0.15 * ambientBaselineDb);
    }

    double dbfs = 20.0 * log10(rms_norm);
    // Calibration offset: 102.0 aligns 0 dBFS to peak SPL and keeps normal speech around 58-68 dB
    double spl = dbfs + 102.0;

    if (spl < 35.0) spl = 35.0;
    if (spl > 115.0) spl = 115.0;

    // Smooth fast attack vs decay: gentle attack prevents momentary syllables from spiking
    if (spl > currentDb) {
      return (float)(0.45 * currentDb + 0.55 * spl);
    } else {
      return (float)(0.80 * currentDb + 0.20 * spl);
    }
  }
  return currentDb;
}

// ---------------- AMBIENT CALIBRATION ROUTINE ----------------
void runAmbientCalibration() {
  applyActuators("BLUE", false);

  if (oledReady) {
    display.clearDisplay();
    display.fillRect(0, 0, 128, 11, SSD1306_WHITE);
    display.setTextSize(1);
    display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
    display.setCursor(14, 2);
    display.print("CALIBRATING ROOM");

    display.setTextColor(SSD1306_WHITE);
    display.setCursor(4, 16);
    display.print("Measuring Ambient...");
    display.setCursor(4, 28);
    display.print("Keep quiet for 3 sec");
    display.drawRect(4, 42, 120, 8, SSD1306_WHITE);
    display.display();
  }

  double sumDb = 0.0;
  int sampleCount = 0;
  unsigned long start = millis();

  while (millis() - start < 3000) {
    float db = readMicrophoneDb();
    if (db >= 35.0 && db <= 115.0) {
      sumDb += db;
      sampleCount++;
    }

    if (oledReady) {
      int progress = map((int)(millis() - start), 0, 3000, 0, 116);
      if (progress > 116) progress = 116;
      display.fillRect(6, 44, progress, 4, SSD1306_WHITE);
      display.display();
    }
    delay(30);
  }

  if (sampleCount > 0) {
    ambientBaselineDb = (float)(sumDb / sampleCount);
  } else {
    ambientBaselineDb = currentDb;
  }

  if (ambientBaselineDb < 38.0) ambientBaselineDb = 38.0;
  if (ambientBaselineDb > 88.0) ambientBaselineDb = 88.0;
  currentDb = ambientBaselineDb;

  if (oledReady) {
    display.clearDisplay();
    display.fillRect(0, 0, 128, 11, SSD1306_WHITE);
    display.setTextSize(1);
    display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
    display.setCursor(16, 2);
    display.print("CALIBRATION OK");

    display.setTextColor(SSD1306_WHITE);
    display.setCursor(4, 16);
    display.print("Ambient Baseline:");
    display.setCursor(18, 30);
    display.setTextSize(2);
    display.print(ambientBaselineDb, 1);
    display.print(" dB");

    display.setTextSize(1);
    display.setCursor(4, 52);
    display.print("Surge Threshold: +24dB");
    display.display();
  }

  Serial.print("{\"event\":\"calibrated\",\"ambient_baseline\":");
  Serial.print(ambientBaselineDb, 1);
  Serial.print(",\"caution_threshold\":");
  Serial.print(ambientBaselineDb + cautionDeltaDb, 1);
  Serial.print(",\"surge_threshold\":");
  Serial.print(ambientBaselineDb + surgeDeltaDb, 1);
  Serial.print("}\n");

  // Audible chirp confirming calibration complete
  digitalWrite(PIN_BUZZER, HIGH);
  delay(80);
  digitalWrite(PIN_BUZZER, LOW);

  applyActuators("GREEN", false);
  delay(1200);
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
    display.print("! SOS ALARM !");
  } else {
    display.print(currentStatus);
  }

  // 3. Noise Decibels & Calibrated Baseline
  display.setCursor(2, 25);
  display.print("NOISE : ");
  display.print(currentDb, 1);
  display.print("dB");

  display.setCursor(82, 25);
  display.print("B:");
  display.print((int)ambientBaselineDb);

  // Visual Volume Bar (0 to +30 dB surge)
  int barWidth = map((int)currentDb, (int)ambientBaselineDb, (int)(ambientBaselineDb + 30.0), 0, 120);
  if (barWidth < 0) barWidth = 0;
  if (barWidth > 120) barWidth = 120;
  display.drawRect(2, 34, 124, 6, SSD1306_WHITE);
  display.fillRect(4, 36, barWidth, 2, SSD1306_WHITE);

  // 4. Climate (DHT) + LED indicator
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
    if (line.length() == 0) continue;

    if (line.equalsIgnoreCase("CAL") || 
        line.equalsIgnoreCase("CALIBRATE") || 
        line.indexOf("\"calibrate\"") >= 0 || 
        line.indexOf("\"cmd\":\"calibrate\"") >= 0) {
      runAmbientCalibration();
      return;
    }

    if (line.equalsIgnoreCase("BUZZ") || line.equalsIgnoreCase("BUZZER") || line.equalsIgnoreCase("BEEP")) {
      Serial.println("[Manual Test] Triggering 1-second buzzer test...");
      applyActuators("RED", true);
      delay(1000);
      applyActuators("GREEN", false);
      return;
    }

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
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(300);

  // GPIO Pins
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BUTTON_SOS, INPUT_PULLUP);

  digitalWrite(PIN_BUZZER, LOW);

  // Audible startup check: 2 crisp beeps confirming buzzer hardware is alive
  digitalWrite(PIN_BUZZER, HIGH);
  delay(120);
  digitalWrite(PIN_BUZZER, LOW);
  delay(80);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(120);
  digitalWrite(PIN_BUZZER, LOW);

  applyActuators("BLUE", false);

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
  WiFi.setTxPower(WIFI_POWER_8_5dBm);

  wifi_promiscuous_filter_t filt = {
    .filter_mask = WIFI_PROMIS_FILTER_MASK_MGMT
  };
  esp_wifi_set_promiscuous_filter(&filt);
  esp_wifi_set_promiscuous_rx_cb(&wifi_promiscuous_rx_cb);
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(currentChannel, WIFI_SECOND_CHAN_NONE);

  Serial.println("\n[CrowdPulse Node] Physical Edge Sensing Node Booted!");

  runAmbientCalibration();

  Serial.println("[CrowdPulse Node] Telemetry Streaming Active...");
}

// ---------------- MAIN LOOP ----------------
void loop() {
  unsigned long now = millis();

  // 1. Process incoming commands from Serial
  parseSerialCommands();

  // 2. Button Handling (GPIO 11): Click = Calibrate / Silence, Hold (1s) = SOS
  static bool lastBtnState = HIGH;
  static unsigned long btnPressTime = 0;
  static bool btnHandled = false;

  // Forward state references for button override
  static unsigned long surgeAlarmUntil = 0;
  static unsigned long surgeCooldownUntil = 0;

  bool btnState = digitalRead(PIN_BUTTON_SOS);
  if (btnState == LOW && lastBtnState == HIGH) {
    btnPressTime = now;
    btnHandled = false;
  } else if (btnState == LOW && !btnHandled) {
    if (now - btnPressTime >= 1000) {
      sosActive = !sosActive;
      btnHandled = true;
      if (sosActive) {
        Serial.println("[Button] SOS Panic Alarm ACTIVATED!");
        applyActuators("RED", true);
      } else {
        Serial.println("[Button] SOS Panic Alarm SILENCED.");
        surgeAlarmUntil = 0;
        surgeCooldownUntil = now + 1500;
        applyActuators("GREEN", false);
      }
    }
  } else if (btnState == HIGH && lastBtnState == LOW) {
    if (!btnHandled && (now - btnPressTime >= 40) && (now - btnPressTime < 1000)) {
      if (sosActive || (now < surgeAlarmUntil)) {
        // Quick tap immediately silences any active alarm!
        sosActive = false;
        surgeAlarmUntil = 0;
        surgeCooldownUntil = now + 1500;
        applyActuators("GREEN", false);
        Serial.println("[Button] Alarm manually silenced via quick tap.");
      } else {
        runAmbientCalibration();
      }
    }
    btnHandled = true;
  }
  lastBtnState = btnState;

  // 3. Sample Microphone via I2S
  currentDb = readMicrophoneDb();

  // Only adapt ambient baseline when no alarm or cooldown is active
  if (now >= surgeCooldownUntil && currentDb < (ambientBaselineDb + 4.0) && currentDb > 35.0) {
    ambientBaselineDb = (0.999f * ambientBaselineDb) + (0.001f * currentDb);
  }

  // 4. Wi-Fi Channel Hopping (every 200ms)
  if (now - lastHopTime >= 200) {
    lastHopTime = now;
    currentChannel++;
    if (currentChannel > 13) currentChannel = 1;
    esp_wifi_set_channel(currentChannel, WIFI_SECOND_CHAN_NONE);
  }

  // 5. Wi-Fi Packet Rate
  if (now - lastPacketRateCalcTime >= 1000) {
    lastPacketRateCalcTime = now;
    currentPacketRate = (float)packetsInLastSec;
    packetsInLastSec = 0;
  }

  // 6. Read DHT every 2s
  if (now - lastDhtTime >= DHT_INTERVAL) {
    lastDhtTime = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentTemp = t;
    if (!isnan(h)) currentHum = h;
  }

  // 7. Dynamic Decision Logic with Anti-Feedback Guard & Persistence Confirmation
  // Normal conversational speech is ~58-70 dB -> NORMAL / SAFE (Green LED, Buzzer OFF)
  // Raised shouting / high crowd noise >= 75 dB (or +14 dB over room) -> CAUTION (Yellow LED)
  // True Acoustic Panic Surge >= 84 dB (or +24 dB over room) sustained for >= 3 cycles -> SURGE RISK (Red + Buzzer)
  float cautionThreshold = max(75.0f, ambientBaselineDb + cautionDeltaDb);
  float surgeThreshold   = max(84.0f, ambientBaselineDb + surgeDeltaDb);

  // Anti-Acoustic Feedback Check:
  // If the buzzer is ALREADY buzzing or within cooldown, ignore the mic
  // so the buzzer's own sound does not re-trigger itself!
  bool isAlarmActive = (now < surgeAlarmUntil);
  bool isCoolingDown = (now < surgeCooldownUntil);

  static int surgeHitCount = 0;

  if (!isAlarmActive && !isCoolingDown) {
    if (currentDb >= surgeThreshold) {
      surgeHitCount++;
      // Require at least 3 consecutive cycles (approx 150-200ms sustained loud sound)
      // This prevents conversational syllables, plosives, and mic clicks from falsely triggering!
      if (surgeHitCount >= 3) {
        // Genuine sustained loud panic/stampede surge: sound alarm for exactly 2 seconds!
        surgeAlarmUntil = now + 2000;
        surgeCooldownUntil = surgeAlarmUntil + 1500; // 1.5s quiet cooldown after alarm stops
        surgeHitCount = 0;
        Serial.println("🚨 [ACOUSTIC SURGE] Loud emergency sound confirmed! Alarm triggered for 2 seconds.");
      }
    } else {
      // Decay hit counter smoothly
      if (surgeHitCount > 0) surgeHitCount--;
    }
  } else {
    surgeHitCount = 0;
  }

  bool acousticSurgeActive = (now < surgeAlarmUntil);

  if (sosActive) {
    // Priority 1: Physical SOS Panic Button pressed -> Red LED + Alarm Buzzer
    applyActuators("RED", true);
  } else if (acousticSurgeActive) {
    // Priority 2: Genuine acoustic surge / clap -> Red LED + Alarm Buzzer (fixed 2.0s burst)
    applyActuators("RED", true);
  } else if (hasRemoteCommand && (now - lastSerialCmdTime <= 3000) && (remoteLed == "RED" || remoteBuzzer)) {
    // Priority 3: Backend Computer Vision detected stampede -> Red LED + Buzzer
    applyActuators("RED", remoteBuzzer);
  } else if (!acousticSurgeActive && !isCoolingDown && currentDb >= cautionThreshold) {
    // Priority 4: Moderate noise / crowd buildup -> Yellow LED, Buzzer OFF
    applyActuators("YELLOW", false);
  } else if (hasRemoteCommand && (now - lastSerialCmdTime <= 3000)) {
    // Priority 5: Backend nominal command
    applyActuators(remoteLed, remoteBuzzer);
  } else {
    // Priority 6: Safe Room Ambient -> Green LED, Buzzer OFF
    applyActuators("GREEN", false);
  }

  // 8. Stream JSON Telemetry (every 500ms)
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;

    int activeCount = 0;
    for (int i = 0; i < totalDevicesKnown; i++) {
      if (now - trackedDevices[i].lastSeen <= 30000) {
        activeCount++;
      }
    }
    activeDevicesRolling = activeCount;

    Serial.print("{\"temperature\":");
    Serial.print(currentTemp, 1);
    Serial.print(",\"humidity\":");
    Serial.print(currentHum, 1);
    Serial.print(",\"noise_db\":");
    Serial.print(currentDb, 1);
    Serial.print(",\"baseline_db\":");
    Serial.print(ambientBaselineDb, 1);
    Serial.print(",\"acoustic_surge\":");
    Serial.print(max(0.0f, currentDb - ambientBaselineDb), 1);
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

    updateOledDisplay();
  }

  delay(15);
}