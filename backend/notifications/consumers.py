import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer

class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return

        self.group_name = f"user_{self.user.id}"

        # Join user group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            # Leave user group
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Receive message from WebSocket (unused, but structure exists)
    async def receive_json(self, content, **kwargs):
        pass

    # Receive notification from group
    async def send_notification(self, event):
        notification = event["notification"]
        # Send message to WebSocket
        await self.send_json({
            "type": "notification",
            "data": notification
        })
