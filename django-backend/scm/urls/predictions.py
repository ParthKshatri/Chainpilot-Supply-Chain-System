from django.urls import path
from scm.views.prediction_views import prediction_list, generate_prediction, comparison_detail

urlpatterns = [
    path('',                                prediction_list),
    path('generate/<str:material_id>/',     generate_prediction),
    path('comparison/<str:material_id>/',   comparison_detail),
]