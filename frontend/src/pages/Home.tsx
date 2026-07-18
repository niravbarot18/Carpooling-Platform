import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRight, Search, Calendar, MapPin, Award, Navigation, 
  ArrowUpRight, Users, CheckCircle, Shield, Sparkles, ChevronRight 
} from 'lucide-react';
import api from '../services/api';

const POPULAR_LOCATIONS = [
  { name: "Main Office HQ (Electronic City)", lat: 12.8406, lng: 77.6753 },
  { name: "South Hub (HSR Layout)", lat: 12.9116, lng: 77.6388 },
  { name: "North Office (Manyata Tech Park)", lat: 13.0408, lng: 77.6244 },
  { name: "West Hub (Koramangala)", lat: 12.9352, lng: 77.6244 },
  { name: "Transit Hub (Indiranagar Metro)", lat: 12.9719, lng: 77.6412 }
];

export const Home: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [fromLoc, setFromLoc] = useState('');
  const [toLoc, setToLoc] = useState('');
  const [date, setDate] = useState('');
  const [upcomingTrip, setUpcomingTrip] = useState<any>(null);
  const [recommendedRides, setRecommendedRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    refreshProfile();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch upcoming trip (bookings where status is Approved)
      const bookingResponse = await api.get('bookings/');
      const bookings = bookingResponse.data.results || bookingResponse.data;
      const futureApproved = bookings.find((b: any) => 
        b.status === 'Approved' && 
        new Date(b.ride_details.departure_time) >= new Date()
      );
      setUpcomingTrip(futureApproved);

      // 2. Fetch active rides to recommend
      const ridesResponse = await api.get('rides/?status=Published');
      const allRides = ridesResponse.data.results || ridesResponse.data;
      // Filter out user's own offers and show top 2 recommendations
      const recommendations = allRides
        .filter((r: any) => r.driver.id !== user?.id)
        .slice(0, 2);
      setRecommendedRides(recommendations);
    } catch (err) {
      console.error("Error loading dashboard details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLoc || !toLoc) return;

    const fromObj = POPULAR_LOCATIONS.find(l => l.name === fromLoc);
    const toObj = POPULAR_LOCATIONS.find(l => l.name === toLoc);

    if (fromObj && toObj) {
      navigate(
        `/find-ride?start_lat=${fromObj.lat}&start_lng=${fromObj.lng}&end_lat=${toObj.lat}&end_lng=${toObj.lng}&from_name=${encodeURIComponent(fromLoc)}&to_name=${encodeURIComponent(toLoc)}&departure_time=${date}`
      );
    }
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      {/* Top Greeting and Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
            {getGreeting()}, {user?.first_name || 'Employee'}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Let's make today's commute sustainable and cost-effective.
          </p>
        </div>

        {/* Environmental Impact Summary */}
        <div className="flex items-center gap-6 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
          <div className="text-center">
            <span className="block text-xs font-semibold text-gray-400">CO₂ Saved</span>
            <span className="text-lg font-bold text-emerald-600">
              {user?.total_co2_saved ? parseFloat(user.total_co2_saved.toString()).toFixed(1) : '0.0'} kg
            </span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <span className="block text-xs font-semibold text-gray-400">Fuel Saved</span>
            <span className="text-lg font-bold text-blue-600">
              {user?.total_fuel_saved ? parseFloat(user.total_fuel_saved.toString()).toFixed(1) : '0.0'} L
            </span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="text-center">
            <span className="block text-xs font-semibold text-gray-400">Money Saved</span>
            <span className="text-lg font-bold text-gray-800">
              ₹{user?.total_money_saved ? parseInt(user.total_money_saved.toString()) : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Search and Upcoming Ride */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Search Card */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                <Search className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">Quick Search</h2>
            </div>
            
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">PICKUP LOCATION</label>
                  <select 
                    required
                    value={fromLoc}
                    onChange={(e) => setFromLoc(e.target.value)}
                    className="premium-input text-xs"
                  >
                    <option value="">Select pickup point...</option>
                    {POPULAR_LOCATIONS.map(l => (
                      <option key={l.name} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">DESTINATION</label>
                  <select 
                    required
                    value={toLoc}
                    onChange={(e) => setToLoc(e.target.value)}
                    className="premium-input text-xs"
                  >
                    <option value="">Select drop-off point...</option>
                    {POPULAR_LOCATIONS.map(l => (
                      <option key={l.name} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1">DEPARTURE DATE & TIME</label>
                <input 
                  type="datetime-local"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="premium-input text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full premium-btn-primary gap-2 mt-4 font-semibold text-xs cursor-pointer"
              >
                <span>Search Commutes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Upcoming Ride Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-gray-800">Upcoming Commute</h2>
            </div>

            {upcomingTrip ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/20 border border-emerald-100/50 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                      Approved
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      Match Score: {upcomingTrip.match_score}%
                    </span>
                  </div>
                  
                  <div className="space-y-2 mt-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-gray-500">PICKUP</p>
                        <p className="text-xs text-gray-700 truncate font-medium">{upcomingTrip.ride_details.start_address}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2.5">
                      <Navigation className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-gray-500">DESTINATION</p>
                        <p className="text-xs text-gray-700 truncate font-medium">{upcomingTrip.ride_details.end_address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs border-t border-gray-50 pt-4">
                  <div>
                    <p className="text-gray-400 text-[10px]">DRIVER</p>
                    <p className="font-semibold text-gray-700 mt-0.5">
                      {upcomingTrip.ride_details.driver.first_name || upcomingTrip.ride_details.driver.email.split('@')[0]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-[10px]">DEPARTURE</p>
                    <p className="font-semibold text-gray-700 mt-0.5">
                      {new Date(upcomingTrip.ride_details.departure_time).toLocaleString([], {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <Shield className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-400">No scheduled rides</p>
                <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">
                  Book a commute or offer a ride to get started.
                </p>
              </div>
            )}
          </div>

          {upcomingTrip && (
            <Link 
              to="/my-trips"
              className="premium-btn-secondary w-full gap-2 mt-4 text-xs font-semibold"
            >
              <span>View Commute Details</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Grid: Recommended Rides and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recommended Rides */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Recommended Commutes</h3>
            <Link to="/find-ride" className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
              <span>Find More</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendedRides.length === 0 ? (
              <div className="col-span-2 bg-white border border-gray-100 rounded-3xl p-8 text-center text-xs text-gray-400">
                No active carpool offers right now. Check back later or create one!
              </div>
            ) : (
              recommendedRides.map((ride) => (
                <div key={ride.id} className="premium-card p-5 bg-white flex flex-col justify-between min-h-[180px]">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center">
                          {ride.driver.first_name?.charAt(0) || 'D'}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {ride.driver.first_name || ride.driver.email.split('@')[0]}
                        </span>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                        95% Match
                      </span>
                    </div>

                    <div className="space-y-1.5 mt-2">
                      <p className="text-xs text-gray-600 font-medium truncate">
                        <span className="text-gray-400 font-semibold mr-1">From:</span>
                        {ride.start_address.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-600 font-medium truncate">
                        <span className="text-gray-400 font-semibold mr-1">To:</span>
                        {ride.end_address.split(',')[0]}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-4 text-[10px] text-gray-500">
                    <span>
                      {new Date(ride.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-bold text-gray-700">₹{parseFloat(ride.price_per_seat).toFixed(0)} / seat</span>
                    <button 
                      onClick={() => navigate(`/find-ride?ride_id=${ride.id}`)}
                      className="text-emerald-600 font-semibold hover:underline"
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Panel */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Recent Commute Logs</h3>
          
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Completed commuting</p>
                <p className="text-[10px] text-gray-400 mt-0.5">HQ Office to Suburban Resident • Yesterday</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Offered ride shared</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Electronic City Route • 3 seats filled • 2 days ago</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Earned Carbon Credits</p>
                <p className="text-[10px] text-gray-400 mt-0.5">₹50 credited for sharing commute • 2 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
