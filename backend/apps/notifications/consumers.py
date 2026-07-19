import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.group_name = f'user_{self.user_id}'

        # Join notifications group channel
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave notifications group channel
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def notification_send(self, event):
        # Broadcast notification payload to WebSocket connection client
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))
