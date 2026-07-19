import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, Phone, ShieldCheck, MapPin, Plus, Trash2, AlertCircle } from 'lucide-react';

interface SavedPlace {
  id: number;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
}

export const Profile: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const location = useLocation();
  const savedPlacesRef = useRef<HTMLDivElement>(null);
  
  // Profile edit states
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [emergName, setEmergName] = useState(user?.emergency_contact_name || '');
  const [emergPhone, setEmergPhone] = useState(user?.emergency_contact_phone || '');
  
  // Saved places states
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSavedPlaces = async () => {
    try {
      const res = await api.get('/saved-places/');
      setSavedPlaces(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setPlacesLoading(false);
    }
  };

  useEffect(() => {
    loadSavedPlaces();
  }, []);

  // Sync form inputs when user context loads
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone_number || '');
      setEmergName(user.emergency_contact_name || '');
      setEmergPhone(user.emergency_contact_phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (location.state && (location.state as any).scroll === 'saved-places') {
      setTimeout(() => {
        savedPlacesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [location.state]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await api.put('/profile/', {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        emergency_contact_name: emergName,
        emergency_contact_phone: emergPhone
      });
      setSuccess("Profile details updated successfully!");
      refreshProfile();
    } catch (err: any) {
      console.error(err);
      if (err.response?.data) {
        const errorDetails = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(errorDetails || "Failed to update profile.");
      } else {
        setError("Failed to update profile. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!placeName || !placeAddress) return;

    // Simulate coordinates (e.g. Bangalore center with random offset)
    const lat = (12.9716 + (Math.random() - 0.5) * 0.1).toFixed(6);
    const lng = (77.5946 + (Math.random() - 0.5) * 0.1).toFixed(6);

    try {
      await api.post('/saved-places/', {
        name: placeName,
        address: placeAddress,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      });
      setPlaceName('');
      setPlaceAddress('');
      loadSavedPlaces();
    } catch (err: any) {
      console.error(err);
      if (err.response?.data) {
        const errorDetails = Object.entries(err.response.data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
          .join(' | ');
        setError(errorDetails || "Failed to add saved place.");
      } else {
        setError("Failed to add saved place.");
      }
    }
  };

  const handleDeletePlace = async (id: number) => {
    try {
      await api.delete(`/saved-places/${id}/`);
      loadSavedPlaces();
    } catch (err) {
      console.error(err);
      alert("Failed to delete saved place.");
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile & Preferences</h2>
        <p className="text-muted-foreground text-sm">Manage contacts, edit emergency details, and register frequently visited work locations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* EDIT PROFILE FORM */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 lg:col-span-2">
          <h3 className="font-bold text-sm border-b border-border pb-2 flex items-center space-x-2">
            <User size={16} className="text-primary" />
            <span>Personal Settings</span>
          </h3>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3 font-semibold text-center">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 flex items-start space-x-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mobile Phone</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                    <Phone size={14} />
                  </span>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Company Email</label>
                <input
                  type="email"
                  disabled
                  value={user?.email}
                  className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            {/* EMERGENCY CONTACT SECTION */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck size={14} className="text-primary" />
                <span>SOS Emergency Contact</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={emergName}
                    onChange={(e) => setEmergName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={emergPhone}
                    onChange={(e) => setEmergPhone(e.target.value)}
                    placeholder="e.g. +15559999"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-xl transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></span>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </form>
        </div>

        {/* SAVED PLACES CONTAINER */}
        <div ref={savedPlacesRef} className="bg-card border border-border rounded-2xl p-6 flex flex-col space-y-6">
          <h3 className="font-bold text-sm border-b border-border pb-2 flex items-center space-x-2">
            <MapPin size={16} className="text-primary" />
            <span>Saved Places</span>
          </h3>

          {/* Places forms */}
          <form onSubmit={handleAddPlace} className="space-y-3">
            <input
              type="text"
              required
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="Label (e.g. Home, Work)"
              className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2 text-xs transition-all outline-none"
            />
            <input
              type="text"
              required
              value={placeAddress}
              onChange={(e) => setPlaceAddress(e.target.value)}
              placeholder="Address details..."
              className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2 text-xs transition-all outline-none"
            />
            <button
              type="submit"
              className="w-full py-2 bg-muted hover:bg-muted-foreground/15 border border-border font-bold rounded-xl text-[11px] transition-all flex items-center justify-center space-x-1.5"
            >
              <Plus size={12} />
              <span>Add Place</span>
            </button>
          </form>

          {/* List of Places */}
          <div className="overflow-y-auto max-h-56 space-y-3">
            {placesLoading ? (
              <p className="text-center text-[10px] text-muted-foreground animate-pulse">Loading saved places...</p>
            ) : savedPlaces.length === 0 ? (
              <p className="text-center text-[10px] text-muted-foreground italic py-4">No saved places found.</p>
            ) : (
              savedPlaces.map((place) => (
                <div key={place.id} className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/10">
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{place.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{place.address}</p>
                  </div>
                  <button
                    onClick={() => handleDeletePlace(place.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
