from rest_framework import serializers
from .models import StudentProfile


class StudentProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentProfile
        fields = '__all__'


class StudentFeeInfoSerializer(serializers.ModelSerializer):
    """Lightweight student info embedded in fee records."""
    class Meta:
        model  = StudentProfile
        fields = [
            'id', 'admission_no', 'student_name',
            'current_class', 'f_g_name', 'f_g_contact',
            'current_fee', 'arrear_dues',
        ]
