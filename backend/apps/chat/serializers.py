from rest_framework import serializers
from apps.chat.models import Message

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.ImageField(source='sender.profile_picture', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_username', 'sender_avatar', 'ride', 'booking', 'content', 'timestamp', 'is_read']
        read_only_fields = ['sender']

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)
