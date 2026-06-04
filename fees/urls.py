from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClassRoomViewSet, AcademicYearViewSet,
    FeeStructureViewSet, FeeRecordViewSet,
    SavedBalanceSheetViewSet,
    ChargeCategoryViewSet, MiscChargeViewSet,
)

router = DefaultRouter()
router.register('classrooms',           ClassRoomViewSet,          basename='classrooms')
router.register('academic-years',       AcademicYearViewSet,       basename='academic-years')
router.register('structures',           FeeStructureViewSet,       basename='fee-structures')
router.register('records',              FeeRecordViewSet,          basename='fee-records')
router.register('saved-balance-sheets', SavedBalanceSheetViewSet,  basename='saved-balance-sheets')
router.register('charge-categories',    ChargeCategoryViewSet,     basename='charge-categories')
router.register('misc-charges',         MiscChargeViewSet,         basename='misc-charges')

urlpatterns = [
    path('', include(router.urls)),
]
