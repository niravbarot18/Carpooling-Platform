"""
ASGI config for carpool_backend project.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'carpool_backend.settings')
django.setup()

# Import routing from apps after django.setup()
from notifications.routing import websocket_urlpatterns as notification_urls
from trips.routing import websocket_urlpatterns as trip_urls
from carpool_backend.channels_middleware import JWTAuthMiddleware

websocket_urlpatterns = []
websocket_urlpatterns.extend(notification_urls)
websocket_urlpatterns.extend(trip_urls)

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
