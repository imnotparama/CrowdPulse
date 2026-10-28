import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch

os.makedirs('report/images', exist_ok=True)

# ---------------------------------------------------------------------------
# Figure 3: Complete Circuit (Wiring) Schematic with ZERO Overlaps
# ---------------------------------------------------------------------------
def generate_clean_circuit_diagram():
    fig, ax = plt.subplots(figsize=(10.5, 6.8), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Background canvas
    bg = patches.Rectangle((0, 0), 100, 100, facecolor='#ffffff', edgecolor='#0f172a', linewidth=1.5)
    ax.add_patch(bg)

    # Title Banner
    ax.text(50, 95.5, 'INTERFACING CIRCUIT SCHEMATIC: SENSORS & ACTUATORS WITH MCU',
            ha='center', va='center', fontsize=11, fontweight='bold', fontfamily='serif', color='#0f172a')

    # Central MCU Block (ESP32-S3 / 8051)
    # Position: x = 36 to 64 (w=28), y = 10 to 88 (h=78)
    mcu_box = FancyBboxPatch((36, 10), 28, 78, boxstyle="square,pad=0",
                             facecolor='#f8fafc', edgecolor='#1e3a8a', linewidth=2.2)
    ax.add_patch(mcu_box)

    # MCU Header text inside box
    ax.text(50, 84, 'ESP32-S3 / 8051', ha='center', va='center',
            fontsize=11.5, fontweight='bold', fontfamily='serif', color='#1e3a8a')
    ax.text(50, 80.5, 'MICROCONTROLLER CORE', ha='center', va='center',
            fontsize=8, fontfamily='serif', color='#475569')
    ax.plot([38, 62], [78, 78], color='#cbd5e1', lw=1.2)

    # Left Peripheral Blocks (x = 3 to 26, w = 23)
    def draw_periph(x, y, w, h, title, sub, details, fill, edge):
        box = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0",
                             facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + w/2, y + h - 2.8, title, ha='center', va='center',
                fontsize=8.5, fontweight='bold', fontfamily='serif', color='#0f172a')
        if sub:
            ax.text(x + w/2, y + h - 6.0, sub, ha='center', va='center',
                    fontsize=7.2, fontfamily='serif', fontstyle='italic', color='#475569')
        if details:
            ax.text(x + w/2, y + (h - 7.5)/2, details, ha='center', va='center',
                    fontsize=6.8, fontfamily='monospace', color='#1e293b')

    # 1. AM2302 (DHT22)
    draw_periph(3, 68, 23, 16, 'AM2302 (DHT22) SENSOR', 'Temperature & Relative Humidity',
                '1-Wire Bus (10kΩ Pull-up)\nVCC: 3.3V | GND: 0V\nPin 2: DATA -> GPIO 4', '#f0f9ff', '#0284c7')

    # 2. INMP441 MEMS Microphone
    draw_periph(3, 44, 23, 21, 'INMP441 MEMS MIC', 'I2S 24-bit Digital Audio',
                'SCK  -> GPIO 16 (BCLK)\nWS   -> GPIO 15 (LRCK)\nSD   -> GPIO 7  (Data)\nVDD: 3.3V | L/R: GND', '#f0fdf4', '#16a34a')

    # 3. HC-SR501 PIR Motion Sensor
    draw_periph(3, 28, 23, 13, 'HC-SR501 PIR SENSOR', 'Kinematic Motion Detector',
                'VCC: 5V | GND: 0V\nOUT -> GPIO 5 / P2.1', '#fefce8', '#ca8a04')

    # 4. SSD1306 OLED HUD
    draw_periph(3, 12, 23, 13, 'SSD1306 OLED (0.96")', '128x64 Graphic HUD',
                'I2C Fast-Mode (400 kHz)\nSDA -> GPIO 8 | SCL -> GPIO 9', '#e0e7ff', '#4f46e5')

    # Right Peripheral Blocks (x = 74 to 97, w = 23)
    # 1. Active Buzzer Driver
    draw_periph(74, 68, 23, 16, 'ACTIVE BUZZER DRIVER', '2N2222 NPN BJT Stage',
                '1kΩ Base Resistor\n1N4148 Flyback Diode\nDrive -> GPIO 10 / P1.0', '#fef2f2', '#dc2626')

    # 2. Tri-Color RGB LED Beacon
    draw_periph(74, 46, 23, 19, 'RGB STATUS BEACON', 'Common-Cathode Indicator',
                'Red LED   -> GPIO 3\nGreen LED -> GPIO 46\n3x 220Ω Limiting Resistors', '#faf5ff', '#9333ea')

    # 3. Manual SOS Pushbutton
    draw_periph(74, 30, 23, 13, 'MANUAL SOS BUTTON', 'Emergency Override Switch',
                'Active-LOW Interrupt\nSignal -> GPIO 11 / INT0', '#fff1f2', '#e11d48')

    # 4. Regulated Power Supply
    draw_periph(74, 12, 23, 15, 'POWER REGULATION', '5V DC & AMS1117-3.3V',
                'Dual Rail: 5V & 3.3V LDO\n10µF Filter Capacitors\nCommon Ground (GND)', '#f1f5f9', '#475569')

    # Wire Connections (LEFT SIDE):
    # From x=26 (peripheral right edge) to x=36 (MCU left edge)
    # The pin label is printed INSIDE the MCU (x=37 to 48), so the wire line stops at x=36.
    left_wires = [
        (76, 'GPIO 4 / P2.0', '#0284c7'),
        (60, 'GPIO 7 (SD)', '#16a34a'),
        (54, 'GPIO 15 (WS)', '#16a34a'),
        (48, 'GPIO 16 (SCK)', '#16a34a'),
        (34, 'GPIO 5 / P2.1', '#ca8a04'),
        (18, 'GPIO 8 / 9 (I2C)', '#4f46e5'),
    ]

    for wy, label, col in left_wires:
        # Wire line between peripheral and MCU
        ax.plot([26, 36], [wy, wy], color='#0f172a', lw=1.5)
        # Port connection terminal dot on MCU boundary
        ax.plot(36, wy, marker='o', markersize=4, color=col)
        # Pin label rendered INSIDE the MCU box (left-aligned, starting at x=37.5)
        ax.text(37.5, wy, label, ha='left', va='center',
                fontsize=7.2, fontfamily='monospace', fontweight='bold', color=col)

    # Wire Connections (RIGHT SIDE):
    # From x=64 (MCU right edge) to x=74 (peripheral left edge)
    # The pin label is printed INSIDE the MCU (x=52 to 62.5), so the wire line starts at x=64.
    right_wires = [
        (76, 'GPIO 10 / P1.0', '#dc2626'),
        (58, 'GPIO 3 (Red)', '#dc2626'),
        (50, 'GPIO 46 (Green)', '#16a34a'),
        (36, 'GPIO 11 / INT0', '#e11d48'),
        (19, '3.3V / 5V / GND', '#475569'),
    ]

    for wy, label, col in right_wires:
        # Wire line between MCU and peripheral
        ls = '--' if 'GND' in label else '-'
        ax.plot([64, 74], [wy, wy], color='#0f172a', lw=1.5, linestyle=ls)
        # Port connection terminal dot on MCU boundary
        ax.plot(64, wy, marker='o', markersize=4, color=col)
        # Pin label rendered INSIDE the MCU box (right-aligned, ending at x=62.5)
        ax.text(62.5, wy, label, ha='right', va='center',
                fontsize=7.2, fontfamily='monospace', fontweight='bold', color=col)

    plt.tight_layout()
    fig.savefig('report/images/circuit_diagram.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Clean circuit diagram generated with ZERO overlapping lines!")

# ---------------------------------------------------------------------------
# Figure 5: Secondary Flowchart (Acoustic Thresholding & Anti-Feedback Guard)
# ---------------------------------------------------------------------------
def generate_clean_figure_5_acoustic():
    # Increase canvas height and width to provide ample breathing room
    fig, ax = plt.subplots(figsize=(7.5, 6.2), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    def draw_proc(x, y, w, h, line1, line2=None, line3=None, fill='#e0f2fe', edge='#0284c7'):
        box = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0",
                             facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        if line3:
            ax.text(x + w/2, y + h * 0.72, line1, ha='center', va='center',
                    fontsize=8.5, fontweight='bold', fontfamily='serif', color='#0f172a')
            ax.text(x + w/2, y + h * 0.46, line2, ha='center', va='center',
                    fontsize=8.0, fontfamily='serif', color='#1e293b')
            ax.text(x + w/2, y + h * 0.22, line3, ha='center', va='center',
                    fontsize=7.5, fontfamily='serif', fontstyle='italic', color='#475569')
        elif line2:
            ax.text(x + w/2, y + h * 0.65, line1, ha='center', va='center',
                    fontsize=8.5, fontweight='bold', fontfamily='serif', color='#0f172a')
            ax.text(x + w/2, y + h * 0.32, line2, ha='center', va='center',
                    fontsize=8.0, fontfamily='serif', color='#1e293b')
        else:
            ax.text(x + w/2, y + h/2, line1, ha='center', va='center',
                    fontsize=8.5, fontfamily='serif', color='#0f172a')

    def draw_oval(x, y, w, h, text, fill='#dcfce7', edge='#16a34a'):
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.2,rounding_size=3",
                             facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + w/2, y + h/2, text, ha='center', va='center',
                fontsize=9.5, fontweight='bold', fontfamily='serif', color='#0f172a')

    def draw_diamond(x, y, w, h, line1, line2, fill='#fef3c7', edge='#d97706'):
        poly = patches.Polygon([
            (x + w/2, y + h), (x + w, y + h/2),
            (x + w/2, y), (x, y + h/2)
        ], facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(poly)
        ax.text(x + w/2, y + h * 0.60, line1, ha='center', va='center',
                fontsize=8.5, fontfamily='serif', color='#0f172a')
        ax.text(x + w/2, y + h * 0.38, line2, ha='center', va='center',
                fontsize=8.5, fontfamily='serif', color='#0f172a')

    # 1. START Node
    draw_oval(36, 88, 28, 8, 'START')
    ax.annotate('', xy=(50, 76), xytext=(50, 88),
                arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.4))

    # 2. Read I2S Audio Node
    draw_proc(20, 62, 60, 14,
              'Read INMP441 I2S 24-bit Audio Frames',
              'Compute RMS Amplitude & Sound Pressure Level (L_dB)',
              fill='#e0f2fe', edge='#0284c7')
    ax.annotate('', xy=(50, 48), xytext=(50, 62),
                arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.4))

    # 3. Decision Diamond
    draw_diamond(25, 26, 50, 22,
                 'L_dB > Baseline + 14 dB',
                 'and not in Cooldown?')

    # YES Path (Downwards to Node 4)
    ax.annotate('', xy=(50, 17), xytext=(50, 26),
                arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.4))
    ax.text(52, 21.5, 'Yes', fontsize=8.5, fontfamily='serif', fontstyle='italic', fontweight='bold', color='#15803d')

    # 4. Emergency Buzzer Actuation & Anti-Feedback Guard Node
    # Box: x = 14 to 86 (w = 72), y = 2 to 17 (h = 15) -> Plenty of internal padding!
    draw_proc(14, 2, 72, 15,
              'Assert GPIO 10: Buzzer Active (2.0s alarm burst)',
              'Engage 1.5s Refractory Blanking Guard',
              '(Microphone input ignored to prevent acoustic self-loop)',
              fill='#fee2e2', edge='#dc2626')

    # NO Path (Rightwards, Downwards, then enters right edge of Node 4)
    # Diamond right corner is at (75, 37)
    ax.annotate('', xy=(90, 37), xytext=(75, 37),
                arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.text(78, 39, 'No', fontsize=8.5, fontfamily='serif', fontstyle='italic', fontweight='bold', color='#b91c1c')

    ax.annotate('', xy=(90, 9.5), xytext=(90, 37),
                arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    # Arrow into the right edge of Node 4 (x=86, y=9.5)
    ax.annotate('', xy=(86, 9.5), xytext=(90, 9.5),
                arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    # Continuous DSP Loop Return Path (Leftwards, Upwards to Node 2)
    # Starts at left edge of Node 4 (x=14, y=9.5)
    ax.annotate('', xy=(6, 9.5), xytext=(14, 9.5),
                arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(6, 69), xytext=(6, 9.5),
                arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(20, 69), xytext=(6, 69),
                arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    # Clean label on return wire with solid background box so it never cuts into lines
    ax.text(6, 39, 'Continuous Acoustic DSP Loop',
            ha='center', va='center', rotation=90,
            fontsize=7.8, fontfamily='serif', fontstyle='italic', color='#0f172a',
            bbox=dict(boxstyle="square,pad=0.35", fc="#ffffff", ec="#cbd5e1", lw=1))

    plt.tight_layout()
    fig.savefig('report/images/figure5_flowchart_acoustic.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Clean Figure 5 Flowchart generated with ZERO overlapping text!")

# ---------------------------------------------------------------------------
# Figure 4: Clean Operation Flowchart
# ---------------------------------------------------------------------------
def generate_clean_figure_4_flowchart():
    fig, ax = plt.subplots(figsize=(6.8, 9.6), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    def draw_proc(x, y, w, h, text, fill='#e0f2fe', edge='#0284c7'):
        box = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0",
                             facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + w/2, y + h/2, text, ha='center', va='center',
                fontsize=8.5, fontfamily='serif', color='#0f172a')

    def draw_oval(x, y, w, h, text, fill='#dcfce7', edge='#16a34a'):
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.2,rounding_size=3",
                             facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + w/2, y + h/2, text, ha='center', va='center',
                fontsize=9.5, fontweight='bold', fontfamily='serif', color='#0f172a')

    def draw_diamond(x, y, w, h, text, fill='#fef3c7', edge='#d97706'):
        poly = patches.Polygon([
            (x + w/2, y + h), (x + w, y + h/2),
            (x + w/2, y), (x, y + h/2)
        ], facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(poly)
        ax.text(x + w/2, y + h/2, text, ha='center', va='center',
                fontsize=8.5, fontfamily='serif', color='#0f172a')

    # Nodes
    draw_oval(37, 94, 26, 5, 'START')
    ax.annotate('', xy=(50, 89), xytext=(50, 94), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    draw_proc(24, 83, 52, 6, 'Initialise GPIO, I2S bus, AM2302,\nOLED, buzzer, RGB LED and Wi-Fi/UART')
    ax.annotate('', xy=(50, 78), xytext=(50, 83), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    draw_proc(26, 72, 48, 6, 'Sample ambient baseline room noise\n(3 seconds auto-calibration)')
    ax.annotate('', xy=(50, 67), xytext=(50, 72), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    draw_proc(26, 61, 48, 6, 'Read sensors: AM2302 (T/H), INMP441\n(dB SPL), PIR motion, Wi-Fi RSSI')
    ax.annotate('', xy=(50, 56), xytext=(50, 61), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    draw_diamond(34, 46, 32, 10, 'Acoustic surge\n> Baseline + 7dB?')
    ax.annotate('', xy=(50, 41), xytext=(50, 46), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(52, 43.5, 'Yes', fontsize=7.8, fontfamily='serif', fontstyle='italic', fontweight='bold', color='#15803d')

    # No branch from Diamond 1
    ax.annotate('', xy=(86, 51), xytext=(66, 51), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(86, 30), xytext=(86, 51), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(72, 30), xytext=(86, 30), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(70, 52.5, 'No', fontsize=7.8, fontfamily='serif', fontstyle='italic', fontweight='bold', color='#b91c1c')

    draw_proc(26, 35, 48, 6, 'Compute Fused Risk Index:\nR = w1*rho + w2*V + w3*S + w4*E')
    ax.annotate('', xy=(50, 30), xytext=(50, 35), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    draw_diamond(34, 20, 32, 10, 'Stampede Risk\n>= 70% or SOS?')
    ax.annotate('', xy=(50, 15), xytext=(50, 20), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(52, 17.5, 'Yes', fontsize=7.8, fontfamily='serif', fontstyle='italic', fontweight='bold', color='#15803d')

    # No branch from Diamond 2
    draw_proc(72, 22, 25, 6, 'Set LED GREEN\nBuzzer OFF', fill='#dcfce7', edge='#16a34a')
    # Clean arrow connection: leaves diamond at (66, 25), enters box at (72, 25)
    ax.annotate('', xy=(72, 25), xytext=(66, 25), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(68, 26.5, 'No', fontsize=7.8, fontfamily='serif', fontstyle='italic', fontweight='bold', color='#b91c1c')

    draw_proc(24, 9, 52, 6, 'Trigger 2N2222 Buzzer (2.0s burst),\nLED RED strobe, WebSocket CRITICAL alert', fill='#fee2e2', edge='#dc2626')
    ax.annotate('', xy=(50, 4), xytext=(50, 9), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    draw_proc(26, 0, 48, 4, 'Send telemetry JSON packet to backend')

    # Loop back from bottom to Read sensors
    ax.annotate('', xy=(10, 2), xytext=(26, 2), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(10, 64), xytext=(10, 2), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(26, 64), xytext=(10, 64), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(10, 33, 'next telemetry frame',
            ha='center', va='center', rotation=90, fontsize=7.5, fontfamily='serif', fontstyle='italic',
            bbox=dict(boxstyle="square,pad=0.25", fc="#ffffff", ec="#cbd5e1", lw=1))

    # Connect Green LED to bottom packet sender
    ax.annotate('', xy=(85, 22), xytext=(85, 2), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(74, 2), xytext=(85, 2), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    plt.tight_layout()
    fig.savefig('report/images/figure4_flowchart_operation.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Clean Figure 4 Flowchart generated!")

if __name__ == '__main__':
    generate_clean_circuit_diagram()
    generate_clean_figure_5_acoustic()
    generate_clean_figure_4_flowchart()
    print("All diagrams regenerated with clean typography and zero overlaps!")
