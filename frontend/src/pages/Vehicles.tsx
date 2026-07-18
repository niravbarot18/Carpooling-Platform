import React, { useState, useEffect } from 'react';
import { 
  Car, Plus, Trash2, CheckCircle, ShieldAlert, 
  Settings, Users, Fuel, PlusCircle, AlertCircle 
} from 'lucide-react';
import api from '../services/api';

export const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Vehicle form fields
  const [name, setName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [fuelType, setFuelType] = useState('Petrol');
  const [isDefault, setIsDefault] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('vehicles/');
      const data = response.data.results || response.data;
      setVehicles(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load registered vehicles.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);

    try {
      await api.post('vehicles/', {
        name,
        registration_number: regNo,
        capacity,
        fuel_type: fuelType,
        is_default: isDefault
      });

      setSuccess('Vehicle registered successfully!');
      setName('');
      setRegNo('');
      setCapacity(4);
      setFuelType('Petrol');
      setIsDefault(false);
      
      fetchVehicles();
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.registration_number?.[0] || 
        err.response?.data?.error || 
        'Unable to add vehicle. Please verify input details.'
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this vehicle? This action is irreversible.")) return;
    setError('');
    setSuccess('');

    try {
      await api.delete(`vehicles/${id}/`);
      setSuccess('Vehicle removed successfully.');
      fetchVehicles();
    } catch (err) {
      console.error(err);
      setError('Unable to remove vehicle.');
    }
  };

  const handleToggleDefault = async (vehicle: any) => {
    try {
      await api.patch(`vehicles/${vehicle.id}/`, {
        is_default: true
      });
      setSuccess(`${vehicle.name} set as your default carpool vehicle.`);
      fetchVehicles();
    } catch (err) {
      console.error(err);
      setError('Unable to change default vehicle.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Vehicles Management</h1>
        <p className="text-xs text-gray-400 mt-1">
          Register and configure your vehicles for carpool route offerings.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-emerald-700 text-xs">
          <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Vehicles list grid */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-gray-800">My Registered Fleet</h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="premium-card p-5 bg-white space-y-3 animate-pulse">
                  <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                  <div className="w-3/4 h-3 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-10 text-center text-xs text-gray-400">
              No vehicles registered yet. Use the registration panel to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicles.map((v) => (
                <div key={v.id} className="premium-card p-5 bg-white flex flex-col justify-between min-h-[170px] border border-gray-100">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">{v.name}</h3>
                        <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">{v.registration_number}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        v.is_default 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300 cursor-pointer'
                      }`}
                      onClick={() => !v.is_default && handleToggleDefault(v)}
                      >
                        {v.is_default ? 'Default' : 'Set Default'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-gray-500 mt-4 border-t border-gray-50 pt-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <span>Capacity: {v.capacity} seats</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5 text-gray-400" />
                        <span>Fuel: {v.fuel_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Remove vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add vehicle form panel */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">Add Vehicle</h2>
          </div>

          <form onSubmit={handleAddVehicle} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Vehicle Make & Model</label>
              <input
                type="text"
                required
                placeholder="e.g. Tesla Model 3, Honda Civic"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="premium-input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">License Plate Registration Number</label>
              <input
                type="text"
                required
                placeholder="e.g. MH 12 AB 1234"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="premium-input text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Capacity (Seats)</label>
                <input
                  type="number"
                  min={2}
                  max={9}
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value))}
                  className="premium-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fuel Type</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="premium-input text-xs"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="EV">Electric (EV)</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="defaultCheck"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 border border-gray-300 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="defaultCheck" className="text-xs font-semibold text-gray-500 select-none cursor-pointer">
                Set as default vehicle
              </label>
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full premium-btn-primary font-semibold text-xs mt-4 cursor-pointer disabled:opacity-50"
            >
              {formLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Register Vehicle</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Check icon
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
