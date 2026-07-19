import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { MapPin, Calendar, Users, Search, AlertCircle, Sparkles, Star, ShieldCheck, CheckCircle, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Ride {
  id: number;
  driver_details: { id: number; username: string; phone_number: string };
  vehicle_details: { name: string; color: string; registration_number: string };
  pickup_location: string;
  destination_location: string;
  travel_date: string;
  travel_time: string;
  available_seats: number;
  fare_per_seat: string;
  recurring?: boolean;
  recurring_pattern?: string;
  pickup_latitude?: string | number;
  pickup_longitude?: string | number;
  destination_latitude?: string | number;
  destination_longitude?: string | number;
}

// Custom Leaflet Icons using SVG drop pins with map markers shape and shadow
const pickupIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px; transform: translate(-9px, -28px);">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#1de9b6" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  className: 'custom-marker-pickup',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
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
  className: 'custom-marker-dest',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

export const FindRide: React.FC = () => {
  const { user } = useAuth();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState('1');
  const [rideType, setRideType] = useState<'all' | 'one_time' | 'recurring'>('all');

  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);

  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  const showPickupLat = selectedRide ? parseFloat(selectedRide.pickup_latitude as any) : pickupLat;
  const showPickupLng = selectedRide ? parseFloat(selectedRide.pickup_longitude as any) : pickupLng;
  const showDestLat = selectedRide ? parseFloat(selectedRide.destination_latitude as any) : destLat;
  const showDestLng = selectedRide ? parseFloat(selectedRide.destination_longitude as any) : destLng;

  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null); // in seconds

  // Helper Haversine Distance Fallback
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Convert seconds into a human-readable duration format
  const formatDuration = (secs: number): string => {
    const mins = Math.round(secs / 60);
    if (mins < 1) return `${Math.round(secs)} secs`;
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
    return `${hrs} hr${hrs > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}`;
  };

  // OSRM Real By-Road Routing Fetcher
  useEffect(() => {
    if (showPickupLat && showPickupLng && showDestLat && showDestLng) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${showPickupLng},${showPickupLat};${showDestLng},${showDestLat}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setRoutePath(coords);
            setDistance(data.routes[0].distance / 1000); // Convert meters to km
            setDuration(data.routes[0].duration); // Set seconds
          } else {
            setRoutePath([[showPickupLat, showPickupLng], [showDestLat, showDestLng]]);
            const d = calculateHaversineDistance(showPickupLat, showPickupLng, showDestLat, showDestLng);
            setDistance(d);
            setDuration((d / 40) * 3600); // Approximate at 40 km/h average speed
          }
        } catch (err) {
          console.error("OSRM fetch failed, drawing straight line fallback:", err);
          setRoutePath([[showPickupLat, showPickupLng], [showDestLat, showDestLng]]);
          const d = calculateHaversineDistance(showPickupLat, showPickupLng, showDestLat, showDestLng);
          setDistance(d);
          setDuration((d / 40) * 3600);
        }
      };
      fetchRoute();
    } else {
      setRoutePath([]);
      setDistance(null);
      setDuration(null);
    }
  }, [showPickupLat, showPickupLng, showDestLat, showDestLng]);

  // Recenter Map Helper Component
  const RecenterMap = () => {
    const map = useMap();
    useEffect(() => {
      if (showPickupLat && showPickupLng && showDestLat && showDestLng) {
        map.fitBounds([
          [showPickupLat, showPickupLng],
          [showDestLat, showDestLng]
        ], { padding: [50, 50] });
      } else if (showPickupLat && showPickupLng) {
        map.setView([showPickupLat, showPickupLng], 14);
      } else if (showDestLat && showDestLng) {
        map.setView([showDestLat, showDestLng], 14);
      }
    }, [showPickupLat, showPickupLng, showDestLat, showDestLng, map]);
    return null;
  };

  // Geocoding Autocomplete States & Handlers
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    if (apiKey && !document.getElementById('google-maps-api-script') && !(window as any).google) {
      const script = document.createElement('script');
      script.id = 'google-maps-api-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const handlePickupChange = async (val: string) => {
    setPickup(val);
    if (val.length < 3) {
      setPickupSuggestions([]);
      return;
    }

    if ((window as any).google) {
      try {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: val }, (predictions: any[], status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPickupSuggestions(predictions.map((p: any) => ({
              display_name: p.description,
              place_id: p.place_id,
              is_google: true
            })));
          } else {
            setPickupSuggestions([]);
          }
        });
        return;
      } catch (err) {
        console.error("Google autocomplete predictions error, falling back:", err);
      }
    }

    // Fallback to Komoot Photon API
    try {
      const response = await fetch(`https://photon.komoot.io/api?q=${encodeURIComponent(val)}&limit=10`);
      const data = await response.json();
      const suggestions = (data.features || []).map((f: any) => {
        const props = f.properties;
        const streetDetails = [props.housenumber, props.street].filter(Boolean).join(' ');
        const parts = [
          streetDetails || null,
          props.district || props.suburb || null,
          props.city || null,
          props.state || null,
          props.country || null
        ].filter(Boolean) as string[];

        const name = props.name;
        if (name && !parts.includes(name) && !streetDetails.includes(name)) {
          parts.unshift(name);
        }

        return {
          display_name: parts.join(', '),
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          is_google: false
        };
      });
      setPickupSuggestions(suggestions);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectPickup = (item: any) => {
    setPickup(item.display_name);
    setPickupSuggestions([]);

    if (item.is_google && item.place_id && (window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ placeId: item.place_id }, (results: any[], status: any) => {
        if (status === (window as any).google.maps.GeocoderStatus.OK && results && results[0]) {
          const loc = results[0].geometry.location;
          setPickupLat(loc.lat());
          setPickupLng(loc.lng());
        }
      });
    } else {
      setPickupLat(item.lat);
      setPickupLng(item.lon);
    }
  };

  const handleDestChange = async (val: string) => {
    setDestination(val);
    if (val.length < 3) {
      setDestSuggestions([]);
      return;
    }

    if ((window as any).google) {
      try {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions({ input: val }, (predictions: any[], status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
            setDestSuggestions(predictions.map((p: any) => ({
              display_name: p.description,
              place_id: p.place_id,
              is_google: true
            })));
          } else {
            setDestSuggestions([]);
          }
        });
        return;
      } catch (err) {
        console.error("Google autocomplete predictions error, falling back:", err);
      }
    }

    // Fallback to Komoot Photon API
    try {
      const response = await fetch(`https://photon.komoot.io/api?q=${encodeURIComponent(val)}&limit=10`);
      const data = await response.json();
      const suggestions = (data.features || []).map((f: any) => {
        const props = f.properties;
        const streetDetails = [props.housenumber, props.street].filter(Boolean).join(' ');
        const parts = [
          streetDetails || null,
          props.district || props.suburb || null,
          props.city || null,
          props.state || null,
          props.country || null
        ].filter(Boolean) as string[];

        const name = props.name;
        if (name && !parts.includes(name) && !streetDetails.includes(name)) {
          parts.unshift(name);
        }

        return {
          display_name: parts.join(', '),
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          is_google: false
        };
      });
      setDestSuggestions(suggestions);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectDest = (item: any) => {
    setDestination(item.display_name);
    setDestSuggestions([]);

    if (item.is_google && item.place_id && (window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ placeId: item.place_id }, (results: any[], status: any) => {
        if (status === (window as any).google.maps.GeocoderStatus.OK && results && results[0]) {
          const loc = results[0].geometry.location;
          setDestLat(loc.lat());
          setDestLng(loc.lng());
        }
      });
    } else {
      setDestLat(item.lat);
      setDestLng(item.lon);
    }
  };

  const [rides, setRides] = useState<Ride[]>([]);
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Clear map markers if inputs are cleared
  useEffect(() => {
    if (!pickup) {
      setPickupLat(null);
      setPickupLng(null);
    }
  }, [pickup]);

  useEffect(() => {
    if (!destination) {
      setDestLat(null);
      setDestLng(null);
    }
  }, [destination]);

  // Reverse Geocoding Helper
  const reverseGeocode = async (lat: number, lng: number, callback: (address: string) => void) => {
    if ((window as any).google) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any[], status: any) => {
          if (status === (window as any).google.maps.GeocoderStatus.OK && results && results[0]) {
            callback(results[0].formatted_address);
          } else {
            callback(`Map Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
        });
        return;
      } catch (err) {
        console.error("Google reverse geocoding failed:", err);
      }
    }

    try {
      const response = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data.features && data.features[0]) {
        const props = data.features[0].properties;
        const streetDetails = [props.housenumber, props.street].filter(Boolean).join(' ');
        const parts = [
          streetDetails || null,
          props.district || props.suburb || null,
          props.city || null,
          props.state || null,
          props.country || null
        ].filter(Boolean) as string[];

        const name = props.name;
        if (name && !parts.includes(name) && !streetDetails.includes(name)) {
          parts.unshift(name);
        }
        callback(parts.join(', '));
      } else {
        callback(`Map Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch (err) {
      console.error(err);
      callback(`Map Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }
  };

  // Map Click Handler Component
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (!pickupLat || !pickupLng) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          setPickupLat(lat);
          setPickupLng(lng);
          setPickup("Fetching location...");
          reverseGeocode(lat, lng, (addr) => setPickup(addr));
        } else if (!destLat || !destLng) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          setDestLat(lat);
          setDestLng(lng);
          setDestination("Fetching location...");
          reverseGeocode(lat, lng, (addr) => setDestination(addr));
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
    setPickup('');
    setDestination('');
  };

  const filteredRides = rides.filter((ride) => {
    if (rideType === 'one_time') {
      return !ride.recurring;
    }
    if (rideType === 'recurring') {
      return !!ride.recurring;
    }
    return true;
  });

  useEffect(() => {
    // Load current wallet balance
    const loadWallet = async () => {
      try {
        const res = await api.get('/wallet/');
        setWalletBalance(res.data.balance);
      } catch (err) {
        console.error("Error fetching wallet balance:", err);
      }
    };
    if (user) loadWallet();
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params: any = { status: 'pending' };
      if (pickup) params.pickup = pickup;
      if (destination) params.destination = destination;
      if (date) params.date = date;
      if (seats) params.seats = seats;

      const res = await api.get('/rides/', { params });
      setRides(res.data.results || res.data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch rides. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedRide) return;
    setBookingLoading(true);
    setError(null);

    const totalFare = Number(seats) * parseFloat(selectedRide.fare_per_seat);
    if (parseFloat(walletBalance) < totalFare) {
      setError(`Insufficient wallet balance. You need ₹${totalFare.toFixed(2)} but only have ₹${Number(walletBalance).toFixed(2)}.`);
      setBookingLoading(false);
      return;
    }

    try {
      await api.post('/book/', {
        ride: selectedRide.id,
        seats_booked: Number(seats),
        pickup_location: selectedRide.pickup_location,
        destination_location: selectedRide.destination_location
      });

      setBookingSuccess(true);
      setTimeout(() => {
        navigate('/my-trips');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data) {
        const errorDetails = typeof err.response.data === 'string'
          ? err.response.data
          : Object.entries(err.response.data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join(' | ');
        setError(errorDetails || "Failed to request booking.");
      } else {
        setError("Failed to request booking. Please check your connection.");
      }
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Find a Ride</h2>
          <p className="text-muted-foreground text-sm">
            Search for driving coworkers sharing a route, book seats instantly, and commute sustainably.
          </p>
        </div>
      </div>

      {/* SEARCH CARD */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
              <MapPin size={12} className="text-primary" />
              <span>Pickup Location</span>
            </label>
            <input
              type="text"
              value={pickup}
              onChange={(e) => handlePickupChange(e.target.value)}
              placeholder="e.g. Metro Station Gate 3"
              className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
            />
            {pickupSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-[2000] max-h-48 overflow-y-auto">
                {pickupSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectPickup(item)}
                    className="px-4 py-2 hover:bg-muted cursor-pointer text-xs border-b border-border/50 last:border-0 truncate text-foreground font-medium"
                  >
                    {item.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
              <MapPin size={12} className="text-primary" />
              <span>Destination</span>
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => handleDestChange(e.target.value)}
              placeholder="e.g. Alpha Office Block"
              className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
            />
            {destSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-[2000] max-h-48 overflow-y-auto">
                {destSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectDest(item)}
                    className="px-4 py-2 hover:bg-muted cursor-pointer text-xs border-b border-border/50 last:border-0 truncate text-foreground font-medium"
                  >
                    {item.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
              <Calendar size={12} className="text-primary" />
              <span>Commute Date</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
              <RefreshCw size={12} className="text-primary" />
              <span>Ride Type</span>
            </label>
            <select
              value={rideType}
              onChange={(e) => setRideType(e.target.value as any)}
              className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
            >
              <option value="all">All Rides</option>
              <option value="one_time">One-Time Only</option>
              <option value="recurring">Recurring Only</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5 col-span-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                <Users size={12} className="text-primary" />
                <span>Seats</span>
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-sm transition-all outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="col-span-2 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
              ) : (
                <>
                  <Search size={16} />
                  <span>Search</span>
                </>
              )}
            </button>
          </div>
        </form>

        {pickupLat && pickupLng && destLat && destLng && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm mt-3 gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">Distance:</span>
              <span className="font-bold text-primary text-sm">{distance !== null ? `${distance.toFixed(2)} km` : "Calculating..."}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-xs">ETA (Duration):</span>
              <span className="font-bold text-primary text-sm">{duration !== null ? formatDuration(duration) : "Calculating..."}</span>
            </div>
          </div>
        )}
      </div>

      {/* RESULTS SECTON */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* LISP OF RIDES */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-base border-b border-border pb-2">
            {searched ? `Found ${filteredRides.length} Matching Rides` : 'Available Ride Offers'}
          </h3>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-4 flex items-start space-x-3">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {filteredRides.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
              {searched ? "No matching carpool routes found. Try adjusting locations or dates." : "Enter route search details above to match with drivers."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRides.map((ride) => (
                <div
                  key={ride.id}
                  className={`bg-card border rounded-2xl p-5 hover-glow flex flex-col justify-between ${selectedRide?.id === ride.id ? 'border-primary shadow-lg shadow-primary/5' : 'border-border'
                    }`}
                >
                  <div className="space-y-3">
                    {/* Header: Driver Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                          {ride.driver_details.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{ride.driver_details.username}</p>
                          <span className="text-[10px] text-muted-foreground flex items-center space-x-1">
                            <Star size={10} className="text-amber-500 fill-amber-500" />
                            <span>4.8 Driver Rating</span>
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        ₹{parseFloat(ride.fare_per_seat).toFixed(2)}/seat
                      </span>
                    </div>

                    {/* Locations */}
                    <div className="space-y-1.5 pt-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        <p className="truncate text-muted-foreground"><span className="font-semibold text-foreground">From:</span> {ride.pickup_location}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                        <p className="truncate text-muted-foreground"><span className="font-semibold text-foreground">To:</span> {ride.destination_location}</p>
                      </div>
                    </div>

                    {/* Car details */}
                    <div className="bg-muted/40 rounded-xl p-3 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold">{ride.vehicle_details.name} ({ride.vehicle_details.color})</span>
                      <span>{ride.available_seats} seats remaining</span>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-muted-foreground">
                      {ride.recurring && ride.recurring_pattern
                        ? `Recurring: ${ride.recurring_pattern}`
                        : ride.travel_date} • {ride.travel_time.slice(0, 5)}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedRide(ride);
                        setBookingSuccess(false);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 transition-all shadow-md shadow-primary/20"
                    >
                      Book Seats
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: MAP & BOOKING DETAILS */}
        <div className="space-y-6">
          {/* MAP ROUTE PREVIEW */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden h-[300px] flex flex-col relative shadow-sm z-10">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin size={12} className="text-primary" />
                <span>{selectedRide ? "Selected Ride Route" : "Map Route Selector"}</span>
              </span>
              {(pickupLat || pickupLng || destLat || destLng || selectedRide) && (
                <button
                  onClick={handleClearMap}
                  className="text-[10px] text-destructive hover:underline font-bold outline-none"
                >
                  Clear Route
                </button>
              )}
            </div>

            <div className="flex-1 w-full relative">
              <MapContainer
                center={[12.9716, 77.5946]} // Default Bangalore coordinates
                zoom={11}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {!selectedRide && <MapEvents />}
                <RecenterMap />
                {showPickupLat && showPickupLng && (
                  <Marker position={[showPickupLat, showPickupLng]} icon={pickupIcon} />
                )}
                {showDestLat && showDestLng && (
                  <Marker position={[showDestLat, showDestLng]} icon={destIcon} />
                )}
                {routePath.length > 0 && (
                  <Polyline
                    positions={routePath}
                    color="hsl(var(--primary))"
                    weight={5}
                  />
                )}
              </MapContainer>
            </div>
          </div>

          {/* BOOKING DETAILS SIDE PANEL */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col space-y-6 shadow-sm">
            <h3 className="font-bold text-base border-b border-border pb-2 flex items-center space-x-1.5">
              <Sparkles size={18} className="text-primary" />
              <span>Confirm Booking</span>
            </h3>

            {bookingSuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl p-4 font-semibold text-center flex items-center justify-center space-x-2">
                <CheckCircle size={16} />
                <span>Seats Booked! Redirecting...</span>
              </div>
            )}

            {selectedRide ? (
              <div className="space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-border pb-1.5">
                    <span className="text-muted-foreground">Driver:</span>
                    <span className="font-semibold">{selectedRide.driver_details.username}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1.5">
                    <span className="text-muted-foreground">Vehicle:</span>
                    <span className="font-semibold">{selectedRide.vehicle_details.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1.5">
                    <span className="text-muted-foreground">Seats Booked:</span>
                    <span className="font-semibold">{seats} seat(s)</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1.5">
                    <span className="text-muted-foreground">Fare Per Seat:</span>
                    <span className="font-semibold">₹{parseFloat(selectedRide.fare_per_seat).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1.5">
                    <span className="text-muted-foreground font-semibold text-foreground">Total Commute Cost:</span>
                    <span className="font-bold text-sm text-primary">
                      ₹{(Number(seats) * parseFloat(selectedRide.fare_per_seat)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Wallet checking */}
                <div className="bg-muted/30 rounded-xl p-3 border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Your Wallet Balance:</span>
                    <span className="font-bold">₹{parseFloat(walletBalance).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-primary">
                    <ShieldCheck size={12} />
                    <span>Fare will be locked until ride ends</span>
                  </div>
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    onClick={() => setSelectedRide(null)}
                    className="flex-1 py-2 border border-border hover:bg-muted/40 font-semibold rounded-xl text-xs transition-all text-muted-foreground outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    disabled={bookingLoading}
                    className="flex-1 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-primary/20 outline-none"
                  >
                    {bookingLoading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></span>
                    ) : (
                      <span>Request Booking</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground leading-relaxed bg-muted/20 border border-dashed border-border rounded-xl">
                Select a matching ride offer from the list to display checkout pricing.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
