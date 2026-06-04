"""PDF invoice generation using ReportLab."""
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
    PageBreak, KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas as pdfcanvas

MONTHS = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

SCHOOL_NAME = "The Creative School"


def _num(v):
    try:
        return f"Rs {int(float(v)):,}"
    except (ValueError, TypeError):
        return "Rs 0"


def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle('SchoolName', parent=ss['Heading1'], fontSize=18,
                          textColor=colors.HexColor('#1d4ed8'), alignment=TA_CENTER, spaceAfter=2))
    ss.add(ParagraphStyle('SubTitle', parent=ss['Normal'], fontSize=10,
                          textColor=colors.gray, alignment=TA_CENTER, spaceAfter=6))
    ss.add(ParagraphStyle('InvoiceTitle', parent=ss['Heading2'], fontSize=13,
                          alignment=TA_CENTER, spaceAfter=10))
    ss.add(ParagraphStyle('SectionHead', parent=ss['Heading3'], fontSize=10,
                          textColor=colors.HexColor('#1d4ed8'), spaceAfter=4))
    ss.add(ParagraphStyle('Small', parent=ss['Normal'], fontSize=8, textColor=colors.gray))
    ss.add(ParagraphStyle('RightSmall', parent=ss['Normal'], fontSize=8,
                          textColor=colors.gray, alignment=TA_RIGHT))
    ss.add(ParagraphStyle('CenterSmall', parent=ss['Normal'], fontSize=8,
                          textColor=colors.gray, alignment=TA_CENTER))
    return ss


