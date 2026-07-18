import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Wallet,
  Leaf,
  IndianRupee,
  Compass,
  ArrowRight,
  PlusCircle,
  MapPin,
  CheckCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Trip {
  id: number;
  status: string;
  ride_details: {
    pickup_location: string;
    destination_location: string;
    driver_details: { username: string };
  };
}

interface LeaderboardItem {
  rank: number;
  name: string;
  co2_saved: number;
  trips: number;
}

interface MonthlyTrip {
  month: string;
  trips: number;
  co2_offset: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [chartData, setChartData] = useState<MonthlyTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fuel & Operational Cost parameters
  const [fuelEfficiency, setFuelEfficiency] = useState(15.0);
  const [fuelPrice, setFuelPrice] = useState(103.50);
  const [totalTripsCount, setTotalTripsCount] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load Wallet
        const walletRes = await api.get('/wallet/');
        setWalletBalance(walletRes.data.balance);

        // Load Active Trips
        const tripsRes = await api.get('/trips/');
        const active = (tripsRes.data.results || tripsRes.data).filter(
          (t: any) => t.status === 'started' || t.status === 'in_progress'
        );
        setActiveTrips(active);

        // Load Leaderboard and Chart data from Analytics
        const analyticsRes = await api.get('/analytics/');
        setLeaderboard(analyticsRes.data.leaderboard || []);
        setChartData(analyticsRes.data.monthly_trips || []);

        // Load Passenger Bookings count
        const bookingsRes = await api.get('/book/', { params: { role_type: 'passenger' } });
        const list = bookingsRes.data.results || bookingsRes.data;
        const completedTrips = list.filter((b: any) => b.ride_details.status === 'completed' && b.status === 'approved');
        setTotalTripsCount(completedTrips.length);

        // Load System Configurations
        try {
          const configRes = await api.get('/system-config/');
          setFuelEfficiency(configRes.data.default_fuel_efficiency || 15.0);
          setFuelPrice(configRes.data.fuel_price || 103.50);
        } catch (configErr) {
          console.error("Failed to load system config:", configErr);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadDashboardData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Personal metrics (defaults to user metrics)
  const distance = user ? parseFloat(user.total_distance) : 0.0;
  const co2 = user ? parseFloat(user.co2_saved) : 0.0;
  const money = user ? parseFloat(user.money_saved) : 0.0;

  // Cost analysis metrics
  const totalFuelConsumed = fuelEfficiency > 0 ? (distance / fuelEfficiency) : 0.0;
  const totalFuelCost = totalFuelConsumed * fuelPrice;
  const costPerKm = distance > 0 ? (totalFuelCost / distance) : 0.0;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hello, {user?.first_name}!</h2>
          <p className="text-muted-foreground text-sm">
            Here is your commute statistics summary for today.
          </p>
        </div>
        {user?.role !== 'admin' && (
          <div className="flex items-center space-x-3">
            <Link
              to="/find-ride"
              className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-primary/25 text-sm"
            >
              <MapPin size={16} />
              <span>Find a Ride</span>
            </Link>
            <Link
              to="/offer-ride"
              className="flex items-center space-x-2 bg-card border border-border hover:bg-muted/40 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm"
            >
              <PlusCircle size={16} />
              <span>Offer a Ride</span>
            </Link>
          </div>
        )}
      </div>

      {/* Cost Analysis & Fuel Efficiency Panel */}
      {user?.role !== 'admin' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm tracking-tight text-foreground">Travel Cost & Fuel Efficiency Analysis</h3>
              <p className="text-[10px] text-muted-foreground">Detailed breakdown of shared trip mileage, operational fuel costs, and efficiency</p>
            </div>
            <div className="px-3 py-1 bg-primary/10 text-primary font-extrabold text-[10px] rounded-lg self-start">
              Parameters: {fuelEfficiency.toFixed(1)} km/L • ₹{fuelPrice.toFixed(2)}/L
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-muted/30 border border-border/40 p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Commutes</span>
              <h4 className="text-xl font-black text-foreground">{totalTripsCount} Trips</h4>
              <p className="text-[9px] text-muted-foreground leading-none">Completed passenger pools</p>
            </div>

            <div className="bg-muted/30 border border-border/40 p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Distance Travelled</span>
              <h4 className="text-xl font-black text-foreground">{distance.toFixed(1)} km</h4>
              <p className="text-[9px] text-muted-foreground leading-none">Shared carpool distance</p>
            </div>

            <div className="bg-muted/30 border border-border/40 p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Estimated Fuel Spent</span>
              <h4 className="text-xl font-black text-rose-600 dark:text-rose-400">₹{totalFuelCost.toFixed(2)}</h4>
              <p className="text-[9px] text-muted-foreground leading-none">Based on shared distance</p>
            </div>

            <div className="bg-muted/30 border border-border/40 p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Cost per Kilometer</span>
              <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{costPerKm.toFixed(2)}/km</h4>
              <p className="text-[9px] text-muted-foreground leading-none">Operational efficiency rate</p>
            </div>

            <div className="bg-muted/30 border border-border/40 p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fuel Efficiency</span>
              <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400">{fuelEfficiency.toFixed(1)} km/L</h4>
              <p className="text-[9px] text-muted-foreground leading-none">Average commuter vehicle</p>
            </div>
          </div>
        </div>
      )}

