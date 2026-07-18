import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { MapPin, Calendar, Users, Search, AlertCircle, Sparkles, Star, ShieldCheck, CheckCircle, RefreshCw } from 'lucide-react';

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
}

export const FindRide: React.FC = () => {
  const { user } = useAuth();
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState('1');
  const [rideType, setRideType] = useState<'all' | 'one_time' | 'recurring'>('all');

  const [rides, setRides] = useState<Ride[]>([]);
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
              <MapPin size={12} className="text-primary" />
              <span>Pickup Location</span>
            </label>
            <input
              type="text"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              placeholder="e.g. Metro Station Gate 3"
              className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
              <MapPin size={12} className="text-primary" />
              <span>Destination</span>
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Alpha Office Block"
              className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
            />
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
                  className={`bg-card border rounded-2xl p-5 hover-glow flex flex-col justify-between ${
                    selectedRide?.id === ride.id ? 'border-primary shadow-lg shadow-primary/5' : 'border-border'
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

        {/* BOOKING DETAILS SIDE PANEL */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col space-y-6">
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
                  className="flex-1 py-2 border border-border hover:bg-muted/40 font-semibold rounded-xl text-xs transition-all text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={bookingLoading}
                  className="flex-1 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-primary/20"
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
  );
};