def generate_student_invoice_pdf(record):
    """Generate a single-student PDF invoice. Returns bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=15*mm, bottomMargin=15*mm,
                            leftMargin=20*mm, rightMargin=20*mm)
    ss = _styles()
    story = []

    story.append(Paragraph(SCHOOL_NAME, ss['SchoolName']))
    story.append(Paragraph("Fee Payment Invoice", ss['SubTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1d4ed8'),
                            spaceAfter=10))

    s = record['student']
    story.append(Paragraph("Receipt Information", ss['SectionHead']))
    info_data = [
        ['Receipt No:', record['receipt_no'], 'Date:', str(record.get('receipt_date', ''))],
        ['Period:', f"{MONTHS[record['month']]} {record['year']}", 'Status:',
         record['status'].upper()],
    ]
    t = Table(info_data, colWidths=[70, 170, 60, 170])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.gray),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.gray),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Student Information", ss['SectionHead']))
    stu_data = [
        ['Student Name:', s.get('student_name', ''), 'Admission #:', str(s.get('admission_no', ''))],
        ['Class:', s.get('current_class', ''), 'Father/Guardian:', s.get('f_g_name', '')],
        ['Contact:', s.get('f_g_contact', ''), '', ''],
    ]
    t2 = Table(stu_data, colWidths=[80, 160, 80, 150])
    t2.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.gray),
        ('TEXTCOLOR', (2, 0), (2, -1), colors.gray),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t2)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Fee Breakdown", ss['SectionHead']))
    fee_data = [
        ['Description', 'Amount'],
        ['Previous Balance', _num(record['previous_balance'])],
        ['Monthly Fee', _num(record['current_fee'])],
        ['Total Due', _num(record['total_amount'])],
        ['Amount Paid', _num(record['amount_paid'])],
        ['Balance Due', _num(record['balance'])],
    ]
    t3 = Table(fee_data, colWidths=[300, 170])
    t3.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1d4ed8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#eff6ff')),
        ('FONTNAME', (0, 3), (-1, 3), 'Helvetica-Bold'),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor('#fef2f2')),
        ('FONTNAME', (0, 5), (-1, 5), 'Helvetica-Bold'),
        ('TEXTCOLOR', (1, 5), (1, 5), colors.HexColor('#dc2626')),
    ]))
    story.append(t3)
    story.append(Spacer(1, 8))

    if record.get('due_date'):
        story.append(Paragraph(f"Due Date: {record['due_date']}", ss['Normal']))
    if record.get('payment_date'):
        story.append(Paragraph(f"Payment Date: {record['payment_date']}", ss['Normal']))
    if record.get('remarks'):
        story.append(Paragraph(f"Remarks: {record['remarks']}", ss['Small']))

    story.append(Spacer(1, 30))

    sig_data = [['_________________', '', '_________________'],
                ['Parent / Guardian', '', 'Accounts Officer']]
    sig_t = Table(sig_data, colWidths=[160, 150, 160])
    sig_t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.gray),
        ('TOPPADDING', (0, 1), (-1, 1), 2),
    ]))
    story.append(sig_t)
    story.append(Spacer(1, 10))
    story.append(Paragraph("This is a computer-generated invoice.", ss['CenterSmall']))

    doc.build(story)
    buf.seek(0)
    return buf.read()


def generate_class_invoice_pdf(class_name, month, year, records, summary):
    """Generate PDF collection sheet for an entire class. Returns bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=(A4[1], A4[0]),
                            topMargin=10*mm, bottomMargin=10*mm,
                            leftMargin=10*mm, rightMargin=10*mm)
    ss = _styles()
    story = []

    month_name = MONTHS[int(month)] if int(month) <= 12 else str(month)

    story.append(Paragraph(SCHOOL_NAME, ss['SchoolName']))
    story.append(Paragraph(f"Fee Collection Sheet — {class_name} — {month_name} {year}", ss['SubTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1d4ed8'), spaceAfter=8))

    tc = _num(summary.get('total_collected', 0))
    tb = _num(summary.get('total_balance', 0))
    story.append(Paragraph(
        f"Total Students: {len(records)} &nbsp;|&nbsp; Collected: {tc} &nbsp;|&nbsp; Balance: {tb}",
        ss['Normal']
    ))
    story.append(Spacer(1, 6))

    header = ['#', 'Receipt', 'Adm #', 'Student Name', 'Father/Guardian', 'Contact',
              'Prev Bal', 'Fee', 'Total', 'Paid', 'Balance', 'Status']
    rows = [header]
    for i, r in enumerate(records, 1):
        s = r.get('student', {})
        rows.append([
            str(i),
            r.get('receipt_no', ''),
            str(s.get('admission_no', '')),
            s.get('student_name', ''),
            s.get('f_g_name', ''),
            s.get('f_g_contact', ''),
            _num(r.get('previous_balance', 0)),
            _num(r.get('current_fee', 0)),
            _num(r.get('total_amount', 0)),
            _num(r.get('amount_paid', 0)),
            _num(r.get('balance', 0)),
            r.get('status', '').upper(),
        ])

    rows.append([
        '', '', '', '', '', 'TOTALS',
        '', '',
        _num(summary.get('total_due', 0)),
        _num(summary.get('total_collected', 0)),
        _num(summary.get('total_balance', 0)),
        '',
    ])

    col_widths = [20, 55, 40, 110, 100, 70, 55, 55, 60, 60, 60, 45]
    t = Table(rows, colWidths=col_widths, repeatRows=1)

    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1d4ed8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#d1d5db')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f9fafb')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#eff6ff')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor('#1d4ed8')),
    ]

    for i, r in enumerate(records, 1):
        if r.get('status') in ('unpaid', 'partial'):
            style_cmds.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#fef2f2')))
            style_cmds.append(('TEXTCOLOR', (0, i), (-1, i), colors.HexColor('#991b1b')))
            style_cmds.append(('FONTNAME', (0, i), (-1, i), 'Helvetica-Bold'))

    t.setStyle(TableStyle(style_cmds))
    story.append(t)

    story.append(Spacer(1, 20))
    sig_data = [['_________________', '', '_________________'],
                ['Accounts Officer', '', 'Principal']]
    sig_t = Table(sig_data, colWidths=[200, 300, 200])
    sig_t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.gray),
    ]))
    story.append(sig_t)

    doc.build(story)
    buf.seek(0)
    return buf.read()


