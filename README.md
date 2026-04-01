# CrowdPulse

**CrowdPulse** is an AI-driven crowd safety and monitoring platform built to predict and prevent stampedes in high-density areas. 

Developed by **Team Fantastic Four** for the Hackathon.

## Overview
CrowdPulse leverages state-of-the-art computer vision models (`YOLOv8m` + ByteTrack) to analyze real-time video feeds for dense crowd analysis. We process crowd metrics such as Density, Agitation, Pressure Index, and Flow Direction, alerting authorities *before* a dangerous situation unfolds.

## Tech Stack
- **Backend:** FastAPI, Python, PyTorch, Ultralytics (YOLO)
- **Computer Vision:** OpenCV, Optical Flow, ByteTrack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
- **Mapping:** React-Leaflet
- **Communications:** WebSockets

## Setup Instructions

### Backend Setup
1. Navigate to the `backend` directory.
2. Create and activate a Virtual Environment.
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
   fastapi dev main.py
   # Or: uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Demo View
![CrowdPulse Dashboard](https://i.imgur.com/your-screenshot-here.png)
*(A high-tech tactical dashboard displaying live crowd density maps, AI-predicted flow paths, metrics, and incident reports).*

---
Built with ❤️ by Team Fantastic Four.
