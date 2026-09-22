# CrowdPulse

**CrowdPulse** is an enterprise-grade, real-time AI crowd safety and monitoring platform built to predict and prevent stampedes, bottlenecks, and hazardous density surges in high-density venues.

---

## Overview
CrowdPulse leverages state-of-the-art computer vision models (`YOLOv8m` + ByteTrack) to analyze real-time video feeds for dense crowd telemetry. We process crowd metrics such as Density, Agitation, Pressure Index, and Flow Direction, alerting operators and dispatching automated countermeasures before a dangerous situation unfolds.

## Tech Stack
- **Backend:** FastAPI, Python 3.11+, PyTorch, Ultralytics (YOLOv8)
- **Computer Vision:** OpenCV, Farneback Optical Flow, ByteTrack
- **Sensor Ingestion:** ESP32 Promiscuous Wi-Fi RSSI Probe Network
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts
- **Mapping:** React-Leaflet
- **Communications:** Bidirectional WebSockets

---

## Setup Instructions

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Virtual Environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup
1. From the project root or `frontend` directory:
   ```bash
   npm install
   npm run dev
   ```

---

## Key Features
- **Dominant Tactical Camera Feed**: Real-time high-definition video viewport with AI heatmap overlay and person detection telemetry.
- **Predictive AI Insights**: Situation assessment, estimated exit times, and automated dispatch recommendations.
- **Hardware Sensor Fusion**: Integrated ESP32 promiscuous Wi-Fi sniffing nodes providing privacy-preserving device counts.
- **Tactical Radar & Evacuation Map**: Real-time routing, drone surveillance paths, and alert zone visualization.
- **Interactive Timeline Activity**: Historical crowd spike and queue monitoring.
