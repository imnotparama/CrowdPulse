/*
 * ==============================================================================
 * CrowdPulse - STEP 4: 0.96" I2C OLED Display Graphics Test
 * Target Board: ESP32-S3 WROOM (N16R8)
 * 
 * Hardware Wiring:
 *   - OLED GND  --> ESP32 GND
 *   - OLED VDD  --> ESP32 3.3V
 *   - OLED SCK  --> ESP32 GPIO 9   (I2C SCL)
 *   - OLED SDA  --> ESP32 GPIO 8   (I2C SDA)
 * ==============================================================================
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C

#define I2C_SDA  8   // ESP32-S3 default I2C SDA
#define I2C_SCL  9   // ESP32-S3 default I2C SCL

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

void showSplashScreen() {
  display.clearDisplay();
  display.drawRect(0, 0, 128, 64, SSD1306_WHITE);
  display.drawRect(2, 2, 124, 60, SSD1306_WHITE);

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(20, 12);
  display.println("CROWDPULSE AI");

  display.setCursor(14, 28);
  display.println("Hardware Node v1");

  display.setCursor(22, 44);
  display.println("Starting OLED...");
  display.display();
  delay(2000);
}

void showTelemetryScreen(const char* status, float temp, float hum, float db, int meterPercent) {
  display.clearDisplay();

  // 1. Header Bar
  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextSize(1);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE); // Inverted text on header
  display.setCursor(4, 2);
  display.print("CROWDPULSE");
  display.setCursor(84, 2);
  display.print("[ONLINE]");

  // 2. Status Banner
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(2, 16);
  display.print("STATUS: ");
  display.print(status);

  // 3. Noise / Decibel Meter
  display.setCursor(2, 28);
  display.print("NOISE : ");
  display.print(db, 1);
  display.print(" dB");

  // Visual Volume Bar
  display.drawRect(2, 38, 124, 7, SSD1306_WHITE);
  int fillWidth = map(meterPercent, 0, 100, 0, 120);
  if (fillWidth > 120) fillWidth = 120;
  if (fillWidth < 0) fillWidth = 0;
  display.fillRect(4, 40, fillWidth, 3, SSD1306_WHITE);

  // 4. Climate Info (DHT11)
  display.setCursor(2, 50);
  display.print("T: ");
  display.print(temp, 1);
  display.print("C  |  H: ");
  display.print(hum, 0);
  display.print("%");

  display.display();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n[CrowdPulse Step 4] Initializing OLED Display on SDA=8, SCL=9...");
  Wire.begin(I2C_SDA, I2C_SCL);

  // Initialize display with I2C address 0x3C
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("❌ SSD1306 allocation failed! Check wiring or address.");
    for (;;); // Don't proceed, loop forever
  }

  Serial.println("✅ SSD1306 Display Connected & Initialized!");
  
  // Show Boot Screen
  showSplashScreen();
}

void loop() {
  // Screen 1: Normal Safe State
  Serial.println("📺 OLED Display: Normal Crowd State");
  showTelemetryScreen("SAFE (NORMAL)", 26.4, 55.0, 44.5, 30);
  delay(2500);

  // Screen 2: Caution State
  Serial.println("📺 OLED Display: Caution / High Density");
  showTelemetryScreen("CAUTION (ELEV)", 27.8, 62.0, 72.0, 65);
  delay(2500);

  // Screen 3: Critical Surge Hazard State
  Serial.println("📺 OLED Display: CRITICAL SURGE ALERT!");
  for (int i = 0; i < 4; i++) {
    showTelemetryScreen("CRITICAL SURGE!", 29.5, 68.0, 94.2, 95);
    delay(400);
    display.invertDisplay(true);
    delay(400);
    display.invertDisplay(false);
  }

  delay(1000);
}
