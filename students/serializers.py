from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import StudentProfile

# for list view in frontend
class StudentListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only = True)

    class Meta:
        model = StudentProfile
        fields = ["id", "admission_no", "full_name", "f_g_name", "f_g_contact", "current_class", "f_g_contact", "withdrawn", "arrear_dues"]


# for the detailed view of any student
class StudentDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only = True)

    class Meta: 
        model = StudentProfile
        field = "__all__"
        extra_kwargs = {
            "password": {"write_only": True}
                        }
        


# Create/Update Student
class StudentCreateUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentProfile
        fields = [
            'admission_no', 'date_of_admission',
            'student_f_name', 'student_l_name',
            'b_form', 'dob', 'religion', 'tribe_caste', 'address',
            'f_g_name', 'f_g_cnic', 'f_g_occupation', 'f_g_contact',
            'class_of_admission', 'current_class',
            'withdrawn', 'class_of_withdrawal',
            'arrear_dues', 'remarks',
            'email', 'password',
        ]
        extra_kwargs = {
            "password": {"write_only": True}
        }
    
        def validate_admission_no(self, value):
            qs = StudentProfile.objects.filter(admission_no=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("The admission number is already taken")
            return value
    
        def validate_b_form(self, value):
            qs = StudentProfile.objects.filter(b_form=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This B-Form number is already registered.")
            return value

        def validate_email(self, value):
            qs = StudentProfile.objects.filter(email=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("This email is already registered.")
            return value

        def validate_f_g_cnic(self, value):
            """Basic CNIC format check — 13 digits."""
            digits = value.replace('-', '')
            if not digits.isdigit() or len(digits) != 13:
                raise serializers.ValidationError("CNIC must be 13 digits.")
            return value

        def create(self, validated_data):
            # Hash the password before saving
            validated_data['password'] = make_password(validated_data['password'])
            return super().create(validated_data)

        def update(self, instance, validated_data):
            # Only hash if password is being updated
            if 'password' in validated_data:
                validated_data['password'] = make_password(validated_data['password'])
            return super().update(instance, validated_data)
