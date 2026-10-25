/*
 * ==============================================================================
 * CrowdPulse - STEP 1: DHT11 Sensor Test
 * 
 * Hardware:
 *   - DHT11 (Blue Sensor)
 *   - ESP32 or ESP32-S3 (or Arduino Uno)
 * 
 * Wiring (Only 3 Wires):
 *   - DHT11 VCC (+)  --> ESP32 3V3 (or 5V)
 *   - DHT11 DATA (S) --> ESP32 GPIO 4
 *   - DHT11 GND (-)  --> ESP32 GND
 * 
 * ==============================================================================
 */

#include <Arduino.h>
#include <DHT.h>

#define DHTPIN  4       // GPIO 4
#define DHTTYPE DHT11   // DHT 11 blue sensor

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[CrowdPulse Step 1] Initializing DHT11 Sensor...");
  dht.begin();
  Serial.println("[CrowdPulse Step 1] Sensor ready! Starting readings...\n");
}

void loop() {
  // DHT11 updates once every 1 to 2 seconds
  delay(1500);

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Check if reading failed
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ ERROR: Failed to read from DHT11! Check wiring to GPIO 4.");
    return;
  }

  // 1. Human-Readable Print
  Serial.print("✅ Temp: ");
  Serial.print(temperature, 1);
  Serial.print(" °C  |  Humidity: ");
  Serial.print(humidity, 1);
  Serial.println(" %");

  // 2. CrowdPulse JSON Format (works with CrowdPulse Serial Listener directly!)
  Serial.print("{\"temperature\":");
  Serial.print(temperature, 1);
  Serial.print(",\"humidity\":");
  Serial.print(humidity, 1);
  Serial.print(",\"noise_db\":45.0,\"motion\":false,\"device_id\":\"ESP32-DHT11\"}\n");
}
