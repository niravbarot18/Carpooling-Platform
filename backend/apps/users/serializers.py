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
    organization_details = OrganizationSerializer(source='organization', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'phone_number', 'role', 'organization', 'organization_details', 
            'emergency_contact_name', 'emergency_contact_phone', 
            'co2_saved', 'money_saved', 'total_distance', 'is_verified'
        ]
        read_only_fields = ['co2_saved', 'money_saved', 'total_distance', 'is_verified']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    organization_name = serializers.CharField(write_only=True, required=False)
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = [
            'username', 'password', 'email', 'first_name', 'last_name', 
            'phone_number', 'role', 'organization', 'organization_name'
        ]

    def create(self, validated_data):
        organization_name = validated_data.pop('organization_name', None)
        organization = validated_data.get('organization', None)
        
        # If organization name is provided, find or create it
        if organization_name and not organization:
            domain = validated_data.get('email', '').split('@')[-1]
            if not domain:
                domain = f"{organization_name.lower().replace(' ', '')}.com"
            organization, _ = Organization.objects.get_or_create(
                name=organization_name,
                defaults={'domain': domain}
            )
            validated_data['organization'] = organization

        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            role=validated_data.get('role', 'employee'),
            organization=validated_data.get('organization')
        )
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'phone_number', 
            'emergency_contact_name', 'emergency_contact_phone', 
            'profile_picture'
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
