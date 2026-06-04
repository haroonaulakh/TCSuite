from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum, Count, Q
from .models import ClassRoom, AcademicYear, FeeStructure, FeeRecord, SavedBalanceSheet, ChargeCategory, MiscCharge
from .serializers import (
    ClassRoomSerializer, AcademicYearSerializer,
    FeeStructureSerializer,
    FeeRecordListSerializer, FeeRecordDetailSerializer,
    FeeRecordCreateSerializer, FeeRecordEditSerializer,
    FeePaymentSerializer,
    FeeInvoiceSerializer, BulkGenerateSerializer,
    AdvancePaymentSerializer,
    SavedBalanceSheetSerializer, SavedBalanceSheetListSerializer,
    ChargeCategorySerializer,
    MiscChargeListSerializer, MiscChargeCreateSerializer,
)
from .pdf import generate_student_invoice_pdf, generate_class_invoice_pdf, generate_bulk_invoices_pdf, generate_balance_sheet_pdf
from students.models import StudentProfile


class ClassRoomViewSet(viewsets.ModelViewSet):
    queryset         = ClassRoom.objects.all()
    serializer_class = ClassRoomSerializer

    @action(detail=False, methods=['get'], url_path='with-fee-stats')
    def with_fee_stats(self, request):
        month = request.query_params.get('month')
        year  = request.query_params.get('year')

        from django.db.models import Count as DjCount, Value
        from django.db.models.functions import Lower

        classrooms = ClassRoom.objects.filter(is_active=True)

        student_counts = dict(
            StudentProfile.objects.exclude(withdrawn='yes')
            .values_list('current_class')
            .annotate(cnt=DjCount('id'))
            .values_list('current_class', 'cnt')
        )

        fee_stats_by_class = {}
        if month and year:
            raw = (
                FeeRecord.objects.filter(month=month, year=year)
                .values('student__current_class')
                .annotate(
                    records_count=DjCount('id'),
                    total_due=Sum('total_amount'),
                    total_collected=Sum('amount_paid'),
                    total_balance=Sum('balance'),
                    paid_count=DjCount('id', filter=Q(status='paid')),
                    unpaid_count=DjCount('id', filter=Q(status='unpaid')),
                    partial_count=DjCount('id', filter=Q(status='partial')),
                )
            )
            for row in raw:
                fee_stats_by_class[row['student__current_class']] = row

        result = []
        for cr in classrooms:
            sc = 0
            for k, v in student_counts.items():
                if k and k.lower() == cr.name.lower():
                    sc += v
            entry = {
                'id': cr.id, 'name': cr.name,
                'sort_order': cr.sort_order, 'student_count': sc,
            }
            if month and year:
                fs = None
                for k, v in fee_stats_by_class.items():
                    if k and k.lower() == cr.name.lower():
                        fs = v
                        break
                if fs:
                    entry['fee_stats'] = {
                        'records_count':   fs['records_count'],
                        'total_due':       float(fs['total_due'] or 0),
                        'total_collected': float(fs['total_collected'] or 0),
                        'total_balance':   float(fs['total_balance'] or 0),
                        'paid_count':      fs['paid_count'],
                        'unpaid_count':    fs['unpaid_count'],
                        'partial_count':   fs['partial_count'],
                    }
                else:
                    entry['fee_stats'] = {
                        'records_count': 0, 'total_due': 0, 'total_collected': 0,
                        'total_balance': 0, 'paid_count': 0, 'unpaid_count': 0, 'partial_count': 0,
                    }
            result.append(entry)
        return Response(result)

    @action(detail=True, methods=['get'], url_path='students-fee')
    def students_fee(self, request, pk=None):
        classroom = self.get_object()
        month = request.query_params.get('month')
        year  = request.query_params.get('year')

        students = StudentProfile.objects.filter(
            current_class__iexact=classroom.name
        ).exclude(withdrawn='yes').order_by('admission_no')

        records_map = {}
        if month and year:
            recs = FeeRecord.objects.filter(
                student__current_class__iexact=classroom.name,
                month=int(month), year=int(year),
            ).select_related('student')
            records_map = {r.student_id: r for r in recs}

        from .models import MiscCharge
        misc_map = {}
        if month and year:
            misc_qs = MiscCharge.objects.filter(
                student__current_class__iexact=classroom.name,
                month=int(month), year=int(year),
            ).values('student_id').annotate(total=Sum('amount'))
            misc_map = {row['student_id']: float(row['total']) for row in misc_qs}

        result = []
        for s in students:
            entry = {
                'id': s.id, 'admission_no': s.admission_no,
                'student_name': s.student_name, 'f_g_name': s.f_g_name,
                'f_g_contact': s.f_g_contact,
                'current_fee': float(s.current_fee) if s.current_fee else None,
                'arrear_dues': s.arrear_dues,
                'fee_record': None, 'misc_charges': misc_map.get(s.id, 0),
            }

            rec = records_map.get(s.id)
            if rec:
                entry['fee_record'] = {
                    'id': rec.id, 'receipt_no': rec.receipt_no,
                    'previous_balance': float(rec.previous_balance),
                    'current_fee': float(rec.current_fee),
                    'total_amount': float(rec.total_amount),
                    'amount_paid': float(rec.amount_paid),
                    'balance': float(rec.balance),
                    'status': rec.status, 'is_advance': rec.is_advance,
                    'misc_charges': float(rec.misc_charges),
                    'due_date': str(rec.due_date) if rec.due_date else None,
                    'payment_date': str(rec.payment_date) if rec.payment_date else None,
                    'receipt_date': str(rec.receipt_date) if rec.receipt_date else None,
                }
            result.append(entry)

        total_students = len(result)
        with_records = sum(1 for r in result if r['fee_record'])
        agg_due = sum(r['fee_record']['total_amount'] for r in result if r['fee_record'])
        agg_collected = sum(r['fee_record']['amount_paid'] for r in result if r['fee_record'])
        agg_balance = sum(r['fee_record']['balance'] for r in result if r['fee_record'])

        return Response({
            'class_name': classroom.name, 'class_id': classroom.id,
            'month': month, 'year': year,
            'total_students': total_students,
            'records_generated': with_records,
            'without_records': total_students - with_records,
            'summary': {
                'total_due': agg_due, 'total_collected': agg_collected, 'total_balance': agg_balance,
            },
            'students': result,
        })

    @action(detail=False, methods=['post'], url_path='sync-from-students')
    def sync_from_students(self, request):
        
        classes = StudentProfile.objects.values_list('current_class', flat=True).distinct()
        classes = set(c.strip() for c in classes if c and c.strip())
        created = 0
        for c in sorted(classes):
            _, is_new = ClassRoom.objects.get_or_create(name=c, defaults={'sort_order': 50})
            if is_new:
                created += 1
        return Response({'created': created, 'total': ClassRoom.objects.count()})


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset         = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer


