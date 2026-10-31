"""
HallTicket Pro - Sample ADF QR-Coded Hall Ticket Stack Generator
Generates realistic 1-Page-Per-Candidate ADF scanned multipage PDFs.
Every page represents exactly ONE candidate's hall ticket with a QR code
containing their Register Number (structured, JSON, URL, and plain formats).
"""
import os
import io
import json
import qrcode
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak

def create_qr_code_image(data_text: str, box_size: int = 5) -> io.BytesIO:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=2,
    )
    qr.add_data(data_text)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer

def generate_sample_qr_adf_pdf(output_path: str, count: int = 20):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        alignment=1,
        textColor=colors.HexColor('#1E293B')
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        alignment=1,
        textColor=colors.HexColor('#475569')
    )
    normal_style = ParagraphStyle(
        'DocNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#334155')
    )
    bold_style = ParagraphStyle(
        'DocBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )
    footer_style = ParagraphStyle(
        'DocFooter',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        alignment=1,
        textColor=colors.HexColor('#64748B')
    )

    story = []

    names = [
        "Aarav Sharma", "Priya Patel", "Rohan Verma", "Ananya Iyer", "Vikram Malhotra",
        "Sneha Reddy", "Arjun Das", "Divya Nair", "Karan Kapoor", "Pooja Joshi",
        "Meera Pillai", "Aditya Sen", "Tanvi Bhat", "Siddharth Rao", "Neha Gupta",
        "Gaurav Saxena", "Ishita Roy", "Naveen Kumar", "Ritu Mishra", "Kavita Choudhury"
    ]

    for idx in range(count):
        reg_num = f"123456{idx + 1:03d}"
        candidate_name = names[idx % len(names)]

        # Payload variety (Structured, JSON, URL, Plain)
        if idx % 4 == 0:
            qr_payload = f"REG:{reg_num}|NAME:{candidate_name}|SESSION:NOV2026"
        elif idx % 4 == 1:
            qr_payload = json.dumps({"register_number": reg_num, "candidate_name": candidate_name})
        elif idx % 4 == 2:
            qr_payload = f"https://exam.gov.in/verify?reg={reg_num}"
        else:
            qr_payload = reg_num

        # Top Header
        story.append(Paragraph("CENTRAL BOARD OF EXAMINATION - ADMIT CARD 2026", title_style))
        story.append(Paragraph("National Professional Examination | Single-Sheet Verification Format", subtitle_style))
        story.append(Spacer(1, 10))

        # QR Code Image
        qr_buf = create_qr_code_image(qr_payload, box_size=5)
        qr_img = RLImage(qr_buf, width=75, height=75)

        # Candidate Details Table with QR code
        info_data = [
            [
                Paragraph("<b>Register Number:</b>", normal_style),
                Paragraph(f"<b><font size=11 color='#1E3A8A'>{reg_num}</font></b>", bold_style),
                Paragraph("<b>Candidate Name:</b>", normal_style),
                Paragraph(f"<b>{candidate_name}</b>", bold_style),
                qr_img
            ],
            [
                Paragraph("<b>Roll / Application ID:</b>", normal_style),
                Paragraph(f"APP-2026-{idx + 101:04d}", normal_style),
                Paragraph("<b>Date of Birth:</b>", normal_style),
                Paragraph("15-08-2003", normal_style),
                ""
            ],
            [
                Paragraph("<b>Examination Center:</b>", normal_style),
                Paragraph("City Tech Campus, Hall B", normal_style),
                Paragraph("<b>Reporting Time:</b>", normal_style),
                Paragraph("08:30 AM IST", normal_style),
                ""
            ],
            [
                Paragraph("<b>Security Code:</b>", normal_style),
                Paragraph(f"SEC-{reg_num[-4:]}-ADF", normal_style),
                Paragraph("<b>Sheet Identification:</b>", normal_style),
                Paragraph("Single-Sheet Candidate Page", normal_style),
                ""
            ]
        ]

        info_table = Table(info_data, colWidths=[95, 135, 95, 135, 80])
        info_table.setStyle(TableStyle([
            ('SPAN', (4, 0), (4, 3)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (4, 0), (4, 3), 'CENTER'),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-2, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 12))

        # Schedule Table
        story.append(Paragraph("<b>SCHEDULE OF PAPERS</b>", bold_style))
        subj_data = [
            [Paragraph("<b>Paper Code</b>", bold_style), Paragraph("<b>Subject Name</b>", bold_style), Paragraph("<b>Date</b>", bold_style), Paragraph("<b>Time</b>", bold_style)],
            [Paragraph("NET-101", normal_style), Paragraph("Core Principles & Applications", normal_style), Paragraph("15-Nov-2026", normal_style), Paragraph("09:30 AM - 12:30 PM", normal_style)]
        ]
        subj_table = Table(subj_data, colWidths=[90, 240, 90, 120])
        subj_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E2E8F0')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(subj_table)
        story.append(Spacer(1, 14))

        # Important Candidate Instructions
        story.append(Paragraph("<b>IMPORTANT INSTRUCTIONS FOR CANDIDATE:</b>", bold_style))
        instructions = [
            "1. This is a single-sheet Hall Ticket. The printed QR code contains your official Register Number.",
            "2. Ensure the QR code is intact and free of fold marks, creases, or scratches.",
            "3. Candidates must produce this Hall Ticket along with an authorized government photo ID.",
            "4. Electronic gadgets, mobile phones, and calculators are strictly forbidden inside the hall."
        ]
        for inst in instructions:
            story.append(Paragraph(inst, normal_style))
            story.append(Spacer(1, 2))

        story.append(Spacer(1, 20))

        # Signature blocks
        sig_data = [
            [
                Paragraph("____________________________<br/>Candidate's Signature", normal_style),
                Paragraph("____________________________<br/>Center Superintendent Signature", normal_style),
                Paragraph("____________________________<br/>Controller of Examinations", normal_style)
            ]
        ]
        sig_table = Table(sig_data, colWidths=[175, 175, 180])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ]))
        story.append(sig_table)

        story.append(Spacer(1, 25))
        story.append(Paragraph(
            f"ADF Scanner Page {idx + 1} | Machine: ADF High-Speed Feeder 300 DPI | ONE PAGE = ONE CANDIDATE = ONE QR CODE",
            footer_style
        ))

        if idx < count - 1:
            story.append(PageBreak())

    doc.build(story)
    print(f"Sample QR-coded ADF PDF successfully generated at: {output_path} ({count} pages/candidates)")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "storage", "samples")
    os.makedirs(out_dir, exist_ok=True)
    sample_file = os.path.join(out_dir, "ADF_Bulk_Scan_QR_HallTickets.pdf")
    generate_sample_qr_adf_pdf(sample_file, count=20)