def _draw_mini_invoice(c, x, y, w, h, record, copy_label):
    blue = colors.HexColor('#1d4ed8')
    gray = colors.HexColor('#6b7280')
    red = colors.HexColor('#dc2626')
    green = colors.HexColor('#16a34a')
    light_blue = colors.HexColor('#eff6ff')
    border_gray = colors.HexColor('#d1d5db')

    s = record.get('student', {})
    month_name = MONTHS[int(record.get('month', 0))] if int(record.get('month', 0)) <= 12 else ''
    margin = 4 * mm

    c.setStrokeColor(border_gray)
    c.setLineWidth(0.5)
    c.rect(x, y, w, h)

    cx = x + margin
    top = y + h - margin
    inner_w = w - 2 * margin

    c.setFillColor(blue)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(x + w / 2, top - 8, SCHOOL_NAME)

    c.setFillColor(gray)
    c.setFont('Helvetica', 6)
    c.drawCentredString(x + w / 2, top - 16, f"Fee Invoice — {copy_label}")

    c.setStrokeColor(blue)
    c.setLineWidth(0.8)
    c.setDash([])
    c.line(cx, top - 20, cx + inner_w, top - 20)

    row_y = top - 30
    c.setFont('Helvetica', 6)
    c.setFillColor(gray)
    c.drawString(cx, row_y, 'Receipt:')
    c.setFillColor(colors.black)
    c.setFont('Helvetica-Bold', 6)
    c.drawString(cx + 30, row_y, str(record.get('receipt_no', '')))

    c.setFont('Helvetica', 6)
    c.setFillColor(gray)
    c.drawString(cx + inner_w * 0.5, row_y, 'Date:')
    c.setFillColor(colors.black)
    c.setFont('Helvetica-Bold', 6)
    c.drawString(cx + inner_w * 0.5 + 22, row_y, str(record.get('receipt_date', '')))

    row_y -= 10
    c.setFont('Helvetica', 6)
    c.setFillColor(gray)
    c.drawString(cx, row_y, 'Period:')
    c.setFillColor(colors.black)
    c.setFont('Helvetica-Bold', 6)
    c.drawString(cx + 30, row_y, f"{month_name} {record.get('year', '')}")

    c.setFont('Helvetica', 6)
    c.setFillColor(gray)
    c.drawString(cx + inner_w * 0.5, row_y, 'Status:')
    status_text = str(record.get('status', '')).upper()
    if status_text in ('PAID', 'ADVANCE'):
        c.setFillColor(green)
    elif status_text == 'UNPAID':
        c.setFillColor(red)
    else:
        c.setFillColor(colors.HexColor('#854d0e'))
    c.setFont('Helvetica-Bold', 6)
    c.drawString(cx + inner_w * 0.5 + 27, row_y, status_text)

    row_y -= 14
    c.setStrokeColor(border_gray)
    c.setLineWidth(0.3)
    c.setDash([])
    c.line(cx, row_y + 4, cx + inner_w, row_y + 4)

    c.setFillColor(gray)
    c.setFont('Helvetica', 5.5)
    c.drawString(cx, row_y, 'Student:')
    c.setFillColor(colors.black)
    c.setFont('Helvetica-Bold', 6)
    name = s.get('student_name', '')
    if len(name) > 28:
        name = name[:26] + '..'
    c.drawString(cx + 30, row_y, name)

    c.setFillColor(gray)
    c.setFont('Helvetica', 5.5)
    c.drawString(cx + inner_w * 0.55, row_y, 'Adm#:')
    c.setFillColor(colors.black)
    c.setFont('Helvetica-Bold', 6)
    c.drawString(cx + inner_w * 0.55 + 22, row_y, str(s.get('admission_no', '')))

    row_y -= 10
    c.setFillColor(gray)
    c.setFont('Helvetica', 5.5)
    c.drawString(cx, row_y, 'Class:')
    c.setFillColor(colors.black)
    c.setFont('Helvetica-Bold', 6)
    c.drawString(cx + 30, row_y, str(s.get('current_class', '')))

    c.setFillColor(gray)
    c.setFont('Helvetica', 5.5)
    c.drawString(cx + inner_w * 0.55, row_y, 'F/G:')
    c.setFillColor(colors.black)
    c.setFont('Helvetica', 6)
    fg = s.get('f_g_name', '')
    if len(fg) > 22:
        fg = fg[:20] + '..'
    c.drawString(cx + inner_w * 0.55 + 16, row_y, fg)

    row_y -= 10
    c.setFillColor(gray)
    c.setFont('Helvetica', 5.5)
    c.drawString(cx, row_y, 'Contact:')
    c.setFillColor(colors.black)
    c.setFont('Helvetica', 6)
    c.drawString(cx + 30, row_y, str(s.get('f_g_contact', '')))

    row_y -= 14
    c.setStrokeColor(border_gray)
    c.line(cx, row_y + 4, cx + inner_w, row_y + 4)

    c.setFillColor(blue)
    c.rect(cx, row_y - 8, inner_w, 11, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 5.5)
    c.drawString(cx + 2, row_y - 5, 'Description')
    c.drawRightString(cx + inner_w - 2, row_y - 5, 'Amount')

    fee_rows = [
        ('Previous Balance', record.get('previous_balance', 0)),
        ('Monthly Fee', record.get('current_fee', 0)),
        ('Total Due', record.get('total_amount', 0)),
        ('Amount Paid', record.get('amount_paid', 0)),
        ('Balance Due', record.get('balance', 0)),
    ]

    row_y -= 10
    for i, (label, val) in enumerate(fee_rows):
        ry = row_y - (i * 10)
        if i == 2:
            c.setFillColor(light_blue)
            c.rect(cx, ry - 3, inner_w, 10, fill=1, stroke=0)
        if i == 4:
            c.setFillColor(colors.HexColor('#fef2f2'))
            c.rect(cx, ry - 3, inner_w, 10, fill=1, stroke=0)

        c.setFillColor(colors.black)
        is_bold = i in (2, 4)
        c.setFont('Helvetica-Bold' if is_bold else 'Helvetica', 5.5)
        c.drawString(cx + 2, ry, label)

        if i == 4 and float(val or 0) > 0:
            c.setFillColor(red)
        elif i == 3:
            c.setFillColor(green)
        else:
            c.setFillColor(colors.black)
        c.setFont('Helvetica-Bold' if is_bold else 'Helvetica', 5.5)
        c.drawRightString(cx + inner_w - 2, ry, _num(val))

        c.setStrokeColor(border_gray)
        c.setLineWidth(0.2)
        c.line(cx, ry - 3, cx + inner_w, ry - 3)

    row_y = row_y - (len(fee_rows) * 10) - 4
    if record.get('due_date'):
        c.setFillColor(gray)
        c.setFont('Helvetica', 5)
        c.drawString(cx, row_y, f"Due: {record['due_date']}")
    if record.get('payment_date'):
        c.setFillColor(gray)
        c.setFont('Helvetica', 5)
        c.drawString(cx + inner_w * 0.5, row_y, f"Paid: {record['payment_date']}")

    sig_y = y + margin + 14
    c.setStrokeColor(gray)
    c.setLineWidth(0.4)
    c.setDash([])
    c.line(cx + 5, sig_y + 6, cx + 55, sig_y + 6)
    c.line(cx + inner_w - 55, sig_y + 6, cx + inner_w - 5, sig_y + 6)
    c.setFillColor(gray)
    c.setFont('Helvetica', 4.5)
    c.drawCentredString(cx + 30, sig_y, 'Parent/Guardian')
    c.drawCentredString(cx + inner_w - 30, sig_y, 'Accounts Officer')

    c.setFillColor(colors.HexColor('#9ca3af'))
    c.setFont('Helvetica', 4)
    c.drawCentredString(x + w / 2, y + margin + 2, 'Computer-generated invoice — The Creative School')


