import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Car, Clock, Calendar, Users, DollarSign, MapPin, AlertCircle, HelpCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Vehicle {
  id: number;
  name: string;
  registration_number: string;
  seat_capacity: number;
}

// Custom Leaflet Icons using inline SVGs to avoid Vite asset issues
const pickupIcon = L.divIcon({
  html: `<div style="background-color: #10b981; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
  className: 'custom-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const destIcon = L.divIcon({
  html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
  className: 'custom-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

export const OfferRide: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleSelected, setVehicleSelected] = useState('');
  const [pickup, setPickup] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  
  const [destination, setDestination] = useState('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);

  const [travelDate, setTravelDate] = useState('');
  const [travelTime, setTravelTime] = useState('');
  const [seats, setSeats] = useState('3');
  const [fare, setFare] = useState('5.00');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await api.get('/vehicles/');
        const list = res.data.results || res.data;
        setVehicles(list);
        if (list.length > 0) {
          setVehicleSelected(list[0].id.toString());
        }
      } catch (err) {
        console.error("Error loading vehicles:", err);
      }
    };
    fetchVehicles();
  }, []);

  // Map Click Handler Component
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (!pickupLat || !pickupLng) {
          setPickupLat(e.latlng.lat);
          setPickupLng(e.latlng.lng);
          if (!pickup) setPickup(`Map Spot (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`);
        } else if (!destLat || !destLng) {
          setDestLat(e.latlng.lat);
          setDestLng(e.latlng.lng);
          if (!destination) setDestination(`Map Spot (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`);
        }
      }
    });
    return null;
  };

  const handleClearMap = () => {
    setPickupLat(null);
    setPickupLng(null);
    setDestLat(null);
    setDestLng(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      setError("Please set both Pickup and Destination spots on the map.");
      setLoading(false);
      return;
    }

    if (!vehicleSelected) {
      setError("Please select a vehicle. If you don't have one registered, go to the Vehicles tab first.");
      setLoading(false);
      return;
    }

    const payload = {
      vehicle: Number(vehicleSelected),
      pickup_location: pickup,
      pickup_latitude: pickupLat,
      pickup_longitude: pickupLng,
      destination_location: destination,
      destination_latitude: destLat,
      destination_longitude: destLng,
      travel_date: travelDate,
      travel_time: travelTime,
      available_seats: Number(seats),
      fare_per_seat: Number(fare),
    };

    try {
      await api.post('/rides/', payload);
      setSuccess(true);
      setTimeout(() => {
        navigate('/my-trips');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data ? JSON.stringify(err.response.data) : "Failed to publish ride."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Offer a Ride</h2>
        <p className="text-muted-foreground text-sm">
          Set up a route, publish available seats, and split commute costs with coworkers.
        </p>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl p-8 flex flex-col items-center text-center space-y-4 max-w-lg mx-auto">
          <AlertCircle size={40} className="text-amber-500" />
          <h3 className="font-bold text-lg">No Vehicle Registered</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            To publish a ride offering, you must first register your vehicle so coworkers can view car capacities and color info.
          </p>
          <Link
            to="/vehicles"
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-all"
          >
            Add a Vehicle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Form Side */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
            
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl p-4 font-semibold text-center">
                Ride published successfully! Redirecting...
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-4 flex items-start space-x-3">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                  <Car size={14} />
                  <span>Choose Vehicle</span>
                </label>
                <select
                  value={vehicleSelected}
                  onChange={(e) => setVehicleSelected(e.target.value)}
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.registration_number}) - Capacity {v.seat_capacity} Seats
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pickup Address
                  </label>
                  <input
                    type="text"
                    required
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="e.g. Metro Station Gate 3"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Destination Address
                  </label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Alpha Office Block"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                    <Calendar size={14} />
                    <span>Travel Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                    <Clock size={14} />
                    <span>Travel Time</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={travelTime}
                    onChange={(e) => setTravelTime(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                    <Users size={14} />
                    <span>Available Seats</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                    <DollarSign size={14} />
                    <span>Fare Per Seat ($)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.50"
                    value={fare}
                    onChange={(e) => setFare(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
                ) : (
                  <span>Publish Ride Offering</span>
                )}
              </button>
            </form>
          </div>

          {/* Map Side */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden h-[450px] flex flex-col relative">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin size={14} className="text-primary" />
                <span>Map Route Preview</span>
              </span>
              <button
                onClick={handleClearMap}
                className="text-xs text-destructive hover:underline font-semibold"
              >
                Reset Route Markers
              </button>
            </div>
            
            {/* Guide Text */}
            <div className="absolute top-14 left-4 right-4 bg-background/95 border border-border shadow-md rounded-xl p-3 z-[1000] text-xs pointer-events-none">
              <p className="font-semibold flex items-center space-x-1.5">
                <HelpCircle size={14} className="text-primary" />
                <span>How to set route coordinates:</span>
              </p>
              <ul className="list-disc pl-4 mt-1.5 space-y-0.5 text-muted-foreground">
                <li>Click 1st spot on map to drop **Pickup** Marker (Green)</li>
                <li>Click 2nd spot to drop **Destination** Marker (Red)</li>
              </ul>
            </div>

            <div className="flex-1 w-full relative">
              <MapContainer
                center={[12.9716, 77.5946]} // Default Bangalore coordinates
                zoom={12}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEvents />
                {pickupLat && pickupLng && (
                  <Marker position={[pickupLat, pickupLng]} icon={pickupIcon} />
                )}
                {destLat && destLng && (
                  <Marker position={[destLat, destLng]} icon={destIcon} />
                )}
                {pickupLat && pickupLng && destLat && destLng && (
                  <Polyline
                    positions={[[pickupLat, pickupLng], [destLat, destLng]]}
                    color="hsl(var(--primary))"
                    dashArray="6, 6"
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
