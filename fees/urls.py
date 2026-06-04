from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClassRoomViewSet, AcademicYearViewSet,
    FeeStructureViewSet, FeeRecordViewSet,
    SavedBalanceSheetViewSet,
)

router = DefaultRouter()
router.register('classrooms',      ClassRoomViewSet,          basename='classrooms')
router.register('academic-years',  AcademicYearViewSet,       basename='academic-years')
router.register('structures',      FeeStructureViewSet,       basename='fee-structures')
router.register('records',         FeeRecordViewSet,          basename='fee-records')
router.register('saved-balance-sheets', SavedBalanceSheetViewSet, basename='saved-balance-sheets')

urlpatterns = [
    path('', include(router.urls)),
]
