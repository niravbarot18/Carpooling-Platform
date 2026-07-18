import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from apps.chat.models import Message
from apps.rides.models import Ride
from apps.bookings.models import Booking

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')

        if message_type == 'typing':
            # Broadcast typing indicator
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_typing',
                    'sender_username': data.get('sender_username'),
                    'is_typing': data.get('is_typing', False)
                }
            )
        else:
            sender_id = data.get('sender_id')
            content = data.get('content')
            ride_id = data.get('ride_id')
            booking_id = data.get('booking_id')

            # Save message to DB asynchronously
            message_obj = await self.save_message(sender_id, content, ride_id, booking_id)

            # Broadcast message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message_id': message_obj['id'],
                    'sender_id': sender_id,
                    'sender_username': message_obj['sender_username'],
                    'content': content,
                    'timestamp': message_obj['timestamp']
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'id': event['message_id'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'content': event['content'],
            'timestamp': event['timestamp']
        }))

    # Receive typing state from room group
    async def chat_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender_username': event['sender_username'],
            'is_typing': event['is_typing']
        }))

    @database_sync_to_async
    def save_message(self, sender_id, content, ride_id, booking_id):
        sender = User.objects.get(id=sender_id)
        ride = Ride.objects.filter(id=ride_id).first() if ride_id else None
        booking = Booking.objects.filter(id=booking_id).first() if booking_id else None
        
        msg = Message.objects.create(
            sender=sender,
            ride=ride,
            booking=booking,
            content=content
        )
        return {
            'id': msg.id,
            'sender_username': sender.username,
            'timestamp': msg.timestamp.isoformat()
        }
