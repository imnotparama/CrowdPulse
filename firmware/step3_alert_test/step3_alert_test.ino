/*
 * ==============================================================================
 * CrowdPulse - STEP 3: RGB Alert LED & 2N2222 Buzzer Test
 * Target Board: ESP32-S3 WROOM (N16R8)
 * 
 * Pin Assignments:
 *   - RGB LED Red      --> 220 Ohm Resistor --> ESP32 GPIO 1
 *   - RGB LED Green    --> 220 Ohm Resistor --> ESP32 GPIO 2
 *   - RGB LED Blue     --> 220 Ohm Resistor --> ESP32 GPIO 3
 *   - RGB LED Long Leg --> ESP32 GND
 *   - Buzzer Control   --> 1k Ohm Resistor  --> 2N2222 Base --> ESP32 GPIO 10
 * ==============================================================================
 */

#include <Arduino.h>

#define PIN_RED    1   // GPIO 1: Red channel
#define PIN_GREEN  2   // GPIO 2: Green channel
#define PIN_BLUE   3   // GPIO 3: Blue channel
#define PIN_BUZZER 10  // GPIO 10: 2N2222 Buzzer driver

const bool COMMON_ANODE = false; // false = Common Cathode (GND on long pin)

void setColor(bool r, bool g, bool b) {
  digitalWrite(PIN_RED,   COMMON_ANODE ? !r : r);
  digitalWrite(PIN_GREEN, COMMON_ANODE ? !g : g);
  digitalWrite(PIN_BLUE,  COMMON_ANODE ? !b : b);
}

void beep(int ms) {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(ms);
  digitalWrite(PIN_BUZZER, LOW);
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  setColor(false, false, false);
  digitalWrite(PIN_BUZZER, LOW);

  Serial.println("\n=======================================================");
  Serial.println("  CrowdPulse - STEP 3: Alert Actuator Test");
  Serial.println("=======================================================");

  // 1. Immediate Startup Buzzer Test (Two short chirps)
  Serial.println("🔊 Testing Buzzer: Chirp 1...");
  beep(120);
  delay(120);
  Serial.println("🔊 Testing Buzzer: Chirp 2...");
  beep(120);
  delay(500);

  Serial.println("✅ Startup Chirps Complete! Starting Alert Cycles...\n");
}

void loop() {
  // 1. SAFE / NORMAL -> GREEN
  Serial.println("🟢 GREEN : Crowd Flow Normal (Safe, Calm)");
  setColor(false, true, false);
  delay(2000);

  // 2. CAUTION / ELEVATED -> YELLOW (Red + Green)
  Serial.println("🟡 YELLOW: Crowd Density Elevated (Caution)");
  setColor(true, true, false);
  delay(2000);

  // 3. CRITICAL SURGE / STAMPEDE HAZARD -> RED (Fast Strobe + Rapid Beeps)
  Serial.println("🚨 RED   : CRITICAL SURGE ALARM! (Rapid Strobe + Beeps)");
  for (int i = 0; i < 6; i++) {
    setColor(true, false, false);
    digitalWrite(PIN_BUZZER, HIGH);
    delay(100);
    setColor(false, false, false);
    digitalWrite(PIN_BUZZER, LOW);
    delay(100);
  }

  // 4. SYSTEM / CONNECTING -> BLUE
  Serial.println("🔵 BLUE  : Network Sync Pulse");
  setColor(false, false, true);
  delay(1500);

  // Brief pause before next cycle
  setColor(false, false, false);
  delay(1000);
}
