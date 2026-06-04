from django.contrib import admin
from .models import ClassRoom, AcademicYear, FeeStructure, FeeRecord, SavedBalanceSheet


@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'sort_order', 'is_active']


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['label', 'is_current', 'start_date', 'end_date']


@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ['class_name', 'monthly_fee', 'is_active']


@admin.register(FeeRecord)
class FeeRecordAdmin(admin.ModelAdmin):
    list_display = ['receipt_no', 'student', 'month', 'year', 'total_amount', 'amount_paid', 'balance', 'status']
    list_filter  = ['status', 'year', 'month']
    search_fields = ['receipt_no', 'student__student_name']


@admin.register(SavedBalanceSheet)
class SavedBalanceSheetAdmin(admin.ModelAdmin):
    list_display = ['year', 'generated_at']