def generate_bulk_invoices_pdf(records):
    buf = io.BytesIO()
    page_w, page_h = A4
    c = pdfcanvas.Canvas(buf, pagesize=A4)

    pad = 5 * mm
    inv_w = (page_w - 3 * pad) / 2
    inv_h = (page_h - 3 * pad) / 2

    for page_start in range(0, len(records), 2):
        page_records = records[page_start:page_start + 2]

        for row_idx, record in enumerate(page_records):
            base_y = page_h - pad - (row_idx + 1) * inv_h - row_idx * pad

            _draw_mini_invoice(c, pad, base_y, inv_w, inv_h, record, 'Student Copy')
            _draw_mini_invoice(c, pad + inv_w + pad, base_y, inv_w, inv_h, record, 'Office Copy')

        c.setStrokeColor(colors.HexColor('#9ca3af'))
        c.setLineWidth(0.3)
        c.setDash(4, 4)
        mid_x = page_w / 2
        c.line(mid_x, pad, mid_x, page_h - pad)
        mid_y = page_h / 2
        c.line(pad, mid_y, page_w - pad, mid_y)

        c.setFont('Helvetica', 5)
        c.setFillColor(colors.HexColor('#9ca3af'))
        c.drawCentredString(mid_x, page_h - pad + 2, '- - - cut here - - -')
        c.drawCentredString(mid_x, pad - 6, '- - - cut here - - -')

        c.showPage()

    c.save()
    buf.seek(0)
    return buf.read()


