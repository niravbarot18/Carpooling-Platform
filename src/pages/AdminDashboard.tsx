import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Users, Car, MapPin, Leaf, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface OrgMetrics {
  total_employees: number;
  total_vehicles: number;
  total_trips: number;
  total_distance: number;
  co2_saved: number;
  money_saved: number;
  rides_offered: number;
}

interface PopularRoute {
  route: string;
  count: number;
}

interface FuelBreakdown {
  name: string;
  value: number;
}

interface MonthlyTrip {
  month: string;
  trips: number;
  co2_offset: number;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);
  const [popularRoutes, setPopularRoutes] = useState<PopularRoute[]>([]);
  const [fuelData, setFuelData] = useState<FuelBreakdown[]>([]);
  const [chartData, setChartData] = useState<MonthlyTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const metricsRes = await api.get('/reports/');
        setMetrics(metricsRes.data.metrics);

        const analyticsRes = await api.get('/analytics/');
        setPopularRoutes(analyticsRes.data.popular_routes || []);
        setFuelData(analyticsRes.data.fuel_breakdown || []);
        setChartData(analyticsRes.data.monthly_trips || []);
      } catch (err) {
        console.error("Error loading admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center space-x-2">
          <ShieldCheck className="text-primary" />
          <span>Company Admin Console</span>
        </h2>
        <p className="text-muted-foreground text-sm">
          Overview of {user?.organization_details?.name || 'Acme Corp'} carbon offsets, ride sharing analytics, and assets.
        </p>
      </div>

      {/* METRIC CARDS */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Staff</span>
              <h3 className="text-2xl font-extrabold">{metrics.total_employees}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fleet Vehicles</span>
              <h3 className="text-2xl font-extrabold">{metrics.total_vehicles}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Car size={20} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Shared Rides</span>
              <h3 className="text-2xl font-extrabold">{metrics.total_trips}</h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Org CO₂ Offset</span>
              <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{metrics.co2_saved.toFixed(1)} kg</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Leaf size={20} />
            </div>
          </div>
        </div>
      )}

      {/* GRAPH GRIDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: MONTHLY TRIPS BAR CHART */}
        <div className="bg-card border border-border rounded-2xl p-6 lg:col-span-2 flex flex-col h-[350px]">
          <h3 className="font-bold text-sm mb-4">Corporate Commuting Activity</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="trips" fill="hsl(var(--primary))" name="Total Shared Trips" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: VEHICLE FUEL BREAKDOWN PIE CHART */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col h-[350px]">
          <h3 className="font-bold text-sm mb-4">Fleet Fuel Breakdowns</h3>
          <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fuelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {fuelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Custom Legends list */}
            <div className="absolute bottom-2 flex justify-center space-x-3 text-[10px] text-muted-foreground">
              {fuelData.map((item, idx) => (
                <div key={item.name} className="flex items-center space-x-1">
                  <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span>{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* THIRD SECTION: POPULAR ROUTES TABLE */}
      <div className="bg-card border border-border rounded-2xl p-6 max-w-4xl">
        <h3 className="font-bold text-sm mb-4 flex items-center space-x-2">
          <MapPin size={16} className="text-primary" />
          <span>Top Commuting Routes</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] pb-2">
                <th className="py-2.5">Route</th>
                <th className="text-right">Activity Count</th>
              </tr>
            </thead>
            <tbody>
              {popularRoutes.map((route, idx) => (
                <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="py-3 font-semibold text-foreground">{route.route}</td>
                  <td className="text-right font-bold text-primary">{route.count} trips</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
