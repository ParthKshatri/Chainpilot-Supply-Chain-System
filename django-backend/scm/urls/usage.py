from django.urls import path
from scm.views.usage_views import usage_list, log_usage, upload_usage

urlpatterns = [
    path('',                            log_usage),
    path('<str:material_id>/',          usage_list),
    path('upload/<str:material_id>/',   upload_usage),
]