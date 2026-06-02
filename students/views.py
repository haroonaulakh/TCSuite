from django.shortcuts import render

# Create your views here.

from django.http import HttpResponse
def student_list(request):
    # 'request' contains everything about the incoming browser request
    return HttpResponse('Hello! This is the student list page.')
