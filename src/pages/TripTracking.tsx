import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Send, AlertTriangle, Phone, PhoneOff, Volume2, Pause } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Message {
  id: number;
  sender_username: string;
  content: string;
  timestamp: string;
}

// Markers DivIcons using SVG drop pins with map markers shape and shadow
const driverIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 36px; height: 36px; transform: translate(-10px, -18px);">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.4));">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#1de9b6" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  className: 'custom-driver-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 36]
});

const destIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px; transform: translate(-9px, -28px);">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#ff4081" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  className: 'custom-dest-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const pickupIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px; transform: translate(-9px, -28px);">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#1de9b6" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  className: 'custom-pickup-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
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

  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState<boolean>(!!(window as any).google);
  const [totalDistance, setTotalDistance] = useState<number>(12.5); // Fallback km
  const [totalDuration, setTotalDuration] = useState<number>(900); // Fallback secs (15 mins)
  const simulationIntervalRef = useRef<any>(null);

  // Voice Call States
  const [activeTab, setActiveTab] = useState<'chat' | 'call'>('chat');
  const [callState, setCallState] = useState<'idle' | 'confirming' | 'calling' | 'active'>('idle');
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isHold, setIsHold] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<any>(null);

  // Dynamic Google Maps Script Loader
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    if (apiKey && !document.getElementById('google-maps-api-script') && !(window as any).google) {
      const script = document.createElement('script');
      script.id = 'google-maps-api-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
      script.addEventListener('load', () => setGoogleScriptLoaded(true));
    } else if ((window as any).google) {
      setGoogleScriptLoaded(true);
    }
  }, []);

  // Encoded Polyline Decoder
  const decodePolyline = (encoded: string): [number, number][] => {
    const points: [number, number][] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push([lat / 1e5, lng / 1e5]);
    }
    return points;
  };

  // Find closest path index for progress percentage
  const findClosestIndex = (lat: number, lng: number, path: [number, number][]): number => {
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < path.length; i++) {
      const dist = Math.pow(path[i][0] - lat, 2) + Math.pow(path[i][1] - lng, 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    return closestIndex;
  };

  // Google Maps Directions Service with OSRM Fallback Real By-Road Routing Fetcher
  useEffect(() => {
    if (trip) {
      const fetchRoute = async () => {
        const pickupLatVal = parseFloat(trip.ride_details.pickup_latitude);
        const pickupLngVal = parseFloat(trip.ride_details.pickup_longitude);
        const destLatVal = parseFloat(trip.ride_details.destination_latitude);
        const destLngVal = parseFloat(trip.ride_details.destination_longitude);

        // Try Google Directions Service if Google script is loaded
        if (googleScriptLoaded && (window as any).google) {
          try {
            const directionsService = new (window as any).google.maps.DirectionsService();
            directionsService.route({
              origin: new (window as any).google.maps.LatLng(pickupLatVal, pickupLngVal),
              destination: new (window as any).google.maps.LatLng(destLatVal, destLngVal),
              travelMode: (window as any).google.maps.TravelMode.DRIVING
            }, async (result: any, status: any) => {
              if (status === (window as any).google.maps.DirectionsStatus.OK && result && result.routes[0]) {
                const encodedPolyline = result.routes[0].overview_polyline;
                const coords = decodePolyline(encodedPolyline);
                setRoutePath(coords);
                if (result.routes[0].legs[0]) {
                  setTotalDistance(result.routes[0].legs[0].distance.value / 1000); // km
                  setTotalDuration(result.routes[0].legs[0].duration.value); // secs
                }
              } else {
                console.warn("Google Directions failed, trying OSRM fallback:", status);
                await fetchOSRMRoute(pickupLatVal, pickupLngVal, destLatVal, destLngVal);
              }
            });
            return;
          } catch (err) {
            console.error("Google Directions error, trying OSRM fallback:", err);
          }
        }

        // Run OSRM directly if Google script is not ready or failed
        await fetchOSRMRoute(pickupLatVal, pickupLngVal, destLatVal, destLngVal);
      };

      const fetchOSRMRoute = async (pickupLatVal: number, pickupLngVal: number, destLatVal: number, destLngVal: number) => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickupLngVal},${pickupLatVal};${destLngVal},${destLatVal}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setRoutePath(coords);
            setTotalDistance(data.routes[0].distance / 1000); // km
            setTotalDuration(data.routes[0].duration); // secs
          } else {
            setRoutePath([[pickupLatVal, pickupLngVal], [destLatVal, destLngVal]]);
          }
        } catch (err) {
          console.error("OSRM fallback failed, drawing straight line:", err);
          setRoutePath([[pickupLatVal, pickupLngVal], [destLatVal, destLngVal]]);
        }
      };

      fetchRoute();
    } else {
      setRoutePath([]);
    }
  }, [trip, googleScriptLoaded]);

  // Compute reactive progress percentage along the path
  useEffect(() => {
    if (driverLat && driverLng && routePath.length > 0) {
      const idx = findClosestIndex(driverLat, driverLng, routePath);
      setProgress(Math.round((idx / (routePath.length - 1 || 1)) * 100));
    }
  }, [driverLat, driverLng, routePath]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, []);

  // Format call duration MM:SS
  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Recenter Map Helper Component
  const RecenterMap = () => {
    const map = useMap();
    useEffect(() => {
      if (trip) {
        const pickupLatVal = parseFloat(trip.ride_details.pickup_latitude);
        const pickupLngVal = parseFloat(trip.ride_details.pickup_longitude);
        const destLatVal = parseFloat(trip.ride_details.destination_latitude);
        const destLngVal = parseFloat(trip.ride_details.destination_longitude);

        map.fitBounds([
          [pickupLatVal, pickupLngVal],
          [destLatVal, destLngVal]
        ], { padding: [50, 50] });
      }
    }, [map]);
    return null;
  };

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

  const handleStartCommute = async () => {
    try {
      await api.post(`/trips/${tripId}/start/`);
      setTripStatus('started');
      tripSocketRef.current?.send(JSON.stringify({
        status: 'started'
      }));

      // Start automatic step simulation if path coordinates are loaded
      if (routePath.length > 0) {
        let index = 0;
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
        }

        simulationIntervalRef.current = setInterval(() => {
          if (index >= routePath.length) {
            clearInterval(simulationIntervalRef.current);
            simulationIntervalRef.current = null;
            handleEndCommute();
            return;
          }

          const [lat, lng] = routePath[index];
          const fraction = 1 - (index / (routePath.length - 1 || 1));
          const distanceCovered = (index / (routePath.length - 1 || 1)) * totalDistance;
          const remainingEtaMinutes = Math.max(0, Math.round((fraction * totalDuration) / 60));

          let nextStatus = 'in_progress';
          if (index === routePath.length - 1) {
            nextStatus = 'completed';
          }

          if (tripSocketRef.current && tripSocketRef.current.readyState === WebSocket.OPEN) {
            tripSocketRef.current.send(JSON.stringify({
              latitude: lat,
              longitude: lng,
              eta_minutes: remainingEtaMinutes,
              distance_covered: Number(distanceCovered.toFixed(2)),
              status: nextStatus
            }));
          }

          index++;
        }, 2000); // 2-second simulation tick rate
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start commute.");
    }
  };

  const handleEndCommute = async () => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }

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
        <div className="absolute top-4 left-4 right-4 bg-card/95 border border-border shadow-xl rounded-2xl p-4 z-[1000] flex flex-col space-y-3 pointer-events-auto">
          <div className="flex flex-wrap gap-4 items-center justify-between">
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
                  <button
                    onClick={handleEndCommute}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                  >
                    End Trip
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Journey Progress Bar */}
          {tripStatus !== 'booked' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                <span>Journey Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
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
          <RecenterMap />
          {/* Pickup Marker */}
          <Marker position={[pickupLatVal, pickupLngVal]} icon={pickupIcon} />

          {/* Destination Marker */}
          <Marker position={[destLatVal, destLngVal]} icon={destIcon} />

          {/* Driver Live Marker (Defaults to pickup lat/lng initially) */}
          {driverLat && driverLng && (
            <Marker position={[driverLat, driverLng]} icon={driverIcon} />
          )}

          {/* Polyline Route */}
          {routePath.length > 0 && (
            <Polyline
              positions={routePath}
              color="hsl(var(--primary))"
              weight={5}
            />
          )}
        </MapContainer>
      </div>

      {/* RIGHT PANEL: REAL-TIME CONSOLE WITH TABS */}
      <div className="w-full lg:w-96 h-2/5 lg:h-full border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col flex-shrink-0">

        {/* Tab Headers */}
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/20 flex-shrink-0">
          <div className="flex space-x-1 bg-muted/50 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${activeTab === 'chat'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Chat Console
            </button>
            <button
              onClick={() => setActiveTab('call')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center space-x-1 ${activeTab === 'call'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Phone size={10} />
              <span>Voice Call</span>
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            Trip ID: {tripId}
          </span>
        </div>

        {/* Tab Content Panels */}
        {activeTab === 'chat' ? (
          <>
            {/* Message Logs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {messages.map((msg) => {
                const isMe = msg.sender_username === user?.username;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-muted-foreground px-1.5 mb-0.5">{msg.sender_username}</span>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${isMe
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
          </>
        ) : (
          /* Simulated calling screen console */
          <div className="flex-1 flex flex-col justify-between p-6 bg-card min-h-0">

            {callState === 'idle' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse-slow">
                  <Phone size={36} />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-foreground">VoIP Voice Call Client</h4>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Initiate a secure, simulated high-quality voice call with the {isDriver ? 'passengers' : 'driver'} of this trip.
                  </p>
                </div>
                <button
                  onClick={() => setCallState('confirming')}
                  className="px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold rounded-xl text-xs shadow-md transition-all outline-none"
                >
                  Call {isDriver ? 'Passenger' : 'Driver'}
                </button>
              </div>
            )}

            {callState === 'confirming' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse">
                  <Phone size={36} />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-foreground font-semibold">Confirm Outbound Call</h4>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Are you sure you want to dial {isDriver ? 'Passenger' : trip.ride_details.driver_details?.username || 'Driver'}?
                  </p>
                </div>
                <div className="flex space-x-3 w-full max-w-[200px]">
                  <button
                    onClick={() => {
                      setCallState('calling');
                      // Transition to active call after 1.5 seconds connecting simulation
                      setTimeout(() => {
                        setCallState('active');
                        setCallDuration(0);
                        if (callTimerRef.current) clearInterval(callTimerRef.current);
                        callTimerRef.current = setInterval(() => {
                          setCallDuration((prev) => prev + 1);
                        }, 1000);
                      }, 1500);
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-sm transition-all outline-none"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setCallState('idle')}
                    className="flex-1 py-2 bg-card border border-border hover:bg-muted text-foreground font-semibold rounded-xl text-xs transition-all outline-none"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {(callState === 'calling' || callState === 'active') && (
              <div className="flex-1 flex flex-col items-center justify-between py-6">
                {/* Call Details */}
                <div className="text-center space-y-3 mt-4">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg border border-primary/30">
                      {(isDriver ? 'Passenger' : trip.ride_details.driver_details?.username || 'Driver').slice(0, 2).toUpperCase()}
                    </div>
                    {callState === 'active' && (
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card animate-pulse"></span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-foreground">
                      {isDriver ? 'Passenger' : trip.ride_details.driver_details?.username || 'Driver'}
                    </h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      {callState === 'calling' ? 'Connecting secure link...' : 'Call Active'}
                    </p>
                  </div>
                  {callState === 'active' && (
                    <div className="text-sm font-mono font-bold text-primary animate-pulse-slow">
                      {formatCallTime(callDuration)}
                    </div>
                  )}
                </div>

                {/* Sound Wave Animation Visualizer */}
                {callState === 'active' && !isHold && (
                  <div className="flex items-center space-x-1 justify-center my-4 h-8">
                    <span className="w-1 bg-primary/80 rounded-full animate-bounce h-5" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-1 bg-primary/80 rounded-full animate-bounce h-8" style={{ animationDelay: '0.3s' }}></span>
                    <span className="w-1 bg-primary/80 rounded-full animate-bounce h-4" style={{ animationDelay: '0.5s' }}></span>
                    <span className="w-1 bg-primary/80 rounded-full animate-bounce h-7" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1 bg-primary/80 rounded-full animate-bounce h-5" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                )}

                {/* Hold Screen Indicator */}
                {callState === 'active' && isHold && (
                  <div className="text-[10px] text-amber-500 font-semibold tracking-wider animate-pulse-slow uppercase my-4">
                    Call Placed on Hold
                  </div>
                )}

                {/* Interaction Panel */}
                <div className="w-full space-y-6">
                  <div className="grid grid-cols-3 gap-4 justify-items-center px-4">
                    {/* Speaker Button */}
                    <div className="flex flex-col items-center space-y-1.5">
                      <button
                        onClick={() => setIsSpeaker(!isSpeaker)}
                        disabled={callState === 'calling'}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all outline-none ${isSpeaker
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          } ${callState === 'calling' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <Volume2 size={16} />
                      </button>
                      <span className="text-[9px] font-semibold text-muted-foreground">Speaker</span>
                    </div>

                    {/* Hold Button */}
                    <div className="flex flex-col items-center space-y-1.5">
                      <button
                        onClick={() => setIsHold(!isHold)}
                        disabled={callState === 'calling'}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all outline-none ${isHold
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          } ${callState === 'calling' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <Pause size={16} />
                      </button>
                      <span className="text-[9px] font-semibold text-muted-foreground">Hold</span>
                    </div>

                    {/* Record Button */}
                    <div className="flex flex-col items-center space-y-1.5">
                      <button
                        onClick={() => setIsRecording(!isRecording)}
                        disabled={callState === 'calling'}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all outline-none ${isRecording
                          ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          } ${callState === 'calling' ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        {isRecording ? (
                          <span className="w-3 h-3 rounded-sm bg-white animate-pulse"></span>
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        )}
                      </button>
                      <span className="text-[9px] font-semibold text-muted-foreground">
                        {isRecording ? 'Recording...' : 'Record'}
                      </span>
                    </div>
                  </div>

                  {/* Hang Up Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        if (callTimerRef.current) {
                          clearInterval(callTimerRef.current);
                          callTimerRef.current = null;
                        }
                        setCallState('idle');
                        setCallDuration(0);
                        setIsSpeaker(false);
                        setIsHold(false);
                        setIsRecording(false);
                      }}
                      className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all outline-none"
                    >
                      <PhoneOff size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
export default TripTracking;
