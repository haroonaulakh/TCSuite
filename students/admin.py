from django.contrib import admin
from .models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display  = ['admission_no', 'student_name', 'current_class', 'f_g_name', 'withdrawn']
    search_fields = ['student_name', 'admission_no', 'f_g_name']
    list_filter   = ['current_class', 'withdrawn']
