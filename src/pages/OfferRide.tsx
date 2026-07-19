import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Car, Clock, Calendar, Users, IndianRupee, MapPin, AlertCircle, HelpCircle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Vehicle {
  id: number;
  name: string;
  registration_number: string;
  seat_capacity: number;
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

export const OfferRide: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleSelected, setVehicleSelected] = useState('');
  const [pickup, setPickup] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);

  const [destination, setDestination] = useState('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);

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
    if (pickupLat && pickupLng && destLat && destLng) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${destLng},${destLat}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            setRoutePath(coords);
            setDistance(data.routes[0].distance / 1000); // Convert meters to km
            setDuration(data.routes[0].duration); // Set seconds
          } else {
            setRoutePath([[pickupLat, pickupLng], [destLat, destLng]]);
            const d = calculateHaversineDistance(pickupLat, pickupLng, destLat, destLng);
            setDistance(d);
            setDuration((d / 40) * 3600); // Approximate at 40 km/h average speed
          }
        } catch (err) {
          console.error("OSRM fetch failed, drawing straight line fallback:", err);
          setRoutePath([[pickupLat, pickupLng], [destLat, destLng]]);
          const d = calculateHaversineDistance(pickupLat, pickupLng, destLat, destLng);
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
  }, [pickupLat, pickupLng, destLat, destLng]);

  // Recenter Map Helper Component
  const RecenterMap = () => {
    const map = useMap();
    useEffect(() => {
      if (pickupLat && pickupLng && destLat && destLng) {
        map.fitBounds([
          [pickupLat, pickupLng],
          [destLat, destLng]
        ], { padding: [50, 50] });
      } else if (pickupLat && pickupLng) {
        map.setView([pickupLat, pickupLng], 14);
      } else if (destLat && destLng) {
        map.setView([destLat, destLng], 14);
      }
    }, [pickupLat, pickupLng, destLat, destLng, map]);
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

  const [travelDate, setTravelDate] = useState('');
  const [travelTime, setTravelTime] = useState('');
  const [seats, setSeats] = useState('3');
  const [fare, setFare] = useState('5.00');

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('daily');

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
      recurring: isRecurring,
      recurring_pattern: isRecurring ? recurringPattern : '',
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
                <div className="space-y-1.5 relative">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pickup Address
                  </label>
                  <input
                    type="text"
                    required
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Destination Address
                  </label>
                  <input
                    type="text"
                    required
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
              </div>

              {pickupLat && pickupLng && destLat && destLng && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Distance
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={distance !== null ? `${distance.toFixed(2)} km` : "Calculating..."}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-primary outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      ETA (Duration)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={duration !== null ? formatDuration(duration) : "Calculating..."}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-primary outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

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
                    <IndianRupee size={14} />
                    <span>Fare Per Seat (₹)</span>
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

              {/* Recurring Ride Section */}
              <div className="space-y-3 p-4 bg-muted/20 border border-border rounded-xl">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <label htmlFor="recurring" className="text-sm font-semibold cursor-pointer">
                    Is this a Recurring Ride?
                  </label>
                </div>

                {isRecurring && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Select Frequency
                    </label>
                    <select
                      value={recurringPattern}
                      onChange={(e) => setRecurringPattern(e.target.value)}
                      className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="weekdays">Weekdays (Mon - Fri)</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-md shadow-primary/25 hover:shadow-primary/30 flex items-center justify-center space-x-2 mt-6"
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
                <RecenterMap />
                {pickupLat && pickupLng && (
                  <Marker position={[pickupLat, pickupLng]} icon={pickupIcon} />
                )}
                {destLat && destLng && (
                  <Marker position={[destLat, destLng]} icon={destIcon} />
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
        </div>
      )}
    </div>
  );
};
