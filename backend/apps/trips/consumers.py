import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from apps.trips.models import Trip

class TripConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.trip_id = self.scope['url_route']['kwargs']['trip_id']
        self.trip_group_name = f'trip_{self.trip_id}'

        # Join trip group
        await self.channel_layer.group_add(
            self.trip_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave trip group
        await self.channel_layer.group_discard(
            self.trip_group_name,
            self.channel_name
        )

    # Receive location coordinate updates from driver client
    async def receive(self, text_data):
        data = json.loads(text_data)
        lat = data.get('latitude')
        lng = data.get('longitude')
        eta = data.get('eta_minutes')
        distance = data.get('distance_covered')
        status_val = data.get('status')

        # Persist coordinates in database asynchronously
        await self.save_location(lat, lng, eta, distance, status_val)

        # Broadcast update to everyone in the trip group
        await self.channel_layer.group_send(
            self.trip_group_name,
            {
                'type': 'trip_update',
                'latitude': lat,
                'longitude': lng,
                'eta_minutes': eta,
                'distance_covered': distance,
                'status': status_val
            }
        )

    # Receive update from group channel
    async def trip_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'eta_minutes': event['eta_minutes'],
            'distance_covered': event['distance_covered'],
            'status': event['status']
        }))

    @database_sync_to_async
    def save_location(self, lat, lng, eta, distance, status_val):
        trip = Trip.objects.filter(id=self.trip_id).first()
        if trip:
            if lat is not None:
                trip.driver_lat = lat
            if lng is not None:
                trip.driver_lng = lng
            if eta is not None:
                trip.eta_minutes = eta
            if distance is not None:
                trip.distance_covered = distance
            if status_val is not None:
                trip.status = status_val
            
            # Transition status
            if trip.status == 'started' and lat is not None:
                trip.status = 'in_progress'
                
            trip.save()