class FeeStructureViewSet(viewsets.ModelViewSet):
    queryset         = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer


class FeeRecordViewSet(viewsets.ModelViewSet):
    queryset = FeeRecord.objects.select_related('student').all()

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = [
        'receipt_no', 'student__student_name', 'student__admission_no',
    ]
    ordering_fields = ['receipt_date', 'due_date', 'year', 'month', 'status', 'balance', 'total_amount']

    def get_serializer_class(self):
        if self.action == 'list':
            return FeeRecordListSerializer
        if self.action == 'create':
            return FeeRecordCreateSerializer
        if self.action in ('update', 'partial_update', 'edit_record'):
            return FeeRecordEditSerializer
        if self.action == 'record_payment':
            return FeePaymentSerializer
        if self.action in ('invoice', 'class_invoice'):
            return FeeInvoiceSerializer
        return FeeRecordDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_f      = self.request.query_params.get('status')
        student_id    = self.request.query_params.get('student')
        month         = self.request.query_params.get('month')
        year          = self.request.query_params.get('year')
        current_class = self.request.query_params.get('current_class')

        if status_f:
            qs = qs.filter(status=status_f)
        if student_id and str(student_id).isdigit():
            qs = qs.filter(student__id=student_id)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        if current_class:
            qs = qs.filter(student__current_class__iexact=current_class)
        return qs

    @action(detail=False, methods=['get'], url_path='lookup-receipt')
    def lookup_receipt(self, request):
        """Look up a fee record by receipt number (full or partial).
        Accepts ?receipt=20260001 or ?receipt=0001 (assumes current year)."""
        receipt = request.query_params.get('receipt', '').strip()
        if not receipt:
            return Response({'error': 'receipt parameter is required'},
                            status=status.HTTP_400_BAD_REQUEST)

        if receipt.isdigit() and len(receipt) <= 4:
            from django.utils import timezone
            receipt = f"{timezone.now().year}{receipt.zfill(4)}"

        try:
            record = FeeRecord.objects.select_related('student').get(receipt_no=receipt)
        except FeeRecord.DoesNotExist:
            return Response({'error': f'No record found for receipt #{receipt}'},
                            status=status.HTTP_404_NOT_FOUND)

        return Response(FeeRecordDetailSerializer(record).data)

    # Record payment 
    @action(detail=True, methods=['patch'], url_path='record-payment')
    def record_payment(self, request, pk=None):
        record     = self.get_object()
        serializer = FeePaymentSerializer(record, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(FeeRecordDetailSerializer(record).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Individual invoice data 
    @action(detail=True, methods=['get'], url_path='invoice')
    def invoice(self, request, pk=None):
        record = self.get_object()
        return Response(FeeInvoiceSerializer(record).data)

    # Individual invoice PDF 
    @action(detail=True, methods=['get'], url_path='invoice-pdf')
    def invoice_pdf(self, request, pk=None):
        record = self.get_object()
        data   = FeeInvoiceSerializer(record).data
        pdf    = generate_student_invoice_pdf(data)
        filename = f"Invoice_{data['receipt_no']}_{data['student']['student_name']}.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    # Class invoice data 
    @action(detail=False, methods=['get'], url_path='class-invoice')
    def class_invoice(self, request):
        month         = request.query_params.get('month')
        year          = request.query_params.get('year')
        current_class = request.query_params.get('current_class')

        if not all([month, year, current_class]):
            return Response(
                {"detail": "month, year, and current_class are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(
            month=month, year=year,
            student__current_class__iexact=current_class
        )
        serializer = FeeInvoiceSerializer(qs, many=True)
        summary = qs.aggregate(
            total_due=Sum('total_amount'),
            total_collected=Sum('amount_paid'),
            total_balance=Sum('balance'),
        )
        return Response({
            'class_name': current_class,
            'month': month, 'year': year,
            'records': serializer.data,
            'summary': {
                'total_due': float(summary['total_due'] or 0),
                'total_collected': float(summary['total_collected'] or 0),
                'total_balance': float(summary['total_balance'] or 0),
            },
            'total_students': qs.count(),
        })

    # Class invoice PDF 
    @action(detail=False, methods=['get'], url_path='class-invoice-pdf')
    def class_invoice_pdf(self, request):
        month         = request.query_params.get('month')
        year          = request.query_params.get('year')
        current_class = request.query_params.get('current_class')

        if not all([month, year, current_class]):
            return Response(
                {"detail": "month, year, and current_class are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(
            month=month, year=year,
            student__current_class__iexact=current_class
        )
        records = FeeInvoiceSerializer(qs, many=True).data
        summary = qs.aggregate(
            total_due=Sum('total_amount'),
            total_collected=Sum('amount_paid'),
            total_balance=Sum('balance'),
        )
        summary_dict = {
            'total_due': float(summary['total_due'] or 0),
            'total_collected': float(summary['total_collected'] or 0),
            'total_balance': float(summary['total_balance'] or 0),
        }

        pdf = generate_class_invoice_pdf(current_class, month, year, records, summary_dict)
        filename = f"Fee_Collection_{current_class}_{month}_{year}.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    # Bulk generate fee records for a class 
    @action(detail=False, methods=['post'], url_path='bulk-generate')
    def bulk_generate(self, request):
        """
        POST /api/fees/records/bulk-generate/
        Body: { current_class, month, year, due_date? }
        Creates fee records for all active students in that class who don't already have one.
        """
        ser = BulkGenerateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        students = StudentProfile.objects.filter(
            current_class__iexact=d['current_class']
        ).exclude(withdrawn='yes')

        existing = set(
            FeeRecord.objects.filter(
                student__current_class__iexact=d['current_class'],
                month=d['month'], year=d['year']
            ).values_list('student_id', flat=True)
        )

        created = 0
        skipped = 0
        errors  = []

        for student in students:
            if student.id in existing:
                skipped += 1
                continue

            # Determine fee
            fee = None
            if student.current_fee:
                fee = student.current_fee
            else:
                try:
                    fs = FeeStructure.objects.get(
                        class_name__iexact=d['current_class'], is_active=True
                    )
                    fee = fs.monthly_fee
                except FeeStructure.DoesNotExist:
                    errors.append(f"No fee structure for {student.student_name} (#{student.admission_no})")
                    continue

            try:
                arrear = int(student.arrear_dues or 0)
            except (ValueError, TypeError):
                arrear = 0

            misc_total = MiscCharge.objects.filter(
                student=student, month=d['month'], year=d['year']
            ).aggregate(t=Sum('amount'))['t'] or 0

            FeeRecord.objects.create(
                student=student,
                month=d['month'],
                year=d['year'],
                previous_balance=arrear,
                current_fee=fee,
                misc_charges=misc_total,
                amount_paid=0,
                due_date=d.get('due_date'),
            )
            created += 1

        return Response({
            'created':  created,
            'skipped':  skipped,
            'errors':   errors,
            'total_students': students.count(),
        })

    # Bulk invoices PDF 
    @action(detail=False, methods=['get'], url_path='bulk-invoices-pdf')
    def bulk_invoices_pdf(self, request):
        """
        GET /api/fees/records/bulk-invoices-pdf/?current_class=X&month=6&year=2026
        Generates a single PDF with all student invoices for a class.
        4 mini-invoices per A4 page (2 students x 2 copies each).
        """
        month         = request.query_params.get('month')
        year          = request.query_params.get('year')
        current_class = request.query_params.get('current_class')

        if not all([month, year, current_class]):
            return Response(
                {"detail": "month, year, and current_class are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        qs = self.get_queryset().filter(
            month=month, year=year,
            student__current_class__iexact=current_class
        ).order_by('student__admission_no')

        records = FeeInvoiceSerializer(qs, many=True).data

        if not records:
            return Response(
                {"detail": "No fee records found for this class/period."},
                status=status.HTTP_404_NOT_FOUND
            )

        pdf = generate_bulk_invoices_pdf(records)
        filename = f"Bulk_Invoices_{current_class}_{month}_{year}.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    # Edit any record 
    @action(detail=True, methods=['patch'], url_path='edit-record')
    def edit_record(self, request, pk=None):
        record     = self.get_object()
        serializer = FeeRecordEditSerializer(record, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(FeeRecordDetailSerializer(record).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Top Defaulters 
    @action(detail=False, methods=['get'], url_path='top-defaulters')
    def top_defaulters(self, request):
        limit = int(request.query_params.get('limit', 10))
        qs = self.get_queryset().filter(
            status__in=['unpaid', 'partial']
        ).order_by('-balance')[:limit]
        return Response(FeeRecordListSerializer(qs, many=True).data)

    # Advance Payment
    @action(detail=False, methods=['post'], url_path='advance-payment')
    def advance_payment(self, request):
        ser = AdvancePaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        students = StudentProfile.objects.filter(id__in=d['student_ids']).exclude(withdrawn='yes')
        if not students.exists():
            return Response({"detail": "No valid students found."}, status=status.HTTP_400_BAD_REQUEST)

        created = 0
        skipped = 0
        errors  = []

        for student in students:
            fee = None
            if d.get('amount_paid'):
                fee = d['amount_paid']
            elif student.current_fee:
                fee = student.current_fee
            else:
                try:
                    fs = FeeStructure.objects.get(
                        class_name__iexact=student.current_class, is_active=True
                    )
                    fee = fs.monthly_fee
                except FeeStructure.DoesNotExist:
                    errors.append(f"No fee for {student.student_name} (#{student.admission_no})")
                    continue

            for month in d['months']:
                if FeeRecord.objects.filter(student=student, month=month, year=d['year']).exists():
                    skipped += 1
                    continue

                rec = FeeRecord(
                    student=student,
                    month=month,
                    year=d['year'],
                    previous_balance=0,
                    current_fee=fee,
                    amount_paid=fee,
                    is_advance=True,
                    due_date=d.get('due_date'),
                    remarks=d.get('remarks', '') or f"Advance payment",
                )
                rec._force_status = 'advance'
                rec.save()
                created += 1

        record_ids = list(
            FeeRecord.objects.filter(
                student__in=students,
                month__in=d['months'],
                year=d['year'],
                is_advance=True,
            ).values_list('id', flat=True)
        )

        return Response({
            'created': created,
            'skipped': skipped,
            'errors': errors,
            'record_ids': record_ids,
        })

    # Distinct Years 
    @action(detail=False, methods=['get'], url_path='distinct-years')
    def distinct_years(self, request):
        from django.utils import timezone
        years_with_data = list(
            FeeRecord.objects.values_list('year', flat=True)
            .distinct().order_by('-year')
        )
        current_year = timezone.now().year
        all_years = sorted(set(years_with_data + [current_year, current_year + 1]), reverse=True)
        return Response({
            'years': all_years,
            'years_with_data': sorted(years_with_data, reverse=True),
            'current_year': current_year,
        })

    # Student Fee History
    @action(detail=False, methods=['get'], url_path='student-fee-history')
    def student_fee_history(self, request):
        student_id = request.query_params.get('student')
        if not student_id or not str(student_id).isdigit():
            return Response({"detail": "student parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student = StudentProfile.objects.get(pk=student_id)
        except StudentProfile.DoesNotExist:
            return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        records = FeeRecord.objects.filter(student=student).order_by('year', 'month')

        years_data = {}
        for rec in records:
            yr = rec.year
            if yr not in years_data:
                years_data[yr] = {
                    'year': yr,
                    'months': {},
                    'total_fee': 0,
                    'total_paid': 0,
                    'total_balance': 0,
                    'records_count': 0,
                }
            years_data[yr]['months'][rec.month] = {
                'id': rec.id, 'receipt_no': rec.receipt_no,
                'month': rec.month, 'month_name': rec.get_month_display(),
                'previous_balance': float(rec.previous_balance),
                'current_fee': float(rec.current_fee),
                'misc_charges': float(rec.misc_charges),
                'total_amount': float(rec.total_amount),
                'amount_paid': float(rec.amount_paid),
                'balance': float(rec.balance),
                'status': rec.status, 'is_advance': rec.is_advance,
                'due_date': str(rec.due_date) if rec.due_date else None,
                'payment_date': str(rec.payment_date) if rec.payment_date else None,
                'receipt_date': str(rec.receipt_date) if rec.receipt_date else None,
            }
            years_data[yr]['total_fee'] += float(rec.current_fee)
            years_data[yr]['total_paid'] += float(rec.amount_paid)
            years_data[yr]['total_balance'] += float(rec.balance)
            years_data[yr]['records_count'] += 1

        month_names = dict(FeeRecord.MONTH_CHOICES)
        result_years = []
        for yr in sorted(years_data.keys(), reverse=True):
            yd = years_data[yr]
            months_list = []
            for m in range(1, 13):
                if m in yd['months']:
                    months_list.append(yd['months'][m])
                else:
                    months_list.append({
                        'month': m,
                        'month_name': month_names.get(m, ''),
                        'status': 'no_record',
                    })
            yd['months'] = months_list
            result_years.append(yd)

        lifetime_agg = records.aggregate(
            total_fee=Sum('current_fee'),
            total_paid=Sum('amount_paid'),
            total_balance=Sum('balance'),
        )

        return Response({
            'student': {
                'id': student.id,
                'admission_no': student.admission_no,
                'student_name': student.student_name,
                'current_class': student.current_class,
                'current_fee': float(student.current_fee) if student.current_fee else None,
            },
            'lifetime': {
                'total_records': records.count(),
                'total_fee': float(lifetime_agg['total_fee'] or 0),
                'total_paid': float(lifetime_agg['total_paid'] or 0),
                'total_balance': float(lifetime_agg['total_balance'] or 0),
            },
            'years': result_years,
        })

    # Summary 
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        qs = self.get_queryset()
        return Response({
            'total_records':   qs.count(),
            'total_due':       float(qs.aggregate(t=Sum('total_amount'))['t'] or 0),
            'total_collected': float(qs.aggregate(t=Sum('amount_paid'))['t']  or 0),
            'total_balance':   float(qs.aggregate(t=Sum('balance'))['t']      or 0),
            'unpaid_count':    qs.filter(status='unpaid').count(),
            'partial_count':   qs.filter(status='partial').count(),
            'paid_count':      qs.filter(status='paid').count(),
        })

    # Balance Sheet PDF 
    @action(detail=False, methods=['get'], url_path='balance-sheet-pdf')
    def balance_sheet_pdf(self, request):
        
        bs_response = self.balance_sheet(request)
        pdf = generate_balance_sheet_pdf(bs_response.data)
        year = request.query_params.get('year', 'all')
        filename = f"Balance_Sheet_{year}.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    # Balance Sheet 
    @action(detail=False, methods=['get'], url_path='balance-sheet')
    def balance_sheet(self, request):
        from django.utils import timezone
        year = request.query_params.get('year', str(timezone.now().year))
        try:
            year = int(year)
        except (ValueError, TypeError):
            year = 2026

        all_records = FeeRecord.objects.filter(year=year).select_related('student')

        monthly = []
        for m in range(1, 13):
            mqs = all_records.filter(month=m)
            if mqs.exists():
                agg = mqs.aggregate(
                    total_due=Sum('total_amount'),
                    total_collected=Sum('amount_paid'),
                    total_balance=Sum('balance'),
                    prev_balance=Sum('previous_balance'),
                    total_fee=Sum('current_fee'),
                )
                monthly.append({
                    'month': m,
                    'month_name': dict(FeeRecord.MONTH_CHOICES).get(m, ''),
                    'records': mqs.count(),
                    'total_fee': float(agg['total_fee'] or 0),
                    'prev_balance': float(agg['prev_balance'] or 0),
                    'total_due': float(agg['total_due'] or 0),
                    'total_collected': float(agg['total_collected'] or 0),
                    'total_balance': float(agg['total_balance'] or 0),
                    'paid': mqs.filter(status='paid').count(),
                    'unpaid': mqs.filter(status='unpaid').count(),
                    'partial': mqs.filter(status='partial').count(),
                })

        classrooms = ClassRoom.objects.filter(is_active=True).order_by('sort_order', 'name')
        class_wise = []
        for cr in classrooms:
            cqs = all_records.filter(student__current_class__iexact=cr.name)
            if cqs.exists():
                agg = cqs.aggregate(
                    total_due=Sum('total_amount'),
                    total_collected=Sum('amount_paid'),
                    total_balance=Sum('balance'),
                )
                student_count = StudentProfile.objects.filter(
                    current_class__iexact=cr.name
                ).exclude(withdrawn='yes').count()
                class_wise.append({
                    'class_name': cr.name,
                    'student_count': student_count,
                    'records': cqs.count(),
                    'total_due': float(agg['total_due'] or 0),
                    'total_collected': float(agg['total_collected'] or 0),
                    'total_balance': float(agg['total_balance'] or 0),
                    'collection_rate': round(
                        float(agg['total_collected'] or 0) / float(agg['total_due'] or 1) * 100, 1
                    ) if agg['total_due'] else 0,
                })

        yearly_agg = all_records.aggregate(
            total_due=Sum('total_amount'),
            total_collected=Sum('amount_paid'),
            total_balance=Sum('balance'),
            prev_balance=Sum('previous_balance'),
            total_fee=Sum('current_fee'),
        )
        total_students = StudentProfile.objects.exclude(withdrawn='yes').count()

        result = {
            'year': year,
            'yearly_summary': {
                'total_students': total_students,
                'total_records': all_records.count(),
                'total_fee': float(yearly_agg['total_fee'] or 0),
                'total_prev_balance': float(yearly_agg['prev_balance'] or 0),
                'total_due': float(yearly_agg['total_due'] or 0),
                'total_collected': float(yearly_agg['total_collected'] or 0),
                'total_balance': float(yearly_agg['total_balance'] or 0),
                'collection_rate': round(
                    float(yearly_agg['total_collected'] or 0) / float(yearly_agg['total_due'] or 1) * 100, 1
                ) if yearly_agg['total_due'] else 0,
                'paid': all_records.filter(status='paid').count(),
                'unpaid': all_records.filter(status='unpaid').count(),
                'partial': all_records.filter(status='partial').count(),
            },
            'monthly': monthly,
            'class_wise': class_wise,
        }

        SavedBalanceSheet.objects.update_or_create(
            year=year, defaults={'data': result}
        )

        return Response(result)


class SavedBalanceSheetViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SavedBalanceSheet.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return SavedBalanceSheetListSerializer
        return SavedBalanceSheetSerializer

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        obj = self.get_object()
        pdf = generate_balance_sheet_pdf(obj.data)
        filename = f"Balance_Sheet_{obj.year}.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ChargeCategoryViewSet(viewsets.ModelViewSet):
    queryset         = ChargeCategory.objects.all()
    serializer_class = ChargeCategorySerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['name']


class MiscChargeViewSet(viewsets.ModelViewSet):
    queryset = MiscCharge.objects.select_related('student', 'category').all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ['student__student_name', 'student__admission_no', 'category__name']
    ordering_fields = ['charge_date', 'amount', 'year', 'month']
    ordering        = ['-year', '-month', '-created_at']

    def get_serializer_class(self):
        if self.action in ('create',):
            return MiscChargeCreateSerializer
        return MiscChargeListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        student_id = self.request.query_params.get('student')
        category   = self.request.query_params.get('category')
        month      = self.request.query_params.get('month')
        year       = self.request.query_params.get('year')

        if student_id and str(student_id).isdigit():
            qs = qs.filter(student_id=student_id)
        if category and str(category).isdigit():
            qs = qs.filter(category_id=category)
        if month:
            qs = qs.filter(month=month)
        if year:
            qs = qs.filter(year=year)
        return qs

    def perform_create(self, serializer):
        charge = serializer.save()
        self._update_fee_record_misc(charge.student, charge.month, charge.year)

    def perform_destroy(self, instance):
        student, month, year = instance.student, instance.month, instance.year
        instance.delete()
        self._update_fee_record_misc(student, month, year)

    def _update_fee_record_misc(self, student, month, year):
        """Recalculate the misc_charges sum on the corresponding FeeRecord."""
        total = MiscCharge.objects.filter(
            student=student, month=month, year=year
        ).aggregate(t=Sum('amount'))['t'] or 0
        FeeRecord.objects.filter(
            student=student, month=month, year=year
        ).update(misc_charges=total)
        try:
            rec = FeeRecord.objects.get(student=student, month=month, year=year)
            rec.save()
        except FeeRecord.DoesNotExist:
            pass

    @action(detail=False, methods=['get'], url_path='student-summary')
    def student_summary(self, request):
        student_id = request.query_params.get('student')
        if not student_id:
            return Response({"detail": "student param required"}, status=status.HTTP_400_BAD_REQUEST)
        qs = MiscCharge.objects.filter(student_id=student_id)
        year = request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        by_cat = qs.values('category__name').annotate(
            total=Sum('amount'), count=Count('id')
        ).order_by('category__name')
        return Response({
            'total': float(qs.aggregate(t=Sum('amount'))['t'] or 0),
            'count': qs.count(),
            'by_category': list(by_cat),
        })
