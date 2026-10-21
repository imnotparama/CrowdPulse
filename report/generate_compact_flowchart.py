import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
import numpy as np

# ---------------------------------------------------------------------------
# Compact Flowchart (Wider, fits cleanly on Page 10 with algorithm text)
# ---------------------------------------------------------------------------
def generate_compact_flowchart():
    fig, ax = plt.subplots(figsize=(10, 5.2), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    bg = patches.Rectangle((0, 0), 100, 100, facecolor='#ffffff', edgecolor='#cbd5e1', linewidth=1)
    ax.add_patch(bg)

    ax.text(50, 94, 'FIRMWARE SENSOR ACQUISITION & MULTI-STAGE ACTUATION FLOWCHART',
            ha='center', va='center', fontsize=10.5, fontweight='bold', fontfamily='serif', color='#0f172a')

    def draw_node(x, y, w, h, text, shape='rect', fill='#f8fafc', stroke='#334155'):
        if shape == 'round':
            p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=3", facecolor=fill, edgecolor=stroke, lw=1.4)
        elif shape == 'rect':
            p = FancyBboxPatch((x, y), w, h, boxstyle="square,pad=0", facecolor=fill, edgecolor=stroke, lw=1.4)
        elif shape == 'diamond':
            pts = np.array([[x + w/2, y], [x + w, y + h/2], [x + w/2, y + h], [x, y + h/2]])
            p = patches.Polygon(pts, facecolor=fill, edgecolor=stroke, lw=1.4)
        ax.add_patch(p)
        ax.text(x + w/2, y + h/2, text, ha='center', va='center', fontsize=7.2, fontfamily='serif', color='#0f172a')

    # Top Row: Init & Calibration -> Sensing
    draw_node(2, 68, 20, 16, 'START / RESET\nInitialize GPIO,\nI2S, Timers 0 & 1', 'round', '#e2e8f0', '#0f172a')
    draw_node(26, 68, 22, 16, 'CALIBRATION\nRead Baseline Noise\n(dB) & Temp Floor', 'rect', '#e0f2fe', '#0284c7')
    draw_node(52, 68, 22, 16, '1-WIRE ACQUIRE\nRead AM2302 Temp\n& Humidity (40 bits)', 'rect', '#fef9c3', '#ca8a04')
    draw_node(77, 68, 21, 16, 'I2S SAMPLING\nSample INMP441\nCalc RMS Decibels', 'rect', '#fae8ff', '#9333ea')

    # Bottom Row: Decision & Actuators
    draw_node(77, 24, 21, 26, 'EVALUATE RISK\nRisk = w1·ρ + w2·dB\n+ w3·T + w4·M\nScore: 0 to 100%', 'rect', '#fee2e2', '#dc2626')
    draw_node(48, 24, 24, 26, 'CRITICAL (>=70%)?\nYES -> Red LED +\nContinuous Siren\nNO -> Check 35%', 'diamond', '#ffedd5', '#ea580c')
    draw_node(22, 24, 22, 26, 'WARNING (>=35%)?\nYES -> Amber LED\n+ Pulsed Buzzer\nNO -> Green LED', 'diamond', '#fef3c7', '#d97706')
    draw_node(2, 24, 16, 26, 'TELEMETRY TX\nSend JSON via\nWiFi / UART\nDelay 250ms', 'rect', '#dcfce7', '#16a34a')

    # Arrows
    arr = dict(arrowstyle="-|>", color="#0f172a", lw=1.4, mutation_scale=11)
    ax.annotate('', xy=(26, 76), xytext=(22, 76), arrowprops=arr)
    ax.annotate('', xy=(52, 76), xytext=(48, 76), arrowprops=arr)
    ax.annotate('', xy=(77, 76), xytext=(74, 76), arrowprops=arr)

    # Down from I2S to Risk
    ax.annotate('', xy=(87.5, 50), xytext=(87.5, 68), arrowprops=arr)

    # Leftwards flow on bottom row
    ax.annotate('', xy=(72, 37), xytext=(77, 37), arrowprops=arr)
    ax.annotate('', xy=(44, 37), xytext=(48, 37), arrowprops=arr)
    ax.annotate('', xy=(18, 37), xytext=(22, 37), arrowprops=arr)

    # Loop back to 1-Wire Acquire
    ax.plot([10, 10, 63, 63], [24, 10, 10, 68], 'b--', lw=1.2)
    ax.annotate('', xy=(63, 68), xytext=(63, 10), arrowprops=dict(arrowstyle="-|>", color="blue", lw=1.2))
    ax.text(37, 7, 'Continuous Loop (Sampling Rate: 4 Hz / 250ms)', fontsize=7, color='blue', ha='center')

    plt.tight_layout()
    fig.savefig('report/images/flowchart_compact.png', dpi=300, bbox_inches='tight')
    plt.close()
    print('Compact flowchart generated!')

generate_compact_flowchart()
