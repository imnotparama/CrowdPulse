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
| 5 | **5** | **1. Introduction** | Problem statement, turbulent crowd shockwaves, multi-sensor precursor paradigm, 21ECC301P course context |
| 6 | **6** | **1.1 Background & 2. Objectives** | Multi-sensor precursor motivation, 5 primary engineering objectives |
| 7 | **7** | **2. Objectives & 3. Block Diagram** | Objectives 3-5, Table 1 Target Metrics, layered hardware architecture, Section 3 intro |
| 8 | **8** | **3. Block Diagram (cont'd)** | Figure 1 System Block Diagram, transducer & telemetry bus descriptions |
| 9 | **9** | **4. Hardware & Software Specs** | Table 2 Hardware component specifications, Table 3 Microcontroller Pinout Mapping |
| 10 | **10** | **4. Specs (cont'd) & 5. Circuit** | Table 4 Software Toolchain Stack, Figure 2 Circuit Schematic, interfacing theory |
| 11 | **11** | **5. Circuit (cont'd) & 6. Flowchart** | Pull-up sizing, 2N2222 switching, Figure 3 Compact Execution Flowchart |
| 12 | **12** | **6. Algorithm (cont'd)** | Steps 1 to 7 (Wi-Fi hopping, I2S fast-attack DSP, OLED HUD, Risk fusion, Telemetry dispatch) |
| 13 | **13** | **7. Program Code (Python - Part 1)** | Telemetry packet schema, hardware controller, fast-attack decibel envelope filter, Risk math |
| 14 | **14** | **7. Program Code (Python - Part 2)** | Multi-stage actuation state machine, FastAPI ingestion endpoint, WebSocket stream server |
| 15 | **15** | **7. Program Code (8051 ALP - Part 1)** | Reset vector, SFR declarations, memory allocation, main loop, AM2302 bit-banging protocol |
| 16 | **16** | **7. Program Code (8051 ALP - Part 2)** | Bit-sampling loop, PIR polling, decibel comparator, 2N2222 Buzzer driver, delay loops |
| 17 | **17** | **7. ALP (cont'd) & 8. Working Principle** | Machine-cycle timing subroutines, Figure 4 Sensor Fusion Model, working principle |
| 18 | **18** | **8. Working Principle (cont'd)** | Transduction physics (AM2302, INMP441, PIR, 802.11 Sniffer), dynamic weighting equations |
| 19 | **19** | **9. Results and Discussion (Part 1)** | Simulated surge trials, Figure 5 Telemetry Waveforms, decibel peaks, heat index shifts |
| 20 | **20** | **9. Results and Discussion (Part 2)** | Figure 6 Enterprise Dashboard UI, Table 5 Experimental Validation Performance Metrics |
| 21 | **21** | **9. Discussion & 10. Conclusion** | Occlusion compensation, early-warning window (38s lead time), engineering conclusion |
| 22 | **22** | **11. References** | 12 IEEE-style formal academic and technical citations |

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
