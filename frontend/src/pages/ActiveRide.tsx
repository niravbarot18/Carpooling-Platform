import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  Play, StopCircle, MapPin, Navigation, Clock, ShieldCheck, 
  MessageSquare, AlertCircle, Compass, Users, Sparkles 
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';

// Map markers
const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverCarIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Haversine calculator for distance tracking
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371.0;
  const dlat = (lat2 - lat1) * Math.PI / 180;
  const dlon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dlon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const ActiveRide: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // Trip details
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Real-time coordinates
  const [driverCoord, setDriverCoord] = useState<[number, number] | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(20);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(10.0);

  // Chat/status simulator state
  const [statusLog, setStatusLog] = useState<string[]>([
    "System: WebSocket session connected.",
    "System: Trip route scheduled."
  ]);
  const [customMsg, setCustomMsg] = useState('');

  // Watch position geolocation hook reference
  const geoWatchRef = useRef<number | null>(null);

  // WebSocket hook
  const { isConnected, messages: wsMessages, sendJson } = useSocket(`/ws/trips/${tripId}/`);

  useEffect(() => {
    fetchTripDetails();
    return () => {
      // Clear geo watch on unmount
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
    };
  }, [tripId]);

  // Handle incoming live location and custom status updates
  useEffect(() => {
    if (wsMessages.length > 0) {
      const lastMsg = wsMessages[wsMessages.length - 1];
      
      if (lastMsg.type === 'location_update') {
        setDriverCoord([lastMsg.lat, lastMsg.lng]);
        
        // Update ETA and remaining distance
        if (trip) {
          const dist = calculateDistance(lastMsg.lat, lastMsg.lng, trip.ride_details.end_lat, trip.ride_details.end_lng);
          setDistanceRemaining(Math.round(dist * 10) / 10);
          setEtaMinutes(Math.max(1, Math.round(dist * 2.5))); // 2.5 mins per km in corporate areas
        }
      } else if (lastMsg.type === 'chat_message') {
        setStatusLog(prev => [...prev, `${lastMsg.sender}: ${lastMsg.message}`]);
      }
    }
  }, [wsMessages, trip]);

  // Hook driver geolocation tracking
  useEffect(() => {
    if (!trip || !isConnected) return;

    const isDriver = trip.ride_details.driver.id === user?.id;
    if (isDriver && navigator.geolocation) {
      console.log("Driver session active. Hooking browser Geolocation GPS...");
      
      // Seed default position first
      sendJson({
        type: 'location_update',
        lat: trip.ride_details.start_lat,
        lng: trip.ride_details.start_lng
      });
      setDriverCoord([trip.ride_details.start_lat, trip.ride_details.start_lng]);

      // Start watching coordinates
      geoWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          console.log(`GPS Location update: ${latitude}, ${longitude}`);
          sendJson({
            type: 'location_update',
            lat: latitude,
            lng: longitude
          });
        },
        (err) => {
          console.warn("Geolocation watch blocked. Simulating route progression...", err);
          // If Geolocation is blocked locally, run route simulator
          simulateGPSMovement();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [trip, isConnected]);

  // Simulated GPS movement fallback for local demonstration/testing
  const simulateGPSMovement = () => {
    if (!trip) return;
    let step = 0;
    const stepsCount = 10;
    const interval = setInterval(() => {
      if (step > stepsCount) {
        clearInterval(interval);
        return;
      }
      // Linearly interpolate between start and end coordinate points
      const ratio = step / stepsCount;
      const lat = trip.ride_details.start_lat + (trip.ride_details.end_lat - trip.ride_details.start_lat) * ratio;
      const lng = trip.ride_details.start_lng + (trip.ride_details.end_lng - trip.ride_details.start_lng) * ratio;
      
      sendJson({
        type: 'location_update',
        lat,
        lng
      });
      step++;
    }, 4000);
  };

  const fetchTripDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`trips/${tripId}/`);
      setTrip(response.data);
      // Initialize driver coordinate
      if (response.data.current_lat) {
        setDriverCoord([response.data.current_lat, response.data.current_lng]);
      } else {
        setDriverCoord([response.data.ride_details.start_lat, response.data.ride_details.start_lng]);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load active trip details.');
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    if (!window.confirm("Complete this commute? Drivers/passengers metrics will be updated.")) return;
    try {
      await api.post(`trips/${tripId}/end_trip/`);
      alert('Ride completed successfully! Carbon credit bonus credited to your wallet.');
      refreshProfile();
      navigate('/my-trips');
    } catch (err) {
      console.error(err);
      alert('Unable to complete trip.');
    }
  };

  const sendStatusUpdate = (message: string) => {
    if (!message.trim()) return;
    // Broadcast via WS
    sendJson({
      type: 'chat_message',
      sender: user?.first_name || user?.email.split('@')[0] || 'User',
      message
    });
    setCustomMsg('');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500 font-medium">Connecting route tracking...</span>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-xs text-red-700 max-w-md mx-auto mt-12">
        {error || 'Trip details not found.'}
      </div>
    );
  }

  const isDriver = trip.ride_details.driver.id === user?.id;
  const ride = trip.ride_details;
  const pickup: [number, number] = [ride.start_lat, ride.start_lng];
  const destination: [number, number] = [ride.end_lat, ride.end_lng];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-8 font-sans">
      {/* Sidebar - Controls & Status Logs */}
      <div className="w-full lg:w-[400px] flex flex-col h-full overflow-hidden flex-shrink-0 gap-4">
        
        {/* Status widget card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-400">ACTIVE COMMUTE</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100 animate-pulse">
              Ongoing
            </span>
          </div>

          {/* Map details summary */}
          <div className="grid grid-cols-2 gap-4 text-center border-t border-b border-gray-50 py-3.5">
            <div>
              <span className="block text-[10px] font-semibold text-gray-400 uppercase">Estimated ETA</span>
              <span className="text-xl font-bold text-gray-800 flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-4 h-4 text-blue-500" />
                {etaMinutes} min
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-semibold text-gray-400 uppercase">Remaining Dist</span>
              <span className="text-xl font-bold text-gray-800 flex items-center justify-center gap-1 mt-0.5">
                <Compass className="w-4 h-4 text-emerald-500" />
                {distanceRemaining} km
              </span>
            </div>
          </div>

          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400 font-medium">Driver:</span>
              <span className="font-semibold text-gray-700">{ride.driver.first_name || ride.driver.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 font-medium">Vehicle:</span>
              <span className="font-semibold text-gray-700">{ride.vehicle?.name} ({ride.vehicle?.registration_number})</span>
            </div>
          </div>

          {/* Complete ride button for drivers */}
          {isDriver && (
            <button
              onClick={handleEndTrip}
              className="w-full premium-btn-primary gap-2 text-xs font-semibold shadow-sm cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              <span>Complete Commute Journey</span>
            </button>
          )}
        </div>

        {/* Live Status chat box */}
        <div className="flex-1 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-50 pb-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-gray-800">Commute Status Log</h3>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-400 animate-ping'}`} />
          </div>

          {/* List log messages */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px] text-gray-600 py-2">
            {statusLog.map((log, idx) => (
              <div key={idx} className="p-2 bg-gray-50 border border-gray-50/50 rounded-xl leading-relaxed">
                {log}
              </div>
            ))}
          </div>

          {/* Custom quick template message shortcuts */}
          <div className="space-y-3 mt-4 pt-3 border-t border-gray-50">
            <div className="flex gap-1.5 flex-wrap">
              <button 
                onClick={() => sendStatusUpdate("I have arrived at the pickup hub.")}
                className="text-[9px] bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 px-2 py-1 rounded-lg border border-gray-100"
              >
                Arrived at Hub
              </button>
              <button 
                onClick={() => sendStatusUpdate("Stuck in minor traffic. Delay approx +5 mins.")}
                className="text-[9px] bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 px-2 py-1 rounded-lg border border-gray-100"
              >
                Traffic Delay
              </button>
              <button 
                onClick={() => sendStatusUpdate("Commute starting. Detouring toward drop-off point.")}
                className="text-[9px] bg-gray-50 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 px-2 py-1 rounded-lg border border-gray-100"
              >
                Departing Now
              </button>
            </div>

            {/* Input field */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Send a status update..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendStatusUpdate(customMsg)}
                className="premium-input h-9 text-xs rounded-xl flex-1"
              />
              <button
                onClick={() => sendStatusUpdate(customMsg)}
                className="premium-btn-primary h-9 px-4 text-xs font-semibold"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Map viewport */}
      <div className="flex-1 h-full bg-white border border-gray-100 rounded-3xl p-4 shadow-sm relative overflow-hidden">
        <MapContainer center={pickup} zoom={13} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Pickup Mark */}
          <Marker position={pickup} icon={startIcon}>
            <Popup><span className="text-xs">Pickup: {ride.start_address}</span></Popup>
          </Marker>

          {/* Drop-off Mark */}
          <Marker position={destination} icon={endIcon}>
            <Popup><span className="text-xs">Drop-off: {ride.end_address}</span></Popup>
          </Marker>

          {/* Route path */}
          <Polyline positions={[pickup, destination]} color="#3b82f6" weight={3} />

          {/* Live driver marker */}
          {driverCoord && (
            <Marker position={driverCoord} icon={driverCarIcon}>
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-semibold text-gray-700">Driver Current Location</p>
                  <p className="text-gray-400 mt-0.5">Speed: ~35 km/h</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};
