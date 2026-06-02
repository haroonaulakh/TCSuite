from django.shortcuts import render
from rest_framework import viewsets, filters
from .models import StudentProfile
from .serializers import (
    StudentListSerializer,
    StudentDetailSerializer,
    StudentCreateUpdateSerializer,
)

# Create your views here.

from django.http import HttpResponse
def student_list(request):
    # 'request' contains everything about the incoming browser request
    return HttpResponse('Hello! This is the student list page.')

class StudentViewSet(viewsets.ModelViewSet):
    queryset        = StudentProfile.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = [
        'student_f_name', 'student_l_name',
        'admission_no', 'b_form',
        'f_g_name', 'f_g_contact'
    ]
    ordering_fields = ['admission_no', 'student_f_name', 'date_of_admission']

    def get_serializer_class(self):
        if self.action == 'list':
            return StudentListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return StudentCreateUpdateSerializer
        return StudentDetailSerializer
    
    def get_queryset(self):
        qs = super().get_queryset()

        # Filter: /api/students/?current_class=5&withdrawn=no
        current_class = self.request.query_params.get('current_class')
        withdrawn     = self.request.query_params.get('withdrawn')

        if current_class:
            qs = qs.filter(current_class__icontains=current_class)
        if withdrawn:
            qs = qs.filter(withdrawn=withdrawn.lower())

        return qs
