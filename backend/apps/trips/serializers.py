from rest_framework import serializers
from apps.trips.models import Trip, Rating
from apps.rides.serializers import RideSerializer
from apps.users.serializers import UserSerializer

class TripSerializer(serializers.ModelSerializer):
    ride_details = RideSerializer(source='ride', read_only=True)

    class Meta:
        model = Trip
        fields = '__all__'


class RatingSerializer(serializers.ModelSerializer):
    rater_details = UserSerializer(source='rater', read_only=True)
    ratee_details = UserSerializer(source='ratee', read_only=True)

    class Meta:
        model = Rating
        fields = '__all__'
        read_only_fields = ['rater']

    def create(self, validated_data):
        validated_data['rater'] = self.context['request'].user
        return super().create(validated_data)
