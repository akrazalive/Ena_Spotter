from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.http import HttpResponse
import os

def serve_react(request, *args, **kwargs):
    index_path = os.path.join(settings.BASE_DIR, 'frontend_build', 'index.html')
    if os.path.exists(index_path):
        with open(index_path, 'r') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse('Frontend not built.', status=404)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('trip.urls')),
    re_path(r'^(?!api|admin|static).*$', serve_react),
]
