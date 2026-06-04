from rest_framework import serializers
from .models import ClassRoom, AcademicYear, FeeStructure, FeeRecord, SavedBalanceSheet
from students.models import StudentProfile
from students.serializers import StudentFeeInfoSerializer


class ClassRoomSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model  = ClassRoom
        fields = ['id', 'name', 'sort_order', 'is_active', 'student_count', 'created_at']

    def get_student_count(self, obj):
        return StudentProfile.objects.filter(
            current_class__iexact=obj.name
        ).exclude(withdrawn='yes').count()


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AcademicYear
        fields = '__all__'


class FeeStructureSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FeeStructure
        fields = '__all__'


class FeeRecordListSerializer(serializers.ModelSerializer):
    student_name  = serializers.CharField(source='student.student_name',  read_only=True)
    admission_no  = serializers.CharField(source='student.admission_no',  read_only=True)
    current_class = serializers.CharField(source='student.current_class', read_only=True)
    month_name    = serializers.CharField(source='get_month_display',     read_only=True)
    f_g_name      = serializers.CharField(source='student.f_g_name',     read_only=True)
    f_g_contact   = serializers.CharField(source='student.f_g_contact',  read_only=True)

    class Meta:
        model  = FeeRecord
        fields = [
            'id', 'receipt_no',
            'student', 'student_name', 'admission_no', 'current_class',
            'f_g_name', 'f_g_contact',
            'month', 'month_name', 'year',
            'previous_balance', 'current_fee', 'total_amount',
            'amount_paid', 'balance', 'status', 'is_advance',
            'due_date', 'payment_date', 'receipt_date',
        ]


class FeeRecordDetailSerializer(serializers.ModelSerializer):
    student    = StudentFeeInfoSerializer(read_only=True)
    month_name = serializers.CharField(source='get_month_display', read_only=True)

    class Meta:
        model  = FeeRecord
        fields = [
            'id', 'receipt_no',
            'student', 'month', 'month_name', 'year',
            'previous_balance', 'current_fee', 'total_amount',
            'amount_paid', 'balance', 'status', 'is_advance',
            'receipt_date', 'due_date', 'payment_date',
            'remarks', 'created_at', 'updated_at',
        ]


class FeeRecordCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FeeRecord
        fields = [
            'student', 'month', 'year',
            'previous_balance', 'current_fee',
            'amount_paid', 'due_date', 'remarks',
        ]

    def validate(self, data):
        student = data.get('student')

        if 'previous_balance' not in data or data.get('previous_balance', 0) == 0:
            try:
                data['previous_balance'] = int(student.arrear_dues or 0)
            except (ValueError, TypeError):
                data['previous_balance'] = 0

        if 'current_fee' not in data or not data.get('current_fee'):
            if student.current_fee:
                data['current_fee'] = student.current_fee
            else:
                try:
                    structure = FeeStructure.objects.get(
                        class_name=student.current_class,
                        is_active=True
                    )
                    data['current_fee'] = structure.monthly_fee
                except FeeStructure.DoesNotExist:
                    raise serializers.ValidationError(
                        f"No fee structure for class '{student.current_class}' and "
                        f"student has no individual fee set."
                    )

        exists = FeeRecord.objects.filter(
            student=student,
            month=data.get('month'),
            year=data.get('year')
        ).exists()
        if exists:
            raise serializers.ValidationError(
                "A fee record already exists for this student for this month/year."
            )

        return data


class FeeRecordEditSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FeeRecord
        fields = [
            'previous_balance', 'current_fee',
            'amount_paid', 'status',
            'due_date', 'payment_date', 'remarks',
        ]

    def validate_amount_paid(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Amount paid cannot be negative.")
        return value

    def update(self, instance, validated_data):
        force_status = validated_data.pop('status', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if force_status and force_status in ('unpaid', 'partial', 'paid', 'waived', 'advance'):
            instance._force_status = force_status
        instance.save()
        return instance


class FeePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = FeeRecord
        fields = ['amount_paid', 'payment_date', 'remarks']

    def validate_amount_paid(self, value):
        if value < 0:
            raise serializers.ValidationError("Amount paid cannot be negative.")
        return value


class FeeInvoiceSerializer(serializers.ModelSerializer):
    student    = StudentFeeInfoSerializer(read_only=True)
    month_name = serializers.CharField(source='get_month_display', read_only=True)

    class Meta:
        model  = FeeRecord
        fields = [
            'id', 'receipt_no',
            'student', 'month', 'month_name', 'year',
            'previous_balance', 'current_fee', 'total_amount',
            'amount_paid', 'balance', 'status', 'is_advance',
            'receipt_date', 'due_date', 'payment_date', 'remarks',
        ]


class BulkGenerateSerializer(serializers.Serializer):
    current_class = serializers.CharField()
    month         = serializers.IntegerField(min_value=1, max_value=12)
    year          = serializers.IntegerField(min_value=2020, max_value=2099)
    due_date      = serializers.DateField(required=False, allow_null=True)


class AdvancePaymentSerializer(serializers.Serializer):
    student_ids  = serializers.ListField(
        child=serializers.IntegerField(), min_length=1)
    months       = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=12), min_length=1)
    year         = serializers.IntegerField(min_value=2020, max_value=2099)
    amount_paid  = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True)
    due_date     = serializers.DateField(required=False, allow_null=True)
    remarks      = serializers.CharField(required=False, allow_blank=True, default='')


class SavedBalanceSheetSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SavedBalanceSheet
        fields = ['id', 'year', 'data', 'generated_at', 'created_at']
        read_only_fields = ['id', 'generated_at', 'created_at']


class SavedBalanceSheetListSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SavedBalanceSheet
        fields = ['id', 'year', 'generated_at', 'created_at']
