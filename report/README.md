# CrowdPulse Academic Project Report

**Course**: `21ECC301P / MICROPROCESSOR, MICROCONTROLLER, AND INTERFACING TECHNIQUES`  
**Department**: Electronics and Communication Engineering  
**Faculty**: Faculty of Engineering and Technology  
**Institution**: SRM Institute of Science and Technology, Ramapuram, Chennai - 600089  
**Submission Date**: October 2026  

---

## Authors & Registration Details
- **Parameshwaran S** — `RA2411053020060`
- **Dharshan Kumar K** — `RA2411053020013`

---

## Document Deliverables in `report/`
- **Word Document**: [`CrowdPulse_Project_Report.docx`](file:///c:/Users/hunte/CrowdPulse/report/CrowdPulse_Project_Report.docx) (Editable, 22 pages)
- **PDF Report**: [`CrowdPulse_Project_Report.pdf`](file:///c:/Users/hunte/CrowdPulse/report/CrowdPulse_Project_Report.pdf) (Print-ready, soft-binding ready, 22 pages)
- **Automated Report Builder**: [`build_final_report.py`](file:///c:/Users/hunte/CrowdPulse/report/build_final_report.py)
- **Diagram Generators**: [`generate_diagrams.py`](file:///c:/Users/hunte/CrowdPulse/report/generate_diagrams.py) and [`generate_compact_flowchart.py`](file:///c:/Users/hunte/CrowdPulse/report/generate_compact_flowchart.py)
- **Figure Assets**: `report/images/`

---

## Report Structure & Page Accounting (22 Pages Total)

| Page # | Printed Page No. | Section / Content | Description |
|:---:|:---:|:---|:---|
| 1 | *None* | **Title Page** | Official Title, Course Code, Student Details, SRM Official Insignia, Campus & Date |
| 2 | *None* | **Bonafide Certificate** | Official certification text, Faculty guide & HOD signature blocks, Exam details |
| 3 | *None* | **Declaration** | Student declaration of original work with signatures |
| 4 | *None* | **Abstract** | 265-word technical abstract (≥ 250 words) with keywords and 1.5 line spacing |
| 5 | **5** | **1. Introduction** | Problem statement, turbulent crowd shockwaves, 21ECC301P course context, SRM insignia |
| 6 | **6** | **1.1 Background & 2. Objectives** | Multi-sensor precursor motivation, 5 primary engineering objectives, Table 1 |
| 7 | **7** | **3. Block Diagram** | Layered hardware architecture, Figure 2 System Block Diagram, transducer descriptions |
| 8 | **8** | **3. Block Diagram (cont'd) & 4. Specs** | Telemetry and actuation bus descriptions, Table 2 Hardware component specifications |
| 9 | **9** | **4. Requirements (cont'd)** | Table 3 Microcontroller Pinout Mapping, Table 4 Software Toolchain Stack |
| 10 | **10** | **5. Circuit Diagram** | Circuit interfacing theory, pull-up sizing, 2N2222 switching, Figure 3 Circuit Schematic |
| 11 | **11** | **6. Algorithm and Flowchart** | State machine logic, Figure 4 Compact Execution Flowchart, Steps 1 to 3 |
| 12 | **12** | **6. Algorithm (cont'd)** | Steps 4 to 7 (Acoustic sampling, PIR interrogation, Risk fusion, Telemetry dispatch) |
| 13 | **13** | **7. Program Code (Python - Part 1)** | Telemetry packet schema, hardware controller, true RMS decibel calculation, Risk math |
| 14 | **14** | **7. Program Code (Python - Part 2)** | Multi-stage actuation state machine, FastAPI ingestion endpoint, WebSocket stream server |
| 15 | **15** | **7. Program Code (8051 ALP - Part 1)** | Reset vector, SFR declarations, memory allocation, main loop, AM2302 bit-banging protocol |
| 16 | **16** | **7. Program Code (8051 ALP - Part 2)** | Bit-sampling loop, PIR polling, decibel comparator, 2N2222 Buzzer driver, delay loops |
| 17 | **17** | **8. Working Principle** | Figure 5 Sensor Fusion Model, capacitive humidity & NTC thermistor physical operating laws |
| 18 | **18** | **8. Working Principle (cont'd)** | INMP441 MEMS diaphragm acoustic physics, PIR pyroelectric lens theory, Risk equations |
| 19 | **19** | **9. Results and Discussion (Part 1)** | Simulated surge trials, Figure 6 Telemetry Waveforms, decibel peaks, heat index shifts |
| 20 | **20** | **9. Results and Discussion (Part 2)** | Figure 7 Enterprise Dashboard UI, Table 5 Experimental Validation Performance Metrics |
| 21 | **21** | **9. Discussion & 10. Conclusion** | Occlusion compensation, early-warning window (38s lead time), engineering conclusion |
| 22 | **22** | **11. References** | 12 IEEE-style formal academic and technical citations |

---

## Formatting Compliance Checklist
- [x] **Headings**: Times New Roman, Font size 14, Bold, Centered.
- [x] **Body / Contents**: Times New Roman, Font size 13, Line spacing 1.5.
- [x] **Figures**: Centered with explicit captions (`Figure 1.` through `Figure 7.`).
- [x] **Tables**: Styled with headers, alternating row fills, and standard cell margins.
- [x] **Page Numbers**: Starts strictly from 5th page (`5`, `6`, ..., `22`) in footer center.
- [x] **Page Budget**: 22 full pages (exceeds the 15-page minimum with zero large empty spaces).
- [x] **Mandatory Codes**: Both Python telemetry server code AND 8051 Assembly Language Program (ALP) code included.
- [x] **Binding Margins**: Left margin 1.25 inches for soft binding (2 copies).
