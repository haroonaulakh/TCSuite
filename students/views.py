from rest_framework import viewsets, filters
from .models import StudentProfile
from .serializers import StudentProfileSerializer


class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student_name', 'admission_no', 'f_g_name', 'f_g_contact']
    ordering_fields = ['student_name', 'admission_no', 'current_class', 'created_at']
    ordering = ['-created_at']
