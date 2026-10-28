/*
 * ==============================================================================
 * CrowdPulse - Dedicated Buzzer Diagnostic Test
 * Target Board: ESP32 / ESP32-S3
 * 
 * Hardware Setup:
 *   - ESP32 GPIO 10 ➔ 1kΩ Resistor ➔ 2N2222 Middle Pin (Base)
 *   - Transistor Pin 1 (Left / Emitter) ➔ ESP32 GND
 *   - Transistor Pin 3 (Right / Collector) ➔ Buzzer (-)
 *   - Buzzer (+) ➔ ESP32 3.3V or 5V (VIN)
 * 
 * Test Behavior:
 *   - Visual Indicator: Red LED (GPIO 1) blinks in sync with the buzzer
 *   - Serial Monitor: Prints exact HIGH / LOW status at 115200 baud
 *   - Pattern: 
 *       1. Single 500ms Beep
 *       2. 1 Second Pause
 *       3. Triple Alarm Chirp (100ms ON / 100ms OFF)
 *       4. 1.5 Second Pause (Repeats continuously)
 * ==============================================================================
 */

#include <Arduino.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Hardware Pin Definitions
#define PIN_BUZZER    10   // GPIO 10: 2N2222 Transistor Base via 1k resistor
#define PIN_LED_TEST   1   // GPIO 1: Red LED (visual sync indicator)

// Disable Brownout Detector so inrush current never triggers an ESP32 reset
extern "C" void esp_brownout_init(void) {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
}

void setup() {
  // Disable brownout detector immediately
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(500);

  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_TEST, OUTPUT);

  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_TEST, LOW);

  Serial.println("\n=======================================================");
  Serial.println("  CrowdPulse - Standalone Buzzer Test Starting");
  Serial.println("  Buzzer Pin: GPIO 10");
  Serial.println("  Indicator LED: GPIO 1");
  Serial.println("=======================================================");
}

void loop() {
  // Pattern 1: Solid 500ms Beep
  Serial.println("🔊 [BEEP ON]  GPIO 10 = HIGH (Should be buzzing now)...");
  digitalWrite(PIN_BUZZER, HIGH);
  digitalWrite(PIN_LED_TEST, HIGH);
  delay(500);

  Serial.println("🔇 [BEEP OFF] GPIO 10 = LOW  (Silent)...");
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_TEST, LOW);
  delay(1000);

  // Pattern 2: Triple Rapid Chirp
  Serial.println("🚨 [ALARM PULSE] Testing 3 rapid chirps...");
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_LED_TEST, HIGH);
    delay(100);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_LED_TEST, LOW);
    delay(100);
  }

  Serial.println("--- Pausing 1.5 seconds before next cycle ---\n");
  delay(1500);
}
