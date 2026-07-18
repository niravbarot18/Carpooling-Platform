import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

class TripConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.trip_id = self.scope["url_route"]["kwargs"]["trip_id"]
        self.group_name = f"trip_{self.trip_id}"

        if self.user.is_anonymous:
            await self.close()
            return

        # Check if the user is authorized for this trip (driver or passenger)
        is_allowed = await self.is_user_authorized_for_trip()
        if not is_allowed:
            await self.close()
            return

        # Join trip group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            # Leave trip group
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Receive location update from client (typically from the driver's phone/browser)
    async def receive_json(self, content, **kwargs):
        msg_type = content.get("type")
        
        if msg_type == "location_update":
            lat = content.get("lat")
            lng = content.get("lng")
            
            if lat is not None and lng is not None:
                # Save to database asynchronously
                await self.save_location_to_db(lat, lng)
                
                # Broadcast coordinate update to the group
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "location_broadcast",
                        "lat": lat,
                        "lng": lng
                    }
                )

    # Receive broadcast message from group
    async def location_broadcast(self, event):
        # Send coordinate updates to the client
        await self.send_json({
            "type": "location_update",
            "lat": event["lat"],
            "lng": event["lng"]
        })

    @database_sync_to_async
    def is_user_authorized_for_trip(self):
        from .models import Trip
        from bookings.models import Booking
        try:
            trip = Trip.objects.get(id=self.trip_id)
            # Driver check
            if trip.ride.driver_id == self.user.id:
                return True
            # Passenger check
            return Booking.objects.filter(ride=trip.ride, passenger=self.user, status='Approved').exists()
        except Trip.DoesNotExist:
            return False

    @database_sync_to_async
    def save_location_to_db(self, lat, lng):
        from .models import Trip
        try:
            trip = Trip.objects.get(id=self.trip_id)
            if trip.ride.driver_id == self.user.id:
                trip.current_lat = float(lat)
                trip.current_lng = float(lng)
                trip.save()
        except Trip.DoesNotExist:
            pass