      {/* Glow Active Trip Panel if exists */}
      {activeTrips.length > 0 && (
        <div className="bg-primary/10 border border-primary/25 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 shadow-lg shadow-primary/5 animate-pulse-slow">
          <div className="flex items-center space-x-4">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <div>
              <h4 className="font-bold text-sm">You have an active trip running right now!</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Route: {activeTrips[0].ride_details.pickup_location} → {activeTrips[0].ride_details.destination_location}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/tracking/${activeTrips[0].id}`)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 transition-all shadow-md"
          >
            <span>Open Live Map</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Wallet balance */}
        <div className="bg-card border border-border rounded-2xl p-6 flex items-start justify-between relative overflow-hidden group hover:border-primary/20 transition-all">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wallet Balance</p>
            <h3 className="text-2xl font-bold tracking-tight">₹{Number(walletBalance).toFixed(2)}</h3>
            {user?.role !== 'admin' && (
              <Link to="/wallet" className="text-xs text-primary font-semibold hover:underline flex items-center space-x-1 pt-2">
                <span>Recharge wallet</span>
                <ArrowRight size={12} />
              </Link>
            )}
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Wallet size={20} />
          </div>
        </div>

        {/* Carbon saved */}
        <div className="bg-card border border-border rounded-2xl p-6 flex items-start justify-between relative overflow-hidden group hover:border-emerald-500/20 transition-all">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Carbon Offset</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{co2.toFixed(1)} kg</h3>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center space-x-1 pt-3">
              <TrendingUp size={12} />
              <span>CO₂ footprint saved</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Leaf size={20} />
          </div>
        </div>

        {/* Money saved */}
        <div className="bg-card border border-border rounded-2xl p-6 flex items-start justify-between relative overflow-hidden group hover:border-indigo-500/20 transition-all">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Money Saved</p>
            <h3 className="text-2xl font-bold tracking-tight">₹{money.toFixed(2)}</h3>
            <span className="text-[10px] text-indigo-500 font-semibold flex items-center space-x-1 pt-3">
              <CheckCircle size={12} />
              <span>Fuel & commute savings</span>
            </span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <IndianRupee size={20} />
          </div>
        </div>

        {/* Distance covered */}
        <div className="bg-card border border-border rounded-2xl p-6 flex items-start justify-between relative overflow-hidden group hover:border-amber-500/20 transition-all">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distance Shared</p>
            <h3 className="text-2xl font-bold tracking-tight">{distance.toFixed(1)} km</h3>
            <span className="text-[10px] text-amber-500 font-semibold flex items-center space-x-1 pt-3">
              <Compass size={12} />
              <span>Total shared mileage</span>
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Compass size={20} />
          </div>
        </div>
      </div>

      {/* SECOND SECTION: GRAPH & LEADERBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRAPH PANEL */}
        <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2 flex flex-col h-96">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base">Shared Trips Statistics</h3>
              <p className="text-xs text-muted-foreground">Monthly carpooling logs & carbon offset metrics</p>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} 
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="trips" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LEADERBOARD PANEL */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col h-96">
          <div className="flex items-center space-x-2 mb-6">
            <Award className="text-primary" size={20} />
            <div>
              <h3 className="font-bold text-base">Eco Leaderboard</h3>
              <p className="text-xs text-muted-foreground">Top carbon offsetting employees</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {leaderboard.map((item) => (
              <div key={item.rank} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/20 transition-all">
                <div className="flex items-center space-x-3 min-w-0">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    item.rank === 1 ? 'bg-amber-500/10 text-amber-600' :
                    item.rank === 2 ? 'bg-slate-400/10 text-slate-500' :
                    item.rank === 3 ? 'bg-amber-700/10 text-amber-800' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {item.rank}
                  </span>
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{item.co2_saved.toFixed(1)} kg</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.trips} trips</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
