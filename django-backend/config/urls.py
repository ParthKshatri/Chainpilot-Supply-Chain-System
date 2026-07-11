from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('api/auth/',        include('scm.urls.auth')),
    path('api/products/',    include('scm.urls.products')),
    path('api/materials/',   include('scm.urls.materials')),
    path('api/usage/',       include('scm.urls.usage')),
    path('api/predictions/', include('scm.urls.predictions')),
    path('api/calendar/',    include('scm.urls.calendar')),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
