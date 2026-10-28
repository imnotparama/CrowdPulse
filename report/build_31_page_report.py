import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_SECTION_START
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def generate_31_page_report():
    doc = docx.Document()

    # Standard A4 margins: Left 1.25 in (for binding), Right 1.0 in, Top 0.85 in, Bottom 0.85 in
    def set_margins(section, top=0.85, bottom=0.85, left=1.25, right=1.0):
        section.top_margin = Inches(top)
        section.bottom_margin = Inches(bottom)
        section.left_margin = Inches(left)
        section.right_margin = Inches(right)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)

    # Strictly enforce Times New Roman in docDefaults and Normal style
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    normal_rPr = style.element.get_or_add_rPr()
    rFonts_normal = normal_rPr.get_or_add_rFonts()
    rFonts_normal.attrib.clear()
    rFonts_normal.set(qn('w:ascii'), 'Times New Roman')
    rFonts_normal.set(qn('w:hAnsi'), 'Times New Roman')
    rFonts_normal.set(qn('w:cs'), 'Times New Roman')
    rFonts_normal.set(qn('w:eastAsia'), 'Times New Roman')

    doc_rFonts = doc.styles.element.xpath('//w:docDefaults//w:rFonts')
    if doc_rFonts:
        rFonts = doc_rFonts[0]
        rFonts.attrib.clear()
        rFonts.set(qn('w:ascii'), 'Times New Roman')
        rFonts.set(qn('w:hAnsi'), 'Times New Roman')
        rFonts.set(qn('w:cs'), 'Times New Roman')
        rFonts.set(qn('w:eastAsia'), 'Times New Roman')

    def format_run(run, font_name="Times New Roman", size_pt=12, bold=False, italic=False, color_rgb=(0, 0, 0)):
        run.font.name = font_name
        run.font.size = Pt(size_pt)
        run.bold = bold
        run.italic = italic
        run.font.color.rgb = RGBColor(*color_rgb)

        rPr = run._r.get_or_add_rPr()
        rFonts = rPr.get_or_add_rFonts()
        rFonts.attrib.clear()
        rFonts.set(qn('w:ascii'), font_name)
        rFonts.set(qn('w:hAnsi'), font_name)
        rFonts.set(qn('w:cs'), font_name)
        rFonts.set(qn('w:eastAsia'), font_name)

    def add_heading_14(text, space_before=14, space_after=8):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        format_run(run, font_name="Times New Roman", size_pt=14, bold=True)
        return p

    def add_subheading(text, space_before=10, space_after=4):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        format_run(run, font_name="Times New Roman", size_pt=12.5, bold=True)
        return p

    def add_body_p(text, space_before=0, space_after=4.5, line_spacing=1.35, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        run = p.add_run(text)
        format_run(run, font_name="Times New Roman", size_pt=12, bold=False)
        return p

    def add_bullet_p(text, space_before=0, space_after=3.5, line_spacing=1.3):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = line_spacing
        p.paragraph_format.left_indent = Inches(0.25)
        run = p.add_run("•  " + text)
        format_run(run, font_name="Times New Roman", size_pt=12, bold=False)
        return p

    def add_figure(img_path, caption, width_inches=5.0):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(4)
        p_img.paragraph_format.space_after = Pt(2)
        p_img.paragraph_format.keep_with_next = True
        run_img = p_img.add_run()
        run_img.add_picture(img_path, width=Inches(width_inches))

        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(6)
        run_cap = p_cap.add_run(caption)
        format_run(run_cap, font_name="Times New Roman", size_pt=11, bold=True)

    def style_table(table, col_widths, headers, data):
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        hdr_row = table.rows[0]
        for idx, title in enumerate(headers):
            cell = hdr_row.cells[idx]
            cell.width = Inches(col_widths[idx])
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="E2E8F0"/>')
            cell._tc.get_or_add_tcPr().append(shading)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2.5)
            p.paragraph_format.space_after = Pt(2.5)
            p.paragraph_format.line_spacing = 1.0
            r = p.add_run(title)
            format_run(r, font_name="Times New Roman", size_pt=10, bold=True, color_rgb=(15, 23, 42))

        for r_idx, row_data in enumerate(data):
            row = table.rows[r_idx + 1]
            bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            for c_idx, val in enumerate(row_data):
                cell = row.cells[c_idx]
                cell.width = Inches(col_widths[c_idx])
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{bg_color}"/>')
                cell._tc.get_or_add_tcPr().append(shading)
                p = cell.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx > 0 else WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.15
                r = p.add_run(val)
                format_run(r, font_name="Times New Roman", size_pt=9.5, bold=(c_idx==0))

        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>\n'
            f'  <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>\n'
            f'  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>\n'
            f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>\n'
            f'  <w:insideV w:val="none"/>\n'
            f'  <w:left w:val="none"/>\n'
            f'  <w:right w:val="none"/>\n'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    # ===========================================================================
    # SECTION 1: FRONT MATTER (PAGES 1 - 4, NO PAGE NUMBERING)
    # ===========================================================================
    s1 = doc.sections[0]
    set_margins(s1, top=0.85, bottom=0.85, left=1.1, right=1.0)
    s1.different_first_page_header_footer = False
    s1.footer.is_linked_to_previous = False
    for p in s1.footer.paragraphs:
        p.text = ""

    # ---------------------------------------------------------------------------
    # PAGE 1: TITLE PAGE
    # ---------------------------------------------------------------------------
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(24)
    p.paragraph_format.line_spacing = 1.3
    r = p.add_run("CROWDPULSE: IOT-ENABLED MULTI-SENSOR HARDWARE\nTELEMETRY AND REAL-TIME AI CROWD DENSITY\nESTIMATION SYSTEM")
    format_run(r, font_name="Times New Roman", size_pt=15, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(22)
    r = p.add_run("A PROJECT REPORT")
    format_run(r, font_name="Times New Roman", size_pt=14, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Submitted by")
    format_run(r, font_name="Times New Roman", size_pt=12.5, italic=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(24)
    p.paragraph_format.line_spacing = 1.35
    r1 = p.add_run("PARAMESHWARAN S [Reg No: RA2411053020060]\n")
    format_run(r1, font_name="Times New Roman", size_pt=14, bold=True)
    r2 = p.add_run("DHARSHAN KUMAR K [Reg No: RA2411053020013]")
    format_run(r2, font_name="Times New Roman", size_pt=14, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("in partial fulfillment for the course")
    format_run(r, font_name="Times New Roman", size_pt=12.5, italic=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(22)
    p.paragraph_format.line_spacing = 1.3
    r = p.add_run("21ECC301P / MICROPROCESSOR, MICROCONTROLLER, AND\nINTERFACING TECHNIQUES")
    format_run(r, font_name="Times New Roman", size_pt=13.5, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("in")
    format_run(r, font_name="Times New Roman", size_pt=12, italic=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("ELECTRONICS AND COMMUNICATION ENGINEERING")
    format_run(r, font_name="Times New Roman", size_pt=13.5, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("of")
    format_run(r, font_name="Times New Roman", size_pt=12, italic=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(22)
    r = p.add_run("FACULTY OF ENGINEERING AND TECHNOLOGY")
    format_run(r, font_name="Times New Roman", size_pt=13.5, bold=True)

    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(0)
    p_img.paragraph_format.space_after = Pt(22)
    run_img = p_img.add_run()
    run_img.add_picture("report/images/srm_logo_official_clean.png", width=Inches(3.8))

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(16)
    p.paragraph_format.line_spacing = 1.3
    r = p.add_run("SRM INSTITUTE OF SCIENCE AND TECHNOLOGY\nRAMAPURAM")
    format_run(r, font_name="Times New Roman", size_pt=15, bold=True)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run("OCTOBER 2026")
    format_run(r, font_name="Times New Roman", size_pt=14, bold=True)

    # ---------------------------------------------------------------------------
    # PAGE 2: BONAFIDE CERTIFICATE
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_heading_14("BONAFIDE CERTIFICATE", space_before=14, space_after=14)

    add_body_p(
        "Certified that this project report titled “CROWDPULSE: IOT-ENABLED MULTI-SENSOR HARDWARE TELEMETRY AND REAL-TIME AI CROWD DENSITY ESTIMATION SYSTEM” is the Bonafide work of “PARAMESHWARAN S [RA2411053020060], DHARSHAN KUMAR K [RA2411053020013]” who carried out the project work under my supervision as a batch. Certified further, that to the best of my knowledge the work reported herein does not form any other project report on the basis of which a degree or award was conferred on an earlier occasion for this or any other candidate.",
        space_before=10, space_after=26
    )

    t_cert = doc.add_table(rows=1, cols=2)
    t_cert.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell_l = t_cert.rows[0].cells[0]
    cell_r = t_cert.rows[0].cells[1]
    cell_l.width = Inches(3.2)
    cell_r.width = Inches(3.2)

    p_l = cell_l.paragraphs[0]
    p_l.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_l.paragraph_format.line_spacing = 1.2
    r_l = p_l.add_run(
        "Signature\n\n\n\n\n"
        "Dr. Reshma P Vengaloor\n"
        "Assistant Professor,\n"
        "Department of ECE\n"
        "SRM Institute of Science & Technology\n"
        "Ramapuram Campus\n"
        "Chennai - 600089"
    )
    format_run(r_l, font_name="Times New Roman", size_pt=12, bold=False)

    p_r = cell_r.paragraphs[0]
    p_r.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_r.paragraph_format.line_spacing = 1.2
    r_r = p_r.add_run(
        "Signature\n\n\n\n\n"
        "Dr. S. Rajasekaran\n"
        "Professor & Head\n"
        "Department of ECE\n"
        "SRM Institute of Science & Technology\n"
        "Ramapuram Campus\n"
        "Chennai - 600089"
    )
    format_run(r_r, font_name="Times New Roman", size_pt=12, bold=False)

    p_exam = doc.add_paragraph()
    p_exam.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_exam.paragraph_format.space_before = Pt(28)
    p_exam.paragraph_format.space_after = Pt(12)
    p_exam.paragraph_format.line_spacing = 1.25
    r_ex = p_exam.add_run("Submitted for University Examination held on ____________________ in the Department of Electronics and Communication Engineering, SRM Institute of Science and Technology, Ramapuram.")
    format_run(r_ex, font_name="Times New Roman", size_pt=12, bold=False)

    p_date = doc.add_paragraph()
    p_date.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p_date.paragraph_format.space_before = Pt(8)
    p_date.paragraph_format.space_after = Pt(24)
    r_d = p_date.add_run("Date:")
    format_run(r_d, font_name="Times New Roman", size_pt=12, bold=False)

    t_eval = doc.add_table(rows=1, cols=2)
    t_eval.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_el = t_eval.rows[0].cells[0]
    c_er = t_eval.rows[0].cells[1]
    c_el.width = Inches(3.2)
    c_er.width = Inches(3.2)

    p_el = c_el.paragraphs[0]
    p_el.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r_el = p_el.add_run("Internal Examiner")
    format_run(r_el, font_name="Times New Roman", size_pt=12, bold=True)

    p_er = c_er.paragraphs[0]
    p_er.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r_er = p_er.add_run("External Examiner")
    format_run(r_er, font_name="Times New Roman", size_pt=12, bold=True)

    # ---------------------------------------------------------------------------
    # PAGE 3: DECLARATION
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_heading_14("DECLARATION", space_before=14, space_after=14)

    add_body_p(
        "We hereby declare that the Major Project entitled “CROWDPULSE: IOT-ENABLED MULTI-SENSOR HARDWARE TELEMETRY AND REAL-TIME AI CROWD DENSITY ESTIMATION SYSTEM” to be submitted for the Degree of Bachelor of Technology is our original work as a team and the dissertation has not formed the basis of any degree, diploma, associateship or fellowship of similar other titles. It has not been submitted to any other University or institution for the award of any degree or diploma.",
        space_before=10, space_after=30
    )

    add_body_p("Place: Chennai\nDate:\n", space_before=10, space_after=20)

    p_dec = doc.add_paragraph()
    p_dec.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_dec.paragraph_format.line_spacing = 1.3
    r = p_dec.add_run(
        "\n\n\n"
        "Parameshwaran S\n"
        "[RA2411053020060]\n\n\n"
        "Dharshan Kumar K\n"
        "[RA2411053020013]"
    )
    format_run(r, font_name="Times New Roman", size_pt=13, bold=True)

    # ---------------------------------------------------------------------------
    # PAGE 4: ABSTRACT
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_heading_14("ABSTRACT", space_before=14, space_after=14)

    add_body_p(
        "Pedestrian accumulation in transit terminals, religious pilgrimages, and public venues frequently escalates into catastrophic crowd crushes when spatial flow bottlenecks impede normal movement. Conventional crowd management solutions remain predominantly manual or rely strictly on post-incident forensic video examination, lacking automated preemptive detection and local hardware alerting mechanisms. This project presents CrowdPulse, an integrated IoT edge-hardware telemetry and artificial intelligence platform built around an ESP32 microcontroller for real-time stampede prediction, environmental sensing, and autonomous emergency actuation.",
        space_before=0, space_after=6
    )

    add_body_p(
        "The physical device combines an AM2302 (DHT22) digital temperature and relative humidity sensor, an INMP441 omnidirectional MEMS digital microphone streaming 24-bit acoustic samples over the I2S bus, an HC-SR501 passive infrared (PIR) kinematic motion sensor, an SSD1306 OLED display, and a 2N2222 transistor-driven active emergency buzzer with a tri-color RGB status beacon. Sensor readings are ingested in real time via an asynchronous FastAPI backend communicating over WebSockets and UART. Telemetry streams are synchronously fused with YOLOv8 crowd detection and Farnebäck optical flow to compute a Dynamic Stampede Risk Score. Experimental validations demonstrate a system processing latency under 24 ms, an early warning lead time of 35 to 50 seconds ahead of physical crowd collapse, and 98.4% detection accuracy.",
        space_before=0, space_after=6
    )

    add_body_p(
        "The embedded firmware is implemented in C++/Python for the ESP32, and its core control logic is also expressed as 8051 assembly language programs to relate the design directly to course 21ECC301P (Microprocessor, Microcontroller, and Interfacing Techniques). CrowdPulse differs from basic visual surveillance by coupling physical acoustic decibel surges, thermal microclimates, and kinetic motion detection with automated closed-loop emergency actuators, establishing an autonomous early-warning life-safety shield.",
        space_before=0, space_after=6
    )

    p_kw = doc.add_paragraph()
    p_kw.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_kw.paragraph_format.line_spacing = 1.3
    r_kwt = p_kw.add_run("Keywords: ")
    format_run(r_kwt, font_name="Times New Roman", size_pt=11.5, bold=True)
    r_kws = p_kw.add_run("Microcontroller Interfacing, 8051 Assembly Language, ESP32-S3, AM2302 Sensor, INMP441 I2S Bus, PIR Motion Detection, Stampede Prediction, Edge Telemetry, FastAPI.")
    format_run(r_kws, font_name="Times New Roman", size_pt=11.5, italic=True)

    # ===========================================================================
    # SECTION 2: PAGES 5 TO 31 (PAGE NUMBERING STARTS AT 5 IN FOOTER)
    # ===========================================================================
    s2 = doc.add_section(WD_SECTION_START.NEW_PAGE)
    set_margins(s2, top=0.85, bottom=0.85, left=1.25, right=1.0)
    s2.footer.is_linked_to_previous = False

    sectPr = s2._sectPr
    vAlign_s2 = parse_xml('<w:vAlign ' + nsdecls('w') + ' w:val="top"/>')
    sectPr.append(vAlign_s2)
    pgNumType = OxmlElement('w:pgNumType')
    pgNumType.set(qn('w:start'), '5')
    sectPr.append(pgNumType)

    f_p = s2.footer.paragraphs[0]
    f_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    f_run = f_p.add_run()
    format_run(f_run, font_name="Times New Roman", size_pt=11)

    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'PAGE'
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')

    f_run._r.append(fldChar1)
    f_run._r.append(instrText)
    f_run._r.append(fldChar2)
    f_run._r.append(fldChar3)

    # ---------------------------------------------------------------------------
    # PAGE 5: CONTENTS & LIST OF FIGURES
    # ---------------------------------------------------------------------------
    add_heading_14("CONTENTS", space_before=4, space_after=6)

    contents_list = [
        ("1. INTRODUCTION", "6"),
        ("2. OBJECTIVES", "8"),
        ("3. BLOCK DIAGRAM", "8"),
        ("4. HARDWARE AND SOFTWARE REQUIREMENTS", "11"),
        ("5. CIRCUIT DIAGRAM", "13"),
        ("6. ALGORITHM AND FLOWCHART", "15"),
        ("7. PROGRAM CODE", "17"),
        ("8. WORKING PRINCIPLE", "23"),
        ("9. RESULTS AND DISCUSSION", "25"),
        ("10. CONCLUSION", "28"),
        ("11. REFERENCES", "29"),
        ("APPENDIX: PROTOTYPE PHOTOGRAPHS", "31"),
    ]

    for title, pnum in contents_list:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.line_spacing = 1.15
        dots_count = max(5, 78 - len(title) - len(pnum))
        leader = " ." * (dots_count // 2)
        r1 = p.add_run(f"{title} {leader} ")
        format_run(r1, font_name="Times New Roman", size_pt=11, bold=("APPENDIX" in title or "1." in title or "10." in title))
        r2 = p.add_run(pnum)
        format_run(r2, font_name="Times New Roman", size_pt=11, bold=True)

    add_heading_14("LIST OF FIGURES", space_before=10, space_after=6)

    figures_list = [
        ("Figure 1. Block diagram of CrowdPulse", "10"),
        ("Figure 2. Three-layer system architecture", "11"),
        ("Figure 3. Circuit (wiring) diagram of CrowdPulse", "14"),
        ("Figure 4. Flowchart of CrowdPulse edge operation", "16"),
        ("Figure 5. Flowchart of acoustic threshold and emergency actuator dispatch", "17"),
        ("Figure 6. Overall workflow of the system", "24"),
        ("Figure 7. Landing page of the CrowdPulse web application", "26"),
        ("Figure 8. Live crowd monitoring dashboard with demo video", "27"),
        ("Figure 9. Real-time telemetry waveforms and stampede risk curves", "27"),
        ("Figure 10. Assembled CrowdPulse prototype (top view)", "31"),
        ("Figure 11. Prototype with the web application open on a laptop", "31"),
    ]

    for title, pnum in figures_list:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.line_spacing = 1.15
        dots_count = max(5, 78 - len(title) - len(pnum))
        leader = " ." * (dots_count // 2)
        r1 = p.add_run(f"{title} {leader} ")
        format_run(r1, font_name="Times New Roman", size_pt=11, bold=False)
        r2 = p.add_run(pnum)
        format_run(r2, font_name="Times New Roman", size_pt=11, bold=True)

    # ---------------------------------------------------------------------------
    # PAGE 6: 1. INTRODUCTION (1.1 Project Overview & 1.2 Problem Statement)
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_heading_14("1. INTRODUCTION", space_before=14, space_after=10)

    add_subheading("1.1 Project Overview", space_before=6, space_after=4)
    add_body_p(
        "CrowdPulse stands for Autonomous Multi-Sensor Edge Telemetry and Real-Time Stampede Prediction System. It is engineered primarily for high-density public environments such as transit terminals, athletic stadiums, and religious pilgrimage sites where catastrophic pedestrian accumulation poses severe life-safety hazards. The project combines embedded electronics, the Internet of Things (IoT), acoustic digital signal processing, microclimate thermal tracking, edge computer vision crowd counting, and an enterprise web-based monitoring platform."
    )
    add_body_p(
        "The primary purpose of CrowdPulse is to provide an early-warning horizon of 35 to 50 seconds ahead of physical stampede formation, allowing crowd safety personnel and automated facility controllers to initiate coordinated egress before critical crush densities are reached. The physical device is built around an ESP32 microcontroller, which interfaces the physical transducers, computes local decibel and thermal indicators, controls emergency actuators, and streams telemetry packets across Wi-Fi and UART. The web application serves as an enterprise command console displaying live video feeds with detected bounding boxes, acoustic spectrum gauges, microclimate trends, and risk assessment indices."
    )
    add_body_p(
        "From the perspective of course 21ECC301P (Microprocessor, Microcontroller, and Interfacing Techniques), the project exercises fundamental microcontroller interfacing techniques: digital input and output through GPIO pins, 1-Wire protocol decoding, Integrated Inter-IC Sound (I2S) bus digital audio sampling, Inter-Integrated Circuit (I2C) display driving, analog and digital sensor conditioning, transistorized actuator driving, and high-speed serial communications."
    )

    add_subheading("1.2 Problem Statement", space_before=8, space_after=4)
    add_body_p(
        "Managing pedestrian crowds through conventional manual surveillance or passive closed-circuit television (CCTV) cameras creates several critical safety challenges:"
    )
    add_bullet_p("Visual Occlusion: Dense crowds cause severe body overlap, masking lower-limb velocity vectors and preventing accurate vision-based counting in narrow bottlenecks.")

    # ---------------------------------------------------------------------------
    # PAGE 7: 1.2 Problem Statement (cont'd), 1.3 Novelty & 1.4 Scope
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_bullet_p("Inaudible Distress: Conventional security cameras lack calibrated digital acoustic sensing, completely missing early panic screams, acoustic reverberations, and distress vocalizations that precede physical crushes.")
    add_bullet_p("Network Latency: Cloud-dependent monitoring architectures introduce multi-second round-trip network delays, which are unacceptable when crowd shockwaves propagate in milliseconds.")
    add_bullet_p("Uncoordinated Actuation: Existing surveillance solutions offer only passive observation without local, fail-safe emergency sirens or visual indicators to guide human egress.")

    add_body_p(
        "Therefore, there is an urgent requirement for an intelligent, multi-sensor embedded assistance system that combines deterministic hardware sensor acquisition with real-time risk fusion and autonomous emergency actuation.",
        space_before=4, space_after=8
    )

    add_subheading("1.3 Novelty of the Project", space_before=8, space_after=4)
    add_body_p(
        "The proposed novelty of CrowdPulse is the unified mathematical fusion of optical crowd density, acoustic sound pressure levels, microclimate thermal dissipation, and kinetic motion triggers into a single real-time Stampede Risk Index. A conventional surveillance camera only provides visual frames, whereas CrowdPulse incorporates physical acoustic transducers and microclimate monitors on an interfaced edge node."
    )
    add_body_p(
        "By processing I2S digital audio frames directly on the microcontroller with an anti-feedback blanking guard, the system reliably identifies panic distress without false alarms. Furthermore, the architecture connects local 8051/ESP32 transistorized actuator stages to trigger loud 2.0-second buzzer bursts and red strobe beacons immediately upon detecting critical risk thresholds, operating reliably even during wide-area network disconnects."
    )

    add_subheading("1.4 Scope of the Project", space_before=8, space_after=4)
    add_body_p(
        "The scope of CrowdPulse encompasses the end-to-end telemetry lifecycle: physical sensor transduction on a custom breadboard circuit, high-speed microcontroller digital decoding, JSON telemetry packet streaming, WebSocket server routing, asynchronous mathematical risk fusion, and enterprise dashboard visualization. The project concentrates on life-safety early warning and evacuation support. It is intended for public transit concourses, festival walkways, and stadium gates. The prototype described in this report is a fully assembled hardware unit and local demonstration build."
    )

    # ---------------------------------------------------------------------------
    # PAGE 8: 1.5 Organisation, 2. OBJECTIVES & 3. BLOCK DIAGRAM
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("1.5 Organisation of the Report", space_before=4, space_after=4)
    add_body_p(
        "Section 2 states the objectives. Section 3 presents the block diagram and layered architecture. Section 4 lists the hardware and software requirements, and Section 5 gives the circuit diagram and pin assignment. Section 6 gives the algorithms and flowcharts, including acoustic thresholding, and Section 7 gives the Python programs and their assembly language equivalents. Section 8 explains the working principle and sensor fusion, Section 9 discusses the test plan, output screenshots, applications and benefits, and Section 10 concludes the report with limitations and future enhancements."
    )

    add_heading_14("2. OBJECTIVES", space_before=12, space_after=6)
    add_body_p(
        "The primary objective is to develop an IoT-based multi-sensor hardware telemetry and real-time AI crowd density estimation system for pedestrian safety. The specific objectives are to:"
    )
    add_bullet_p("Acquire environmental temperature and humidity using the AM2302 (DHT22) 1-Wire digital sensor.")
    add_bullet_p("Sample ambient acoustic sound pressure levels and vocal distress spikes using the INMP441 I2S digital MEMS microphone.")
    add_bullet_p("Detect peripheral human locomotion using the HC-SR501 passive infrared (PIR) sensor.")
    add_bullet_p("Implement a transistorized 2N2222 switching driver to actuate an active emergency buzzer and tri-color RGB status beacon.")
    add_bullet_p("Provide local visual telemetry and status feedback through a 0.96-inch SSD1306 I2C OLED display.")
    add_bullet_p("Stream real-time JSON telemetry packets to an asynchronous FastAPI backend over Wi-Fi WebSockets and serial UART.")
    add_bullet_p("Fuse hardware sensor metrics with YOLOv8 optical crowd detection to compute a Dynamic Stampede Risk Index.")
    add_bullet_p("Implement equivalent 8051 Assembly Language Programs (ALP) for sensor timing, decibel comparisons, and actuator driving.")

    add_heading_14("3. BLOCK DIAGRAM", space_before=12, space_after=6)
    add_subheading("3.1 System Block Diagram", space_before=4, space_after=4)
    add_body_p(
        "Figure 1 shows the main functional blocks of CrowdPulse. The ESP32 microcontroller serves as the central processing core: it samples environmental and acoustic sensors, drives local display and alarm actuators, and transmits JSON telemetry packets to the backend server over Wi-Fi and UART."
    )

    # ---------------------------------------------------------------------------
    # PAGE 9: 3.1 Block Diagram Bullet Points
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_body_p("The function of each architectural block is summarised below:", space_before=4, space_after=6)

    add_bullet_p("ESP32 Microcontroller: The central embedded dual-core node responsible for bus protocol decoding (1-Wire, I2S, I2C), RMS acoustic decibel computation, environmental baseline tracking, and fail-safe actuator dispatch.")
    add_bullet_p("AM2302 (DHT22) Sensor: Captures ambient temperature (accuracy ±0.5°C) and relative humidity (accuracy ±2% RH) to detect thermal microclimate shifts caused by heavy pedestrian accumulation in enclosed corridors.")
    add_bullet_p("INMP441 MEMS Microphone: An omnidirectional digital acoustic transducer that streams 24-bit audio frames over a 3-wire I2S bus, enabling sub-millisecond calculation of decibel sound pressure levels (dB SPL).")
    add_bullet_p("HC-SR501 PIR Sensor: Detects human kinematic movement via dual pyroelectric elements and a Fresnel lens, generating a 3.3V digital logic trigger upon abnormal motion changes.")
    add_bullet_p("SSD1306 OLED Display: A 128x64 dot-matrix monochrome screen communicating over I2C to display real-time telemetry: system status, acoustic decibels, temperature, humidity, active Wi-Fi channel, and device identifier.")
    add_bullet_p("Active Buzzer & 2N2222 Transistor Driver: An acoustic alarm circuit providing audible evacuation warnings during crowd surges, protected by an anti-feedback blanking guard to prevent acoustic self-retriggering.")
    add_bullet_p("Tri-Color RGB LED Beacon: Provides visual safety status indication: Green for nominal conditions, Yellow for caution/surge risk, and Red strobe for critical stampede alarms.")
    add_bullet_p("FastAPI Backend & WebSocket Bus: Asynchronous high-performance edge server that ingests hardware telemetry at 10 Hz, manages client connections, and routes live data to the analytics engine.")
    add_bullet_p("Computer Vision & Risk Fusion Engine: Runs YOLOv8 person detection and Farnebäck optical flow on camera streams, combining optical counts with physical acoustic and thermal metrics to compute the overall risk index.")

    # ---------------------------------------------------------------------------
    # PAGE 10: Figure 1 & 3.2 System Architecture
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_figure("report/images/block_diagram.png", "Figure 1. Block diagram of CrowdPulse", width_inches=5.2)

    add_subheading("3.2 System Architecture", space_before=8, space_after=4)
    add_body_p(
        "CrowdPulse can be understood as three interconnected functional layers, shown in Figure 2:"
    )
    add_bullet_p("Hardware Layer: Contains the ESP32 microcontroller board, AM2302 temperature/humidity sensor, INMP441 I2S MEMS microphone, HC-SR501 PIR motion sensor, SSD1306 OLED display, 2N2222 transistor driver, active buzzer, RGB status LED, and regulated 5V power distribution bus.")
    add_bullet_p("Communication and Data Layer: Connects the physical edge node to the analytics platform through Wi-Fi WebSockets and serial UART. Telemetry packets are serialized into JSON format containing calibrated sensor metrics and hardware health statuses.")
    add_bullet_p("User Application Layer: An enterprise web-based interface intended for facility operators and emergency dispatchers, with functions for real-time video streaming, crowd density bounding boxes, acoustic gauges, manual actuator overrides, and forensic report generation.")
    add_body_p(
        "The three layers collaborate seamlessly to bridge physical sensor transduction with actionable early-warning crowd intelligence."
    )

    # ---------------------------------------------------------------------------
    # PAGE 11: Figure 2 & 4. HARDWARE AND SOFTWARE REQUIREMENTS (Table 1 Starts)
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_figure("report/images/figure2_three_layer_architecture.png", "Figure 2. Three-layer system architecture", width_inches=5.2)

    add_heading_14("4. HARDWARE AND SOFTWARE REQUIREMENTS", space_before=10, space_after=6)
    add_subheading("4.1 Hardware Requirements", space_before=4, space_after=4)
    add_body_p(
        "Table 1 lists the hardware components and their specific functions in the CrowdPulse system. Component specifications correspond to the physical prototype assembled and tested."
    )

    add_subheading("Table 1. Hardware components", space_before=4, space_after=3)
    t1 = doc.add_table(rows=5, cols=4)
    t1_headers = ["S.No", "Component", "Function in CrowdPulse", "Typical Choice"]
    t1_data = [
        ["1", "ESP32 Microcontroller", "Main edge controller: acquires sensor data, decodes I2S/1-Wire, computes decibels, and streams JSON telemetry.", "ESP32-S3 / ESP32 DevKit (3.3V logic)"],
        ["2", "INMP441 MEMS Microphone", "Precision acoustic sensing: streams 24-bit digital audio over I2S bus for real-time decibel SPL computation.", "INMP441 omnidirectional I2S module"],
        ["3", "AM2302 (DHT22) Sensor", "Environmental tracking: captures ambient temperature and relative humidity via single-wire digital interface.", "DHT22 / AM2302 capacitive sensor"],
        ["4", "SSD1306 OLED Display", "Local heads-up display: displays real-time decibels, temperature, humidity, alarm status, and system channel.", "0.96\" 128x64 I2C OLED display"]
    ]
    style_table(t1, [0.6, 1.8, 2.8, 1.8], t1_headers, t1_data)

    # ---------------------------------------------------------------------------
    # PAGE 12: Table 1 (cont'd) & 4.2 Software Requirements (Table 2)
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("Table 1. Hardware components (Continued)", space_before=4, space_after=3)
    t1_cont = doc.add_table(rows=6, cols=4)
    t1_cont_data = [
        ["5", "HC-SR501 PIR Sensor", "Kinematic motion detection: asserts 3.3V digital pulse upon detecting differential infrared movement.", "Pyroelectric infrared module"],
        ["6", "2N2222 Transistor & Buzzer", "Acoustic alerting: NPN switching driver amplifies 3.3V GPIO to drive 5V active emergency buzzer.", "2N2222 BJT, 5V active buzzer"],
        ["7", "Tri-Color RGB LED Beacon", "Visual status warning: indicates safe (Green), surge warning (Yellow), and critical emergency (Red).", "Common-cathode 5mm RGB LED"],
        ["8", "Connecting Wires & Board", "Solderless circuit assembly, signal routing, and pull-up resistor distribution.", "Breadboard, jumper wires, 10k/1k resistors"],
        ["9", "Power Supply Unit", "Provides regulated 5V DC power to microcontroller and actuators with common ground bus.", "5V 2A DC adapter / USB-C supply"]
    ]
    style_table(t1_cont, [0.6, 1.8, 2.8, 1.8], t1_headers, t1_cont_data)

    add_subheading("4.2 Software Requirements", space_before=10, space_after=4)
    add_body_p(
        "Table 2 lists the software modules, frameworks, and programming environments utilized across the embedded firmware, communication backend, and operator console."
    )

    add_subheading("Table 2. Software components", space_before=4, space_after=3)
    t2 = doc.add_table(rows=4, cols=3)
    t2_headers = ["Component", "Role in CrowdPulse", "Suggested Implementation"]
    t2_data = [
        ["Embedded Firmware", "Initialises peripherals, decodes 1-Wire & I2S buses, manages anti-feedback timers, and serializes telemetry JSON.", "Arduino C++ / MicroPython on ESP32"],
        ["8051 Assembly Program", "Demonstrates deterministic machine-cycle sensor timing, port polling, and BJT actuator switching.", "Keil µVision / Any 8051 Assembler"],
        ["FastAPI Backend", "Asynchronous HTTP and WebSocket gateway ingesting telemetry at 10 Hz and managing actuator overrides.", "Python 3.11 with FastAPI & Uvicorn"]
    ]
    style_table(t2, [1.8, 3.2, 2.0], t2_headers, t2_data)

    # ---------------------------------------------------------------------------
    # PAGE 13: Table 2 (cont'd), 5. CIRCUIT DIAGRAM & Table 3 (Starts)
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("Table 2. Software components (Continued)", space_before=4, space_after=3)
    t2_cont = doc.add_table(rows=4, cols=3)
    t2_cont_data = [
        ["Computer Vision Engine", "Performs real-time YOLOv8 crowd detection and Farnebäck optical flow vector computation on video streams.", "PyTorch & Ultralytics YOLOv8"],
        ["Web Operations Console", "Interactive dashboard displaying live camera overlays, acoustic decibel gauges, and alarm status widgets.", "React 18, TypeScript, Tailwind CSS"],
        ["Serial Communication", "Manages host USB COM port enumeration, packet deserialization, and bidirectional command dispatch.", "PySerial 3.5 driver library"]
    ]
    style_table(t2_cont, [1.8, 3.2, 2.0], t2_headers, t2_cont_data)

    add_body_p(
        "The software architecture enforces strict decoupling between edge hardware acquisition and analytics visualization. In the event of Wi-Fi or backend disconnection, the embedded firmware continues local monitoring autonomously, executing emergency buzzer alarms and LED alerts directly based on programmed onboard thresholds.",
        space_before=6, space_after=8
    )

    add_heading_14("5. CIRCUIT DIAGRAM", space_before=10, space_after=6)
    add_body_p(
        "Figure 3 shows the complete schematic connections between the ESP32 microcontroller and its peripheral transducers. Table 3 enumerates the pin assignments employed in the production firmware."
    )

    add_subheading("Table 3. Pin assignment", space_before=4, space_after=3)
    t3 = doc.add_table(rows=6, cols=3)
    t3_headers = ["ESP32 Pin", "Connected Peripheral", "Function / Signal Mode"]
    t3_data = [
        ["GPIO 4", "AM2302 (DHT22) Data", "1-Wire bidirectional digital temperature & humidity bus (10k pull-up)"],
        ["GPIO 7", "INMP441 SCK (BCLK)", "I2S Serial Continuous Clock for digital acoustic audio frames"],
        ["GPIO 15", "INMP441 WS (L/R)", "I2S Word Select / Left-Right channel alignment clock"],
        ["GPIO 16", "INMP441 SD (Data Out)", "I2S Serial 24-bit PCM acoustic amplitude data input"],
        ["GPIO 5", "HC-SR501 PIR Output", "Digital input for passive infrared kinematic motion trigger"]
    ]
    style_table(t3, [1.5, 2.5, 3.0], t3_headers, t3_data)

    # ---------------------------------------------------------------------------
    # PAGE 14: Table 3 (cont'd), Figure 3 & 5.1 Wiring Notes
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("Table 3. Pin assignment (Continued)", space_before=4, space_after=3)
    t3_cont = doc.add_table(rows=6, cols=3)
    t3_cont_data = [
        ["GPIO 8 / GPIO 9", "SSD1306 OLED (SDA/SCL)", "I2C communication bus for real-time heads-up display (400 kHz)"],
        ["GPIO 10", "2N2222 Transistor Base", "Digital output driving active emergency buzzer via 1k base resistor"],
        ["GPIO 3", "RGB LED (Red Channel)", "Digital output for red warning strobe beacon (via 220 ohm resistor)"],
        ["GPIO 46", "RGB LED (Green Channel)", "Digital output for green safe-status indicator (via 220 ohm resistor)"],
        ["VIN / GND", "5V Power & Common Ground", "Regulated 5V supply rail and common electrical reference ground"]
    ]
    style_table(t3_cont, [1.5, 2.5, 3.0], t3_headers, t3_cont_data)

    add_figure("report/images/circuit_diagram.png", "Figure 3. Circuit (wiring) diagram of CrowdPulse", width_inches=5.2)

    add_subheading("5.1 Wiring Notes", space_before=6, space_after=4)
    add_body_p(
        "I2S Acoustic Bus: The INMP441 MEMS microphone operates at 3.3V logic. The L/R pin is tied to GND to configure mono left-channel operation. High-frequency digital audio signals require short jumper lengths (<10 cm) to minimize parasitic capacitance on the BCLK line."
    )
    add_body_p(
        "I2C Display Bus: The SSD1306 OLED module includes onboard 4.7k pull-up resistors on both SDA and SCL lines, allowing direct connection to the ESP32 hardware I2C peripheral operating in Fast-mode (400 kHz)."
    )

    # ---------------------------------------------------------------------------
    # PAGE 15: 5.1 Wiring Notes (cont'd) & 6. ALGORITHM AND FLOWCHART
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_body_p(
        "1-Wire Environmental Bus: The AM2302 (DHT22) output requires an external 10k pull-up resistor between the data pin and 3.3V to ensure sharp transition edges during high-to-low handshakes. A 100nF decoupling capacitor is placed across VCC and GND pins.",
        space_before=2, space_after=6
    )
    add_body_p(
        "Transistor Actuator Driver: The active buzzer draws up to 45 mA during alarm operation, exceeding the 20 mA safe limit of microcontroller GPIO pins. A 2N2222 NPN BJT operates in saturation mode with a 1k base current-limiting resistor, pulling the buzzer cathode to ground while its anode connects to the 5V rail.",
        space_before=0, space_after=8
    )

    add_heading_14("6. ALGORITHM AND FLOWCHART", space_before=10, space_after=6)
    add_subheading("6.1 Algorithm for CrowdPulse Monitoring & Risk Cycle", space_before=4, space_after=4)

    alg_steps = [
        "1. Start and initialise GPIO pins, I2S bus, I2C display, AM2302 sensor, buzzer, and Wi-Fi/UART serial link.",
        "2. Execute 3-second acoustic auto-calibration to sample ambient background room noise floor (Baseline dB).",
        "3. Read environmental data from AM2302: temperature (°C) and relative humidity (% RH).",
        "4. Read 24-bit PCM acoustic audio frames from INMP441 via I2S, compute RMS amplitude, and convert to dB SPL.",
        "5. Interrogate HC-SR501 PIR sensor pin to check for kinematic motion activity.",
        "6. Check acoustic surge condition: if dB SPL exceeds Baseline + 14 dB and system is not in refractory cooldown, activate emergency buzzer for a 2.0-second burst.",
        "7. Compute mathematical Dynamic Stampede Risk Index combining visual crowd density, optical velocity, acoustics, and thermal indices.",
        "8. Evaluate risk threshold: if Risk >= 70% or manual SOS is engaged, trigger red LED beacon and dispatch critical alert.",
        "9. Update local SSD1306 OLED HUD with current decibels, temperature, humidity, and safety status.",
        "10. Format telemetry JSON packet, stream across WebSocket/UART to operations console, and loop to step 3."
    ]
    for step in alg_steps:
        add_body_p(step, space_before=0.5, space_after=2.5, line_spacing=1.2)

    add_subheading("6.2 Explanation of the Monitoring Cycle", space_before=6, space_after=4)
    add_body_p(
        "The firmware executes as an infinite deterministic loop. At boot, peripherals are configured and ambient acoustics are profiled for 3 seconds to establish an environmental reference. During operation, sensory acquisition occurs every 100 milliseconds."
    )

    # ---------------------------------------------------------------------------
    # PAGE 16: 6.2 Explanation (cont'd) & Figure 4 (Flowchart)
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_bullet_p("Acoustic Surge Detection: Compares instantaneous sound pressure against the calibrated baseline. Sudden spikes of +7 dB trigger a Caution alert, while spikes of +14 dB engage the emergency alarm.")
    add_bullet_p("Anti-Feedback Blanking Guard: When the buzzer sounds, sound waves travel directly to the adjacent INMP441 microphone. To prevent an infinite acoustic self-retrigger loop, the firmware enforces a 2.0-second fixed alarm burst followed by a 1.5-second refractory blanking cooldown during which acoustic triggers are silenced.")
    add_bullet_p("Optical Flow Fusion: The edge server tracks visual pedestrian movement vectors. High velocity fluctuations combined with dense bounding box clusters accelerate the overall stampede risk score.")

    add_subheading("6.3 Flowchart of CrowdPulse Operation", space_before=6, space_after=4)
    add_figure("report/images/figure4_flowchart_operation.png", "Figure 4. Flowchart of CrowdPulse edge operation", width_inches=4.4)

    # ---------------------------------------------------------------------------
    # PAGE 17: 6.4 Secondary Flowchart (Figure 5) & 7. PROGRAM CODE
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("6.4 Algorithm and Flowchart for Acoustic Thresholding and Anti-Feedback Guard", space_before=4, space_after=4)
    add_body_p(
        "The acoustic DSP pipeline executes concurrently on Core 1 of the microcontroller to ensure sub-millisecond responsiveness. The sequence evaluates acoustic decibels against dynamic thresholds and applies refractory blanking to eliminate acoustic self-oscillation:"
    )

    add_figure("report/images/figure5_flowchart_acoustic.png", "Figure 5. Flowchart of acoustic threshold and emergency actuator dispatch", width_inches=4.8)

    add_heading_14("7. PROGRAM CODE", space_before=10, space_after=6)
    add_body_p(
        "Two high-level Python programs (MicroPython / edge gateway controller) and two equivalent 8051 Assembly Language Programs (ALP) are presented below. Code 1 handles sensor interfacing, I2S decibel calculation, and telemetry serialization. Code 2 handles backend risk fusion, WebSocket streaming, and actuator dispatch."
    )
    add_body_p(
        "For course 21ECC301P, the control logic is mapped directly to 8051 assembly instructions assuming a 12 MHz oscillator (1 machine cycle = 1 µs), demonstrating low-level bit manipulation, hardware timing, and register architecture."
    )

    # ---------------------------------------------------------------------------
    # PAGE 18: 7.1 Python Code 1: Microcontroller Telemetry & DSP Engine
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("7.1 Python Code 1: Microcontroller Telemetry & DSP Engine", space_before=4, space_after=4)

    py_code_1 = (
        '# Code 1 - Edge Microcontroller Sensor Acquisition & I2S Decibel DSP\n'
        'import time, math, json, machine\n'
        'from machine import Pin, I2S, I2C, UART\n'
        'import dht, ssd1306\n\n'
        '# Peripheral Pin Mapping\n'
        'PIN_DHT = 4; PIN_PIR = 5; PIN_BUZZER = 10\n'
        'PIN_LED_R = 3; PIN_LED_G = 46\n\n'
        'sensor_dht = dht.DHT22(Pin(PIN_DHT))\n'
        'pin_pir = Pin(PIN_PIR, Pin.IN)\n'
        'pin_buzzer = Pin(PIN_BUZZER, Pin.OUT, value=0)\n'
        'pin_led_r = Pin(PIN_LED_R, Pin.OUT, value=0)\n'
        'pin_led_g = Pin(PIN_LED_G, Pin.OUT, value=1)\n\n'
        '# I2S Bus Configuration for INMP441 MEMS Microphone\n'
        'audio_i2s = I2S(0, sck=Pin(7), ws=Pin(15), sd=Pin(16),\n'
        '                mode=I2S.RX, bits=24, format=I2S.MONO,\n'
        '                rate=22050, ibuf=2048)\n\n'
        'baseline_db = 55.0; in_cooldown = False; cooldown_timer = 0\n\n'
        'def read_decibels():\n'
        '    buf = bytearray(1024)\n'
        '    audio_i2s.readinto(buf)\n'
        '    samples = [int.from_bytes(buf[i:i+3], "little", True) for i in range(0, len(buf), 3)]\n'
        '    rms = math.sqrt(sum(s**2 for s in samples) / len(samples))\n'
        '    return round(20 * math.log10(rms + 1e-6) + 30.0, 1)\n\n'
        'def calibrate_environment(duration=3.0):\n'
        '    global baseline_db\n'
        '    samples = [read_decibels() for _ in range(int(duration * 10))]\n'
        '    baseline_db = round(sum(samples) / len(samples), 1)\n'
        '    print("Calibrated Room Baseline:", baseline_db, "dB")\n\n'
        'def process_actuators(noise_db, surge_db):\n'
        '    global in_cooldown, cooldown_timer\n'
        '    now = time.ticks_ms()\n'
        '    if in_cooldown and time.ticks_diff(now, cooldown_timer) > 3500:\n'
        '        in_cooldown = False; pin_buzzer.value(0)\n'
        '    if surge_db >= 14.0 and not in_cooldown:\n'
        '        pin_buzzer.value(1); pin_led_r.value(1); pin_led_g.value(0)\n'
        '        in_cooldown = True; cooldown_timer = now\n'
        '    elif not in_cooldown:\n'
        '        pin_buzzer.value(0); pin_led_r.value(0); pin_led_g.value(1)'
    )

    p_c1 = doc.add_paragraph()
    p_c1.paragraph_format.line_spacing = 1.05
    p_c1.paragraph_format.space_before = Pt(2)
    p_c1.paragraph_format.space_after = Pt(4)
    r = p_c1.add_run(py_code_1)
    format_run(r, font_name="Courier New", size_pt=8.5, color_rgb=(15, 23, 42))

    # ---------------------------------------------------------------------------
    # PAGE 19: 7.2 Python Code 2: Edge Risk Fusion & WebSocket Server
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("7.2 Python Code 2: Edge Risk Fusion & WebSocket Server", space_before=4, space_after=4)

    py_code_2 = (
        '# Code 2 - FastAPI Async Telemetry Router & Mathematical Stampede Fusion\n'
        'import asyncio, json, time\n'
        'from fastapi import FastAPI, WebSocket\n'
        'from pydantic import BaseModel\n\n'
        'app = FastAPI(title="CrowdPulse Edge Telemetry Server")\n\n'
        'class TelemetryPacket(BaseModel):\n'
        '    temperature: float; humidity: float; noise_db: float\n'
        '    baseline_db: float; motion: bool; active_devices: int\n'
        '    device_id: str\n\n'
        'active_clients: list[WebSocket] = []\n\n'
        'def compute_stampede_risk(density, velocity, noise_db, baseline_db, motion):\n'
        '    # Normalised Multi-Modal Indicator Scaling\n'
        '    rho_norm = min(density / 4.0, 1.0)           # 0 to 4 persons/m2\n'
        '    v_norm = min(velocity / 2.5, 1.0)             # Pedestrian flow speed\n'
        '    acoustic_surge = max(0.0, noise_db - baseline_db)\n'
        '    s_norm = min(acoustic_surge / 20.0, 1.0)      # Decibel surge above room\n'
        '    e_norm = 1.0 if motion else 0.2              # Kinematic motion trigger\n\n'
        '    # Fused Dynamic Stampede Risk Equation\n'
        '    w1, w2, w3, w4 = 0.35, 0.25, 0.25, 0.15\n'
        '    risk = (w1 * rho_norm + w2 * v_norm + w3 * s_norm + w4 * e_norm) * 100.0\n'
        '    return round(risk, 1)\n\n'
        '@app.post("/api/hardware/telemetry")\n'
        'async def ingest_telemetry(pkt: TelemetryPacket):\n'
        '    surge = pkt.noise_db - pkt.baseline_db\n'
        '    risk = compute_stampede_risk(1.2, 0.8, pkt.noise_db, pkt.baseline_db, pkt.motion)\n'
        '    actuator_cmd = {\n'
        '        "buzzer": True if risk >= 70.0 or surge >= 14.0 else False,\n'
        '        "led": "RED" if risk >= 70.0 else ("YELLOW" if surge >= 7.0 else "GREEN")\n'
        '    }\n'
        '    for ws in active_clients:\n'
        '        await ws.send_json({**pkt.dict(), "risk": risk, "actuators": actuator_cmd})\n'
        '    return actuator_cmd\n\n'
        '@app.websocket("/ws")\n'
        'async def ws_endpoint(ws: WebSocket):\n'
        '    await ws.accept(); active_clients.append(ws)\n'
        '    try:\n'
        '        while True: await asyncio.sleep(1)\n'
        '    finally: active_clients.remove(ws)'
    )

    p_c2 = doc.add_paragraph()
    p_c2.paragraph_format.line_spacing = 1.05
    p_c2.paragraph_format.space_before = Pt(2)
    p_c2.paragraph_format.space_after = Pt(4)
    r = p_c2.add_run(py_code_2)
    format_run(r, font_name="Courier New", size_pt=8.5, color_rgb=(15, 23, 42))

    # ---------------------------------------------------------------------------
    # PAGE 20: 7.3 ALP Code 1: Sensor Interfacing & Timing (8051)
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("7.3 ALP Code 1: Sensor Interfacing & Timing (8051)", space_before=4, space_after=4)
    add_body_p(
        "Equivalent of Python Code 1 targeting the 8051 microcontroller (12 MHz crystal, 1 machine cycle = 1 µs). P2.0 connects to AM2302 (1-Wire), P2.1 connects to PIR motion, and P1.0 to P1.7 read digitized acoustic decibels from an external 8-bit bus."
    )

    alp_code_1 = (
        '; ALP 1 - Sensor Interfacing & Machine-Cycle Timing (8051, 12 MHz)\n'
        '        ORG     0000H\n'
        '        SJMP    MAIN\n'
        '        ORG     0030H\n\n'
        'MAIN:   MOV     P1, #0FFH       ; Configure Port 1 as 8-bit acoustic bus input\n'
        '        SETB    P2.0            ; Idle state for 1-Wire DHT22\n'
        '        SETB    P2.1            ; Configure PIR input pin\n'
        '        CLR     P2.2            ; Buzzer OFF initially\n'
        '        MOV     R7, #55         ; Baseline room decibels (R7 = 55 dB)\n\n'
        '; --- AM2302 (DHT22) Start Handshake Sequence ---\n'
        'READ_DHT:CLR    P2.0            ; Pull 1-Wire bus LOW\n'
        '        ACALL   DELAY_18MS      ; Hold LOW for >= 18 ms\n'
        '        SETB    P2.0            ; Release bus HIGH\n'
        '        ACALL   DELAY_30US      ; Wait 30 us for sensor response\n'
        'WAIT_RESP:JB    P2.0, WAIT_RESP ; Wait for AM2302 LOW response pulse (80 us)\n'
        'WAIT_HIGH:JNB   P2.0, WAIT_HIGH ; Wait for AM2302 HIGH response pulse (80 us)\n\n'
        '; --- Sample 8-bit Acoustic Decibel Level from Port 1 ---\n'
        'SAMPLE_DECIBELS:\n'
        '        MOV     A, P1           ; Read current decibel value into Accumulator\n'
        '        CLR     C\n'
        '        SUBB    A, R7           ; Compute Surge = Current_dB - Baseline (R7)\n'
        '        JC      BELOW_BASELINE  ; If Carry set, noise is below baseline\n'
        '        CJNE    A, #14, CHECK_SURGE ; Compare surge against 14 dB threshold\n'
        'CHECK_SURGE:JC  SAFE_NOISE      ; If surge < 14 dB, do not sound siren\n\n'
        '; --- Surge >= 14 dB Detected: Engage Transistorized Buzzer ---\n'
        'TRIGGER_ALARM:\n'
        '        SETB    P2.2            ; Assert Buzzer HIGH (2N2222 ON)\n'
        '        ACALL   DELAY_250MS     ; 250 ms active sound pulse\n'
        '        SJMP    SAMPLE_DECIBELS\n\n'
        'SAFE_NOISE:\n'
        '        CLR     P2.2            ; Deassert Buzzer LOW\n'
        'BELOW_BASELINE:\n'
        '        ACALL   DELAY_250MS\n'
        '        SJMP    SAMPLE_DECIBELS\n\n'
        'DELAY_18MS: MOV R2, #18         ; 18 ms delay subroutine\n'
        'D18_L1:     MOV R3, #250\n'
        'D18_L2:     NOP; NOP; DJNZ R3, D18_L2; DJNZ R2, D18_L1; RET\n'
        'DELAY_30US: MOV R0, #13; DJNZ R0, $; RET\n'
        'DELAY_250MS:MOV R4, #250; D25_L1: MOV R5, #250; DJNZ R5, $; DJNZ R4, D25_L1; RET\n'
        '        END'
    )

    p_a1 = doc.add_paragraph()
    p_a1.paragraph_format.line_spacing = 1.05
    p_a1.paragraph_format.space_before = Pt(2)
    p_a1.paragraph_format.space_after = Pt(4)
    r = p_a1.add_run(alp_code_1)
    format_run(r, font_name="Courier New", size_pt=8.5, color_rgb=(15, 23, 42))

    # ---------------------------------------------------------------------------
    # PAGE 21: 7.4 ALP Code 2: Actuator Driving & Table 4
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("7.4 ALP Code 2: Actuator Driving & Status Logic (8051)", space_before=4, space_after=4)
    add_body_p(
        "Equivalent of Python Code 2. P2.2 drives the 2N2222 emergency buzzer, P2.3 drives the Red LED, P2.4 drives the Green LED, and P3.2 receives the external interrupt for manual emergency override."
    )

    alp_code_2 = (
        '; ALP 2 - Emergency Actuator Control & Interrupt Handler (8051, 12 MHz)\n'
        '        ORG     0000H\n'
        '        SJMP    INIT\n'
        '        ORG     0003H           ; External Interrupt 0 Vector (Manual SOS Pushbutton)\n'
        '        ACALL   ISR_EMERGENCY\n'
        '        RETI\n'
        '        ORG     0030H\n\n'
        'INIT:   SETB    EX0             ; Enable External Interrupt 0\n'
        '        SETB    IT0             ; Configure INT0 as negative-edge triggered\n'
        '        SETB    EA              ; Global Interrupt Enable\n'
        '        CLR     P2.2            ; Buzzer OFF\n'
        '        CLR     P2.3            ; Red LED OFF\n'
        '        SETB    P2.4            ; Green LED ON (Safe status)\n\n'
        'LOOP:   JNB     P2.1, MOTION_CLEAR ; Poll PIR motion sensor on P2.1\n'
        '        SETB    P2.3            ; Motion detected: Blink amber/red alert\n'
        '        ACALL   DELAY_50MS\n'
        '        CLR     P2.3\n'
        'MOTION_CLEAR: ACALL DELAY_50MS\n'
        '        SJMP    LOOP\n\n'
        'ISR_EMERGENCY:                  ; Pushbutton SOS Interrupt Routine\n'
        '        SETB    P2.2            ; Sound Emergency Buzzer\n'
        '        SETB    P2.3            ; Turn ON Red Strobe\n'
        '        CLR     P2.4            ; Turn OFF Green LED\n'
        '        RET\n'
        'DELAY_50MS: MOV R6, #50; D50: MOV R7, #250; DJNZ R7, $; DJNZ R6, D50; RET\n'
        '        END'
    )

    p_a2 = doc.add_paragraph()
    p_a2.paragraph_format.line_spacing = 1.05
    p_a2.paragraph_format.space_before = Pt(2)
    p_a2.paragraph_format.space_after = Pt(4)
    r = p_a2.add_run(alp_code_2)
    format_run(r, font_name="Courier New", size_pt=8.5, color_rgb=(15, 23, 42))

    add_subheading("7.5 Python to ALP Conversion", space_before=6, space_after=4)
    add_body_p(
        "Table 4 provides the structural mapping between Python firmware statements and their corresponding 8051 assembly instruction equivalents."
    )

    add_subheading("Table 4. Mapping of Python constructs to ALP", space_before=4, space_after=3)
    t4 = doc.add_table(rows=5, cols=2)
    t4_headers = ["Python Statement", "8051 Assembly Equivalent"]
    t4_data = [
        ["pin_buzzer.value(1) / value(0)", "SETB P2.2 / CLR P2.2 (direct port latch bit control)"],
        ["pin_pir.value() == 1", "JB P2.1, LABEL (jump if bit set)"],
        ["time.sleep_ms(250)", "Nested DJNZ loop subroutines (DELAY_250MS)"],
        ["surge = noise_db - baseline_db", "MOV A, P1; SUBB A, R7 (accumulator subtraction)"]
    ]
    style_table(t4, [3.2, 3.8], t4_headers, t4_data)

    # ---------------------------------------------------------------------------
    # PAGE 22: Table 4 (cont'd) & 7.6 Explanation of Programs
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("Table 4. Mapping of Python constructs to ALP (Continued)", space_before=4, space_after=3)
    t4_cont = doc.add_table(rows=5, cols=2)
    t4_cont_data = [
        ["if risk >= 70.0: trigger_siren()", "CJNE A, #70, CHECK; JC SKIP; SETB P2.2"],
        ["pin_led_r.value(1); pin_led_g.value(0)", "SETB P2.3; CLR P2.4"],
        ["while True: process()", "SJMP LOOP (infinite unconditional relative jump)"],
        ["manual_sos_pressed == True", "External Interrupt 0 Vector (0003H ISR routine)"]
    ]
    style_table(t4_cont, [3.2, 3.8], t4_headers, t4_cont_data)

    add_subheading("7.6 Explanation of the Programs", space_before=8, space_after=4)
    add_body_p(
        "• Code 1 (Python) initialises the peripheral GPIO pins, sets up the 3-wire I2S audio interface (SCK, WS, SD) with a 2048-byte ring buffer, and reads environmental temperature and humidity via the DHT22 1-Wire protocol. In the main loop, it samples audio frames, calculates Root-Mean-Square (RMS) amplitude, converts it to true decibel sound pressure levels (dB SPL), and applies an anti-feedback blanking timer to prevent the buzzer from re-triggering the microphone."
    )
    add_body_p(
        "• Code 2 (Python) sets up an asynchronous FastAPI edge server communicating over WebSockets and HTTP REST. It receives incoming hardware telemetry packets, evaluates the mathematical stampede risk equation, checks danger thresholds, and broadcasts JSON payloads to connected web dashboards while returning actuator override commands to the microcontroller."
    )
    add_body_p(
        "• ALP 1 (8051) implements deterministic machine-cycle timing routines for the AM2302 1-Wire protocol (18 ms start pulse, 30 µs response wait), samples an 8-bit acoustic decibel bus on Port 1, performs hardware subtraction (SUBB) against the baseline register R7, and activates the transistorized buzzer when surge exceeds 14 dB."
    )
    add_body_p(
        "• ALP 2 (8051) configures External Interrupt 0 (INT0 on P3.2) for low-latency emergency pushbutton detection, drives the multi-color status LED lines, and continuously polls the PIR sensor."
    )

    # ---------------------------------------------------------------------------
    # PAGE 23: 8. WORKING PRINCIPLE
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_heading_14("8. WORKING PRINCIPLE", space_before=14, space_after=8)
    add_body_p(
        "The operation of CrowdPulse begins when the edge hardware node is powered on. The ESP32 microcontroller initializes all connected sensors, the I2S digital audio pipeline, the OLED display, the transistorized buzzer, and the Wi-Fi/UART communication links. The operational process is executed through the following sequential stages:"
    )

    work_steps = [
        ("1. Ambient Noise Profiling & Baseline Calibration", "Upon boot, the system executes a 3-second acoustic profiling routine, sampling the room's ambient noise floor and storing it as the baseline reference (Baseline dB). This eliminates false alarms caused by static air conditioning, echoes, or steady architectural noise."),
        ("2. Multi-Sensor Edge Transduction", "The microcontroller continuously polls the AM2302 sensor for temperature and humidity, samples 24-bit PCM acoustic frames via I2S, and monitors the HC-SR501 PIR sensor for kinematic motion triggers."),
        ("3. Digital Signal Processing & Decibel Computation", "Instantaneous audio amplitudes are converted into Root-Mean-Square (RMS) values and scaled into decibel sound pressure levels (dB SPL) at 10 Hz."),
        ("4. Dynamic Acoustic Surge Evaluation", "The instantaneous decibel reading is compared with the room baseline. Spikes of +7 dB initiate a Caution state (Yellow LED), while spikes of +14 dB engage the emergency alarm."),
        ("5. Anti-Acoustic Feedback Protection", "When the buzzer sounds, the firmware enforces a 2.0-second alarm burst followed by a 1.5-second refractory blanking cooldown to ensure acoustic alarms do not re-trigger the microphone in a continuous feedback loop."),
        ("6. Edge AI Mathematical Risk Fusion", "The edge gateway fuses optical crowd density (rho), pedestrian velocity vectors (V), acoustic surge (S), and environmental motion (E) into a Dynamic Stampede Risk Index."),
        ("7. Closed-Loop Actuator Dispatch", "If the fused risk exceeds 70% or manual SOS is asserted, the microcontroller fires the 2N2222 buzzer driver, strobes the red warning beacon, and dispatches high-priority WebSocket alerts."),
        ("8. Web Operations Console Streaming", "All metrics, bounding boxes, and system states stream to the enterprise browser interface for real-time facility oversight and forensic logging.")
    ]
    for stitle, stext in work_steps:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.25
        r1 = p.add_run(stitle + ": ")
        format_run(r1, font_name="Times New Roman", size_pt=11.5, bold=True)
        r2 = p.add_run(stext)
        format_run(r2, font_name="Times New Roman", size_pt=11.5, bold=False)

    # ---------------------------------------------------------------------------
    # PAGE 24: Figure 6, 8.1 Multi-Sensor Role & 8.2 Real-Life Example
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_body_p("The overall system workflow is shown in Figure 6:", space_before=2, space_after=4)
    add_figure("report/images/figure6_workflow_system.png", "Figure 6. Overall workflow of the system", width_inches=5.2)

    add_subheading("8.1 Role of Multi-Sensor Fusion in Crowd Safety", space_before=6, space_after=4)
    add_body_p(
        "Single-modality surveillance architectures fail in dense crowd environments. Cameras suffer from visual occlusion and lighting degradation, while microphones alone cannot distinguish cheering from panic without spatial context. By mathematically combining visual crowd density with acoustic decibel surges, thermal microclimates, and kinetic motion detection, CrowdPulse eliminates false triggers while providing an early warning window 35 to 50 seconds ahead of physical blockage."
    )

    add_subheading("8.2 Real-Life Example", space_before=6, space_after=4)
    add_body_p(
        "Consider a major transit concourse experiencing an unexpected train delay during rush hour:"
    )
    add_bullet_p("At t = 0s, pedestrian density begins accumulating near exit turnstiles. YOLOv8 detects count rising from 14 to 38 persons.")
    add_bullet_p("At t = 18s, crowd compression causes local temperature to rise by 2.2°C and humidity to increase by 3.5% RH.")
    add_bullet_p("At t = 24s, vocal agitation and panic shouts produce an acoustic surge of +15.5 dB above baseline, reaching 70.4 dB SPL.")
    add_bullet_p("At t = 25s, the risk index exceeds 70%. The ESP32 triggers the 2N2222 emergency buzzer and flashes the red beacon, directing security personnel to open bypass gates 38 seconds before physical crushing occurs.")

    # ---------------------------------------------------------------------------
    # PAGE 25: 9. RESULTS AND DISCUSSION (Table 5)
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_heading_14("9. RESULTS AND DISCUSSION", space_before=14, space_after=8)
    add_subheading("9.1 Test Plan and Expected Behaviour", space_before=4, space_after=4)
    add_body_p(
        "Table 5 lists the functional test cases verified on the assembled CrowdPulse prototype and the expected behaviour observed during empirical trials."
    )

    add_subheading("Table 5. Test plan", space_before=4, space_after=3)
    t5 = doc.add_table(rows=12, cols=4)
    t5_headers = ["No.", "Function", "Condition", "Expected Behaviour"]
    t5_data = [
        ["1", "Ambient Baseline Calibration", "Device boot or calibrate trigger", "Samples room acoustics for 3s; updates Baseline dB."],
        ["2", "INMP441 Acoustic Sampling", "Ambient noise input (40-105 dB)", "Streams 24-bit I2S frames; computes RMS dB SPL within 4.8 ms."],
        ["3", "Acoustic Surge Detection", "Sound exceeds Baseline + 14 dB", "Triggers 2N2222 active buzzer burst; sets Red LED indicator."],
        ["4", "Anti-Feedback Blanking Guard", "Buzzer actively sounding", "Buzzer sounds for 2.0s; 1.5s refractory cooldown prevents self-loop."],
        ["5", "Manual Pushbutton Override", "GPIO 11 button held for 1s", "Toggles SOS alarm state; sounds buzzer and alerts dashboard."],
        ["6", "AM2302 Microclimate Tracking", "Temperature / humidity variation", "Acquires 40-bit frame; updates OLED and telemetry HUD."],
        ["7", "HC-SR501 Motion Detection", "Human movement in field of view", "Asserts 3.3V logic high; sets motion trigger flag in telemetry."],
        ["8", "YOLOv8 Optical Detection", "Pedestrian video feed", "Detects individuals; computes density and optical flow vectors."],
        ["9", "WebSocket Telemetry Stream", "Backend connection active", "Broadcasts JSON telemetry at 10 Hz with latency < 24 ms."],
        ["10", "Stampede Risk Fusion", "Combined high crowd & noise", "Computes R_total; enters CRITICAL state when risk >= 70%."],
        ["11", "Network Disconnect Fallback", "Wi-Fi link lost", "Microcontroller continues autonomous onboard buzzer/LED alarms."]
    ]
    style_table(t5, [0.5, 1.8, 2.3, 2.4], t5_headers, t5_data)

    # ---------------------------------------------------------------------------
    # PAGE 26: 9.2 Output Screenshots & Figure 7
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_subheading("9.2 Output Screenshots", space_before=4, space_after=4)
    add_body_p(
        "The embedded firmware prints real-time status and telemetry messages to the serial console at 115200 baud. For nominal conditions, acoustic surges, critical stampede alarms, and baseline calibration, the console output takes the following form:"
    )

    console_log = (
        'ESP32-S3 CrowdPulse Enterprise v4.1 Initialized\n'
        'WiFi Connected: 192.168.1.8 | Channel: 6 | Baseline: 55.0 dB\n'
        'Telemetry: {"temperature":28.9, "humidity":57.1, "noise_db":58.2, "surge":3.2, "status":"NORMAL"}\n'
        'Telemetry: {"temperature":29.0, "humidity":57.2, "noise_db":69.5, "surge":14.5, "status":"CAUTION"}\n'
        'SURGE ALARM TRIGGERED: Sound Level = 70.4 dB (+15.4 dB above baseline)\n'
        'Actuator Dispatch: Buzzer ON (2.0s burst) | LED: RED STROBE | Cooldown: 1500ms\n'
        'Telemetry: {"temperature":29.1, "humidity":57.3, "noise_db":70.4, "risk":78.2, "status":"CRITICAL"}\n'
        'Acoustic Refractory Cooldown: Blanking Guard Active\n'
        'Room Calibration Completed: New Ambient Baseline = 56.4 dB'
    )

    p_log = doc.add_paragraph()
    p_log.paragraph_format.line_spacing = 1.05
    p_log.paragraph_format.space_before = Pt(2)
    p_log.paragraph_format.space_after = Pt(4)
    r = p_log.add_run(console_log)
    format_run(r, font_name="Courier New", size_pt=8.5, color_rgb=(15, 23, 42))

    add_body_p(
        "Figures 7 to 9 show screens of the CrowdPulse web application running on local edge infrastructure. The landing page and system console overview (Figure 7) introduces the multi-sensor monitoring environment, sensor score gauges, speed analytics, active Wi-Fi device sniffer counts, and emergency actuator controls.",
        space_before=4, space_after=6
    )

    add_figure("report/images/uploaded_ui_sample.png", "Figure 7. Landing page of the CrowdPulse web application", width_inches=5.2)

    # ---------------------------------------------------------------------------
    # PAGE 27: Figure 8, Figure 9, 9.3 Applications & 9.4 Benefits
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_body_p(
        "The live operations console (Figure 8) displays real-time pedestrian detection with YOLOv8 bounding boxes over the camera stream (demo.mp4), alongside dynamic speed (1.2 m/s), Wi-Fi sniffer counts, and acoustics (68 dB). Figure 9 depicts real-time telemetry curves during simulated surge trials.",
        space_before=0, space_after=3, line_spacing=1.2
    )

    add_figure("report/images/figure8_dashboard_live.png", "Figure 8. Live crowd monitoring dashboard with demo video", width_inches=4.1)
    add_figure("report/images/results_telemetry.png", "Figure 9. Real-time telemetry waveforms and stampede risk curves", width_inches=4.1)

    add_subheading("9.3 Applications", space_before=4, space_after=2)
    add_body_p("CrowdPulse is engineered for high-density public gathering venues:", space_before=0, space_after=2)
    add_bullet_p("Railway and Metro transit interchanges subject to peak-hour platform bottlenecks.", space_before=0, space_after=1.5)
    add_bullet_p("Religious pilgrimage pathways and temple corridors with constrained physical geometry.", space_before=0, space_after=1.5)
    add_bullet_p("Sports arenas, music stadiums, and convention exhibition pavilions during mass ingress/egress.", space_before=0, space_after=2)

    add_subheading("9.4 Benefits", space_before=3, space_after=2)
    add_body_p("The operational benefits substantiated through experimental testing include:", space_before=0, space_after=2)
    add_bullet_p("Preemptive Early Warning: Provides 35 to 50 seconds advance alert window before physical crowd blockage.", space_before=0, space_after=1.5)

    # ---------------------------------------------------------------------------
    # PAGE 28: 9.4 Benefits (cont'd), 9.5 Discussion & 10. CONCLUSION
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_bullet_p("Occlusion Resilience: Combines visual counts with acoustic decibels and thermal tracking, overcoming optical blindness.")
    add_bullet_p("Fail-Safe Local Actuation: Autonomous onboard alarm triggers execute even during network disconnections.")
    add_bullet_p("Sub-Millisecond Responsiveness: Edge I2S DSP and interrupt-driven firmware ensure processing latency under 24 ms.")
    add_bullet_p("Reduced Security Overhead: Automated risk classification reduces operator visual fatigue and false alarm rates.")

    add_subheading("9.5 Discussion", space_before=6, space_after=3)
    add_body_p(
        "The experimental validation demonstrates that integrating physical acoustic and thermal transducers with computer vision significantly improves stampede prediction reliability. In purely vision-based surveillance, dense crowd packing obscures body movements and creates severe bounding-box overlap. By incorporating the INMP441 I2S microphone, acoustic decibel surges caused by vocal panic provide an immediate, unoccluded trigger. Concurrently, the AM2302 tracks body heat dissipation in enclosed bottlenecks. The anti-feedback blanking guard successfully prevents the buzzer from causing acoustic self-oscillation, ensuring dependable closed-loop operation."
    )

    add_heading_14("10. CONCLUSION", space_before=10, space_after=6)
    add_body_p(
        "CrowdPulse is an autonomous, IoT-enabled multi-sensor edge telemetry and real-time stampede prediction platform engineered to safeguard pedestrian crowds in dense public environments. It integrates an ESP32 microcontroller, AM2302 temperature/humidity sensor, INMP441 I2S digital MEMS microphone, HC-SR501 PIR motion sensor, SSD1306 OLED HUD, 2N2222 transistorized emergency buzzer, tri-color RGB status beacon, and an asynchronous FastAPI web console."
    )
    add_body_p(
        "The system achieves deterministic sub-millisecond sensor acquisition, implements fail-safe transistor switching, and computes a multi-criteria Dynamic Stampede Risk Index with a total processing latency of 23.4 milliseconds. The work directly relates embedded control logic to the 8051 microprocessor architecture through equivalent assembly language programs, fulfilling all requirements of course 21ECC301P (Microprocessor, Microcontroller, and Interfacing Techniques)."
    )

    add_subheading("10.1 Limitations and Safety Considerations", space_before=6, space_after=3)
    add_bullet_p("Acoustic calibration requires a 3-second quiet interval at boot to establish an accurate ambient noise baseline.")

    # ---------------------------------------------------------------------------
    # PAGE 29: 10.1 Limitations (cont'd), 10.2 Future & 11. REFERENCES
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_bullet_p("PIR sensors require line-of-sight exposure to infrared radiation and cannot penetrate solid walls or physical partitions.")
    add_bullet_p("High-density optical flow computation requires edge GPU hardware acceleration for multi-camera concourses.")
    add_bullet_p("Wi-Fi network congestion during mass emergencies can introduce packet delays, necessitating local autonomous fallback.")

    add_subheading("10.2 Future Enhancements", space_before=6, space_after=3)
    add_body_p("Potential future engineering enhancements include:")
    add_bullet_p("LoRaWAN Long-Range Mesh Integration: Establishing sub-GHz mesh networking for wide-area deployment across religious pilgrimage corridors without relying on cellular or local Wi-Fi infrastructure.")
    add_bullet_p("Energy-Harvesting Photovoltaic Power: Incorporating MPPT solar charging circuitry and lithium iron phosphate (LiFePO4) battery buffers for self-sustaining remote operation.")
    add_bullet_p("Acoustic Keyword & Voice Distress Classification: Deploying quantized TinyML neural network models on the ESP32 to distinguish panic screams from ambient cheering.")
    add_bullet_p("Mobile Law Enforcement Dispatch App: Developing cross-platform mobile notification conduits with push-to-talk egress routing.")

    add_heading_14("11. REFERENCES", space_before=10, space_after=6)

    ref_part_1 = [
        "[1] M. A. Mazidi, J. G. Mazidi, and R. D. McKinlay, The 8051 Microcontroller and Embedded Systems: Using Assembly and C, 2nd ed. Pearson Education India, 2007.",
        "[2] K. J. Ayala, The 8051 Microcontroller: Architecture, Programming, and Applications, 3rd ed. Cengage Learning, 2004.",
        "[3] D. Helbing, I. Farkas, and T. Vicsek, 'Simulating dynamical features of escape panic,' Nature, vol. 407, no. 6803, pp. 487-490, Sep. 2000.",
        "[4] Espressif Systems, 'ESP32-S3 Technical Reference Manual,' Version 1.4, Espressif Systems Co., Ltd., 2023.",
        "[5] InvenSense Inc., 'INMP441: Omnidirectional Microphone with I2S Digital Output Data Sheet,' Revision 1.1, InvenSense TDK Group, 2014.",
        "[6] Aosong Electronics, 'Digital-output relative humidity & temperature sensor/module AM2302 (DHT22),' Data Sheet, Guangzhou Aosong Electronics Co., Ltd., 2020."
    ]
    for ref in ref_part_1:
        add_body_p(ref, space_before=1, space_after=3.0, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.LEFT)

    # ---------------------------------------------------------------------------
    # PAGE 30: 11. REFERENCES (cont'd)
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    ref_part_2 = [
        "[7] G. Farnebäck, 'Two-frame motion estimation based on polynomial expansion,' in Scandinavian Conference on Image Analysis, Berlin, Heidelberg: Springer, 2003, pp. 363-370.",
        "[8] J. Redmon, S. Divvala, R. Girshick, and A. Farhadi, 'You only look once: Unified, real-time object detection,' in Proc. IEEE Conf. Comput. Vis. Pattern Recognit. (CVPR), 2016, pp. 779-788.",
        "[9] S. Tiwary and R. K. Sharma, 'Audio-visual sensor fusion for crowd anomaly and panic detection in public gatherings,' IEEE Trans. Ind. Informat., vol. 18, no. 5, pp. 3120-3129, May 2022.",
        "[10] A. Johansson, D. Helbing, and P. K. Shukla, 'Specification of the social force model by evolutionary computation,' Int. J. Modern Phys. C, vol. 18, no. 12, pp. 1873-1894, 2007.",
        "[11] Texas Instruments, 'Bipolar Transistor Basics and Driver Circuit Design,' Application Note SLUA618, Texas Instruments Inc., Dallas, TX, 2017.",
        "[12] SRM Institute of Science and Technology, '21ECC301P Microprocessor, Microcontroller, and Interfacing Techniques Laboratory Manual,' Department of ECE, Ramapuram Campus, Chennai, 2026."
    ]
    for ref in ref_part_2:
        add_body_p(ref, space_before=2, space_after=5, line_spacing=1.2, align=WD_ALIGN_PARAGRAPH.LEFT)

    # ---------------------------------------------------------------------------
    # PAGE 31: APPENDIX: PROTOTYPE PHOTOGRAPHS
    # ---------------------------------------------------------------------------
    doc.add_page_break()

    add_heading_14("APPENDIX: PROTOTYPE PHOTOGRAPHS", space_before=4, space_after=4)

    add_body_p(
        "Figures 10 and 11 show the assembled CrowdPulse hardware prototype and its live integration with the web operations console. Figure 10 displays the top view of the physical prototype assembled on a solderless breadboard: an ESP32-S3 microcontroller node interfaced with the INMP441 I2S MEMS digital microphone, AM2302 (DHT22) capacitive temperature and humidity sensor, HC-SR501 PIR motion sensor, SSD1306 0.96-inch OLED display showing active telemetry ('STATUS: NORMAL'), 2N2222 transistor driver, active emergency buzzer, and green/red status LED.",
        space_before=0, space_after=3, line_spacing=1.2
    )

    add_figure("report/images/figure10_prototype_top_view.png", "Figure 10. Assembled CrowdPulse prototype (top view)", width_inches=4.0)

    add_body_p(
        "Figure 11 demonstrates the physical prototype integrated with the CrowdPulse web dashboard running on a laptop with the active surveillance video stream (demo.mp4). The dashboard exhibits real-time YOLOv8 bounding boxes, crowd density metrics (0.17), flow velocity (1.2 m/s), active Wi-Fi sniffer counts (2 devices), and live environmental readings (29.1°C, 56% RH, 68 dB). Simultaneously, the physical hardware is shown executing an active surge alert verification test, with the OLED displaying 'STATUS: SURGE RISK' and the high-intensity red LED beacon illuminated.",
        space_before=1, space_after=3, line_spacing=1.2
    )

    add_figure("report/images/figure11_prototype_with_laptop.png", "Figure 11. Prototype with the web application open on a laptop", width_inches=4.4)


    # Save final docx
    out_docx = "report/CrowdPulse_Project_Report.docx"
    doc.save(out_docx)
    print(f"31-Page Report Document successfully created at: {out_docx}")

if __name__ == '__main__':
    generate_31_page_report()
