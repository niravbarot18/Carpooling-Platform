import React, { useState, useEffect } from 'react';
import { 
  User, CheckCircle, ShieldAlert, Award, 
  ToggleLeft, ToggleRight, Save, Info, AlertCircle 
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  // Input states
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || 'Engineering');

  // Preference states
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [carbonReminders, setCarbonReminders] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone || '');
      setDepartment(user.department || 'Engineering');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await api.patch('auth/profile/', {
        first_name: firstName,
        last_name: lastName,
        phone,
        department
      });
      setSuccess('Profile configuration saved successfully.');
      refreshProfile(); // Sync global auth session
    } catch (err) {
      console.error(err);
      setError('Unable to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Account Settings</h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure your employee profile details and notification preferences.
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
        {/* Profile Edit form panel */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-500" />
            <span>Personal Particulars</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="premium-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="premium-input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Employee ID (Read Only)</label>
                <input
                  type="text"
                  disabled
                  value={user?.employee_id || 'N/A'}
                  className="premium-input text-xs bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="premium-input text-xs"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                  <option value="HR">Human Resources</option>
                  <option value="Product">Product Management</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="premium-input text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="premium-btn-primary font-semibold text-xs gap-2 px-6 mt-4 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Preference Settings Sidebar */}
        <div className="space-y-6">
          {/* Notification Alerts */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-800">Alert Communications</h3>
            
            <div className="space-y-4 text-xs font-medium text-gray-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 font-semibold">Email Notifications</p>
                  <p className="text-[9px] text-gray-400">Receive booking updates</p>
                </div>
                <button onClick={() => setEmailAlerts(!emailAlerts)}>
                  {emailAlerts ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 font-semibold">SMS Alert Pings</p>
                  <p className="text-[9px] text-gray-400">Receive live route reminders</p>
                </div>
                <button onClick={() => setSmsAlerts(!smsAlerts)}>
                  {smsAlerts ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 font-semibold">Carbon Credits Digests</p>
                  <p className="text-[9px] text-gray-400">Receive monthly reduction summaries</p>
                </div>
                <button onClick={() => setCarbonReminders(!carbonReminders)}>
                  {carbonReminders ? <ToggleRight className="w-8 h-8 text-emerald-500" /> : <ToggleLeft className="w-8 h-8 text-gray-300" />}
                </button>
              </div>
            </div>
          </div>

          {/* Rating Summary Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm text-center">
            <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Carpool Rating Summary</span>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Award className="w-7 h-7 text-amber-500" />
              <span className="text-2xl font-extrabold text-gray-800">
                {user?.average_rating ? parseFloat(user.average_rating.toString()).toFixed(1) : '5.0'}
              </span>
            </div>
            <p className="text-[9px] text-gray-400 mt-2">Your score is aggregated from peer rating feedback sheets.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Check Icon
const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
