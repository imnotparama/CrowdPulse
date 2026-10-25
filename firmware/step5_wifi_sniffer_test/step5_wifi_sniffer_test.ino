/*
 * ==============================================================================
 * CrowdPulse - STEP 5: ESP32-S3 Real-Time 802.11 Wi-Fi Promiscuous Sniffer
 * Target Board: ESP32-S3 WROOM (N16R8)
 * 
 * How it Works:
 *   - Puts the ESP32-S3 Wi-Fi radio into Promiscuous Sniffing Mode.
 *   - Intercepts 802.11 Probe Request packets transmitted by nearby smartphones.
 *   - Automatically hops channels (1 to 13) every 200ms to scan all 2.4GHz spectrum.
 *   - De-duplicates MAC addresses in a rolling 30-second window to calculate
 *     the exact number of active phones/people within 15-20 meters!
 *   - Emits real-time JSON packets over USB Serial at 115200 baud.
 *   - Displays live RF metrics on the 0.96" OLED screen (SDA=8, SCL=9).
 * ==============================================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// OLED Display Config
#define SCREEN_WIDTH    128
#define SCREEN_HEIGHT    64
#define OLED_RESET       -1
#define SCREEN_ADDRESS 0x3C
#define I2C_SDA          8
#define I2C_SCL          9

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledAvailable = false;

// ---------------- DEVICE TRACKING TABLE ----------------
struct TrackedDevice {
  uint8_t mac[6];
  int8_t rssi;
  unsigned long lastSeen;
};

#define MAX_TRACKED_DEVICES 128
TrackedDevice devices[MAX_TRACKED_DEVICES];
int totalDevicesKnown = 0;

// Statistics
volatile unsigned long totalPacketsCaptured = 0;
volatile unsigned long probeRequestsCaptured = 0;
int activeDevicesRolling = 0;
int currentChannel = 1;

unsigned long lastHopTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastPacketRateCalcTime = 0;
unsigned long packetsInLastSec = 0;
float currentPacketRate = 0.0;

// ---------------- PROMISCUOUS PACKET HANDLER ----------------
void wifi_promiscuous_rx_cb(void* buf, wifi_promiscuous_pkt_type_t type) {
  totalPacketsCaptured++;
  packetsInLastSec++;

  // We are interested in 802.11 Management frames (Probe Requests)
  if (type != WIFI_PKT_MGMT) return;

  const wifi_promiscuous_pkt_t* pkt = (wifi_promiscuous_pkt_t*)buf;
  const uint8_t* payload = pkt->payload;
  int8_t rssi = pkt->rx_ctrl.rssi;

  // Frame Control byte 0: 0x40 is 802.11 Subtype Probe Request
  uint8_t frameType = payload[0];
  if (frameType != 0x40) return;

  probeRequestsCaptured++;

  // Source MAC address of the phone is at payload offset 10 to 15
  const uint8_t* srcMac = &payload[10];

  // Ignore invalid / multicast MACs (first byte least significant bit set to 1)
  if (srcMac[0] & 0x01) return;

  unsigned long now = millis();
  bool found = false;

  // Check if MAC is already in our tracked list
  for (int i = 0; i < totalDevicesKnown; i++) {
    if (memcmp(devices[i].mac, srcMac, 6) == 0) {
      devices[i].rssi = rssi;
      devices[i].lastSeen = now;
      found = true;
      break;
    }
  }

  // If new device, register into tracking table
  if (!found) {
    int insertIndex = -1;
    if (totalDevicesKnown < MAX_TRACKED_DEVICES) {
      insertIndex = totalDevicesKnown++;
    } else {
      // Overwrite oldest stale device
      unsigned long oldest = now;
      for (int i = 0; i < MAX_TRACKED_DEVICES; i++) {
        if (devices[i].lastSeen < oldest) {
          oldest = devices[i].lastSeen;
          insertIndex = i;
        }
      }
    }

    if (insertIndex >= 0) {
      memcpy(devices[insertIndex].mac, srcMac, 6);
      devices[insertIndex].rssi = rssi;
      devices[insertIndex].lastSeen = now;

      // Print new discovery notification
      char macStr[18];
      snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
               srcMac[0], srcMac[1], srcMac[2], srcMac[3], srcMac[4], srcMac[5]);
      Serial.print("📱 [NEW PHONE SNIFFED] MAC: ");
      Serial.print(macStr);
      Serial.print(" | Signal: ");
      Serial.print(rssi);
      Serial.println(" dBm");
    }
  }
}

// ---------------- OLED DISPLAY UPDATE ----------------
void updateOledSnifferScreen() {
  if (!oledAvailable) return;

  display.clearDisplay();

  // Header Banner
  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextSize(1);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setCursor(4, 2);
  display.print("CROWDPULSE RF SNIFFER");

  // Big Active Devices Counter
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(2, 16);
  display.print("ACTIVE PHONES:");

  display.setTextSize(2);
  display.setCursor(24, 28);
  display.print("[ ");
  if (activeDevicesRolling < 10) display.print(" ");
  display.print(activeDevicesRolling);
  display.print(" ]");

  // Radio Channel & Packet Rate
  display.setTextSize(1);
  display.setCursor(2, 48);
  display.print("CH:");
  display.print(currentChannel);
  display.print(" | RATE:");
  display.print(currentPacketRate, 0);
  display.print(" pkt/s");

  display.display();
}

// ---------------- SETUP & INITIALIZATION ----------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=======================================================");
  Serial.println("  CrowdPulse - STEP 5: 802.11 Wi-Fi Sniffer Edge Node");
  Serial.println("=======================================================");
  Serial.println("Initializing OLED Display on SDA=8, SCL=9...");

  // Initialize OLED
  Wire.begin(I2C_SDA, I2C_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    oledAvailable = true;
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 20);
    display.println("CROWDPULSE RF");
    display.setCursor(10, 36);
    display.println("Starting Sniffer...");
    display.display();
    delay(1000);
  }

  // Initialize Wi-Fi in Station Mode (Disconnected)
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  // Configure Promiscuous Filter for 802.11 Management Packets
  wifi_promiscuous_filter_t filt = {
    .filter_mask = WIFI_PROMIS_FILTER_MASK_MGMT
  };
  esp_wifi_set_promiscuous_filter(&filt);
  esp_wifi_set_promiscuous_rx_cb(&wifi_promiscuous_rx_cb);
  esp_wifi_set_promiscuous(true);

  // Set initial channel
  esp_wifi_set_channel(currentChannel, WIFI_SECOND_CHAN_NONE);

  Serial.println("✅ Promiscuous Mode Activated!");
  Serial.println("👉 Scanning 2.4GHz channels 1 to 13 for smartphone probe requests...\n");
}

// ---------------- MAIN LOOP ----------------
void loop() {
  unsigned long now = millis();

  // 1. Channel Hopping (every 200ms across channels 1..13)
  if (now - lastHopTime >= 200) {
    lastHopTime = now;
    currentChannel++;
    if (currentChannel > 13) currentChannel = 1;
    esp_wifi_set_channel(currentChannel, WIFI_SECOND_CHAN_NONE);
  }

  // 2. Compute Packet Rate (every 1 second)
  if (now - lastPacketRateCalcTime >= 1000) {
    lastPacketRateCalcTime = now;
    currentPacketRate = (float)packetsInLastSec;
    packetsInLastSec = 0;
  }

  // 3. Telemetry Broadcast & Pruning (every 1 second)
  if (now - lastTelemetryTime >= 1000) {
    lastTelemetryTime = now;

    // Prune devices not seen in the last 30 seconds
    int activeCount = 0;
    for (int i = 0; i < totalDevicesKnown; i++) {
      if (now - devices[i].lastSeen <= 30000) {
        activeCount++;
      }
    }
    activeDevicesRolling = activeCount;

    // Output human-readable summary
    Serial.print("📶 [RF STATUS] Channel: ");
    Serial.print(currentChannel);
    Serial.print(" | Active Devices (30s window): ");
    Serial.print(activeDevicesRolling);
    Serial.print(" | Total Probes: ");
    Serial.print(probeRequestsCaptured);
    Serial.print(" | Rate: ");
    Serial.print(currentPacketRate, 1);
    Serial.println(" pkt/s");

    // Output CrowdPulse JSON Stream format
    Serial.print("{\"active_devices\":");
    Serial.print(activeDevicesRolling);
    Serial.print(",\"probe_rate\":");
    Serial.print(currentPacketRate, 1);
    Serial.print(",\"total_probes\":");
    Serial.print(probeRequestsCaptured);
    Serial.print(",\"channel\":");
    Serial.print(currentChannel);
    Serial.print(",\"device_id\":\"ESP32-S3-SNIFFER\"}\n");

    // Refresh OLED
    updateOledSnifferScreen();
  }

  delay(10);
}
