# trips/routing.py
from django.urls import re_path
from .consumers import TripConsumer

websocket_urlpatterns = [
    re_path(r'^ws/trips/(?P<trip_id>\d+)/$', TripConsumer.as_asgi()),
]
