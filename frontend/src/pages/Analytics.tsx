import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, Globe, ShieldAlert, Award, TrendingUp, 
  ChevronRight, MapPin, Navigation, Info 
} from 'lucide-react';
import api from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#6b7280'];

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('analytics/dashboard/');
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('Unable to load corporate analytics dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <span className="text-xs text-gray-500 font-medium">Aggregating analytics data...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-xs text-red-700 max-w-md mx-auto mt-12">
        {error}
      </div>
    );
  }

  const { metrics, department_usage, weekly_trend, popular_routes } = data;

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Corporate Sustainability & Analytics</h1>
        <p className="text-xs text-gray-400 mt-1">
          Monitor your organization's collective carbon footprint reduction and commuting metrics.
        </p>
      </div>

      {/* Aggregated Total Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm text-center">
          <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Share Journeys</span>
          <span className="block text-2xl font-extrabold text-gray-800 mt-1">{metrics.total_trips}</span>
          <span className="text-[10px] text-gray-400 mt-1 block">Commutes completed</span>
        </div>
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm text-center">
          <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Net Carbon Saved</span>
          <span className="block text-2xl font-extrabold text-emerald-600 mt-1">{parseFloat(metrics.co2_saved).toFixed(1)} kg</span>
          <span className="text-[10px] text-emerald-500 font-medium mt-1 block">✓ Equivalent to 47 trees planted</span>
        </div>
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm text-center">
          <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fuel Reduction</span>
          <span className="block text-2xl font-extrabold text-blue-600 mt-1">{parseFloat(metrics.fuel_saved).toFixed(1)} L</span>
          <span className="text-[10px] text-blue-500 font-medium mt-1 block">Saved from single-occupancy travel</span>
        </div>
        <div className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm text-center">
          <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Collective Cost Savings</span>
          <span className="block text-2xl font-extrabold text-gray-800 mt-1">₹{metrics.money_saved.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 mt-1 block">Saved in fuel sharing fares</span>
        </div>
      </div>

      {/* Recharts Diagrams Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Weekly Trend Line Chart */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Weekly Share Commute Trends</span>
            </h3>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Active</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="trips" stroke="#10b981" strokeWidth={2} name="Trips Taken" activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="co2_saved" stroke="#3b82f6" strokeWidth={2} name="CO2 Saved (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution Pie Chart */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Commute Share by Corporate Department</span>
            </h3>
            <span className="text-[9px] text-gray-400">Total metrics</span>
          </div>

          <div className="h-64 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={department_usage}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {department_usage.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Pie Legend panel */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[10px] font-medium text-gray-500">
              {department_usage.map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-gray-700 font-semibold">{entry.name}:</span>
                  <span>{entry.value} trips</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Popular Commute Routes */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-800">Popular Commuting Corridors</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {popular_routes.map((route: any, idx: number) => (
            <div key={idx} className="premium-card p-5 bg-white border border-gray-100 flex flex-col justify-between min-h-[140px]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    {route.match} Match
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">#{idx+1} route</span>
                </div>
                
                <div className="space-y-1 pl-2 border-l border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-700 truncate">{route.from}</p>
                  <p className="text-[11px] font-semibold text-gray-700 truncate">{route.to}</p>
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-gray-400 border-t border-gray-50 pt-3 mt-4">
                <span>{route.trips} trips weekly</span>
                <span className="text-emerald-600 font-semibold">-{route.co2}kg CO₂</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info notice bar */}
      <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-start gap-2 text-[10px] text-gray-400 leading-normal">
        <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <span>
          CO₂ reductions are calculated using standard corporate emissions offsets: carrying passengers avoids single-occupancy vehicles, saving ~0.12kg CO₂ and ~0.08L of fuel per traveler per kilometer.
        </span>
      </div>
    </div>
  );
};
