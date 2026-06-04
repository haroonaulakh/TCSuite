from django.db import models


class StudentProfile(models.Model):
    admission_no       = models.CharField(max_length=100, blank=True)
    student_name       = models.CharField(max_length=255, blank=True)
    b_form             = models.CharField(max_length=100, blank=True)
    dob                = models.CharField(max_length=100, blank=True)
    religion           = models.CharField(max_length=100, blank=True)
    tribe_caste        = models.CharField(max_length=100, blank=True)
    address            = models.CharField(max_length=500, blank=True)
    email              = models.CharField(max_length=255, blank=True)

    f_g_name           = models.CharField(max_length=255, blank=True)
    f_g_cnic           = models.CharField(max_length=100, blank=True)
    f_g_occupation     = models.CharField(max_length=255, blank=True)
    f_g_contact        = models.CharField(max_length=100, blank=True)

    class_of_admission = models.CharField(max_length=100, blank=True)
    current_class      = models.CharField(max_length=100, blank=True)
    date_of_admission  = models.CharField(max_length=100, blank=True)
    withdrawn          = models.CharField(max_length=100, blank=True, default='no')
    class_of_withdrawl = models.CharField(max_length=100, blank=True)

    current_fee        = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    arrear_dues        = models.CharField(max_length=100, blank=True)
    remarks            = models.TextField(blank=True)

    created_at         = models.DateTimeField(auto_now_add=True, null=True)
    updated_at         = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student_name} ({self.admission_no})"
