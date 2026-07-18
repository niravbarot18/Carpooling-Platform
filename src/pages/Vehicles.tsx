import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Car, Trash2, Plus, AlertCircle } from 'lucide-react';

interface Vehicle {
  id: number;
  name: string;
  registration_number: string;
  fuel_type: 'petrol' | 'diesel' | 'cng' | 'electric';
  color: string;
  mileage: string;
  seat_capacity: number;
}

export const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [name, setName] = useState('');
  const [regNum, setRegNum] = useState('');
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel' | 'cng' | 'electric'>('petrol');
  const [color, setColor] = useState('');
  const [mileage, setMileage] = useState('');
  const [capacity, setCapacity] = useState('4');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVehicles = async () => {
    try {
      const res = await api.get('/vehicles/');
      setVehicles(res.data.results || res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load vehicle list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionLoading(true);

    const payload = {
      name,
      registration_number: regNum,
      fuel_type: fuelType,
      color,
      mileage: Number(mileage),
      seat_capacity: Number(capacity)
    };

    try {
      await api.post('/vehicles/', payload);
      // Reset form fields
      setName('');
      setRegNum('');
      setColor('');
      setMileage('');
      setCapacity('4');
      loadVehicles();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.registration_number?.[0] || 
        err.response?.data?.mileage?.[0] || 
        "Failed to register vehicle. Please verify input data."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this vehicle? Any active rides linked to it will be affected.")) return;
    try {
      await api.delete(`/vehicles/${id}/`);
      loadVehicles();
    } catch (err) {
      console.error(err);
      alert("Failed to delete vehicle.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Vehicles Management</h2>
        <p className="text-muted-foreground text-sm">Register personal cars, set fuel metrics, and display seat availability to coworkers.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* VEHICLE LIST */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-base border-b border-border pb-2">Registered Vehicles ({vehicles.length})</h3>
            
            {vehicles.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground text-sm flex flex-col items-center space-y-2">
                <Car size={32} className="text-muted-foreground/60" />
                <p>No vehicles registered. Register your car using the panel on the right.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicles.map((v) => (
                  <div key={v.id} className="bg-card border border-border rounded-2xl p-5 hover-glow flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Car size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm leading-tight">{v.name}</h4>
                            <span className="text-[10px] text-muted-foreground">{v.registration_number}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          title="Delete Vehicle"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-1 border-t border-border pt-3 text-center text-[10px] leading-tight text-muted-foreground">
                        <div>
                          <p className="font-bold text-foreground mb-0.5 capitalize">{v.fuel_type}</p>
                          <span>Fuel Type</span>
                        </div>
                        <div>
                          <p className="font-bold text-foreground mb-0.5">{v.mileage} km/unit</p>
                          <span>Efficiency</span>
                        </div>
                        <div>
                          <p className="font-bold text-foreground mb-0.5">{v.seat_capacity} seats</p>
                          <span>Capacity</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ADD VEHICLE FORM */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
            <h3 className="font-bold text-sm border-b border-border pb-2 flex items-center space-x-2">
              <Plus size={16} className="text-primary" />
              <span>Register a Car</span>
            </h3>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 flex items-start space-x-2">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Car Model Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tesla Model 3"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registration Number</label>
                <input
                  type="text"
                  required
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  placeholder="e.g. CA-94043"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as any)}
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  >
                    <option value="petrol">Petrol</option>
                    <option value="diesel">Diesel</option>
                    <option value="cng">CNG</option>
                    <option value="electric">Electric</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Color</label>
                  <input
                    type="text"
                    required
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g. Metallic Grey"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mileage (km/l or km/kWh)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    min="1"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="e.g. 15.5"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Seat Capacity</label>
                  <input
                    type="number"
                    required
                    min="2"
                    max="10"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center space-x-2"
              >
                {actionLoading ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
                ) : (
                  <span>Register Car</span>
                )}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
};
