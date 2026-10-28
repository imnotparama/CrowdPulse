import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
import numpy as np
from PIL import Image

os.makedirs('report/images', exist_ok=True)

# ---------------------------------------------------------------------------
# Figure 2: Three-Layer System Architecture
# ---------------------------------------------------------------------------
def generate_figure_2_architecture():
    fig, ax = plt.subplots(figsize=(8.5, 4.8), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # Layer C: User Application Layer
    c_box = FancyBboxPatch((15, 68), 70, 24, boxstyle="square,pad=0",
                           facecolor='#dcfce7', edgecolor='#16a34a', linewidth=1.5)
    ax.add_patch(c_box)
    ax.text(50, 83, 'C. User Application Layer', ha='center', va='center',
            fontsize=11, fontweight='bold', fontfamily='serif', color='#0f172a')
    ax.text(50, 75, 'Web interface for real-time crowd density monitoring:\nstampede risk gauge, visual bounding boxes, sensor telemetry HUD,\nemergency actuator dispatch and forensic exports',
            ha='center', va='center', fontsize=8.5, fontfamily='serif', color='#1e293b')

    # Arrow C <-> B
    ax.annotate('', xy=(50, 68), xytext=(50, 56),
                arrowprops=dict(arrowstyle="<->", color='#0f172a', lw=1.8))

    # Layer B: Communication and Data Layer
    b_box = FancyBboxPatch((15, 34), 70, 22, boxstyle="square,pad=0",
                           facecolor='#ffedd5', edgecolor='#ea580c', linewidth=1.5)
    ax.add_patch(b_box)
    ax.text(50, 48, 'B. Communication and Data Layer', ha='center', va='center',
            fontsize=11, fontweight='bold', fontfamily='serif', color='#0f172a')
    ax.text(50, 41, 'Wi-Fi WebSocket & UART serial bus link, FastAPI async backend:\nreal-time JSON telemetry streamer, dynamic thresholding engine,\nmultimodal sensor fusion pipeline (Acoustic + Thermal + YOLOv8)',
            ha='center', va='center', fontsize=8.5, fontfamily='serif', color='#1e293b')

    # Arrow B <-> A
    ax.annotate('', xy=(50, 34), xytext=(50, 22),
                arrowprops=dict(arrowstyle="<->", color='#0f172a', lw=1.8))

    # Layer A: Hardware Layer
    a_box = FancyBboxPatch((15, 0), 70, 22, boxstyle="square,pad=0",
                           facecolor='#e0f2fe', edgecolor='#0284c7', linewidth=1.5)
    ax.add_patch(a_box)
    ax.text(50, 14, 'A. Hardware Layer', ha='center', va='center',
            fontsize=11, fontweight='bold', fontfamily='serif', color='#0f172a')
    ax.text(50, 7, 'ESP32-S3 microcontroller, AM2302 (DHT22) temp/humidity sensor,\nINMP441 I2S digital MEMS microphone, HC-SR501 PIR motion detector,\nSSD1306 OLED HUD, 2N2222 transistorized active buzzer & RGB LED beacon',
            ha='center', va='center', fontsize=8.5, fontfamily='serif', color='#1e293b')

    plt.tight_layout()
    fig.savefig('report/images/figure2_three_layer_architecture.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Figure 2 Architecture generated!")

# ---------------------------------------------------------------------------
# Figure 4: Flowchart of CrowdPulse Operation
# ---------------------------------------------------------------------------
def generate_figure_4_flowchart():
    fig, ax = plt.subplots(figsize=(6.5, 9.2), dpi=300)
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

    def draw_arrow(x1, y1, x2, y2, label=None, label_side='right'):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
        if label:
            lx = (x1 + x2) / 2
            ly = (y1 + y2) / 2
            offset = 2.5 if label_side == 'right' else -2.5
            ha = 'left' if label_side == 'right' else 'right'
            ax.text(lx + offset, ly, label, fontsize=7.5, fontfamily='serif', fontstyle='italic', ha=ha, va='center')

    # Nodes
    draw_oval(37, 94, 26, 5, 'START')
    draw_arrow(50, 94, 50, 89)

    draw_proc(25, 83, 50, 6, 'Initialise GPIO, I2S bus, AM2302,\nOLED, buzzer, RGB LED and Wi-Fi/UART')
    draw_arrow(50, 83, 50, 78)

    draw_proc(27, 72, 46, 6, 'Sample ambient baseline room noise\n(3 seconds auto-calibration)')
    draw_arrow(50, 72, 50, 67)

    draw_proc(27, 61, 46, 6, 'Read sensors: AM2302 (T/H), INMP441\n(dB SPL), PIR motion, Wi-Fi RSSI')
    draw_arrow(50, 61, 50, 56)

    draw_diamond(34, 46, 32, 10, 'Acoustic surge\n> Baseline + 7dB?')
    draw_arrow(50, 46, 50, 41, label='Yes', label_side='right')

    # No branch from Diamond 1
    ax.annotate('', xy=(85, 51), xytext=(66, 51), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(85, 30), xytext=(85, 51), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(73, 30), xytext=(85, 30), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(69, 52.5, 'No', fontsize=7.5, fontfamily='serif', fontstyle='italic')

    draw_proc(27, 35, 46, 6, 'Compute Fused Risk Index:\nR = w1*rho + w2*V + w3*S + w4*E')
    draw_arrow(50, 35, 50, 30)

    draw_diamond(34, 20, 32, 10, 'Stampede Risk\n>= 70% or SOS?')
    draw_arrow(50, 20, 50, 15, label='Yes', label_side='right')

    # No branch from Diamond 2
    draw_proc(73, 23, 24, 6, 'Set LED GREEN\nBuzzer OFF', fill='#dcfce7', edge='#16a34a')
    draw_arrow(66, 25, 73, 25, label='No', label_side='right')

    draw_proc(25, 9, 50, 6, 'Trigger 2N2222 Buzzer (2.0s burst),\nLED RED strobe, WebSocket CRITICAL alert', fill='#fee2e2', edge='#dc2626')
    draw_arrow(50, 9, 50, 4)

    draw_proc(27, 0, 46, 4, 'Send telemetry JSON packet to backend')

    # Loop back from bottom to Read sensors
    ax.annotate('', xy=(12, 2), xytext=(27, 2), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(12, 64), xytext=(12, 2), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(27, 64), xytext=(12, 64), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(14, 33, 'next telemetry frame', fontsize=7.5, fontfamily='serif', fontstyle='italic', rotation=90)

    # Connect Green LED to bottom
    ax.annotate('', xy=(85, 23), xytext=(85, 2), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(73, 2), xytext=(85, 2), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    plt.tight_layout()
    fig.savefig('report/images/figure4_flowchart_operation.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Figure 4 Flowchart generated!")

# ---------------------------------------------------------------------------
# Figure 5: Secondary Flowchart (Acoustic Thresholding & Anti-Feedback)
# ---------------------------------------------------------------------------
def generate_figure_5_acoustic():
    fig, ax = plt.subplots(figsize=(6.5, 4.6), dpi=300)
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

    draw_oval(37, 88, 26, 9, 'START')
    ax.annotate('', xy=(50, 75), xytext=(50, 88), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    draw_proc(25, 62, 50, 13, 'Read INMP441 I2S 24-bit audio frames;\nCompute RMS and Decibel SPL (L_dB)')
    ax.annotate('', xy=(50, 48), xytext=(50, 62), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    draw_diamond(32, 28, 36, 20, 'L_dB > Baseline + 14dB\nand not in cooldown?')

    # Yes path
    ax.annotate('', xy=(50, 14), xytext=(50, 28), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(51.5, 20, 'Yes', fontsize=8, fontfamily='serif', fontstyle='italic')
    draw_proc(22, 0, 56, 14, 'Assert GPIO 10 (Buzzer ON) for 2.0s burst;\nApply 1.5s refractory blanking guard to prevent mic self-retrigger',
              fill='#fee2e2', edge='#dc2626')

    # No path
    ax.annotate('', xy=(85, 38), xytext=(68, 38), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(85, 7), xytext=(85, 38), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(78, 7), xytext=(85, 7), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(71, 40, 'No', fontsize=8, fontfamily='serif', fontstyle='italic')

    # Loop back
    ax.annotate('', xy=(12, 7), xytext=(22, 7), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(12, 68), xytext=(12, 7), arrowprops=dict(arrowstyle="-", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(25, 68), xytext=(12, 68), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.text(14, 38, 'Continuous DSP Loop', fontsize=7.5, fontfamily='serif', fontstyle='italic', rotation=90)

    plt.tight_layout()
    fig.savefig('report/images/figure5_flowchart_acoustic.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Figure 5 Flowchart generated!")

# ---------------------------------------------------------------------------
# Figure 6: Overall Workflow of the System
# ---------------------------------------------------------------------------
def generate_figure_6_workflow():
    fig, ax = plt.subplots(figsize=(8.5, 3.8), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # 5 top boxes
    top_boxes = [
        (4, 'Sensor\nTransducers', '#fee2e2', '#ef4444'),
        (23, 'ESP32-S3\nEdge Node', '#fef3c7', '#f59e0b'),
        (42, 'Wi-Fi / UART\nBus Stream', '#e0f2fe', '#0ea5e9'),
        (61, 'FastAPI Edge\nBackend', '#ffedd5', '#ea580c'),
        (80, 'YOLOv8 & Risk\nFusion Engine', '#dcfce7', '#16a34a'),
    ]
    for x, txt, fill, edge in top_boxes:
        box = FancyBboxPatch((x, 56), 16, 32, boxstyle="round,pad=0.2,rounding_size=2",
                             facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + 8, 72, txt, ha='center', va='center',
                fontsize=8.5, fontfamily='serif', color='#0f172a', fontweight='bold')

    # Horizontal arrows across top
    for i in range(len(top_boxes) - 1):
        x1 = top_boxes[i][0] + 16
        x2 = top_boxes[i+1][0]
        ax.annotate('', xy=(x2, 72), xytext=(x1, 72),
                    arrowprops=dict(arrowstyle="<->", color='#0f172a', lw=1.3))

    # 4 bottom boxes
    bot_boxes = [
        (13, 'Emergency Buzzer\n& RGB LED Siren', '#fee2e2', '#ef4444'),
        (35, 'Local SSD1306\nOLED HUD', '#e0e7ff', '#6366f1'),
        (57, 'FastAPI Real-Time\nWebSocket Bus', '#ffedd5', '#ea580c'),
        (79, 'Enterprise Web\nOperations Console', '#dcfce7', '#16a34a'),
    ]
    for x, txt, fill, edge in bot_boxes:
        box = FancyBboxPatch((x, 8), 18, 30, boxstyle="round,pad=0.2,rounding_size=2",
                             facecolor=fill, edgecolor=edge, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + 9, 23, txt, ha='center', va='center',
                fontsize=8.5, fontfamily='serif', color='#0f172a')

    # Vertical connections
    ax.annotate('', xy=(22, 38), xytext=(29, 56), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(44, 38), xytext=(33, 56), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(66, 38), xytext=(69, 56), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))
    ax.annotate('', xy=(88, 38), xytext=(88, 56), arrowprops=dict(arrowstyle="->", color='#0f172a', lw=1.3))

    plt.tight_layout()
    fig.savefig('report/images/figure6_workflow_system.png', dpi=300, bbox_inches='tight')
    plt.close()
    print("Figure 6 Workflow generated!")

# ---------------------------------------------------------------------------
# Figure 10: Assembled Prototype (Top View)
# ---------------------------------------------------------------------------
def generate_figure_10_prototype():
    img_src = 'report/images/WhatsApp Image 2026-10-27 at 2.20.20 PM.jpeg'
    if os.path.exists(img_src):
        im = Image.open(img_src)
        # Crop slightly to center on breadboard
        w, h = im.size
        # Crop bounding box: left, upper, right, lower
        crop_box = (int(w * 0.12), int(h * 0.05), int(w * 0.90), int(h * 0.95))
        im_cropped = im.crop(crop_box)
        im_cropped.save('report/images/figure10_prototype_top_view.png', quality=95)
        print("Figure 10 Prototype image processed successfully!")

# ---------------------------------------------------------------------------
# Figure 11: Live Prototype with Web Application Open on Laptop
# ---------------------------------------------------------------------------
def generate_figure_11_composite():
    # Load WhatsApp Image 2 (active hardware with red LED & OLED "STATUS: SURGE RISK")
    hw_img_path = 'report/images/WhatsApp Image 2026-10-27 at 2.20.19 PM.jpeg'
    dash_img_path = 'C:/Users/hunte/.gemini/antigravity-ide/brain/4ea82d98-1d8d-4ab2-a175-ba188c43a30b/crowdpulse_dashboard_1793091478662.png'

    if os.path.exists(hw_img_path) and os.path.exists(dash_img_path):
        hw_im = Image.open(hw_img_path)
        dash_im = Image.open(dash_img_path)

        # Create a side-by-side composite
        target_height = 800
        # Resize dash_im to height 800
        dash_w = int(dash_im.width * (target_height / dash_im.height))
        dash_resized = dash_im.resize((dash_w, target_height), Image.Resampling.LANCZOS)

        # Resize hw_im to height 800
        hw_w = int(hw_im.width * (target_height / hw_im.height))
        hw_resized = hw_im.resize((hw_w, target_height), Image.Resampling.LANCZOS)

        total_w = dash_w + hw_w + 30
        composite = Image.new('RGB', (total_w, target_height + 60), color=(255, 255, 255))

        # Paste images
        composite.paste(dash_resized, (0, 40))
        composite.paste(hw_resized, (dash_w + 30, 40))

        composite.save('report/images/figure11_prototype_with_laptop.png', quality=95)
        print("Figure 11 Composite created successfully!")

# Also copy the captured live dashboard as Figure 8
def setup_dashboard_figure():
    dash_src = 'C:/Users/hunte/.gemini/antigravity-ide/brain/4ea82d98-1d8d-4ab2-a175-ba188c43a30b/crowdpulse_dashboard_1793091478662.png'
    if os.path.exists(dash_src):
        im = Image.open(dash_src)
        im.save('report/images/figure8_dashboard_live.png', quality=95)
        print("Figure 8 Live Dashboard saved!")

if __name__ == '__main__':
    generate_figure_2_architecture()
    generate_figure_4_flowchart()
    generate_figure_5_acoustic()
    generate_figure_6_workflow()
    generate_figure_10_prototype()
    generate_figure_11_composite()
    setup_dashboard_figure()
    print("All figures generated and processed successfully!")
