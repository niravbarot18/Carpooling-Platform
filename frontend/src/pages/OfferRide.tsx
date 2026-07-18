import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  PlusCircle, Car, MapPin, Navigation, Calendar, Users, 
  DollarSign, BarChart3, AlertCircle, Info, Sparkles, CheckCircle 
} from 'lucide-react';
import api from '../services/api';

const POPULAR_LOCATIONS = [
  { name: "Main Office HQ (Electronic City)", lat: 12.8406, lng: 77.6753 },
  { name: "South Hub (HSR Layout)", lat: 12.9116, lng: 77.6388 },
  { name: "North Office (Manyata Tech Park)", lat: 13.0408, lng: 77.6244 },
  { name: "West Hub (Koramangala)", lat: 12.9352, lng: 77.6244 },
  { name: "Transit Hub (Indiranagar Metro)", lat: 12.9719, lng: 77.6412 }
];

// SVG markers for maps
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

// Haversine calculator for frontend coordinate distance estimate
const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371.0;
  const dlat = (lat2 - lat1) * Math.PI / 180;
  const dlon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dlon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const OfferRide: React.FC = () => {
  const navigate = useNavigate();

  // Form inputs
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [fromLoc, setFromLoc] = useState('');
  const [toLoc, setToLoc] = useState('');
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(150);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Coordinates
  const [pickupCoord, setPickupCoord] = useState<[number, number] | null>(null);
  const [destCoord, setDestCoord] = useState<[number, number] | null>(null);
  const [distance, setDistance] = useState(0.0);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    // Update coordinates when selections change
    const fromObj = POPULAR_LOCATIONS.find(l => l.name === fromLoc);
    const toObj = POPULAR_LOCATIONS.find(l => l.name === toLoc);

    if (fromObj) {
      setPickupCoord([fromObj.lat, fromObj.lng]);
    } else {
      setPickupCoord(null);
    }

    if (toObj) {
      setDestCoord([toObj.lat, toObj.lng]);
    } else {
      setDestCoord(null);
    }

    if (fromObj && toObj) {
      const dist = calculateHaversine(fromObj.lat, fromObj.lng, toObj.lat, toObj.lng);
      // Add a slight multiplier of 1.25 to reflect actual road routing deviation
      setDistance(Math.round(dist * 1.25 * 10) / 10);
    } else {
      setDistance(0.0);
    }
  }, [fromLoc, toLoc]);

  const fetchVehicles = async () => {
    try {
      const response = await api.get('vehicles/');
      const data = response.data.results || response.data;
      setVehicles(data);
      if (data.length > 0) {
        // Auto-select default or first vehicle
        const defaultVehicle = data.find((v: any) => v.is_default);
        setSelectedVehicle(defaultVehicle ? defaultVehicle.id.toString() : data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!selectedVehicle) {
      setError('Please register a corporate vehicle under the Vehicles tab before offering a ride.');
      setLoading(false);
      return;
    }

    if (fromLoc === toLoc) {
      setError('Pickup and destination hubs cannot be the same.');
      setLoading(false);
      return;
    }

    // Build coordinates array path to store in polyline
    const routePath = JSON.stringify([
      { lat: pickupCoord?.[0], lng: pickupCoord?.[1] },
      { lat: destCoord?.[0], lng: destCoord?.[1] }
    ]);

    try {
      await api.post('rides/', {
        vehicle_id: parseInt(selectedVehicle),
        start_address: fromLoc,
        start_lat: pickupCoord?.[0],
        start_lng: pickupCoord?.[1],
        end_address: toLoc,
        end_lat: destCoord?.[0],
        end_lng: destCoord?.[1],
        route_polyline: routePath,
        departure_time: date ? new Date(date).toISOString() : date,
        total_seats: seats,
        price_per_seat: price,
        estimated_distance: distance,
        estimated_duration: Math.round(distance * 2) // approx 2 mins per km
      });

      setSuccess('Commute ride published successfully! Your route is now live for bookings.');
      setTimeout(() => {
        navigate('/my-trips');
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.error || 
        err.response?.data?.non_field_errors?.[0] || 
        'Unable to publish ride. Please check fields and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Environmental impact estimations
  const co2Estimate = Math.round(distance * 0.12 * (seats - 1) * 10) / 10;
  const fuelEstimate = Math.round(distance * 0.08 * (seats - 1) * 10) / 10;
  const earningsEstimate = price * seats;

  // Center coordinate for map (default to Bangalore center)
  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const mapCenter: [number, number] = pickupCoord || defaultCenter;

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Offer a Ride</h1>
        <p className="text-xs text-gray-400 mt-1">
          Share your commute with colleagues and receive carbon credits rewards.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-emerald-700 text-xs">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Form Panel */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Vehicle Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Vehicle</label>
              {vehicles.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center text-xs text-gray-500">
                  No vehicles registered.{' '}
                  <Link to="/vehicles" className="text-emerald-600 font-semibold underline">
                    Add vehicle now
                  </Link>
                </div>
              ) : (
                <select
                  required
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="premium-input text-xs"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.registration_number}) - Capacity: {v.capacity}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Pickup & Destination select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Pickup Hub</label>
                <select
                  required
                  value={fromLoc}
                  onChange={(e) => setFromLoc(e.target.value)}
                  className="premium-input text-xs"
                >
                  <option value="">Choose pickup hub...</option>
                  {POPULAR_LOCATIONS.map(l => (
                    <option key={l.name} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Destination Hub</label>
                <select
                  required
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  className="premium-input text-xs"
                >
                  <option value="">Choose destination hub...</option>
                  {POPULAR_LOCATIONS.map(l => (
                    <option key={l.name} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Time Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Departure Date & Time</label>
              <input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="premium-input text-xs"
              />
            </div>

            {/* Seats & Fare */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Available Passenger Seats</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  required
                  value={seats}
                  onChange={(e) => setSeats(parseInt(e.target.value))}
                  className="premium-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Price Per Seat (₹)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={price}
                  onChange={(e) => setPrice(parseInt(e.target.value))}
                  className="premium-input text-xs"
                />
              </div>
            </div>

            {/* Simulated Estimations Box */}
            {distance > 0 && (
              <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Commute Projections</span>
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">Distance</span>
                    <span className="text-sm font-bold text-gray-700">{distance} km</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">CO₂ Saved</span>
                    <span className="text-sm font-bold text-emerald-600">{co2Estimate} kg</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">Fuel Saved</span>
                    <span className="text-sm font-bold text-blue-600">{fuelEstimate} L</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">Max Earnings</span>
                    <span className="text-sm font-bold text-gray-800">₹{earningsEstimate}</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || vehicles.length === 0}
              className="w-full premium-btn-primary font-semibold text-xs mt-4 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Publish Carpool Offer</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Map Preview Panel */}
        <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm h-[480px] overflow-hidden flex flex-col justify-between">
          <div className="flex-1 w-full relative rounded-2xl overflow-hidden mb-4">
            <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {pickupCoord && (
                <Marker position={pickupCoord} icon={startIcon}>
                  <Popup><span className="text-xs">Start: {fromLoc}</span></Popup>
                </Marker>
              )}

              {destCoord && (
                <Marker position={destCoord} icon={endIcon}>
                  <Popup><span className="text-xs">End: {toLoc}</span></Popup>
                </Marker>
              )}

              {pickupCoord && destCoord && (
                <Polyline positions={[pickupCoord, destCoord]} color="#10b981" weight={3} />
              )}
            </MapContainer>
          </div>
          <div className="text-[10px] text-gray-400 flex items-start gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              The preview route shows the direct line mapping between selected hubs. 
              The matching algorithm scans coordinate ranges to verify detour paths.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
