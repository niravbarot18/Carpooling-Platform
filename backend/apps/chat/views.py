from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.chat.models import Message
from apps.chat.serializers import MessageSerializer

class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        queryset = Message.objects.all().order_by('timestamp')
        ride_id = self.request.query_params.get('ride_id')
        booking_id = self.request.query_params.get('booking_id')

        if ride_id:
            queryset = queryset.filter(ride_id=ride_id)
        if booking_id:
            queryset = queryset.filter(booking_id=booking_id)
            
        return queryset
