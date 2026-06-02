from django.contrib import admin
from .models import StudentProfile

# Register your models here.
@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display  = [
        'admission_no', 'full_name', 'current_class',
        'f_g_name', 'f_g_contact', 'withdrawn', 'arrear_dues'
    ]
    list_filter   = ['withdrawn', 'current_class', 'religion']
    search_fields = [
        'student_f_name', 'student_l_name',
        'admission_no', 'b_form', 'f_g_name', 'f_g_cnic'
    ]