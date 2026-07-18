import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  payment_status?: string;
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
  payment_status?: string;
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
  const [activeTab, setActiveTab] = useState<'passenger' | 'driver' | 'history'>('passenger');
  const [offeredRides, setOfferedRides] = useState<Ride[]>([]);
  const [passengerBookings, setPassengerBookings] = useState<PassengerBooking[]>([]);
  
  const [historyRides, setHistoryRides] = useState<Ride[]>([]);
  const [historyBookings, setHistoryBookings] = useState<PassengerBooking[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state && (location.state as any).tab) {
      setActiveTab((location.state as any).tab);
    }
  }, [location.state]);

  const loadTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'driver') {
        const res = await api.get('/rides/', { params: { driver_id: user?.id } });
        const ridesList = res.data.results || res.data;
        const bookingsRes = await api.get('/book/', { params: { role_type: 'driver' } });
        const allDriverBookings = bookingsRes.data.results || bookingsRes.data;

        // Group and filter for active offered rides
        const activeOfferedRides = ridesList
          .filter((r: Ride) => r.status !== 'completed' && r.status !== 'cancelled')
          .map((ride: Ride) => ({
            ...ride,
            bookings: allDriverBookings.filter((b: any) => b.ride === ride.id)
          }));
        setOfferedRides(activeOfferedRides);
      } else if (activeTab === 'passenger') {
        const res = await api.get('/book/', { params: { role_type: 'passenger' } });
        const list = res.data.results || res.data;
        
        // Filter out completed/cancelled passenger bookings
        const activePassengerBookings = list.filter(
          (b: PassengerBooking) => b.ride_details.status !== 'completed' && b.ride_details.status !== 'cancelled'
        );
        setPassengerBookings(activePassengerBookings);
      } else if (activeTab === 'history') {
        const ridesRes = await api.get('/rides/', { params: { driver_id: user?.id } });
        const bookingsRes = await api.get('/book/', { params: { role_type: 'passenger' } });
        const allBookingsRes = await api.get('/book/', { params: { role_type: 'driver' } });

        const ridesList = ridesRes.data.results || ridesRes.data;
        const bookingsList = bookingsRes.data.results || bookingsRes.data;
        const allDriverBookings = allBookingsRes.data.results || allBookingsRes.data;

        // History as driver (completed/cancelled offered rides)
        const completedRides = ridesList
          .filter((r: Ride) => r.status === 'completed' || r.status === 'cancelled')
          .map((ride: Ride) => ({
            ...ride,
            bookings: allDriverBookings.filter((b: any) => b.ride === ride.id)
          }));

        // History as passenger (completed/cancelled booked rides)
        const completedBookings = bookingsList.filter(
          (b: PassengerBooking) => b.ride_details.status === 'completed' || b.ride_details.status === 'cancelled'
        );

        setHistoryRides(completedRides);
        setHistoryBookings(completedBookings);
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

  const handlePayBooking = async (bookingId: number) => {
    if (!window.confirm("Do you want to pay for this booking now using your wallet balance?")) return;
    try {
      await api.post(`/book/${bookingId}/pay/`);
      alert("Payment completed successfully!");
      loadTrips();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to make early payment.");
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
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ride History
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
                        {booking.payment_status && booking.payment_status !== 'no_payment' && (
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 mt-1.5 rounded-md ${
                            booking.payment_status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                            booking.payment_status === 'pending' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' :
                            booking.payment_status === 'refunded' ? 'bg-muted text-muted-foreground border border-border' :
                            'bg-destructive/10 text-destructive border border-destructive/20'
                          }`}>
                            Payment: {booking.payment_status === 'pending' ? 'Pending Ride End' : booking.payment_status}
                          </span>
                        )}
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
                          ₹{(booking.seats_booked * parseFloat(ride.fare_per_seat)).toFixed(2)}
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
                    <div className="flex items-center space-x-2">
                      {booking.status === 'approved' && ride.status !== 'completed' && (
                        <button
                          onClick={() => navigate(`/tracking/${booking.id}`)} // Redirect to live view
                          className="flex items-center space-x-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold rounded-xl text-xs shadow-md transition-all outline-none"
                        >
                          <Navigation size={12} />
                          <span>Track Live Journey</span>
                        </button>
                      )}
                      
                      {booking.status === 'approved' && booking.payment_status === 'pending' && (
                        <button
                          onClick={() => handlePayBooking(booking.id)}
                          className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all outline-none"
                        >
                          <span>Pay Now (₹{(booking.seats_booked * parseFloat(ride.fare_per_seat)).toFixed(2)})</span>
                        </button>
                      )}
                    </div>
                    
                    {(booking.status === 'pending' || (booking.status === 'approved' && booking.payment_status === 'pending')) && (
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="text-xs text-destructive hover:underline font-semibold outline-none"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'driver' ? (
        // DRIVER VIEW
        offeredRides.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm">
            You haven't offered any active driving commutes. Set up your route in Offer a Ride!
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
      ) : (
        // RIDE HISTORY VIEW (ENDED TRIPS)
        historyRides.length === 0 && historyBookings.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm max-w-xl mx-auto">
            You don't have any past / ended trips in your history yet.
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* History as Driver */}
            {historyRides.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Offered Rides History (As Driver)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {historyRides.map((ride) => (
                    <div key={ride.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover-glow opacity-85">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-indigo-500 tracking-wider">Driver Role</span>
                            <h4 className="font-bold text-sm mt-1">{ride.pickup_location} → {ride.destination_location}</h4>
                          </div>
                          <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                            ride.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                          }`}>
                            {ride.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-y border-border py-3 text-xs">
                          <div>
                            <p className="text-muted-foreground font-semibold">Date & Time</p>
                            <p className="font-bold text-foreground mt-0.5">{ride.travel_date} • {ride.travel_time.slice(0, 5)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground font-semibold">Vehicle</p>
                            <p className="font-bold text-foreground mt-0.5">{ride.vehicle_details.name} ({ride.vehicle_details.registration_number})</p>
                          </div>
                        </div>

                        {/* Participants / Passengers */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ride Participants (Passengers)</p>
                          {ride.bookings.filter((b: any) => b.status === 'approved').length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No passengers joined this ride.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {ride.bookings
                                .filter((b: any) => b.status === 'approved')
                                .map((b: any) => (
                                  <span key={b.id} className="px-2 py-0.5 bg-muted border border-border rounded-md text-xs font-medium text-foreground">
                                    {b.passenger_details.username} ({b.seats_booked} seat{b.seats_booked > 1 ? 's' : ''})
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History as Passenger */}
            {historyBookings.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Booked Rides History (As Passenger)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {historyBookings.map((booking) => {
                    const ride = booking.ride_details;
                    return (
                      <div key={booking.id} className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between hover-glow opacity-85">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-emerald-500 tracking-wider">Passenger Role</span>
                              <h4 className="font-bold text-sm mt-1">{ride.pickup_location} → {ride.destination_location}</h4>
                              {booking.payment_status && booking.payment_status !== 'no_payment' && (
                                <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 mt-1.5 rounded-md ${
                                  booking.payment_status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                  booking.payment_status === 'pending' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' :
                                  booking.payment_status === 'refunded' ? 'bg-muted text-muted-foreground border border-border' :
                                  'bg-destructive/10 text-destructive border border-destructive/20'
                                }`}>
                                  Payment: {booking.payment_status}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                                ride.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
                              }`}>
                                Ride: {ride.status}
                              </span>
                            </div>
                          </div>

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
                              <p className="text-muted-foreground font-semibold">Total Cost</p>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                ₹{(booking.seats_booked * parseFloat(ride.fare_per_seat)).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>Date & Time: <span className="font-semibold text-foreground">{ride.travel_date} • {ride.travel_time.slice(0, 5)}</span></p>
                            <p>Vehicle: <span className="font-semibold text-foreground">{ride.vehicle_details.name} ({ride.vehicle_details.registration_number})</span></p>
                            <p>Booking Status: <span className="font-bold text-foreground capitalize">{booking.status}</span></p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
