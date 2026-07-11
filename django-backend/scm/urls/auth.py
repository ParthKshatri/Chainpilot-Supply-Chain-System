from django.urls import path
from scm.views.auth_views import register, login, me, update_profile

urlpatterns = [
    path('register/', register),
    path('login/',    login),
    path('me/',       me),
    path('profile/',  update_profile),
]
