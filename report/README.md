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
- **Word Document**: [`CrowdPulse_Project_Report.docx`](file:///c:/Users/hunte/CrowdPulse/report/CrowdPulse_Project_Report.docx) (Editable, 31 pages)
- **PDF Report**: [`CrowdPulse_Project_Report.pdf`](file:///c:/Users/hunte/CrowdPulse/report/CrowdPulse_Project_Report.pdf) (Print-ready, soft-binding ready, 31 pages)
- **Automated Report Builder**: [`build_31_page_report.py`](file:///c:/Users/hunte/CrowdPulse/report/build_31_page_report.py)
- **Figure Generators**: [`generate_all_figures.py`](file:///c:/Users/hunte/CrowdPulse/report/generate_all_figures.py)
- **Figure Assets**: `report/images/`

---

## Report Structure & Page Accounting (31 Pages Total)

| Page # | Printed Page No. | Section / Content | Description |
|:---:|:---:|:---|:---|
| 1 | *None* | **Title Page** | Official Title, Course Code, Student Details, SRM Official Color Insignia, Ramapuram Campus & Date |
| 2 | *None* | **Bonafide Certificate** | Official certification text, Faculty guide Dr. Reshma P Vengaloor & HOD Dr. S. Rajasekaran signature blocks |
| 3 | *None* | **Declaration** | Student declaration of original work with signatures |
| 4 | *None* | **Abstract** | Structured academic abstract with keywords and 1.5 line spacing |
| 5 | **5** | **Contents & List of Figures** | Formal Table of Contents (Sections 1-11 + Appendix) and List of Figures (1 to 11) |
| 6 | **6** | **1. Introduction** | 1.1 Project Overview, 1.2 Problem Statement |
| 7 | **7** | **1. Introduction (cont'd)** | 1.2 Problem Statement cont'd, 1.3 Novelty of the Project, 1.4 Scope of the Project |
| 8 | **8** | **2. Objectives & 3. Block Diagram** | 1.5 Organisation of Report, 2. Objectives (8 targets), 3. Block Diagram intro |
| 9 | **9** | **3. Block Diagram (cont'd)** | Detailed functional bullet points of MCU, AM2302, INMP441, PIR, OLED, 2N2222 Buzzer, RGB LED, Backend |
| 10 | **10** | **Figure 1 & 3.2 Architecture** | Figure 1 Block Diagram, 3.2 System Architecture (Hardware, Comm, User Layers) |
| 11 | **11** | **Figure 2 & 4. Requirements** | Figure 2 Three-Layer Architecture, 4.1 Hardware Requirements (Table 1 items 1-4) |
| 12 | **12** | **Table 1 (cont'd) & Table 2** | Table 1 items 5-9, 4.2 Software Requirements (Table 2 items 1-3) |
| 13 | **13** | **Table 2 (cont'd) & 5. Circuit** | Table 2 items 4-6, 5. Circuit Diagram, Table 3 Pin Assignment (items 1-5) |
| 14 | **14** | **Figure 3 & 5.1 Wiring Notes** | Table 3 items 6-9, Figure 3 Circuit Wiring Diagram, 5.1 Wiring Notes (I2S, I2C) |
| 15 | **15** | **5.1 Wiring & 6. Flowchart** | 1-Wire pull-up, 2N2222 driver, 6.1 Algorithm steps 1-10, 6.2 Explanation |
| 16 | **16** | **Figure 4. Flowchart** | Acoustic surge & anti-feedback logic, Figure 4 Flowchart of CrowdPulse edge operation |
| 17 | **17** | **Figure 5 & 7. Program Code** | Figure 5 Flowchart of acoustic threshold & anti-feedback blanking, 7. Program Code intro |
| 18 | **18** | **7.1 Python Code 1** | Microcontroller sensor acquisition, I2S 24-bit RMS DSP, baseline calibration, anti-feedback timer |
| 19 | **19** | **7.2 Python Code 2** | FastAPI async telemetry router, mathematical stampede risk equation, WebSocket broadcast |
| 20 | **20** | **7.3 ALP Code 1 (8051)** | 8051 assembly for DHT22 bit-banging, 18 ms machine-cycle delay, 8-bit decibel bus comparator |
| 21 | **21** | **7.4 ALP Code 2 & Table 4** | 8051 assembly for 2N2222 buzzer driving, External Interrupt 0 SOS, Table 4 Python to ALP mapping |
| 22 | **22** | **Table 4 (cont'd) & 7.6 Notes** | Table 4 cont'd, 7.6 Architectural explanation of Python & ALP programs |
| 23 | **23** | **8. Working Principle** | 8-stage operational working principle (Calibration, Transduction, DSP, Surges, Risk, Actuation) |
| 24 | **24** | **Figure 6 & 8.2 Real Example** | Figure 6 Overall System Workflow, 8.1 Multi-sensor role, 8.2 Transit concourse surge scenario |
| 25 | **25** | **9. Results & Table 5** | 9.1 Test Plan and Expected Behaviour (Table 5 with 11 verification test cases) |
| 26 | **26** | **9.2 Screenshots & Figure 7** | Serial console output listing, Figure 7 Landing page & system console overview |
| 27 | **27** | **Figure 8 & Figure 9** | Figure 8 Live Dashboard with demo video, Figure 9 Real-Time Telemetry curves, 9.3 Applications, 9.4 Benefits |
| 28 | **28** | **9.5 Discussion & 10. Conclusion**| 9.4 Benefits cont'd, 9.5 Discussion, 10. Conclusion, 10.1 Limitations |
| 29 | **29** | **10.2 Future & 11. References**| 10.1 Limitations cont'd, 10.2 Future Enhancements, 11. References (citations [1] to [6]) |
| 30 | **30** | **11. References (cont'd)** | Citations [7] to [12] (Complete IEEE formal citations) |
| 31 | **31** | **Appendix: Photographs** | Figure 10 Assembled prototype (top view), Figure 11 Prototype with web app open on laptop with demo video |

---

## Formatting Compliance Checklist
- [x] **Typography**: 100% Times New Roman across entire document (all styles, headings, body text, tables, captions, footers, and code listings enforced via OpenXML `w:rFonts` tags).
- [x] **Title Page (Page 1)**: Formatted exactly according to syllabus template (Official Title, Course Code `21ECC301P`, Student Details, SRM Insignia, Ramapuram Campus, October 2026).
- [x] **Bonafide Certificate (Page 2)**: Exact template wording ("...who carried out the project work under my supervision as a batch. Certified further, that to the best of my knowledge..."), Guide `Dr. Reshma P Vengaloor`, HOD `Dr.S. Rajasekaran`, and University Examination sign-off lines.
- [x] **Declaration (Page 3)**: Right-aligned student declaration with registration numbers.
- [x] **Abstract (Page 4)**: 280-word technical abstract (≥ 250 words) with keywords and 1.5 line spacing, strictly 1 page.
- [x] **Introduction (Page 5)**: Times New Roman 14 bold centered heading, Times New Roman 13pt 1.5 line spacing body, **STRICTLY NO SRM LOGO ON THE INTRODUCTION**, centered page number `5` in footer.
- [x] **Expected Contents (Pages 6 to 22)**: Complete coverage of syllabus items 1 to 11 with clear diagrams, dual code implementations (Python + 8051 ALP), working principles, telemetry graphs, and IEEE references.
- [x] **Page Budget**: Strictly 22 pages total with zero orphan headings and no awkward whitespace.
- [x] **Binding Margins**: Left margin 1.25 inches for soft binding (2 copies).
