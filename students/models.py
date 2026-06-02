from django.db import models

# Create your models here.
from django.db import models


class StudentProfile(models.Model):

    WITHDRAWN_CHOICES = [
        ('yes', 'Yes'),
        ('no',  'No'),
    ]

    # Admission info
    admission_no       = models.IntegerField(unique=True)
    date_of_admission  = models.DateField()

    # Student personal info
    student_f_name     = models.CharField(max_length=100)
    student_l_name     = models.CharField(max_length=100)
    b_form             = models.CharField(max_length=20, unique=True)
    dob                = models.DateField()
    religion           = models.CharField(max_length=50, blank=True)
    tribe_caste        = models.CharField(max_length=100, blank=True)
    address            = models.TextField(blank=True)

    # Father/Guardian info
    f_g_name           = models.CharField(max_length=100)
    f_g_cnic           = models.CharField(max_length=20)
    f_g_occupation     = models.CharField(max_length=100, blank=True)
    f_g_contact        = models.CharField(max_length=20)

    # Class info
    class_of_admission = models.CharField(max_length=50)
    current_class      = models.CharField(max_length=50)

    # Withdrawal
    withdrawn          = models.CharField(max_length=3, choices=WITHDRAWN_CHOICES, default='no')
    class_of_withdrawal = models.CharField(max_length=50, blank=True)

    # Financial
    arrear_dues        = models.IntegerField(default=0)

    # Remarks
    remarks            = models.TextField(blank=True)

    # Login credentials
    email              = models.EmailField(unique=True)
    password           = models.CharField(max_length=255)  # will store hashed password

    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['admission_no']

    def __str__(self):
        return f"{self.student_f_name} {self.student_l_name} ({self.admission_no})"

    @property
    def full_name(self):
        return f"{self.student_f_name} {self.student_l_name}"