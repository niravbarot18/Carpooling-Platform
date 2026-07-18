import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  Search, MapPin, Navigation, Calendar, Users, Star, 
  Clock, DollarSign, Percent, ShieldCheck, Sparkles, X 
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Fix Leaflet marker icons by using default external SVG pins
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

const rideIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const POPULAR_LOCATIONS = [
  { name: "Main Office HQ (Electronic City)", lat: 12.8406, lng: 77.6753 },
  { name: "South Hub (HSR Layout)", lat: 12.9116, lng: 77.6388 },
  { name: "North Office (Manyata Tech Park)", lat: 13.0408, lng: 77.6244 },
  { name: "West Hub (Koramangala)", lat: 12.9352, lng: 77.6244 },
  { name: "Transit Hub (Indiranagar Metro)", lat: 12.9719, lng: 77.6412 }
];

export const FindRide: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // Search filter states
  const [fromLoc, setFromLoc] = useState(searchParams.get('from_name') || '');
  const [toLoc, setToLoc] = useState(searchParams.get('to_name') || '');
  const [date, setDate] = useState(searchParams.get('departure_time') || '');

  // Rides list & map coordinates
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Selected locations for map pins
  const [pickupCoord, setPickupCoord] = useState<[number, number] | null>(null);
  const [destCoord, setDestCoord] = useState<[number, number] | null>(null);

  // Booking modal state
  const [selectedRide, setSelectedRide] = useState<any | null>(null);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    // Resolve coordinates on load if query params exist
    handleLocationPinSync();
    fetchRides();
  }, [searchParams]);

  const handleLocationPinSync = () => {
    const s_lat = searchParams.get('start_lat');
    const s_lng = searchParams.get('start_lng');
    const e_lat = searchParams.get('end_lat');
    const e_lng = searchParams.get('end_lng');

    if (s_lat && s_lng) {
      setPickupCoord([parseFloat(s_lat), parseFloat(s_lng)]);
    } else {
      setPickupCoord(null);
    }

    if (e_lat && e_lng) {
      setDestCoord([parseFloat(e_lat), parseFloat(e_lng)]);
    } else {
      setDestCoord(null);
    }
  };

  const fetchRides = async () => {
    setLoading(true);
    setError('');
    
    // Build API query parameters
    const params: any = { status: 'Published' };
    const s_lat = searchParams.get('start_lat');
    const s_lng = searchParams.get('start_lng');
    const e_lat = searchParams.get('end_lat');
    const e_lng = searchParams.get('end_lng');
    const d_time = searchParams.get('departure_time');

    if (s_lat && s_lng && e_lat && e_lng) {
      params.start_lat = s_lat;
      params.start_lng = s_lng;
      params.end_lat = e_lat;
      params.end_lng = e_lng;
      if (d_time) {
        try {
          params.departure_time = new Date(d_time).toISOString();
        } catch (e) {
          params.departure_time = d_time;
        }
      }
    }

    try {
      const response = await api.get('rides/', { params });
      // Django returns results as paginated lists or simple arrays
      const data = response.data.results || response.data;
      setRides(data);
    } catch (err) {
      setError('Unable to fetch rides. Please try adjusting your search parameters.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fromObj = POPULAR_LOCATIONS.find(l => l.name === fromLoc);
    const toObj = POPULAR_LOCATIONS.find(l => l.name === toLoc);

    if (fromObj && toObj) {
      setSearchParams({
        start_lat: fromObj.lat.toString(),
        start_lng: fromObj.lng.toString(),
        end_lat: toObj.lat.toString(),
        end_lng: toObj.lng.toString(),
        from_name: fromLoc,
        to_name: toLoc,
        departure_time: date
      });
    } else {
      // Fetch default published rides
      setSearchParams({});
    }
  };

  const openBookingModal = (ride: any) => {
    setSelectedRide(ride);
    setSeatsToBook(1);
    setBookingSuccess('');
    setBookingError('');
  };

  const handleConfirmBooking = async () => {
    if (!selectedRide) return;
    setBookingLoading(true);
    setBookingError('');
    setBookingSuccess('');

    // Check balance
    const fare = selectedRide.price_per_seat * seatsToBook;
    if (parseFloat(user?.wallet_balance?.toString() || '0') < fare) {
      setBookingError(`Insufficient wallet balance. Total cost is ₹${fare.toFixed(2)}, but you only have ₹${parseFloat(user?.wallet_balance?.toString() || '0').toFixed(2)}.`);
      setBookingLoading(false);
      return;
    }

    try {
      const response = await api.post('bookings/', {
        ride: selectedRide.id,
        seats_booked: seatsToBook
      });
      
      setBookingSuccess(`Booking request submitted successfully! Driver has been notified.`);
      refreshProfile(); // Sync new wallet state
      
      // Remove booked ride from list or update local state
      setTimeout(() => {
        setSelectedRide(null);
        fetchRides();
      }, 3000);
    } catch (err: any) {
      setBookingError(
        err.response?.data?.error || 
        err.response?.data?.non_field_errors?.[0] || 
        'Unable to complete booking. Please try again.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  // Center coordinate for map (default to Bangalore centre)
  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const mapCenter: [number, number] = pickupCoord || defaultCenter;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-8 font-sans">
      {/* Sidebar: Filters & Cards */}
      <div className="w-full lg:w-[450px] flex flex-col h-full overflow-hidden flex-shrink-0">
        
        {/* Search Header Form */}
        <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm mb-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="space-y-2">
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <select
                  value={fromLoc}
                  onChange={(e) => setFromLoc(e.target.value)}
                  className="premium-input text-xs"
                  style={{ paddingLeft: '2.5rem' }}
                >
                  <option value="">Select pickup point...</option>
                  {POPULAR_LOCATIONS.map(l => (
                    <option key={l.name} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Navigation className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <select
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  className="premium-input text-xs"
                  style={{ paddingLeft: '2.5rem' }}
                >
                  <option value="">Select drop-off point...</option>
                  {POPULAR_LOCATIONS.map(l => (
                    <option key={l.name} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="premium-input text-xs"
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full premium-btn-primary gap-2 text-xs font-semibold"
            >
              <Search className="w-4 h-4" />
              <span>Filter Rides</span>
            </button>
          </form>
        </div>

        {/* Ride Cards List container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="premium-card p-5 bg-white space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                    <div className="w-12 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-full h-8 bg-gray-100 rounded"></div>
                  <div className="w-1/3 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center text-xs text-red-700 leading-normal">
              {error}
            </div>
          ) : rides.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-8 text-center text-xs text-gray-400">
              No matching rides found. Try modifying your pickup or destination hubs.
            </div>
          ) : (
            rides.map((ride) => {
              const score = ride.match_details?.score || 100;
              const explanation = ride.match_details?.checklist || ["✓ Same Route", "✓ Leaves on time"];
              return (
                <div key={ride.id} className="premium-card p-5 bg-white flex flex-col justify-between border border-gray-100">
                  <div>
                    {/* Card Header: Driver details and Match % */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center text-xs">
                          {ride.driver.first_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-700">
                            {ride.driver.first_name || ride.driver.email.split('@')[0]}
                          </p>
                          <div className="flex items-center gap-1 text-[9px] text-gray-400 font-medium">
                            <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />
                            <span>{ride.driver.average_rating.toFixed(1)} rating</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          {score}% Match
                        </span>
                      </div>
                    </div>

                    {/* Route addresses */}
                    <div className="space-y-1.5 border-l-2 border-dashed border-gray-100 pl-3 ml-4 mb-4">
                      <div className="text-xs">
                        <span className="text-gray-400 font-medium mr-1.5">From:</span>
                        <span className="text-gray-700 font-medium">{ride.start_address}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-400 font-medium mr-1.5">To:</span>
                        <span className="text-gray-700 font-medium">{ride.end_address}</span>
                      </div>
                    </div>

                    {/* Match Score explanation checklist */}
                    <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-50/50 space-y-1 mb-4">
                      {explanation.map((item: string, i: number) => (
                        <p key={i} className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                          {item}
                        </p>
                      ))}
                    </div>

                    {/* Vehicle & timing info */}
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-500 mb-4 border-t border-b border-gray-50 py-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>{ride.available_seats} seats free</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                        <span>{ride.vehicle?.name || 'Car'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & pricing */}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-[9px] text-gray-400">PRICE PER SEAT</p>
                      <p className="text-base font-bold text-gray-800">₹{parseFloat(ride.price_per_seat).toFixed(0)}</p>
                    </div>

                    {ride.driver.id === user?.id ? (
                      <span className="text-xs bg-gray-100 text-gray-400 font-semibold px-4 py-2 rounded-xl border border-gray-200">
                        Your Offer
                      </span>
                    ) : (
                      <button
                        onClick={() => openBookingModal(ride)}
                        className="premium-btn-primary h-10 px-6 text-xs font-semibold shadow-sm cursor-pointer"
                      >
                        Book Ride
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Interactive Map */}
      <div className="flex-1 h-full bg-white border border-gray-100 rounded-3xl p-4 shadow-sm relative overflow-hidden">
        <MapContainer center={mapCenter} zoom={12} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Pickup Pin */}
          {pickupCoord && (
            <Marker position={pickupCoord} icon={startIcon}>
              <Popup>
                <div className="text-xs font-semibold">Pickup: {fromLoc}</div>
              </Popup>
            </Marker>
          )}

          {/* Destination Pin */}
          {destCoord && (
            <Marker position={destCoord} icon={endIcon}>
              <Popup>
                <div className="text-xs font-semibold">Drop-off: {toLoc}</div>
              </Popup>
            </Marker>
          )}

          {/* Draw connecting line if both coordinates exist */}
          {pickupCoord && destCoord && (
            <Polyline positions={[pickupCoord, destCoord]} color="#10b981" dashArray="5, 5" weight={3} />
          )}

          {/* Markers for offered rides (if showing default listings) */}
          {rides.map((ride) => (
            <Marker 
              key={ride.id} 
              position={[ride.start_lat, ride.start_lng]} 
              icon={rideIcon}
            >
              <Popup>
                <div className="text-xs p-1">
                  <p className="font-semibold text-gray-700">Ride by {ride.driver.first_name || ride.driver.email}</p>
                  <p className="text-gray-500 mt-1">Leaves at: {new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-emerald-600 font-bold mt-1">₹{parseFloat(ride.price_per_seat).toFixed(0)}/seat</p>
                  <button 
                    onClick={() => openBookingModal(ride)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-1 px-2 rounded text-[10px] mt-2 cursor-pointer"
                  >
                    Select Booking
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Booking confirmation modal */}
      {selectedRide && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 99999,
            boxSizing: 'border-box',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedRide(null); }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #f3f4f6',
              borderRadius: '1.5rem',
              width: '100%',
              maxWidth: '28rem',
              minWidth: '320px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '1.5rem',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <button 
              onClick={() => setSelectedRide(null)}
              style={{
                position: 'absolute',
                right: '1rem',
                top: '1rem',
                color: '#9ca3af',
                padding: '0.375rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>Book Commute Seat</h3>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
              Confirm your seats on {selectedRide.driver.first_name || selectedRide.driver.email}'s vehicle.
            </p>

            {/* Error alerts */}
            {bookingError && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.625rem', color: '#b91c1c', fontSize: '0.75rem', lineHeight: '1.5' }}>
                <X style={{ width: '1rem', height: '1rem', color: '#ef4444', flexShrink: 0, marginTop: '0.125rem' }} />
                <span>{bookingError}</span>
              </div>
            )}

            {/* Success alerts */}
            {bookingSuccess && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.625rem', color: '#047857', fontSize: '0.75rem', lineHeight: '1.5' }}>
                <ShieldCheck style={{ width: '1rem', height: '1rem', color: '#10b981', flexShrink: 0, marginTop: '0.125rem' }} />
                <span>{bookingSuccess}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Seat Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '1rem', border: '1px solid #f3f4f6' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', margin: 0 }}>Seating Seats</p>
                  <p style={{ fontSize: '10px', color: '#9ca3af', margin: 0 }}>Available: {selectedRide.available_seats}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: '#fff', border: '1px solid #f3f4f6', borderRadius: '0.75rem', padding: '0.25rem 0.5rem' }}>
                  <button 
                    disabled={seatsToBook <= 1}
                    onClick={() => setSeatsToBook(s => s - 1)}
                    style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#4b5563', border: 'none', background: 'none', cursor: 'pointer', opacity: seatsToBook <= 1 ? 0.5 : 1 }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1f2937', width: '1rem', textAlign: 'center' }}>{seatsToBook}</span>
                  <button 
                    disabled={seatsToBook >= selectedRide.available_seats}
                    onClick={() => setSeatsToBook(s => s + 1)}
                    style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#4b5563', border: 'none', background: 'none', cursor: 'pointer', opacity: seatsToBook >= selectedRide.available_seats ? 0.5 : 1 }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Price Breakdown */}
              <div style={{ borderTop: '1px solid #f9fafb', paddingTop: '1rem', fontSize: '0.75rem', fontWeight: 500, color: '#4b5563', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fare ({seatsToBook} seat{seatsToBook > 1 ? 's' : ''})</span>
                  <span style={{ whiteSpace: 'nowrap' }}>₹{(selectedRide.price_per_seat * seatsToBook).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#059669' }}>
                  <span>Simulated Carbon Credit Discount (10%)</span>
                  <span style={{ whiteSpace: 'nowrap' }}>- ₹{(selectedRide.price_per_seat * seatsToBook * 0.1).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f9fafb', paddingTop: '0.75rem', fontSize: '0.875rem', fontWeight: 700, color: '#1f2937' }}>
                  <span>Total Debit Amount</span>
                  <span style={{ whiteSpace: 'nowrap' }}>₹{(selectedRide.price_per_seat * seatsToBook * 0.9).toFixed(2)}</span>
                </div>
              </div>

              {/* Wallet Info Check */}
              <div style={{ fontSize: '10px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.375rem', backgroundColor: '#f9fafb', padding: '0.625rem', borderRadius: '0.75rem', border: '1px solid #f3f4f6' }}>
                <Users style={{ width: '0.875rem', height: '0.875rem', color: '#9ca3af', flexShrink: 0 }} />
                <span>Your wallet balance: ₹{parseFloat(user?.wallet_balance?.toString() || '0').toFixed(2)}</span>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #f9fafb', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => setSelectedRide(null)}
                  className="premium-btn-secondary"
                  style={{ flex: 1, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  disabled={bookingLoading || !!bookingSuccess}
                  onClick={handleConfirmBooking}
                  className="premium-btn-primary"
                  style={{ flex: 1, fontSize: '0.75rem', fontWeight: 600, gap: '0.375rem', cursor: 'pointer', opacity: (bookingLoading || !!bookingSuccess) ? 0.5 : 1 }}
                >
                  {bookingLoading ? (
                    <div style={{ width: '1rem', height: '1rem', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  ) : (
                    <>
                      <ShieldCheck style={{ width: '1rem', height: '1rem' }} />
                      <span>Request Booking</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
