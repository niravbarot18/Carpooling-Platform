import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Car, MapPin, Navigation, Clock, Users, 
  CheckCircle, AlertCircle, Play, CheckSquare, XCircle, ArrowRight 
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const MyTrips: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'passenger' | 'driver'>('passenger');
  const [bookings, setBookings] = useState<any[]>([]);
  const [driverRides, setDriverRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchTripsData();
  }, [activeTab]);

  const fetchTripsData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'passenger') {
        const response = await api.get('bookings/');
        const data = response.data.results || response.data;
        setBookings(data);
      } else {
        const response = await api.get('rides/?my_rides=true');
        const data = response.data.results || response.data;
        setDriverRides(data);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load trips data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setActionLoading(`cancel_${bookingId}`);
    try {
      await api.post(`bookings/${bookingId}/cancel/`);
      fetchTripsData();
      refreshProfile();
    } catch (err) {
      console.error(err);
      alert('Unable to cancel booking.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTrip = async (rideId: number, tripId: number) => {
    setActionLoading(`start_${rideId}`);
    try {
      await api.post(`trips/${tripId}/start_trip/`);
      alert('Ride started! You can now stream your location.');
      fetchTripsData();
      navigate(`/active-ride/${tripId}`);
    } catch (err) {
      console.error(err);
      alert('Unable to start ride.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndTrip = async (rideId: number, tripId: number) => {
    setActionLoading(`end_${rideId}`);
    try {
      await api.post(`trips/${tripId}/end_trip/`);
      alert('Ride completed successfully! Carbon credits credited.');
      fetchTripsData();
      refreshProfile();
    } catch (err) {
      console.error(err);
      alert('Unable to complete ride.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveBooking = async (bookingId: number) => {
    setActionLoading(`approve_${bookingId}`);
    try {
      await api.post(`bookings/${bookingId}/approve/`);
      fetchTripsData();
      refreshProfile();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Unable to approve booking.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    setActionLoading(`reject_${bookingId}`);
    try {
      await api.post(`bookings/${bookingId}/reject/`);
      fetchTripsData();
    } catch (err) {
      console.error(err);
      alert('Unable to reject booking.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Approved': case 'Published': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Ongoing': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Cancelled': case 'Rejected': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">My Trips</h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your ride offers and requested seat bookings.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-100 self-start">
          <button
            onClick={() => setActiveTab('passenger')}
            className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'passenger' 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Passenger Bookings
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'driver' 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Driver Ride Offers
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="premium-card p-6 bg-white space-y-3 animate-pulse">
              <div className="flex justify-between">
                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="h-10 bg-gray-100 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : activeTab === 'passenger' ? (
        /* PASSENGER BOOKINGS LIST */
        <div className="space-y-6">
          {bookings.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center text-xs text-gray-400">
              You haven't requested any rides yet.{' '}
              <button onClick={() => navigate('/find-ride')} className="text-emerald-600 font-semibold underline bg-transparent border-0 cursor-pointer">
                Find a commute
              </button>
            </div>
          ) : (
            bookings.map((booking) => {
              const ride = booking.ride_details;
              const isFuture = new Date(ride.departure_time) >= new Date();
              const tripId = ride.trip?.id;
              
              return (
                <div key={booking.id} className="premium-card p-6 bg-white border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left Column: Route Details */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Match Score: {booking.match_score}%
                      </span>
                    </div>

                    <div className="space-y-1.5 border-l border-gray-100 pl-3 ml-1.5">
                      <div className="text-xs truncate">
                        <span className="text-gray-400 font-medium mr-1.5">From:</span>
                        <span className="text-gray-700 font-medium">{ride.start_address}</span>
                      </div>
                      <div className="text-xs truncate">
                        <span className="text-gray-400 font-medium mr-1.5">To:</span>
                        <span className="text-gray-700 font-medium">{ride.end_address}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-gray-400 font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(ride.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{booking.seats_booked} Seat{booking.seats_booked > 1 ? 's' : ''} booked</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Driver and vehicle info */}
                  <div className="md:w-48 text-xs text-gray-500 border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-6">
                    <p className="text-[9px] text-gray-400">DRIVER</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{ride.driver.first_name || ride.driver.username}</p>
                    
                    <p className="text-[9px] text-gray-400 mt-3">VEHICLE</p>
                    <p className="font-semibold text-gray-700 mt-0.5">{ride.vehicle?.name} ({ride.vehicle?.registration_number})</p>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-row md:flex-col gap-2 md:w-36 justify-end">
                    {/* Live Tracking link */}
                    {booking.status === 'Approved' && ride.trip?.status === 'Ongoing' && (
                      <button
                        onClick={() => navigate(`/active-ride/${tripId}`)}
                        className="w-full premium-btn-primary gap-1 text-[11px] h-9 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Track Live</span>
                      </button>
                    )}

                    {/* Cancel Booking option */}
                    {isFuture && ['Pending', 'Approved'].includes(booking.status) && (
                      <button
                        disabled={actionLoading === `cancel_${booking.id}`}
                        onClick={() => handleCancelBooking(booking.id)}
                        className="w-full premium-btn-secondary text-[11px] h-9 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 cursor-pointer"
                      >
                        Cancel Book
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* DRIVER OFFERS LIST */
        <div className="space-y-6">
          {driverRides.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center text-xs text-gray-400">
              You haven't offered any rides yet.{' '}
              <button onClick={() => navigate('/offer-ride')} className="text-emerald-600 font-semibold underline bg-transparent border-0 cursor-pointer">
                Offer a ride
              </button>
            </div>
          ) : (
            driverRides.map((ride) => {
              const tripId = ride.trip?.id;
              const hasBookings = ride.bookings && ride.bookings.length > 0;
              const pendingBookings = ride.bookings?.filter((b: any) => b.status === 'Pending') || [];
              const approvedBookings = ride.bookings?.filter((b: any) => b.status === 'Approved') || [];
              
              return (
                <div key={ride.id} className="premium-card bg-white border border-gray-100 overflow-hidden">
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left Column: Route and status */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(ride.status)}`}>
                          {ride.trip?.status || ride.status}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          Seats: {ride.total_seats - ride.available_seats}/{ride.total_seats} filled
                        </span>
                      </div>

                      <div className="space-y-1.5 border-l border-gray-100 pl-3 ml-1.5">
                        <div className="text-xs truncate">
                          <span className="text-gray-400 font-medium mr-1.5">From:</span>
                          <span className="text-gray-700 font-medium">{ride.start_address}</span>
                        </div>
                        <div className="text-xs truncate">
                          <span className="text-gray-400 font-medium mr-1.5">To:</span>
                          <span className="text-gray-700 font-medium">{ride.end_address}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-gray-400 font-semibold">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(ride.departure_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>Vehicle: {ride.vehicle?.name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Earning details */}
                    <div className="md:w-36 text-xs text-gray-500 border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-6">
                      <p className="text-[9px] text-gray-400 font-semibold">FARE PER SEAT</p>
                      <p className="text-base font-bold text-gray-800 mt-0.5">₹{parseFloat(ride.price_per_seat).toFixed(0)}</p>
                      
                      <p className="text-[9px] text-gray-400 mt-2 font-semibold">EST. CO₂ SAVED</p>
                      <p className="text-xs font-bold text-emerald-600 mt-0.5">{ride.estimated_co2_saved} kg</p>
                    </div>

                    {/* Right Column: Trip workflow controls */}
                    <div className="flex flex-row md:flex-col gap-2 md:w-40 justify-end">
                      {/* Driver actions depending on trip state */}
                      {ride.status === 'Published' && ride.trip?.status === 'Scheduled' && (
                        <button
                          disabled={actionLoading === `start_${ride.id}`}
                          onClick={() => handleStartTrip(ride.id, tripId)}
                          className="w-full premium-btn-primary gap-1.5 text-[11px] h-9 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Start Ride</span>
                        </button>
                      )}

                      {ride.status === 'Published' && ride.trip?.status === 'Ongoing' && (
                        <div className="w-full space-y-2">
                          <button
                            onClick={() => navigate(`/active-ride/${tripId}`)}
                            className="w-full premium-btn-primary gap-1 text-[11px] h-9 bg-blue-600 hover:bg-blue-700 cursor-pointer"
                          >
                            <span>Share Location</span>
                          </button>
                          
                          <button
                            disabled={actionLoading === `end_${ride.id}`}
                            onClick={() => handleEndTrip(ride.id, tripId)}
                            className="w-full premium-btn-secondary gap-1 text-[11px] h-9 border-emerald-500 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Complete Ride</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nested Bookings request sub-panel */}
                  {hasBookings && (
                    <div className="bg-gray-50 border-t border-gray-100 p-4 space-y-3">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Riders on this trip
                      </h4>
                      
                      <div className="space-y-2">
                        {ride.bookings.map((booking: any) => (
                          <div key={booking.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center">
                                {booking.passenger.first_name?.charAt(0) || 'P'}
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-700">
                                  {booking.passenger.first_name || booking.passenger.email.split('@')[0]}
                                </p>
                                <p className="text-[9px] text-gray-400 font-medium">
                                  {booking.passenger.department} • Requested {booking.seats_booked} seat{booking.seats_booked > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                              
                              {booking.status === 'Pending' && (
                                <div className="flex gap-2">
                                  <button
                                    disabled={actionLoading === `approve_${booking.id}`}
                                    onClick={() => handleApproveBooking(booking.id)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold py-1 px-2.5 rounded-lg cursor-pointer disabled:opacity-50"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    disabled={actionLoading === `reject_${booking.id}`}
                                    onClick={() => handleRejectBooking(booking.id)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-semibold py-1 px-2.5 rounded-lg cursor-pointer disabled:opacity-50"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
