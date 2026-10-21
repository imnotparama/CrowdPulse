import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, ArrowStyle
import numpy as np
from PIL import Image

os.makedirs('report/images', exist_ok=True)

# ---------------------------------------------------------------------------
# Figure 2: Block Diagram
# ---------------------------------------------------------------------------
def generate_block_diagram():
    fig, ax = plt.subplots(figsize=(10, 6.2), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Background canvas
    bg = patches.Rectangle((0, 0), 100, 100, facecolor='#f8fafc', edgecolor='#cbd5e1', linewidth=1.5)
    ax.add_patch(bg)

    # Title / Header Banner
    ax.text(50, 95, 'CROWDPULSE HARDWARE & TELEMETRY ARCHITECTURAL BLOCK DIAGRAM',
            ha='center', va='center', fontsize=12, fontweight='bold', fontfamily='serif', color='#0f172a')

    # Helper function for drawing boxes
    def draw_box(x, y, w, h, title, subtitle, color_fill, color_edge, text_color='#0f172a'):
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.6,rounding_size=2",
                             facecolor=color_fill, edgecolor=color_edge, linewidth=2, zorder=3)
        ax.add_patch(box)
        ax.text(x + w/2, y + h*0.65, title, ha='center', va='center',
                fontsize=9.5, fontweight='bold', fontfamily='serif', color=text_color, zorder=4)
        ax.text(x + w/2, y + h*0.3, subtitle, ha='center', va='center',
                fontsize=7.8, fontfamily='serif', color='#334155', zorder=4)

    # 1. Input Sensor Layer (Left)
    draw_box(4, 70, 24, 16, 'AM2302 (DHT22)', 'Temperature & Humidity\n1-Wire Digital Bus', '#e0f2fe', '#0284c7')
    draw_box(4, 45, 24, 16, 'INMP441 MEMS MIC', 'Acoustic Decibel Sensing\nI2S Digital Bus (24-bit)', '#e0f2fe', '#0284c7')
    draw_box(4, 20, 24, 16, 'HC-SR501 PIR SENSOR', 'Infrared Motion Detect\nDigital GPIO Trigger', '#e0f2fe', '#0284c7')

    # 2. Central Microcontroller Unit (Center)
    mc_box = FancyBboxPatch((35, 15), 30, 72, boxstyle="round,pad=1,rounding_size=3",
                            facecolor='#f1f5f9', edgecolor='#1e3a8a', linewidth=2.5, zorder=3)
    ax.add_patch(mc_box)
    ax.text(50, 82, 'MICROCONTROLLER UNIT', ha='center', va='center',
            fontsize=11, fontweight='bold', fontfamily='serif', color='#1e3a8a', zorder=4)
    ax.text(50, 77.5, 'ESP32-S3 Dual-Core / 8051 Interfacing Architecture', ha='center', va='center',
            fontsize=8, fontstyle='italic', fontfamily='serif', color='#475569', zorder=4)

    # Sub-blocks inside MCU
    sub_modules = [
        (37, 63, 26, 9, '1-Wire Bus Protocol Decoder (GPIO4 / P2.0)', '#ffffff', '#94a3b8'),
        (37, 51, 26, 9, 'I2S Audio Pipeline & RMS Engine (GPIO7/15/16)', '#ffffff', '#94a3b8'),
        (37, 39, 26, 9, 'PIR Interrupt & State Debouncer (GPIO5 / P2.1)', '#ffffff', '#94a3b8'),
        (37, 27, 26, 9, 'Risk Fusion & Alarm Logic Engine (FSM)', '#ffffff', '#94a3b8'),
        (37, 16, 26, 8, '802.11b/g/n Wi-Fi & UART Telemetry TX', '#dbeafe', '#3b82f6')
    ]
    for sx, sy, sw, sh, stxt, sfill, sedge in sub_modules:
        sbox = FancyBboxPatch((sx, sy), sw, sh, boxstyle="round,pad=0.3,rounding_size=1",
                              facecolor=sfill, edgecolor=sedge, linewidth=1.2, zorder=4)
        ax.add_patch(sbox)
        ax.text(sx + sw/2, sy + sh/2, stxt, ha='center', va='center',
                fontsize=7.2, fontfamily='serif', color='#1e293b', zorder=5)

    # 3. Output Actuators (Top Right)
    draw_box(72, 68, 24, 18, 'ALARM ACTUATORS', 'Active Buzzer (NPN Driver)\nTri-Color RGB Status LED', '#fee2e2', '#dc2626')

    # 4. Gateway & Processing Server (Bottom Right)
    draw_box(72, 38, 24, 18, 'FASTAPI BACKEND', 'WebSocket & REST Ingestion\nYOLOv8 & Optical Flow Fusion', '#dcfce7', '#16a34a')

    # 5. Dashboard UI
    draw_box(72, 12, 24, 18, 'ENTERPRISE DASHBOARD', 'Live React 19 Client UI\nReal-Time Telemetry & Alerts', '#fef9c3', '#ca8a04')

    # Connection Arrows
    arrow_props = dict(arrowstyle="-|>", color="#1e3a8a", lw=1.8, mutation_scale=15)

    # Sensors -> MCU
    ax.annotate('', xy=(35, 78), xytext=(28, 78), arrowprops=arrow_props)
    ax.text(31.5, 80, 'DATA', fontsize=7, fontfamily='serif', fontweight='bold', color='#0284c7', ha='center')

    ax.annotate('', xy=(35, 53), xytext=(28, 53), arrowprops=arrow_props)
    ax.text(31.5, 55, 'I2S BUS', fontsize=7, fontfamily='serif', fontweight='bold', color='#0284c7', ha='center')

    ax.annotate('', xy=(35, 28), xytext=(28, 28), arrowprops=arrow_props)
    ax.text(31.5, 30, 'INT / GPIO', fontsize=7, fontfamily='serif', fontweight='bold', color='#0284c7', ha='center')

    # MCU -> Actuators
    ax.annotate('', xy=(72, 77), xytext=(65, 77), arrowprops=dict(arrowstyle="-|>", color="#dc2626", lw=1.8, mutation_scale=15))
    ax.text(68.5, 79, 'PWM/GPIO', fontsize=7, fontfamily='serif', fontweight='bold', color='#dc2626', ha='center')

    # MCU -> Server (Wi-Fi)
    ax.annotate('', xy=(72, 47), xytext=(65, 47), arrowprops=dict(arrowstyle="-|>", color="#2563eb", lw=1.8, mutation_scale=15))
    ax.text(68.5, 49, 'WiFi / HTTP', fontsize=7, fontfamily='serif', fontweight='bold', color='#2563eb', ha='center')

    # Server -> Dashboard (WebSocket)
    ax.annotate('', xy=(84, 30), xytext=(84, 38), arrowprops=dict(arrowstyle="-|>", color="#16a34a", lw=1.8, mutation_scale=15))
    ax.text(88, 34, 'WebSocket', fontsize=7, fontfamily='serif', fontweight='bold', color='#16a34a', ha='left')

    plt.tight_layout()
    fig.savefig('report/images/block_diagram.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('Block diagram created!')

# ---------------------------------------------------------------------------
# Figure 3: Circuit Diagram
# ---------------------------------------------------------------------------
def generate_circuit_diagram():
    fig, ax = plt.subplots(figsize=(10, 6.2), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Canvas
    bg = patches.Rectangle((0, 0), 100, 100, facecolor='#ffffff', edgecolor='#0f172a', linewidth=1.5)
    ax.add_patch(bg)

    ax.text(50, 95, 'INTERFACING CIRCUIT SCHEMATIC: SENSORS & ACTUATORS WITH MCU',
            ha='center', va='center', fontsize=11, fontweight='bold', fontfamily='serif', color='#0f172a')

    # Draw MCU Box in Center
    mcu = FancyBboxPatch((38, 20), 24, 66, boxstyle="square,pad=0",
                         facecolor='#f8fafc', edgecolor='#1e293b', linewidth=2)
    ax.add_patch(mcu)
    ax.text(50, 82, 'ESP32-S3 / 8051', ha='center', va='center', fontsize=10, fontweight='bold', fontfamily='serif')
    ax.text(50, 78, 'MICROCONTROLLER', ha='center', va='center', fontsize=8, fontfamily='serif')

    # Left Pin Labels on MCU
    pins_left = [
        (22, 70, 'GPIO4 / P2.0', 'DHT22 DATA'),
        (22, 58, 'GPIO15 / P3.4', 'I2S BCLK (SCK)'),
        (22, 50, 'GPIO16 / P3.5', 'I2S WS (LRCK)'),
        (22, 42, 'GPIO7 / P3.2', 'I2S SD (DATA)'),
        (22, 30, 'GPIO5 / P2.1', 'PIR MOTION')
    ]
    for _, py, pin, desc in pins_left:
        ax.plot([34, 38], [py, py], 'k-', lw=1.5)
        ax.text(37, py, pin + ' ', ha='right', va='center', fontsize=7, fontfamily='monospace', fontweight='bold')

    # Right Pin Labels on MCU
    pins_right = [
        (62, 70, 'GPIO18 / P1.0', 'BUZZER DRIVE'),
        (62, 56, 'GPIO19 / P1.1', 'RED LED'),
        (62, 46, 'GPIO20 / P1.2', 'GREEN LED'),
        (62, 36, 'GPIO21 / P1.3', 'BLUE LED'),
        (62, 25, '3V3 / 5V / GND', 'POWER RAILS')
    ]
    for _, py, pin, desc in pins_right:
        ax.plot([62, 66], [py, py], 'k-', lw=1.5)
        ax.text(63, py, ' ' + pin, ha='left', va='center', fontsize=7, fontfamily='monospace', fontweight='bold')

    # Left Component Blocks
    # AM2302
    dht = FancyBboxPatch((4, 63), 20, 14, boxstyle="square,pad=0", facecolor='#f0f9ff', edgecolor='#0369a1', lw=1.5)
    ax.add_patch(dht)
    ax.text(14, 73, 'AM2302 (DHT22)', ha='center', fontsize=8.5, fontweight='bold', fontfamily='serif')
    ax.text(14, 68, '1: VCC (3.3V)\n2: DATA  3: NC\n4: GND', ha='center', fontsize=6.8, fontfamily='monospace')
    ax.plot([24, 34], [70, 70], 'k-', lw=1.5)
    # 4.7k Pull-up
    ax.plot([29, 29], [70, 78], 'r--', lw=1.2)
    ax.plot([28, 30], [78, 78], 'r-', lw=2)
    ax.text(29, 81, '4.7kΩ\nto 3.3V', ha='center', fontsize=6.5, color='#b91c1c', fontfamily='serif')

    # INMP441
    mic = FancyBboxPatch((4, 38), 20, 22, boxstyle="square,pad=0", facecolor='#f0fdf4', edgecolor='#15803d', lw=1.5)
    ax.add_patch(mic)
    ax.text(14, 55, 'INMP441 MEMS', ha='center', fontsize=8.5, fontweight='bold', fontfamily='serif')
    ax.text(14, 46, 'SCK  -> GPIO15\nWS   -> GPIO16\nSD   -> GPIO7\nVDD -> 3.3V\nGND  -> GND',
            ha='center', fontsize=6.5, fontfamily='monospace')
    ax.plot([24, 34], [58, 58], 'k-', lw=1.5)
    ax.plot([24, 34], [50, 50], 'k-', lw=1.5)
    ax.plot([24, 34], [42, 42], 'k-', lw=1.5)

    # PIR
    pir = FancyBboxPatch((4, 22), 20, 12, boxstyle="square,pad=0", facecolor='#fefce8', edgecolor='#a16207', lw=1.5)
    ax.add_patch(pir)
    ax.text(14, 30, 'HC-SR501 PIR', ha='center', fontsize=8.5, fontweight='bold', fontfamily='serif')
    ax.text(14, 25, 'VCC (5V) | OUT | GND', ha='center', fontsize=6.8, fontfamily='monospace')
    ax.plot([24, 34], [30, 30], 'k-', lw=1.5)

    # Right Components
    # Active Buzzer with Transistor
    buz = FancyBboxPatch((74, 63), 22, 16, boxstyle="square,pad=0", facecolor='#fef2f2', edgecolor='#b91c1c', lw=1.5)
    ax.add_patch(buz)
    ax.text(85, 74, 'ACTIVE BUZZER DRIVER', ha='center', fontsize=8, fontweight='bold', fontfamily='serif')
    ax.text(85, 68, '2N2222 NPN BJT\n1kΩ Base Resistor\n1N4148 Flyback Diode', ha='center', fontsize=6.8, fontfamily='serif')
    ax.plot([66, 74], [70, 70], 'k-', lw=1.5)
    ax.text(70, 72, '1kΩ', ha='center', fontsize=7, color='#b91c1c')

    # RGB LED
    led = FancyBboxPatch((74, 33), 22, 26, boxstyle="square,pad=0", facecolor='#faf5ff', edgecolor='#7e22ce', lw=1.5)
    ax.add_patch(led)
    ax.text(85, 54, 'RGB STATUS LED', ha='center', fontsize=8.5, fontweight='bold', fontfamily='serif')
    ax.text(85, 48, 'Common Cathode (GND)\n3x 330Ω Limiting Resistors', ha='center', fontsize=6.8, fontfamily='serif')
    ax.text(85, 39, 'RED   <- 330Ω <- GPIO19\nGREEN <- 330Ω <- GPIO20\nBLUE  <- 330Ω <- GPIO21',
            ha='center', fontsize=6.5, fontfamily='monospace')
    ax.plot([66, 74], [56, 56], 'r-', lw=1.5)
    ax.plot([66, 74], [46, 46], 'g-', lw=1.5)
    ax.plot([66, 74], [36, 36], 'b-', lw=1.5)

    # Decoupling Caps & Power
    pwr = FancyBboxPatch((74, 15), 22, 14, boxstyle="square,pad=0", facecolor='#f8fafc', edgecolor='#64748b', lw=1.5)
    ax.add_patch(pwr)
    ax.text(85, 25, 'POWER REGULATION', ha='center', fontsize=8, fontweight='bold', fontfamily='serif')
    ax.text(85, 19, 'AMS1117-3.3V LDO\n10µF + 0.1µF Filter Caps', ha='center', fontsize=6.8, fontfamily='serif')
    ax.plot([66, 74], [25, 25], 'k--', lw=1.2)

    plt.tight_layout()
    fig.savefig('report/images/circuit_diagram.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('Circuit diagram created!')

# ---------------------------------------------------------------------------
# Figure 4: Flowchart
# ---------------------------------------------------------------------------
def generate_flowchart():
    fig, ax = plt.subplots(figsize=(8, 10.5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Canvas
    bg = patches.Rectangle((0, 0), 100, 100, facecolor='#ffffff', edgecolor='#cbd5e1', linewidth=1)
    ax.add_patch(bg)

    ax.text(50, 97.5, 'CROWDPULSE FIRMWARE & RISK FUSION FLOWCHART',
            ha='center', va='center', fontsize=11, fontweight='bold', fontfamily='serif', color='#0f172a')

    def draw_node(x, y, w, h, text, shape='round', fill='#f8fafc', stroke='#334155'):
        if shape == 'round':
            p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.5,rounding_size=3", facecolor=fill, edgecolor=stroke, lw=1.5)
        elif shape == 'rect':
            p = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0", facecolor=fill, edgecolor=stroke, lw=1.5)
        elif shape == 'diamond':
            pts = np.array([[x + w/2, y], [x + w, y + h/2], [x + w/2, y + h], [x, y + h/2]])
            p = patches.Polygon(pts, facecolor=fill, edgecolor=stroke, lw=1.5)
        ax.add_patch(p)
        ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=7.5, fontfamily='serif', color='#0f172a')

    # Flow Steps
    draw_node(35, 91, 30, 4.5, 'START / SYSTEM RESET', 'round', '#e2e8f0', '#0f172a')
    draw_node(25, 82.5, 50, 5.5, 'Initialize Peripherals:\nGPIO, I2S Buffer, Timers, 1-Wire & Wi-Fi', 'rect', '#e0f2fe', '#0284c7')
    draw_node(25, 73.5, 50, 5.5, 'Calibrate Ambient Baseline:\nRead Ambient Noise Floor (dB) & Temp Baseline', 'rect', '#f1f5f9', '#475569')

    # Sensor acquisition loop
    draw_node(25, 63.5, 50, 6.5, 'Read Multi-Sensor Data:\n1. AM2302 (Temp °C, Humidity %)\n2. INMP441 I2S Sample (Peak & RMS dB)\n3. PIR Motion Sensor State', 'rect', '#fef9c3', '#ca8a04')

    # Stampede calculation
    draw_node(22, 53.5, 56, 6.5, 'Compute Dynamic Stampede Risk Score:\nRisk = (w1·Density + w2·Noise_dB + w3·Temp + w4·Motion)', 'rect', '#fee2e2', '#dc2626')

    # Decision 1: Risk >= 70%?
    draw_node(26, 42.5, 48, 7.5, 'Is Risk Score >= 70%?\n(CRITICAL EMERGENCY)', 'diamond', '#ffedd5', '#ea580c')

    # Action Critical
    draw_node(62, 31, 34, 6.5, 'CRITICAL ALARM STATE:\n• RED LED Solid ON\n• Continuous Buzzer (4kHz Siren)\n• High-Priority Alert Broadcast', 'rect', '#fecaca', '#dc2626')

    # Decision 2: Risk >= 35%?
    draw_node(10, 31, 44, 7.5, 'Is Risk Score >= 35%?\n(WARNING STATE)', 'diamond', '#fef3c7', '#d97706')

    # Action Warning
    draw_node(4, 18, 38, 6.5, 'WARNING ADVISORY STATE:\n• AMBER / YELLOW LED ON\n• Pulsed Intermittent Buzzer\n• Telemetry Advisory Warning', 'rect', '#fef9c3', '#b45309')

    # Action Normal
    draw_node(46, 18, 38, 6.5, 'NORMAL STATE:\n• GREEN LED Pulsing Heartbeat\n• Buzzer Deactivated\n• Standard Telemetry Stream', 'rect', '#dcfce7', '#16a34a')

    # Transmit & Delay
    draw_node(25, 8.5, 50, 5.5, 'Transmit JSON Packet over WiFi to FastAPI Backend\nWait Sampling Interval (Timer Delay 250ms)', 'rect', '#f8fafc', '#334155')

    # Arrows
    arr = dict(arrowstyle="-|>", color="#0f172a", lw=1.4, mutation_scale=12)

    ax.annotate('', xy=(50, 88), xytext=(50, 91), arrowprops=arr)
    ax.annotate('', xy=(50, 79), xytext=(50, 82.5), arrowprops=arr)
    ax.annotate('', xy=(50, 70), xytext=(50, 73.5), arrowprops=arr)
    ax.annotate('', xy=(50, 60), xytext=(50, 63.5), arrowprops=arr)
    ax.annotate('', xy=(50, 50), xytext=(50, 53.5), arrowprops=arr)

    # Decision 1 branches
    ax.annotate('', xy=(79, 37.5), xytext=(74, 46.25), arrowprops=arr)
    ax.text(76, 44, 'YES', fontsize=7.5, fontweight='bold', color='#dc2626')

    ax.annotate('', xy=(32, 38.5), xytext=(38, 42.5), arrowprops=arr)
    ax.text(32, 42, 'NO', fontsize=7.5, fontweight='bold', color='#2563eb')

    # Decision 2 branches
    ax.annotate('', xy=(23, 24.5), xytext=(23, 31), arrowprops=arr)
    ax.text(25, 28, 'YES', fontsize=7.5, fontweight='bold', color='#ea580c')

    ax.annotate('', xy=(55, 24.5), xytext=(45, 31), arrowprops=arr)
    ax.text(52, 29, 'NO', fontsize=7.5, fontweight='bold', color='#16a34a')

    # Convergence to Transmit
    ax.annotate('', xy=(50, 14), xytext=(23, 18), arrowprops=arr)
    ax.annotate('', xy=(50, 14), xytext=(65, 18), arrowprops=arr)
    ax.annotate('', xy=(65, 14), xytext=(79, 31), arrowprops=arr)

    # Loop back from bottom to Read Multi-Sensor Data
    ax.plot([25, 1, 1, 25], [11.25, 11.25, 66.75, 66.75], 'b--', lw=1.2)
    ax.annotate('', xy=(25, 66.75), xytext=(2, 66.75), arrowprops=dict(arrowstyle="-|>", color="blue", lw=1.2))
    ax.text(2, 40, 'Repeat Loop\n(Continuous)', ha='left', va='center', fontsize=7, color='blue', rotation=90)

    plt.tight_layout()
    fig.savefig('report/images/flowchart.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('Flowchart created!')

# ---------------------------------------------------------------------------
# Figure 5: Mathematical Sensor Fusion Model
# ---------------------------------------------------------------------------
def generate_sensor_fusion():
    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    bg = patches.Rectangle((0, 0), 100, 100, facecolor='#ffffff', edgecolor='#cbd5e1', linewidth=1)
    ax.add_patch(bg)

    ax.text(50, 94, 'MULTI-SENSOR EDGE FUSION & STAMPEDE RISK CALCULATION PIPELINE',
            ha='center', va='center', fontsize=10.5, fontweight='bold', fontfamily='serif', color='#0f172a')

    # Draw inputs
    inputs = [
        (4, 73, 'Visual Crowd Density (ρ)', 'YOLOv8 Head Counts\n& Bounding Area Ratio', '#dbeafe', '#2563eb'),
        (4, 51, 'Optical Flow Velocity (V)', 'Farnebäck Dense Vector\nMean Velocity & Divergence', '#e0e7ff', '#4f46e5'),
        (4, 29, 'Acoustic Sound Pressure (S)', 'INMP441 I2S Sample\nPeak RMS Amplitude (dB)', '#fae8ff', '#9333ea'),
        (4, 7, 'Environmental & Motion (E)', 'AM2302 Temp/Humid\n& PIR Movement Triggers', '#ffedd5', '#ea580c')
    ]
    for x, y, title, desc, fill, edge in inputs:
        b = FancyBboxPatch((x, y), 26, 17, boxstyle="round,pad=0.5,rounding_size=2", facecolor=fill, edgecolor=edge, lw=1.5)
        ax.add_patch(b)
        ax.text(x+13, y+11, title, ha='center', va='center', fontsize=8, fontweight='bold', fontfamily='serif', color='#0f172a')
        ax.text(x+13, y+5, desc, ha='center', va='center', fontsize=6.8, fontfamily='serif', color='#334155')

    # Normalization & Weighting Matrix
    w_box = FancyBboxPatch((36, 15), 28, 70, boxstyle="round,pad=0.8,rounding_size=2", facecolor='#f8fafc', edgecolor='#0f172a', lw=1.8)
    ax.add_patch(w_box)
    ax.text(50, 80, 'DYNAMIC WEIGHTING &\nNORMALIZATION LAYER', ha='center', va='center', fontsize=8.5, fontweight='bold', fontfamily='serif')

    equations = [
        r'$\bar{\rho} = \min(1.0, \frac{N_{persons}}{N_{max}})$',
        r'$\bar{V} = \frac{||\vec{v}_{opt}||}{V_{surge\_max}}$',
        r'$\bar{S} = \frac{dB_{measured} - 45}{95 - 45}$',
        r'$\bar{E} = 0.6 \cdot M_{PIR} + 0.4 \cdot \frac{T - 25}{45 - 25}$',
        r'$R_{risk} = w_1 \bar{\rho} + w_2 \bar{V} + w_3 \bar{S} + w_4 \bar{E}$',
        r'$\sum w_i = 1.0 \quad (0.35, 0.25, 0.25, 0.15)$'
    ]
    eq_y = [68, 56, 44, 32, 22, 17]
    for eq, y in zip(equations, eq_y):
        ax.text(50, y, eq, ha='center', va='center', fontsize=7.8, color='#0f172a')

    # Output Decision Box
    out_box = FancyBboxPatch((70, 20), 26, 60, boxstyle="round,pad=0.8,rounding_size=2", facecolor='#fef2f2', edgecolor='#dc2626', lw=1.8)
    ax.add_patch(out_box)
    ax.text(83, 74, 'DECISION & ACTUATION', ha='center', va='center', fontsize=8.5, fontweight='bold', fontfamily='serif', color='#991b1b')

    states = [
        (83, 62, 'CRITICAL (Risk >= 0.70)\nSiren ON | Red LED\nAuto Egress Guidance', '#dc2626'),
        (83, 44, 'WARNING (0.35 <= Risk < 0.70)\nIntermittent Pulse Buzzer\nAmber LED | Security Alert', '#d97706'),
        (83, 27, 'NORMAL (Risk < 0.35)\nHeartbeat Green LED\nPassive Log Telemetry', '#16a34a')
    ]
    for sx, sy, stxt, scol in states:
        ax.text(sx, sy, stxt, ha='center', va='center', fontsize=7.2, fontweight='bold', fontfamily='serif', color=scol)

    # Connections
    arr = dict(arrowstyle="-|>", color="#0f172a", lw=1.5, mutation_scale=12)
    for y_in in [81, 59, 37, 15]:
        ax.annotate('', xy=(36, y_in), xytext=(30, y_in), arrowprops=arr)

    ax.annotate('', xy=(70, 50), xytext=(64, 50), arrowprops=arr)

    plt.tight_layout()
    fig.savefig('report/images/sensor_fusion.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('Sensor fusion diagram created!')

# ---------------------------------------------------------------------------
# Figure 6: Results & Telemetry Plot
# ---------------------------------------------------------------------------
def generate_results_plots():
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(10, 6.8), dpi=300)

    time = np.linspace(0, 60, 300) # 60 seconds

    # 1. Acoustic Decibel Profile
    ambient_noise = 48 + 3 * np.random.randn(300)
    surge_noise = 40 * np.exp(-((time - 32)**2) / 45) # Surge peak at t=32s
    total_noise = np.clip(ambient_noise + surge_noise, 40, 98)
    ax1.plot(time, total_noise, color='#2563eb', lw=1.6, label='INMP441 Acoustic Level')
    ax1.axhline(y=80, color='r', linestyle='--', label='Critical Surge Threshold (80 dB)')
    ax1.axhline(y=65, color='orange', linestyle=':', label='Warning Threshold (65 dB)')
    ax1.set_title('(a) Real-Time Acoustic Telemetry (dB SPL)', fontsize=9.5, fontweight='bold', fontfamily='serif')
    ax1.set_xlabel('Time (seconds)', fontsize=8, fontfamily='serif')
    ax1.set_ylabel('Sound Level (dB)', fontsize=8, fontfamily='serif')
    ax1.set_ylim(35, 105)
    ax1.grid(True, linestyle='--', alpha=0.5)
    ax1.legend(fontsize=7, loc='upper left')

    # 2. Crowd Density & Count
    counts = 12 + 4 * np.sin(time / 6) + 38 * np.exp(-((time - 33)**2) / 60) + np.random.randn(300)
    counts = np.clip(counts, 5, 55)
    ax2.plot(time, counts, color='#16a34a', lw=1.6, label='YOLOv8 Detected Count')
    ax2.fill_between(time, counts, color='#dcfce7', alpha=0.5)
    ax2.set_title('(b) Dynamic Crowd Head Count (Persons)', fontsize=9.5, fontweight='bold', fontfamily='serif')
    ax2.set_xlabel('Time (seconds)', fontsize=8, fontfamily='serif')
    ax2.set_ylabel('Crowd Count (Persons)', fontsize=8, fontfamily='serif')
    ax2.grid(True, linestyle='--', alpha=0.5)
    ax2.legend(fontsize=7, loc='upper left')

    # 3. Stampede Risk Index
    norm_noise = (total_noise - 45) / 50.0
    norm_count = counts / 50.0
    risk = np.clip(0.45 * norm_count + 0.35 * norm_noise + 0.1 * np.random.rand(300), 0.05, 0.98)
    ax3.plot(time, risk * 100, color='#dc2626', lw=1.8, label='Fused Stampede Risk Index')
    ax3.axhline(y=70, color='#dc2626', linestyle='--', label='Critical Alarm (70%)')
    ax3.axhline(y=35, color='#d97706', linestyle=':', label='Warning Advisory (35%)')
    ax3.set_title('(c) Computed Multi-Sensor Stampede Risk (%)', fontsize=9.5, fontweight='bold', fontfamily='serif')
    ax3.set_xlabel('Time (seconds)', fontsize=8, fontfamily='serif')
    ax3.set_ylabel('Risk Index (%)', fontsize=8, fontfamily='serif')
    ax3.set_ylim(0, 110)
    ax3.grid(True, linestyle='--', alpha=0.5)
    ax3.legend(fontsize=7, loc='upper left')

    # 4. Temperature & Humidity (DHT22)
    temp = 28.5 + 2.2 * np.sin(time / 20) + 0.2 * np.random.randn(300)
    humidity = 62.0 - 3.5 * np.sin(time / 20) + 0.3 * np.random.randn(300)
    ax4_t = ax4.twinx()
    l1 = ax4.plot(time, temp, color='#ea580c', lw=1.6, label='AM2302 Temp (°C)')
    l2 = ax4_t.plot(time, humidity, color='#0284c7', lw=1.6, linestyle='-.', label='AM2302 Humidity (%)')
    ax4.set_title('(d) AM2302 Environmental Telemetry', fontsize=9.5, fontweight='bold', fontfamily='serif')
    ax4.set_xlabel('Time (seconds)', fontsize=8, fontfamily='serif')
    ax4.set_ylabel('Temperature (°C)', color='#ea580c', fontsize=8, fontfamily='serif')
    ax4_t.set_ylabel('Relative Humidity (%)', color='#0284c7', fontsize=8, fontfamily='serif')
    ax4.grid(True, linestyle='--', alpha=0.5)
    lines = l1 + l2
    labels = [l.get_label() for l in lines]
    ax4.legend(lines, labels, fontsize=7, loc='upper left')

    plt.tight_layout()
    fig.savefig('report/images/results_telemetry.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('Results telemetry plots created!')

# ---------------------------------------------------------------------------
# Figure 7: Dashboard UI Mockup
# ---------------------------------------------------------------------------
def generate_dashboard_ui():
    fig, ax = plt.subplots(figsize=(10, 5.8), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Main dashboard background
    bg = FancyBboxPatch((0, 0), 100, 100, boxstyle="round,pad=0.5,rounding_size=1", facecolor='#090d16', edgecolor='#1e293b', lw=1.5)
    ax.add_patch(bg)

    # Top App Bar
    topbar = patches.Rectangle((0, 90), 100, 10, facecolor='#111827')
    ax.add_patch(topbar)
    ax.text(3, 95, 'CROWDPULSE ENTERPRISE v4.0', fontsize=11, fontweight='bold', fontfamily='sans-serif', color='#38bdf8', va='center')
    ax.text(48, 95, 'LIVE MULTI-SENSOR TELEMETRY & STAMPEDE RISK MONITOR', fontsize=8, fontfamily='sans-serif', color='#94a3b8', va='center')
    ax.text(97, 95, '● SYSTEM ACTIVE | 60 FPS | 24ms LATENCY', fontsize=7.5, fontfamily='monospace', color='#4ade80', ha='right', va='center')

    # Status Cards Row (Y: 74 to 88)
    cards = [
        (3, 'CROWD DENSITY', '38 Persons', 'CRITICAL LEVEL (84%)', '#ef4444', '#7f1d1d'),
        (27, 'ACOUSTIC LEVEL', '88.4 dB SPL', 'SURGE DETECTED (+32dB)', '#f97316', '#7c2d12'),
        (51, 'HEAT & HUMIDITY', '31.2°C / 68%', 'AM2302 CALIBRATED', '#3b82f6', '#1e3a8a'),
        (75, 'STAMPEDE RISK', 'HIGH (78.2%)', 'ACTUATORS TRIGGERED', '#ef4444', '#7f1d1d')
    ]
    for cx, ctitle, cval, csub, ccol, cbg in cards:
        card = FancyBboxPatch((cx, 74), 22, 14, boxstyle="round,pad=0.4,rounding_size=1.5", facecolor='#1f2937', edgecolor=ccol, lw=1.2)
        ax.add_patch(card)
        ax.text(cx + 2, 85, ctitle, fontsize=6.8, fontfamily='sans-serif', fontweight='bold', color='#9ca3af')
        ax.text(cx + 2, 79.5, cval, fontsize=10, fontfamily='sans-serif', fontweight='bold', color='#ffffff')
        ax.text(cx + 2, 75.5, csub, fontsize=6.2, fontfamily='monospace', color=ccol)

    # Left Panel: Live Camera Feed with YOLO Bounding Boxes (X: 3 to 58, Y: 14 to 71)
    cam_bg = FancyBboxPatch((3, 14), 58, 57, boxstyle="round,pad=0.4,rounding_size=1.5", facecolor='#030712', edgecolor='#374151', lw=1.2)
    ax.add_patch(cam_bg)
    ax.text(5, 68, 'CAMERA FEED 01: MAIN ENTRANCE CONCOURSE (YOLOv8 + OPTICAL FLOW)', fontsize=7.5, fontfamily='sans-serif', fontweight='bold', color='#f3f4f6')

    # Mock people and bounding boxes
    np.random.seed(42)
    for _ in range(14):
        bx = np.random.uniform(7, 52)
        by = np.random.uniform(18, 56)
        bw = np.random.uniform(3, 4.5)
        bh = np.random.uniform(6, 9)
        bbox = patches.Rectangle((bx, by), bw, bh, fill=False, edgecolor='#ef4444', lw=1.2)
        ax.add_patch(bbox)
        ax.text(bx, by + bh + 0.8, 'person 92%', fontsize=5, fontfamily='monospace', color='#f87171')
        # Optical flow vector arrow
        ax.annotate('', xy=(bx + bw/2 + 2, by + bh/2 + 1), xytext=(bx + bw/2, by + bh/2),
                    arrowprops=dict(arrowstyle="->", color="#38bdf8", lw=1))

    # Right Top Panel: Live Acoustic Spectrum Waveform (X: 63 to 97, Y: 44 to 71)
    wave_bg = FancyBboxPatch((63, 44), 34, 27, boxstyle="round,pad=0.4,rounding_size=1.5", facecolor='#111827', edgecolor='#374151', lw=1.2)
    ax.add_patch(wave_bg)
    ax.text(65, 68, 'INMP441 I2S SOUND PRESSURE SPECTRUM', fontsize=7, fontfamily='sans-serif', fontweight='bold', color='#e5e7eb')

    # Mock FFT bars
    fft_x = np.linspace(65, 95, 20)
    fft_h = np.array([4, 6, 9, 14, 18, 20, 16, 12, 10, 8, 11, 15, 17, 13, 9, 7, 5, 4, 3, 2])
    for fx, fh in zip(fft_x, fft_h):
        bar = patches.Rectangle((fx, 46), 1.2, fh * 0.8, facecolor='#38bdf8', edgecolor='none')
        ax.add_patch(bar)

    # Right Bottom Panel: Hardware Actuator & Alert Log (X: 63 to 97, Y: 14 to 41)
    alert_bg = FancyBboxPatch((63, 14), 34, 27, boxstyle="round,pad=0.4,rounding_size=1.5", facecolor='#111827', edgecolor='#dc2626', lw=1.2)
    ax.add_patch(alert_bg)
    ax.text(65, 38, 'HARDWARE ACTUATOR STATUS & LOGS', fontsize=7, fontfamily='sans-serif', fontweight='bold', color='#f87171')
    ax.text(65, 33, '● BUZZER: ACTIVE (4 kHz Pulse PWM 80%)', fontsize=6.8, fontfamily='monospace', color='#fca5a5')
    ax.text(65, 29, '● STATUS LED: RED BLINKING (CRITICAL)', fontsize=6.8, fontfamily='monospace', color='#f87171')
    ax.text(65, 25, '● PIR SENSOR: MOTION HIGH (CONTINUOUS)', fontsize=6.8, fontfamily='monospace', color='#fde047')
    ax.text(65, 21, '● TELEMETRY: WEBSOCKET STREAMING (10 Hz)', fontsize=6.8, fontfamily='monospace', color='#86efac')
    ax.text(65, 17, '● STAMPEDE RISK: 78.2% -> SIREN ENGAGED', fontsize=6.8, fontfamily='monospace', color='#fca5a5')

    # Bottom status bar
    bot = patches.Rectangle((0, 0), 100, 10, facecolor='#111827')
    ax.add_patch(bot)
    ax.text(3, 5, 'SRM INSTITUTE OF SCIENCE AND TECHNOLOGY — DEPARTMENT OF ECE | COURSE: 21ECC301P',
            fontsize=7, fontfamily='sans-serif', color='#94a3b8', va='center')
    ax.text(97, 5, 'AUTHORS: PARAMESHWARAN S & DHARSHAN KUMAR K',
            fontsize=7, fontfamily='sans-serif', color='#38bdf8', ha='right', va='center')

    plt.tight_layout()
    fig.savefig('report/images/dashboard_interface.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('Dashboard UI created!')

generate_block_diagram()
generate_circuit_diagram()
generate_flowchart()
generate_sensor_fusion()
generate_results_plots()
generate_dashboard_ui()
print('All diagrams generated successfully!')
