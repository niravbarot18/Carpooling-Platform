import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Send, AlertTriangle, MessageSquare } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Message {
  id: number;
  sender_username: string;
  content: string;
  timestamp: string;
}

// Markers DivIcons
const driverIcon = L.divIcon({
  html: `<div style="background-color: #8b5cf6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(139, 92, 246, 0.5); animate-pulse-slow"></div>`,
  className: 'custom-driver-marker',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const destIcon = L.divIcon({
  html: `<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);"></div>`,
  className: 'custom-dest-marker',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const pickupIcon = L.divIcon({
  html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);"></div>`,
  className: 'custom-pickup-marker',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

export const TripTracking: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const { getTripSocket, getChatSocket, closeSocket } = useSocket();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GPS Tracking States
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number>(0.0);
  const [tripStatus, setTripStatus] = useState('booked');

  // Real-time Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [typingUser, setTypingUser] = useState<string | null>(null);
  
  const tripSocketRef = useRef<WebSocket | null>(null);
  const chatSocketRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const isDriver = trip && user && trip.ride_details.driver === user.id;

  const loadTrip = async () => {
    try {
      // 1. Fetch Trip details
      const res = await api.get(`/trips/${tripId}/`);
      setTrip(res.data);
      setTripStatus(res.data.status);
      setDriverLat(res.data.driver_lat ? parseFloat(res.data.driver_lat) : parseFloat(res.data.ride_details.pickup_latitude));
      setDriverLng(res.data.driver_lng ? parseFloat(res.data.driver_lng) : parseFloat(res.data.ride_details.pickup_longitude));
      setEta(res.data.eta_minutes || 15);
      setDistance(parseFloat(res.data.distance_covered) || 0.0);

      // 2. Fetch Chat histories
      const chatRes = await api.get('/messages/', { params: { ride_id: res.data.ride_details.id } });
      setMessages(chatRes.data.results || chatRes.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to initialize tracking screen.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  // Connect WebSockets
  useEffect(() => {
    if (!trip || !tripId) return;

    // A. Connect Live GPS Socket
    const wsUrl = `/ws/trips/${tripId}/`;
    const socket = getTripSocket(tripId);
    tripSocketRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'location_update') {
        if (data.latitude) setDriverLat(parseFloat(data.latitude));
        if (data.longitude) setDriverLng(parseFloat(data.longitude));
        if (data.eta_minutes !== undefined) setEta(data.eta_minutes);
        if (data.distance_covered !== undefined) setDistance(parseFloat(data.distance_covered));
        if (data.status) setTripStatus(data.status);
      }
    };

    // B. Connect Chat Socket
    const roomName = `ride_${trip.ride_details.id}`;
    const chatSocket = getChatSocket(roomName);
    chatSocketRef.current = chatSocket;

    chatSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            sender_username: data.sender_username,
            content: data.content,
            timestamp: data.timestamp
          }
        ]);
        setTypingUser(null);
      } else if (data.type === 'typing') {
        if (data.sender_username !== user?.username) {
          setTypingUser(data.is_typing ? data.sender_username : null);
        }
      }
    };

    return () => {
      closeSocket(wsUrl);
      closeSocket(`/ws/chat/${roomName}/`);
    };
  }, [trip]);

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicators
  const handleChatFocus = (isTyping: boolean) => {
    if (chatSocketRef.current && chatSocketRef.current.readyState === WebSocket.OPEN) {
      chatSocketRef.current.send(JSON.stringify({
        type: 'typing',
        sender_username: user?.username,
        is_typing: isTyping
      }));
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatSocketRef.current || !user || !trip) return;

    chatSocketRef.current.send(JSON.stringify({
      type: 'message',
      sender_id: user.id,
      content: chatInput,
      ride_id: trip.ride_details.id
    }));

    setChatInput('');
    handleChatFocus(false);
  };

  // Driver Simulated Coordinate Movement
  const handleSimulateGPS = () => {
    if (!trip || !tripSocketRef.current) return;

    // Shift coordinates 10% closer to the destination
    const destLatVal = parseFloat(trip.ride_details.destination_latitude);
    const destLngVal = parseFloat(trip.ride_details.destination_longitude);

    if (driverLat && driverLng) {
      const nextLat = driverLat + (destLatVal - driverLat) * 0.15;
      const nextLng = driverLng + (destLngVal - driverLng) * 0.15;
      const nextEta = Math.max(0, (eta || 15) - 2);
      const nextDist = distance + 1.8;

      let nextStatus = tripStatus;
      if (tripStatus === 'started') nextStatus = 'in_progress';

      tripSocketRef.current.send(JSON.stringify({
        latitude: nextLat,
        longitude: nextLng,
        eta_minutes: nextEta,
        distance_covered: nextDist,
        status: nextStatus
      }));
    }
  };

  const handleStartCommute = async () => {
    try {
      await api.post(`/trips/${tripId}/start/`);
      setTripStatus('started');
      // Broadcast initial start status
      tripSocketRef.current?.send(JSON.stringify({
        status: 'started'
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to start commute.");
    }
  };

  const handleEndCommute = async () => {
    try {
      await api.post(`/trips/${tripId}/end/`);
      setTripStatus('completed');
      tripSocketRef.current?.send(JSON.stringify({
        status: 'completed'
      }));
      alert("Trip completed successfully! Wallet earnings are distributed.");
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert("Failed to terminate commute.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <AlertTriangle size={32} className="mx-auto text-destructive mb-3" />
        <p>{error || "Commute context not initialized."}</p>
      </div>
    );
  }

  const pickupLatVal = parseFloat(trip.ride_details.pickup_latitude);
  const pickupLngVal = parseFloat(trip.ride_details.pickup_longitude);
  const destLatVal = parseFloat(trip.ride_details.destination_latitude);
  const destLngVal = parseFloat(trip.ride_details.destination_longitude);

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT PANEL: LIVE OSM MAP */}
      <div className="flex-1 h-3/5 lg:h-full relative overflow-hidden">
        
        {/* Real-time Status Card overlay */}
        <div className="absolute top-4 left-4 right-4 bg-card/95 border border-border shadow-xl rounded-2xl p-4 z-[1000] flex flex-wrap gap-4 items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl animate-pulse">
              <Navigation size={18} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Live tracking status</span>
              <h4 className="font-bold text-sm leading-tight capitalize">{tripStatus.replace('_', ' ')}</h4>
            </div>
          </div>

          <div className="flex space-x-6 text-center text-xs">
            <div>
              <p className="text-muted-foreground font-semibold">ETA</p>
              <p className="font-bold text-foreground mt-0.5">{eta !== null && eta > 0 ? `${eta} mins` : 'Arrived'}</p>
            </div>
            <div>
              <p className="text-muted-foreground font-semibold">Shared Mileage</p>
              <p className="font-bold text-foreground mt-0.5">{distance.toFixed(1)} km</p>
            </div>
          </div>

          {/* Driver Controls */}
          {isDriver && (
            <div className="flex space-x-2 w-full sm:w-auto">
              {tripStatus === 'booked' && (
                <button
                  onClick={handleStartCommute}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow-md transition-all"
                >
                  Start Trip
                </button>
              )}
              {(tripStatus === 'started' || tripStatus === 'in_progress') && (
                <>
                  <button
                    onClick={handleSimulateGPS}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-card border border-border hover:bg-muted text-foreground font-bold rounded-xl text-xs transition-all"
                  >
                    Simulate Coordinate Move
                  </button>
                  <button
                    onClick={handleEndCommute}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    End Trip
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* OSM Map Container */}
        <MapContainer
          center={[pickupLatVal, pickupLngVal]}
          zoom={13}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Pickup Marker */}
          <Marker position={[pickupLatVal, pickupLngVal]} icon={pickupIcon} />
          
          {/* Destination Marker */}
          <Marker position={[destLatVal, destLngVal]} icon={destIcon} />
          
          {/* Driver Live Marker (Defaults to pickup lat/lng initially) */}
          {driverLat && driverLng && (
            <Marker position={[driverLat, driverLng]} icon={driverIcon} />
          )}

          {/* Polyline Route */}
          {driverLat && driverLng && (
            <Polyline
              positions={[[driverLat, driverLng], [destLatVal, destLngVal]]}
              color="hsl(var(--primary))"
              weight={4}
            />
          )}
        </MapContainer>
      </div>

      {/* RIGHT PANEL: REAL-TIME CHAT PANEL */}
      <div className="w-full lg:w-96 h-2/5 lg:h-full border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col flex-shrink-0">
        
        {/* Chat Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <MessageSquare size={16} className="text-primary" />
            <h3 className="font-bold text-sm">Commute Chat Console</h3>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            Trip ID: {tripId}
          </span>
        </div>

        {/* Message Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((msg) => {
            const isMe = msg.sender_username === user?.username;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-muted-foreground px-1.5 mb-0.5">{msg.sender_username}</span>
                <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted text-foreground rounded-tl-none border border-border'
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {typingUser && (
            <div className="text-[10px] text-muted-foreground italic px-2 animate-pulse-slow">
              {typingUser} is typing...
            </div>
          )}
          <div ref={chatEndRef}></div>
        </div>

        {/* Input area */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex items-center space-x-2 flex-shrink-0">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onFocus={() => handleChatFocus(true)}
            onBlur={() => handleChatFocus(false)}
            placeholder="Type message to driver/passengers..."
            className="flex-1 bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2 text-xs transition-all outline-none"
          />
          <button
            type="submit"
            className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all shadow-md"
          >
            <Send size={14} />
          </button>
        </form>

      </div>
    </div>
  );
};
export default TripTracking;
