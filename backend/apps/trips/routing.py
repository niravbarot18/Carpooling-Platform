from django.urls import re_path
from apps.trips.consumers import TripConsumer

websocket_urlpatterns = [
    re_path(r'ws/trips/(?P<trip_id>\w+)/$', TripConsumer.as_asgi()),
]
