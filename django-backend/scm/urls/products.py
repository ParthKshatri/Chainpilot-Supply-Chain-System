from django.urls import path
from scm.views.product_views import product_list, product_detail

urlpatterns = [
    path('',            product_list),
    path('<str:pk>/',   product_detail),
]