from django.urls import path
from scm.views.calendar_views import event_list, event_detail

urlpatterns = [
    path('',           event_list),
    path('<str:pk>/',  event_detail),
]