from django.urls import path
from scm.views.material_views import material_list, material_detail, update_stock

urlpatterns = [
    path('',                        material_list),
    path('<str:pk>/',               material_detail),
    path('<str:pk>/stock/',         update_stock),
]