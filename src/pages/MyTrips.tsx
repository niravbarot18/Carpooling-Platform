import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Navigation, AlertCircle } from 'lucide-react';

interface Booking {
  id: number;
  seats_booked: number;
  status: string;
  passenger_details: { username: string; phone_number: string };
  pickup_location: string;
  destination_location: string;
}

interface Ride {
  id: number;
  pickup_location: string;
  destination_location: string;
  travel_date: string;
  travel_time: string;
  available_seats: number;
  fare_per_seat: string;
  status: string;
  vehicle_details: { name: string; registration_number: string };
  bookings: Booking[];
  trip?: { id: number; status: string };
}

interface PassengerBooking {
  id: number;
  seats_booked: number;
  status: string;
  pickup_location: string;
  destination_location: string;
  ride_details: {
    id: number;
    pickup_location: string;
    destination_location: string;
    travel_date: string;
    travel_time: string;
    fare_per_seat: string;
    driver_details: { username: string; phone_number: string };
    vehicle_details: { name: string; color: string; registration_number: string };
    status: string;
    trip?: { id: number; status: string };
  };
}

export const MyTrips: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'passenger' | 'driver'>('passenger');
  const [offeredRides, setOfferedRides] = useState<Ride[]>([]);
  const [passengerBookings, setPassengerBookings] = useState<PassengerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'driver') {
        const res = await api.get('/rides/', { params: { driver_id: user?.id } });
        // Embed bookings for each ride by hitting booking list
        const ridesList = res.data.results || res.data;
        const bookingsRes = await api.get('/book/', { params: { role_type: 'driver' } });
        const allDriverBookings = bookingsRes.data.results || bookingsRes.data;

        // Group bookings under rides
        const populatedRides = ridesList.map((ride: Ride) => ({
          ...ride,
          bookings: allDriverBookings.filter((b: any) => b.ride === ride.id)
        }));
        setOfferedRides(populatedRides);
      } else {
        const res = await api.get('/book/', { params: { role_type: 'passenger' } });
        setPassengerBookings(res.data.results || res.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load commutes log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTrips();
    }
  }, [user, activeTab]);

  const handleApproveBooking = async (bookingId: number) => {
    try {
      await api.post(`/book/${bookingId}/approve/`);
      loadTrips();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to approve booking.");
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    try {
      await api.post(`/book/${bookingId}/reject/`);
      loadTrips();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to reject booking.");
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm("Are you sure you want to cancel this booking request?")) return;
    try {
      await api.post(`/book/${bookingId}/cancel/`);
      loadTrips();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to cancel booking.");
    }
  };

  const handleStartTrip = async (rideId: number) => {
    try {
      // Fetch trip details for the ride
      const res = await api.get('/trips/');
      const tripsList = res.data.results || res.data;
      const tripObj = tripsList.find((t: any) => t.ride === rideId);

      if (tripObj) {
        await api.post(`/trips/${tripObj.id}/start/`);
        navigate(`/tracking/${tripObj.id}`);
      } else {
        alert("Trip instance not found.");
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to start trip.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Commutes</h2>
          <p className="text-muted-foreground text-sm">Review offered driving routes, request statuses, and track live commutes.</p>
        </div>

        {/* Tab triggers */}
        <div className="bg-card border border-border p-1 rounded-xl flex space-x-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('passenger')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'passenger'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Passenger Bookings
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'driver'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Offered Rides (Driver)
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl p-4 flex items-start space-x-3 max-w-lg mx-auto">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
        </div>
      ) : activeTab === 'passenger' ? (
        // PASSENGER VIEW
        passengerBookings.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
            You haven't requested any carpool seats. Try finding a ride first!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {passengerBookings.map((booking) => {
              const ride = booking.ride_details;
              return (
                <div key={booking.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover-glow">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Passenger Booking</span>
                        <h4 className="font-bold text-sm mt-1">{ride.pickup_location} → {ride.destination_location}</h4>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                        booking.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' :
                        booking.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                        booking.status === 'rejected' ? 'bg-red-500/10 text-red-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 border-y border-border py-3 text-center text-xs">
                      <div>
                        <p className="text-muted-foreground font-semibold">Driver</p>
                        <p className="font-bold text-foreground mt-0.5">{ride.driver_details.username}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold">Seats Booked</p>
                        <p className="font-bold text-foreground mt-0.5">{booking.seats_booked}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-semibold">Total Price</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ${(booking.seats_booked * parseFloat(ride.fare_per_seat)).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Time & Car */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Time: <span className="font-semibold text-foreground">{ride.travel_date} • {ride.travel_time.slice(0, 5)}</span></p>
                      <p>Vehicle: <span className="font-semibold text-foreground">{ride.vehicle_details.name} ({ride.vehicle_details.registration_number})</span></p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-border flex justify-between items-center">
                    {booking.status === 'approved' && ride.status !== 'completed' && (
                      <button
                        onClick={() => navigate(`/tracking/${booking.id}`)} // Redirect to live view
                        className="flex items-center space-x-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold rounded-xl text-xs shadow-md transition-all"
                      >
                        <Navigation size={12} />
                        <span>Track Live Journey</span>
                      </button>
                    )}
                    
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="text-xs text-destructive hover:underline font-semibold"
                      >
                        Cancel Booking Request
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // DRIVER VIEW
        offeredRides.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
            You haven't offered any driving commutes. Set up your route in Offer a Ride!
          </div>
        ) : (
          <div className="space-y-8">
            {offeredRides.map((ride) => (
              <div key={ride.id} className="bg-card border border-border rounded-2xl p-6 space-y-6">
                
                {/* Offered Ride Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0 pb-4 border-b border-border">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Offered Driving Route</span>
                    <h3 className="font-bold text-base mt-1">{ride.pickup_location} → {ride.destination_location}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ride.travel_date} • {ride.travel_time.slice(0, 5)} • Vehicle: {ride.vehicle_details.name}
                    </p>
                  </div>
                  
                  {/* Driving Status Actions */}
                  <div className="flex items-center space-x-2">
                    {ride.status === 'pending' && (
                      <button
                        onClick={() => handleStartTrip(ride.id)}
                        className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md flex items-center space-x-1.5"
                      >
                        <Navigation size={12} />
                        <span>Start driving trip</span>
                      </button>
                    )}
                    {ride.status === 'active' && (
                      <button
                        onClick={() => navigate(`/tracking/${ride.id}`)}
                        className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 transition-all shadow-md"
                      >
                        Open Live Console
                      </button>
                    )}
                    <span className="text-xs font-semibold bg-muted text-muted-foreground px-3 py-1.5 rounded-full border border-border">
                      Ride: {ride.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Ride Booking Request list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Passenger Commute Requests</h4>
                  
                  {ride.bookings.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-3 rounded-xl">No passengers have booked seats yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ride.bookings.map((b) => (
                        <div key={b.id} className="border border-border rounded-xl p-4 flex items-center justify-between bg-muted/10">
                          <div>
                            <p className="text-xs font-bold">{b.passenger_details.username}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Seats requested: {b.seats_booked} seat(s)</p>
                            <span className={`inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-md mt-1.5 ${
                              b.status === 'approved' ? 'bg-emerald-500/10 text-emerald-600' :
                              b.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                              b.status === 'rejected' ? 'bg-red-500/10 text-red-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {b.status}
                            </span>
                          </div>

                          {b.status === 'pending' && (
                            <div className="flex space-x-1.5">
                              <button
                                onClick={() => handleApproveBooking(b.id)}
                                className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                                title="Approve Request"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => handleRejectBooking(b.id)}
                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                title="Decline Request"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
