from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization
from apps.users.models import SavedPlace

User = get_user_model()

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'phone_number', 'role', 
            'emergency_contact_name', 'emergency_contact_phone', 
            'co2_saved', 'money_saved', 'total_distance', 'is_verified',
            'reporting_manager', 'department', 'office_seat_desk'
        ]
        read_only_fields = ['co2_saved', 'money_saved', 'total_distance', 'is_verified']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'password', 'email', 'first_name', 'last_name', 
            'phone_number', 'role'
        ]

    def create(self, validated_data):
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            role=validated_data.get('role', 'user')
        )
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone_number', 
            'emergency_contact_name', 'emergency_contact_phone', 
            'profile_picture',
            'reporting_manager', 'department', 'office_seat_desk'
        ]


class SavedPlaceSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    class Meta:
        model = SavedPlace
        fields = '__all__'
        read_only_fields = ['user']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
