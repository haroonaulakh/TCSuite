from django.db import models
from students.models import StudentProfile


class ClassRoom(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    sort_order  = models.IntegerField(default=0, help_text="Order for display sorting")
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'name']

    def __str__(self):
        return self.name


class AcademicYear(models.Model):
    label       = models.CharField(max_length=50, unique=True)  # e.g. "2025-2026"
    start_date  = models.CharField(max_length=20, blank=True)
    end_date    = models.CharField(max_length=20, blank=True)
    is_current  = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-label']

    def __str__(self):
        return self.label

    def save(self, *args, **kwargs):
        if self.is_current:
            AcademicYear.objects.filter(is_current=True).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class FeeStructure(models.Model):
    class_name  = models.CharField(max_length=100, unique=True)
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['class_name']

    def __str__(self):
        return f"{self.class_name} — Rs. {self.monthly_fee}/month"


def generate_receipt_no():
    last = FeeRecord.objects.order_by('id').last()
    if not last:
        return 'RCP-0001'
    last_no = int(last.receipt_no.split('-')[1])
    return f"RCP-{str(last_no + 1).zfill(4)}"


class FeeRecord(models.Model):
    MONTH_CHOICES = [
        (1,  'January'),  (2,  'February'), (3,  'March'),
        (4,  'April'),    (5,  'May'),       (6,  'June'),
        (7,  'July'),     (8,  'August'),    (9,  'September'),
        (10, 'October'),  (11, 'November'),  (12, 'December'),
    ]

    STATUS_CHOICES = [
        ('unpaid',  'Unpaid'),
        ('partial', 'Partial'),
        ('paid',    'Paid'),
        ('waived',  'Waived'),
        ('advance', 'Paid in Advance'),
    ]

    receipt_no        = models.CharField(max_length=20, unique=True, editable=False)
    student           = models.ForeignKey(
                            StudentProfile, on_delete=models.PROTECT,
                            related_name='fee_records')
    month             = models.IntegerField(choices=MONTH_CHOICES)
    year              = models.IntegerField()

    previous_balance  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    current_fee       = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount      = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    amount_paid       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance           = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unpaid')

    receipt_date      = models.DateField(auto_now_add=True)
    due_date          = models.DateField(null=True, blank=True)
    payment_date      = models.DateField(null=True, blank=True)

    misc_charges      = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                            help_text="Sum of miscellaneous charges for this period.")
    is_advance        = models.BooleanField(default=False,
                            help_text="True if this record was created via advance payment.")

    remarks           = models.TextField(blank=True)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering        = ['-year', '-month']
        unique_together = ('student', 'month', 'year')

    def save(self, *args, **kwargs):
        if not self.receipt_no:
            self.receipt_no = generate_receipt_no()

        self.total_amount = (self.previous_balance or 0) + (self.current_fee or 0) + (self.misc_charges or 0)
        self.balance      = self.total_amount - (self.amount_paid or 0)

        force_status = getattr(self, '_force_status', None)
        if force_status:
            self.status = force_status
            if force_status in ('waived', 'advance'):
                self.balance = 0
            delattr(self, '_force_status')
        else:
            if (self.amount_paid or 0) <= 0:
                self.status = 'unpaid'
            elif self.balance <= 0:
                self.status = 'paid'
                self.balance = 0
            else:
                self.status = 'partial'

        if self.status in ('paid', 'advance') and not self.payment_date:
            from django.utils import timezone
            self.payment_date = timezone.now().date()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.receipt_no} — {self.student.student_name} — {self.get_month_display()} {self.year}"


class ChargeCategory(models.Model):
    """Categories for miscellaneous charges: books, notebooks, diaries, etc."""
    name        = models.CharField(max_length=150, unique=True)
    amount      = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                      help_text="Default/fixed charge amount for this category")
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Charge Categories'

    def __str__(self):
        return f"{self.name} — Rs. {self.amount}"


class MiscCharge(models.Model):
    """A single miscellaneous charge record for a student."""
    student     = models.ForeignKey(
                      StudentProfile, on_delete=models.PROTECT,
                      related_name='misc_charges')
    category    = models.ForeignKey(
                      ChargeCategory, on_delete=models.PROTECT,
                      related_name='charges')
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    month       = models.IntegerField(choices=FeeRecord.MONTH_CHOICES)
    year        = models.IntegerField()
    charge_date = models.DateField(auto_now_add=True)
    remarks     = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month', '-created_at']

    def __str__(self):
        return f"{self.student.student_name} — {self.category.name} — Rs. {self.amount}"


class SavedBalanceSheet(models.Model):
    year         = models.IntegerField(unique=True)
    data         = models.JSONField(help_text="Full balance sheet JSON snapshot")
    generated_at = models.DateTimeField(auto_now=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year']

    def __str__(self):
        return f"Balance Sheet — {self.year}"
