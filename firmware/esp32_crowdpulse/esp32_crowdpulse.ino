/*
 * ==============================================================================
 * CrowdPulse Enterprise v4.1 - Master ESP32-S3 Physical Edge Node
 * Target Microcontroller: ESP32-S3 WROOM (N16R8)
 * 
 * Verified Hardware Pinout:
 *   1. DHT11 Climate Sensor:      GPIO 4
 *   2. INMP441 I2S Digital Mic:   SD=7, SCK=15, WS=16, L/R=GND, VDD=3.3V
 *   3. 4-Pin RGB Status LED:      Red=1, Green=2, Blue=3, Common=GND (220 Ohm resistors)
 *   4. 5V Buzzer Driver (2N2222): GPIO 10 (1k Ohm to Base, 1N4148 flyback diode)
 *   5. 0.96" I2C OLED (SSD1306):  SDA=8, SCL=9, VDD=3.3V, GND=GND
 *   6. Emergency SOS Push Button: GPIO 11 (Internal Pullup, other leg to GND)
 * 
 * Communication:
 *   - Continuous 115200 baud JSON Telemetry streaming to CrowdPulse backend.
 *   - Real-time bidirectional actuator control (Buzzer & RGB LED directives).
 * ==============================================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <driver/i2s.h>
#include <math.h>

// ---------------- PIN DEFINITIONS ----------------
#define PIN_DHT          4   // DHT11 Data
#define PIN_LED_RED      1   // RGB Red
#define PIN_LED_GREEN    2   // RGB Green
#define PIN_LED_BLUE     3   // RGB Blue
#define PIN_BUZZER      10   // 2N2222 Transistor Base
#define PIN_BUTTON_SOS  11   // Emergency Push Button

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

// ---------------- OBJECTS & CONFIG ----------------
DHT dht(PIN_DHT, DHT11);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

const bool COMMON_ANODE = false; // false = Common Cathode

// State Tracking
String currentStatus = "NORMAL";
String currentLedColor = "GREEN";
bool currentBuzzer = false;
bool sosActive = false;

float currentTemp = 25.0;
float currentHum = 50.0;
float currentDb = 42.0;

unsigned long lastTelemetryTime = 0;
unsigned long lastDhtTime = 0;
const unsigned long TELEMETRY_INTERVAL = 500; // Emit JSON every 500ms
const unsigned long DHT_INTERVAL = 2000;       // Read DHT every 2s

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

  digitalWrite(PIN_BUZZER, buzzer ? HIGH : LOW);
}

// ---------------- SENSING FUNCTIONS ----------------
float readMicrophoneDb() {
  int32_t samples[SAMPLES_NUM];
  size_t bytes_read = 0;
  esp_err_t result = i2s_read(I2S_PORT, (char*)samples, sizeof(samples), &bytes_read, 20);

  if (result == ESP_OK && bytes_read > 0) {
    int count = bytes_read / sizeof(int32_t);
    int64_t sum_squares = 0;
    for (int i = 0; i < count; i++) {
      int32_t s = samples[i] >> 8;
      sum_squares += (int64_t)s * s;
    }
    double rms = sqrt((double)sum_squares / (double)count);
    double db = 40.0;
    if (rms > 10.0) {
      db = 20.0 * log10(rms / 100.0) + 40.0;
    }
    if (db < 38.0) db = 38.0;
    if (db > 105.0) db = 105.0;
    return (float)db;
  }
  return currentDb;
}

// ---------------- OLED GRAPHICS ----------------
void updateOledDisplay() {
  display.clearDisplay();

  // Header Bar
  display.fillRect(0, 0, 128, 11, SSD1306_WHITE);
  display.setTextSize(1);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setCursor(4, 2);
  display.print("CROWDPULSE");
  display.setCursor(82, 2);
  display.print("[ONLINE]");

  // Status Banner
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(2, 15);
  display.print("STATUS: ");
  if (sosActive) {
    display.print("🚨 SOS ALARM!");
  } else {
    display.print(currentStatus);
  }

  // Noise Decibels & Visual Meter Bar
  display.setCursor(2, 27);
  display.print("NOISE : ");
  display.print(currentDb, 1);
  display.print(" dB");

  // Bar meter: scale 40dB to 95dB across 120 pixels
  int barWidth = map((int)currentDb, 40, 95, 0, 120);
  if (barWidth < 0) barWidth = 0;
  if (barWidth > 120) barWidth = 120;
  display.drawRect(2, 37, 124, 7, SSD1306_WHITE);
  display.fillRect(4, 39, barWidth, 3, SSD1306_WHITE);

  // Climate (DHT11)
  display.setCursor(2, 49);
  display.print("T:");
  display.print(currentTemp, 1);
  display.print("C  H:");
  display.print(currentHum, 0);
  display.print("%");

  display.setCursor(80, 49);
  display.print("LED:");
  display.print(currentLedColor.substring(0, 3));

  display.display();
}

// ---------------- SERIAL COMMAND PARSER ----------------
void parseSerialCommands() {
  while (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      // Fast manual parser for commands like {"buzzer": 1, "led": "RED"}
      bool buzz = currentBuzzer;
      String led = currentLedColor;

      if (line.indexOf("\"buzzer\": 1") > 0 || line.indexOf("\"buzzer\":1") > 0 || line.indexOf("\"buzzer\": true") > 0) {
        buzz = true;
      } else if (line.indexOf("\"buzzer\": 0") > 0 || line.indexOf("\"buzzer\":0") > 0 || line.indexOf("\"buzzer\": false") > 0) {
        buzz = false;
      }

      if (line.indexOf("\"RED\"") > 0 || line.indexOf("\"red\"") > 0) {
        led = "RED";
      } else if (line.indexOf("\"YELLOW\"") > 0 || line.indexOf("\"yellow\"") > 0) {
        led = "YELLOW";
      } else if (line.indexOf("\"GREEN\"") > 0 || line.indexOf("\"green\"") > 0) {
        led = "GREEN";
      } else if (line.indexOf("\"BLUE\"") > 0 || line.indexOf("\"blue\"") > 0) {
        led = "BLUE";
      }

      applyActuators(led, buzz);
    }
  }
}

// ---------------- SETUP & LOOP ----------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BUTTON_SOS, INPUT_PULLUP);

  applyActuators("GREEN", false);

  // Startup Chirps
  digitalWrite(PIN_BUZZER, HIGH);
  delay(80);
  digitalWrite(PIN_BUZZER, LOW);
  delay(80);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(80);
  digitalWrite(PIN_BUZZER, LOW);

  // Initialize Sensors
  dht.begin();
  setupI2S();

  // Initialize OLED Display
  Wire.begin(I2C_SDA, I2C_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(14, 20);
    display.println("CROWDPULSE AI");
    display.setCursor(10, 36);
    display.println("Master Node Boot...");
    display.display();
    delay(1500);
  }

  Serial.println("\n[CrowdPulse Node] Physical Edge Sensing Node Ready!");
}

void loop() {
  unsigned long now = millis();

  // 1. Process incoming commands from CrowdPulse backend
  parseSerialCommands();

  // 2. Sample INMP441 Microphone continuously
  currentDb = readMicrophoneDb();

  // 3. Sample DHT11 every 2 seconds
  if (now - lastDhtTime >= DHT_INTERVAL) {
    lastDhtTime = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentTemp = t;
    if (!isnan(h)) currentHum = h;
  }

  // 4. Check SOS Push Button (Active LOW)
  if (digitalRead(PIN_BUTTON_SOS) == LOW) {
    sosActive = true;
    applyActuators("RED", true);
  } else if (sosActive) {
    sosActive = false;
    applyActuators("GREEN", false);
  }

  // 5. Automatic local safety threshold
  if (!sosActive && currentDb > 85.0) {
    applyActuators("YELLOW", false); // Auto caution on high decibels
  }

  // 6. Transmit Telemetry JSON to CrowdPulse backend
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = now;

    // Emits standard CrowdPulse JSON Packet
    Serial.print("{\"temperature\":");
    Serial.print(currentTemp, 1);
    Serial.print(",\"humidity\":");
    Serial.print(currentHum, 1);
    Serial.print(",\"noise_db\":");
    Serial.print(currentDb, 1);
    Serial.print(",\"motion\":");
    Serial.print(sosActive ? "true" : "false");
    Serial.print(",\"device_id\":\"ESP32-S3-CROWDPULSE\"}\n");

    // Refresh OLED Display
    updateOledDisplay();
  }

  delay(20);
}
