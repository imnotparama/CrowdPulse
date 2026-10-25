/*
 * ==============================================================================
 * CrowdPulse - STEP 2: INMP441 I2S MEMS Microphone Test
 * 
 * Target Board: ESP32-S3 WROOM (N16R8)
 * 
 * Hardware Wiring (6 Wires):
 *   1. INMP441 VDD  --> ESP32 3.3V  (Optionally with 0.1uF capacitor to GND)
 *   2. INMP441 GND  --> ESP32 GND
 *   3. INMP441 SD   --> ESP32 GPIO 7   (Serial Data)
 *   4. INMP441 SCK  --> ESP32 GPIO 15  (Serial Clock / BCLK)
 *   5. INMP441 WS   --> ESP32 GPIO 16  (Word Select / LRCK)
 *   6. INMP441 L/R  --> ESP32 GND      (Selects Left channel)
 * 
 * ==============================================================================
 */

#include <Arduino.h>
#include <driver/i2s.h>
#include <math.h>

// I2S Pin Definitions for ESP32-S3
#define I2S_SD   7   // GPIO 7 (Data Out from mic)
#define I2S_SCK  15  // GPIO 15 (Clock)
#define I2S_WS   16  // GPIO 16 (Word Select)

// I2S Configuration
#define I2S_PORT I2S_NUM_0
#define SAMPLE_RATE 16000
#define SAMPLES_NUM 256

// Initializes the I2S hardware peripheral
void setupI2S() {
  const i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = SAMPLE_RATE,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT, // INMP441 sends 24 bits inside 32-bit slot
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

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=======================================================");
  Serial.println("  CrowdPulse - INMP441 Digital Microphone Test");
  Serial.println("=======================================================");
  
  setupI2S();
  
  Serial.println("✅ INMP441 I2S Driver Started Successfully!");
  Serial.println("👉 Make a sound, talk, or clap to test decibel response:\n");
}

void loop() {
  int32_t samples[SAMPLES_NUM];
  size_t bytes_read = 0;

  // Read audio frames from INMP441 via DMA
  esp_err_t result = i2s_read(I2S_PORT, (char*)samples, sizeof(samples), &bytes_read, portMAX_DELAY);

  if (result == ESP_OK && bytes_read > 0) {
    int samples_count = bytes_read / sizeof(int32_t);
    int64_t sum_squares = 0;

    for (int i = 0; i < samples_count; i++) {
      // INMP441 output is 24-bit MSB-aligned in 32-bit slot: shift right by 8 bits
      int32_t sample = samples[i] >> 8;
      sum_squares += (int64_t)sample * sample;
    }

    // Calculate Root Mean Square (RMS)
    double mean_square = (double)sum_squares / (double)samples_count;
    double rms = sqrt(mean_square);

    // Calculate Sound Pressure Level (dB SPL)
    double db = 40.0;
    if (rms > 10.0) {
      db = 20.0 * log10(rms / 100.0) + 40.0;
    }
    // Clamp to realistic indoor range
    if (db < 38.0) db = 38.0;
    if (db > 105.0) db = 105.0;

    // Visual live volume bar
    int bar_length = (int)((db - 35.0) * 0.7);
    if (bar_length < 0) bar_length = 0;
    if (bar_length > 35) bar_length = 35;

    String bar = "";
    for (int b = 0; b < bar_length; b++) bar += "=";
    while (bar.length() < 35) bar += " ";

    Serial.print("🎤 Audio: [");
    Serial.print(bar);
    Serial.print("]  ");
    Serial.print(db, 1);
    Serial.println(" dB");
  }

  delay(100); // 100ms loop = 10 updates per second
}
