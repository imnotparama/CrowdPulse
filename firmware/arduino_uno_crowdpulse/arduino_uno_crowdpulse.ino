/*
 * ==============================================================================
 * CrowdPulse Enterprise v4.1 - Arduino Uno / Nano Edge Node Firmware
 * Microcontroller: ATmega328P (Arduino Uno R3 / Nano)
 * 
 * Communication: USB Serial @ 115200 baud
 * Pinout:
 *  - DHT11 / DHT22 Data: Digital Pin 4
 *  - Analog Sound Microphone (KY-038 / LM393): Analog Pin A0
 *  - HC-SR501 PIR Motion Sensor: Digital Pin 2 (External Interrupt 0)
 *  - Active Buzzer: Digital Pin 8
 *  - RGB LED (Common Cathode):
 *      Red: Pin 9 (PWM)
 *      Green: Pin 10 (PWM)
 *      Blue: Pin 11 (PWM)
 * ==============================================================================
 */

#include <DHT.h>
#include <ArduinoJson.h>

#define PIN_PIR       2
#define PIN_DHT       4
#define PIN_BUZZER    8
#define PIN_LED_RED   9
#define PIN_LED_GREEN 10
#define PIN_LED_BLUE  11
#define PIN_SOUND_ADC A0

#define DHTTYPE DHT22 // Change to DHT11 if using DHT11 sensor
DHT dht(PIN_DHT, DHTTYPE);

unsigned long lastTransmit = 0;
volatile bool motionFlag = false;
bool currentBuzzer = false;

void pirISR() {
  motionFlag = true;
}

void setRGB(int r, int g, int b) {
  analogWrite(PIN_LED_RED, r);
  analogWrite(PIN_LED_GREEN, g);
  analogWrite(PIN_LED_BLUE, b);
}

void applyActuators(bool buzzerOn, String ledColor) {
  currentBuzzer = buzzerOn;
  digitalWrite(PIN_BUZZER, buzzerOn ? HIGH : LOW);

  ledColor.toUpperCase();
  if (ledColor == "RED") {
    setRGB(255, 0, 0);
  } else if (ledColor == "GREEN") {
    setRGB(0, 255, 0);
  } else if (ledColor == "YELLOW" || ledColor == "AMBER") {
    setRGB(255, 180, 0);
  } else if (ledColor == "BLUE") {
    setRGB(0, 100, 255);
  } else {
    setRGB(0, 0, 0);
  }
}

float getSoundDb() {
  unsigned long sum = 0;
  for (int i = 0; i < 64; i++) {
    int val = analogRead(PIN_SOUND_ADC) - 512;
    sum += (long)val * val;
    delayMicroseconds(100);
  }
  float rms = sqrt(sum / 64.0);
  float db = 44.0 + 20.0 * log10(max(rms, 1.0f) / 5.0f);
  if (db < 40.0) db = 40.0;
  if (db > 100.0) db = 100.0;
  return db;
}

void checkIncomingCommands() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      StaticJsonDocument<128> doc;
      if (!deserializeJson(doc, line)) {
        bool buz = doc["buzzer"] | currentBuzzer;
        const char* led = doc["led"] | "GREEN";
        applyActuators(buz, String(led));
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);

  applyActuators(false, "GREEN");
  attachInterrupt(digitalPinToInterrupt(PIN_PIR), pirISR, RISING);
  dht.begin();
}

void loop() {
  checkIncomingCommands();

  unsigned long now = millis();
  if (now - lastTransmit >= 1000) {
    lastTransmit = now;

    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (isnan(t)) t = 24.5;
    if (isnan(h)) h = 50.0;

    float db = getSoundDb();
    bool motion = motionFlag || (digitalRead(PIN_PIR) == HIGH);
    motionFlag = false;

    StaticJsonDocument<160> doc;
    doc["temperature"] = round(t * 10.0) / 10.0;
    doc["humidity"]    = round(h * 10.0) / 10.0;
    doc["noise_db"]    = round(db * 10.0) / 10.0;
    doc["motion"]      = motion;
    doc["device_id"]   = "ARDUINO-UNO-01";

    String output;
    serializeJson(doc, output);
    Serial.println(output);
  }
}
