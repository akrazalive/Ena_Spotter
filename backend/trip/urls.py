from django.urls import path
from .views import TripPlanView, AutocompleteView

urlpatterns = [
    path('trip/plan/', TripPlanView.as_view(), name='trip-plan'),
    path('trip/autocomplete/', AutocompleteView.as_view(), name='trip-autocomplete'),
]
