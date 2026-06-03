"""
URL configuration for the_creative_school project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    return Response({
        'message': 'School Management API is running.',
        'endpoints': {
            'admin':    '/admin/',
            'login':    '/api/accounts/login/',
            'refresh':  '/api/accounts/refresh/',
            'me':       '/api/accounts/me/',
            'students': '/api/students/',
            'fees':     '/api/fees/',
            
        }
    })

urlpatterns = [
    path('',              api_root),
    path('admin/',        admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/students/', include('students.urls')),
    path('api/fees/',     include('fees.urls')), 


] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