def generate_balance_sheet_pdf(data):
    """Generate a comprehensive balance sheet PDF. Returns bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=(A4[1], A4[0]),
                            topMargin=10*mm, bottomMargin=10*mm,
                            leftMargin=10*mm, rightMargin=10*mm)
    ss = _styles()
    story = []

    year = data.get('year', '')
    ys = data.get('yearly_summary', {})

    story.append(Paragraph(SCHOOL_NAME, ss['SchoolName']))
    story.append(Paragraph(f"Balance Sheet — Annual Financial Report — {year}", ss['SubTitle']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#1d4ed8'),
                            spaceAfter=8))

    story.append(Paragraph("Annual Summary", ss['SectionHead']))
    sum_data = [
        ['Total Students', 'Total Records', 'Total Fee', 'Arrears Carried',
         'Total Due', 'Collected', 'Outstanding', 'Collection Rate'],
        [
            str(ys.get('total_students', 0)),
            str(ys.get('total_records', 0)),
            _num(ys.get('total_fee', 0)),
            _num(ys.get('total_prev_balance', 0)),
            _num(ys.get('total_due', 0)),
            _num(ys.get('total_collected', 0)),
            _num(ys.get('total_balance', 0)),
            f"{ys.get('collection_rate', 0)}%",
        ],
    ]
    sum_t = Table(sum_data, colWidths=[70, 65, 80, 80, 80, 80, 80, 80])
    sum_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1d4ed8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#d1d5db')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#eff6ff')),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
    ]))
    story.append(sum_t)
    story.append(Spacer(1, 6))

    status_line = (
        f"Paid: {ys.get('paid', 0)}   |   "
        f"Partial: {ys.get('partial', 0)}   |   "
        f"Unpaid: {ys.get('unpaid', 0)}"
    )
    story.append(Paragraph(status_line, ss['CenterSmall']))
    story.append(Spacer(1, 12))

    monthly = data.get('monthly', [])
    if monthly:
        story.append(Paragraph("Month-by-Month Breakdown", ss['SectionHead']))
        header = ['Month', 'Records', 'Monthly Fee', 'Prev Balance',
                  'Total Due', 'Collected', 'Outstanding', 'Rate', 'Paid', 'Partial', 'Unpaid']
        rows = [header]
        for m in monthly:
            rate = round(m['total_collected'] / m['total_due'] * 100, 1) if m['total_due'] > 0 else 0
            rows.append([
                m.get('month_name', ''), str(m.get('records', 0)),
                _num(m.get('total_fee', 0)), _num(m.get('prev_balance', 0)),
                _num(m.get('total_due', 0)), _num(m.get('total_collected', 0)),
                _num(m.get('total_balance', 0)), f"{rate}%",
                str(m.get('paid', 0)), str(m.get('partial', 0)), str(m.get('unpaid', 0)),
            ])

        rows.append([
            'TOTAL', str(sum(m.get('records', 0) for m in monthly)),
            _num(sum(m.get('total_fee', 0) for m in monthly)),
            _num(sum(m.get('prev_balance', 0) for m in monthly)),
            _num(sum(m.get('total_due', 0) for m in monthly)),
            _num(sum(m.get('total_collected', 0) for m in monthly)),
            _num(sum(m.get('total_balance', 0) for m in monthly)),
            f"{ys.get('collection_rate', 0)}%",
            str(sum(m.get('paid', 0) for m in monthly)),
            str(sum(m.get('partial', 0) for m in monthly)),
            str(sum(m.get('unpaid', 0) for m in monthly)),
        ])

        mcols = [68, 48, 68, 68, 68, 68, 68, 42, 38, 38, 38]
        mt = Table(rows, colWidths=mcols, repeatRows=1)
        mt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1d4ed8')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f9fafb')]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#eff6ff')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor('#1d4ed8')),
        ]))
        story.append(mt)
        story.append(Spacer(1, 14))

    class_wise = data.get('class_wise', [])
    if class_wise:
        story.append(Paragraph("Class-wise Annual Summary", ss['SectionHead']))
        cheader = ['Class', 'Students', 'Records', 'Total Due',
                   'Collected', 'Outstanding', 'Collection Rate']
        crows = [cheader]
        for cw in class_wise:
            crows.append([
                cw.get('class_name', ''), str(cw.get('student_count', 0)),
                str(cw.get('records', 0)), _num(cw.get('total_due', 0)),
                _num(cw.get('total_collected', 0)), _num(cw.get('total_balance', 0)),
                f"{cw.get('collection_rate', 0)}%",
            ])

        crows.append([
            'TOTAL', str(sum(c.get('student_count', 0) for c in class_wise)),
            str(sum(c.get('records', 0) for c in class_wise)),
            _num(sum(c.get('total_due', 0) for c in class_wise)),
            _num(sum(c.get('total_collected', 0) for c in class_wise)),
            _num(sum(c.get('total_balance', 0) for c in class_wise)),
            f"{ys.get('collection_rate', 0)}%",
        ])

        ccols = [100, 60, 60, 90, 90, 90, 85]
        ct = Table(crows, colWidths=ccols, repeatRows=1)
        ct.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1d4ed8')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f9fafb')]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#eff6ff')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('LINEABOVE', (0, -1), (-1, -1), 1.5, colors.HexColor('#1d4ed8')),
        ]))
        story.append(ct)

    story.append(Spacer(1, 20))
    sig_data = [['_________________', '', '_________________'],
                ['Accounts Officer', '', 'Principal']]
    sig_t = Table(sig_data, colWidths=[200, 300, 200])
    sig_t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.gray),
    ]))
    story.append(sig_t)
    story.append(Spacer(1, 6))
    story.append(Paragraph("This is a computer-generated balance sheet.", ss['CenterSmall']))

    doc.build(story)
    buf.seek(0)
    return buf.read()
