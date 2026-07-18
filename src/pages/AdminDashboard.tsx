import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShieldCheck, Users, Car, MapPin, Leaf, Clock, Settings, 
  Trash, CheckCircle2, XCircle, Edit3, Save, Sparkles, UserCheck 
} from 'lucide-react';
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

interface Employee {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  is_active?: boolean;
  is_verified?: boolean;
  reporting_manager: string;
  department: string;
  office_seat_desk: string;
}

interface Vehicle {
  id: number;
  name: string;
  registration_number: string;
  capacity: number;
  owner_details?: { username: string; email: string };
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'vehicles' | 'config'>('overview');
  const [loading, setLoading] = useState(true);

  // Overview metrics states
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);
  const [popularRoutes, setPopularRoutes] = useState<PopularRoute[]>([]);
  const [fuelData, setFuelData] = useState<FuelBreakdown[]>([]);
  const [chartData, setChartData] = useState<MonthlyTrip[]>([]);

  // Employee Management states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingEmp, setEditingEmp] = useState<number | null>(null);
  const [empFullName, setEmpFullName] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empSeat, setEmpSeat] = useState('');
  const [empManager, setEmpManager] = useState('');
  const [empRole, setEmpRole] = useState('user');

  // Vehicle Management states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Carpooling Operational parameters
  const [fuelPrice, setFuelPrice] = useState(103.50);
  const [fuelEfficiency, setFuelEfficiency] = useState(15.00);
  const [co2Factor, setCo2Factor] = useState(0.15);
  const [seatsLimit, setSeatsLimit] = useState(6);
  const [requireLicense, setRequireLicense] = useState(true);
  const [configSuccess, setConfigSuccess] = useState(false);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Overview Report
      const metricsRes = await api.get('/reports/');
      setMetrics(metricsRes.data.metrics);

      // 2. Fetch Analytics
      const analyticsRes = await api.get('/analytics/');
      setPopularRoutes(analyticsRes.data.popular_routes || []);
      setFuelData(analyticsRes.data.fuel_breakdown || []);
      setChartData(analyticsRes.data.monthly_trips || []);

      // 3. Fetch Operational Configurations
      const configRes = await api.get('/system-config/');
      setFuelPrice(configRes.data.fuel_price || 103.50);
      setFuelEfficiency(configRes.data.default_fuel_efficiency || 15.00);
      setCo2Factor(configRes.data.co2_factor || 0.15);
      setSeatsLimit(configRes.data.max_seats_limit || 6);
      setRequireLicense(configRes.data.require_license_for_driver ?? true);

      // 4. Fetch Employees
      const empRes = await api.get('/admin/employees/');
      setEmployees(empRes.data.results || empRes.data || []);

      // 5. Fetch Vehicles
      const vehRes = await api.get('/vehicles/');
      setVehicles(vehRes.data.results || vehRes.data || []);
    } catch (err) {
      console.error("Error loading administrative datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadData();
    }
  }, [user]);

  // Employee Toggles (platform access activation)
  const toggleEmployeeActive = async (empId: number, currentActive: boolean) => {
    try {
      await api.patch(`/admin/employees/${empId}/`, { is_active: !currentActive });
      setEmployees(employees.map(emp => emp.id === empId ? { ...emp, is_active: !currentActive } : emp));
    } catch (err) {
      alert("Failed to toggle employee access status.");
    }
  };

  // Driver license verification
  const toggleDriverVerified = async (empId: number, currentVerified: boolean) => {
    try {
      await api.patch(`/admin/employees/${empId}/`, { is_verified: !currentVerified });
      setEmployees(employees.map(emp => emp.id === empId ? { ...emp, is_verified: !currentVerified } : emp));
    } catch (err) {
      alert("Failed to update driver license verification.");
    }
  };

  // Employee Record Edit
  const startEditEmployee = (emp: Employee) => {
    setEditingEmp(emp.id);
    setEmpFullName(`${emp.first_name} ${emp.last_name}`.trim());
    setEmpDept(emp.department || '');
    setEmpSeat(emp.office_seat_desk || '');
    setEmpManager(emp.reporting_manager || '');
    setEmpRole(emp.role);
  };

  const handleSaveEmployee = async (empId: number) => {
    const parts = empFullName.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    try {
      await api.patch(`/admin/employees/${empId}/`, {
        first_name: firstName,
        last_name: lastName,
        department: empDept,
        office_seat_desk: empSeat,
        reporting_manager: empManager,
        role: empRole
      });
      setEditingEmp(null);
      loadData();
    } catch (err) {
      alert("Failed to save employee profile updates.");
    }
  };

  // Delete fleet vehicle
  const handleDeleteVehicle = async (vehId: number) => {
    if (!window.confirm("Are you sure you want to remove this vehicle from the registered fleet?")) return;
    try {
      await api.delete(`/vehicles/${vehId}/`);
      setVehicles(vehicles.filter(v => v.id !== vehId));
      if (metrics) {
        setMetrics({ ...metrics, total_vehicles: metrics.total_vehicles - 1 });
      }
    } catch (err) {
      alert("Failed to delete fleet vehicle.");
    }
  };

  // Save Operational Settings
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/system-config/', {
        fuel_price: fuelPrice,
        default_fuel_efficiency: fuelEfficiency,
        co2_factor: co2Factor,
        max_seats_limit: seatsLimit,
        require_license_for_driver: requireLicense
      });
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
      loadData();
    } catch (err) {
      alert("Failed to update operational configurations.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center space-x-2">
            <ShieldCheck className="text-rose-600" />
            <span>Corporate Admin Console</span>
          </h2>
          <p className="text-muted-foreground text-xs">
            Manage employees, audit vehicles, verify drivers, and configure operational variables.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: Clock },
            { id: 'employees', label: 'Employee Records', icon: Users },
            { id: 'vehicles', label: 'Fleet Vehicles', icon: Car },
            { id: 'config', label: 'Carpool Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all outline-none ${
                  activeTab === tab.id
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                    : 'bg-card border border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Metrics summary widgets */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Employees</span>
                  <h3 className="text-2xl font-black text-foreground">{metrics.total_employees}</h3>
                  <p className="text-[9px] text-muted-foreground">Registered on platform</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <Users size={18} />
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registered Vehicles</span>
                  <h3 className="text-2xl font-black text-foreground">{metrics.total_vehicles}</h3>
                  <p className="text-[9px] text-muted-foreground">Approved commuter fleet</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Car size={18} />
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Carpool Commutes</span>
                  <h3 className="text-2xl font-black text-foreground">{metrics.total_trips}</h3>
                  <p className="text-[9px] text-muted-foreground">Trips completed successfully</p>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                  <Clock size={18} />
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Corporate CO₂ Offset</span>
                  <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.co2_saved.toFixed(1)} kg</h3>
                  <p className="text-[9px] text-muted-foreground">Total carbon emissions offset</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <Leaf size={18} />
                </div>
              </div>
            </div>
          )}

          {/* Charts block */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col h-[350px]">
              <h3 className="font-bold text-sm mb-4">Fleet Fuel Breakdowns</h3>
              <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
                {fuelData.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No fuel logs collected yet.</p>
                ) : (
                  <>
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
                    <div className="absolute bottom-2 flex justify-center space-x-3 text-[10px] text-muted-foreground">
                      {fuelData.map((item, idx) => (
                        <div key={item.name} className="flex items-center space-x-1">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                          <span>{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Popular routes */}
          <div className="bg-card border border-border rounded-2xl p-6 max-w-4xl shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center space-x-2">
              <MapPin size={16} className="text-rose-600" />
              <span>Top Commuting Routes</span>
            </h3>
            <div className="overflow-x-auto">
              {popularRoutes.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No trips matching popular routes.</p>
              ) : (
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
                        <td className="text-right font-bold text-rose-600">{route.count} trips</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEE RECORDS */}
      {activeTab === 'employees' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h3 className="font-bold text-sm text-foreground">Employee Records & Platform Access</h3>
            <p className="text-[10px] text-muted-foreground">Monitor participation, modify coordinates, verify driving documents, and toggle platform access.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                  <th className="py-3">Employee</th>
                  <th>Department / Seat</th>
                  <th>Reporting Manager</th>
                  <th>Access Permission</th>
                  <th>Driver Verification</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const isEditing = editingEmp === emp.id;
                  return (
                    <tr key={emp.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-all">
                      {/* Name / Email */}
                      <td className="py-4">
                        {isEditing ? (
                          <div className="space-y-1 pr-2">
                            <input
                              type="text"
                              value={empFullName}
                              onChange={(e) => setEmpFullName(e.target.value)}
                              className="bg-background border border-border rounded px-2 py-1 text-xs outline-none"
                            />
                            <p className="text-[10px] text-muted-foreground">{emp.email}</p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="font-bold text-foreground">{emp.first_name} {emp.last_name || emp.username}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.email}</p>
                          </div>
                        )}
                      </td>

                      {/* Dept / Seat */}
                      <td>
                        {isEditing ? (
                          <div className="space-y-1 pr-2">
                            <input
                              type="text"
                              value={empDept}
                              onChange={(e) => setEmpDept(e.target.value)}
                              placeholder="Dept"
                              className="bg-background border border-border rounded px-2 py-1 text-[11px] outline-none"
                            />
                            <input
                              type="text"
                              value={empSeat}
                              onChange={(e) => setEmpSeat(e.target.value)}
                              placeholder="Seat"
                              className="bg-background border border-border rounded px-2 py-1 text-[11px] outline-none"
                            />
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <p className="font-semibold">{emp.department || 'N/A'}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.office_seat_desk || 'Desk N/A'}</p>
                          </div>
                        )}
                      </td>

                      {/* Reporting manager */}
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={empManager}
                            onChange={(e) => setEmpManager(e.target.value)}
                            className="bg-background border border-border rounded px-2 py-1 text-[11px] outline-none"
                          />
                        ) : (
                          <span className="font-semibold text-muted-foreground">{emp.reporting_manager || 'None'}</span>
                        )}
                      </td>

                      {/* Platform Access Toggle */}
                      <td>
                        <button
                          onClick={() => toggleEmployeeActive(emp.id, emp.is_active ?? true)}
                          className={`px-2.5 py-1 rounded-full font-bold text-[9px] tracking-wider uppercase transition-all flex items-center space-x-1 border ${
                            emp.is_active ?? true
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'
                          }`}
                        >
                          {emp.is_active ?? true ? (
                            <>
                              <CheckCircle2 size={10} />
                              <span>Granted</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={10} />
                              <span>Suspended</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Driver verification status */}
                      <td>
                        <button
                          onClick={() => toggleDriverVerified(emp.id, emp.is_verified ?? false)}
                          className={`px-2.5 py-1 rounded-full font-bold text-[9px] tracking-wider uppercase transition-all flex items-center space-x-1 border ${
                            emp.is_verified
                              ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/20'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
                          }`}
                        >
                          <UserCheck size={10} />
                          <span>{emp.is_verified ? 'Verified' : 'Unverified'}</span>
                        </button>
                      </td>

                      {/* Edit / Save actions */}
                      <td className="text-right">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEmployee(emp.id)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all inline-flex items-center space-x-1 px-2.5 font-bold outline-none"
                          >
                            <Save size={10} />
                            <span>Save</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => startEditEmployee(emp)}
                            className="p-1 text-rose-600 hover:bg-rose-600/10 rounded transition-all inline-flex items-center space-x-1 px-2 font-bold outline-none"
                          >
                            <Edit3 size={10} />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FLEET VEHICLES */}
      {activeTab === 'vehicles' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div>
            <h3 className="font-bold text-sm text-foreground">Fleet Vehicle Audits</h3>
            <p className="text-[10px] text-muted-foreground">Review registered employee vehicles, passenger capacities, and remove obsolete cars from database.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[9px] tracking-wider">
                  <th className="py-3">Vehicle Details</th>
                  <th>Plate Registration No.</th>
                  <th>Capacity Limit</th>
                  <th>Owner Employee</th>
                  <th className="text-right">Audit</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground italic">No vehicles registered in the fleet database.</td>
                  </tr>
                ) : (
                  vehicles.map((veh) => (
                    <tr key={veh.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-all">
                      <td className="py-4 font-bold text-foreground">{veh.name}</td>
                      <td className="font-mono text-muted-foreground">{veh.registration_number}</td>
                      <td>{veh.capacity} Seater</td>
                      <td>{veh.owner_details?.username || 'System Owner'}</td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDeleteVehicle(veh.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all outline-none"
                          title="Remove Vehicle"
                        >
                          <Trash size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: OPERATIONAL CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in max-w-xl">
          <div>
            <h3 className="font-bold text-sm text-foreground">Operational settings & configs</h3>
            <p className="text-[10px] text-muted-foreground">Maintain default fuel costs, average consumption coefficients, driver check limitations, and seat validation caps.</p>
          </div>

          {configSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-4 flex items-center space-x-2 font-semibold">
              <CheckCircle2 size={16} />
              <span>Configurations saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fuel Cost (₹ / Liter)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(parseFloat(e.target.value))}
                  className="w-full bg-background border border-border focus:border-rose-500 focus:ring-1 focus:rose-500 rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fuel Efficiency (km / L)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fuelEfficiency}
                  onChange={(e) => setFuelEfficiency(parseFloat(e.target.value))}
                  className="w-full bg-background border border-border focus:border-rose-500 focus:ring-1 focus:rose-500 rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CO₂ Savings Factor (kg / km)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={co2Factor}
                  onChange={(e) => setCo2Factor(parseFloat(e.target.value))}
                  className="w-full bg-background border border-border focus:border-rose-500 focus:ring-1 focus:rose-500 rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Maximum Allowed Seats</label>
                <input
                  type="number"
                  required
                  value={seatsLimit}
                  onChange={(e) => setSeatsLimit(parseInt(e.target.value))}
                  className="w-full bg-background border border-border focus:border-rose-500 focus:ring-1 focus:rose-500 rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                />
              </div>
            </div>

            {/* License verification requirement toggle */}
            <div className="bg-muted/40 p-4 border border-border/40 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <h4 className="font-bold text-xs text-foreground">Require Driver License Verification</h4>
                <p className="text-[9px] text-muted-foreground leading-relaxed">Require drivers to get verified before setting up carpool offerings.</p>
              </div>
              <input
                type="checkbox"
                checked={requireLicense}
                onChange={(e) => setRequireLicense(e.target.checked)}
                className="h-4 w-4 text-rose-600 border-border focus:ring-rose-500 rounded cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 flex items-center justify-center space-x-1 outline-none"
            >
              <Sparkles size={12} />
              <span>Save System Operational Parameters</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
