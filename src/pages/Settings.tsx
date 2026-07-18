import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  User as UserIcon, Calendar, Car, Wallet, History, 
  HelpCircle, LogOut, Mail, Send, CheckCircle2, ShieldCheck, Star
} from 'lucide-react';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, refreshProfile } = useAuth()!;

  const [activeTab, setActiveTab] = useState<'profile' | 'support'>('profile');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Profile coordinates inputs
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [reportingManager, setReportingManager] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [officeSeatDesk, setOfficeSeatDesk] = useState('');

  // Dynamic balance & verification
  const [walletBalance, setWalletBalance] = useState('0.00');

  // Support ticket form
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMsg, setSupportMsg] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Initialize profile coordinates
  useEffect(() => {
    if (user) {
      const full = `${user.first_name} ${user.last_name}`.trim();
      setFullName(full || user.username);
      setPhoneNumber(user.phone_number || '');
      setReportingManager(user.reporting_manager || 'Raj Patel');
      setEmail(user.email || '');
      setDepartment(user.department || 'Engineering');
      setOfficeSeatDesk(user.office_seat_desk || 'Gandhinagar HQ');
    }
  }, [user]);

  // Fetch current wallet balance
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const res = await api.get('/wallet/');
        setWalletBalance(res.data.balance || '0.00');
      } catch (err) {
        console.error("Failed to load wallet balance:", err);
      }
    };
    fetchWalletData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const parts = fullName.trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    try {
      await api.put('/profile/', {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        reporting_manager: reportingManager,
        department: department,
        office_seat_desk: officeSeatDesk
      });
      await refreshProfile();
      setSuccessMsg("Profile coordinates saved successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to save profile changes. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportLoading(true);
    try {
      await api.post('/support/', {
        name: supportName,
        email: supportEmail,
        message: supportMsg
      });
      setSupportSuccess(true);
      setSupportName('');
      setSupportEmail('');
      setSupportMsg('');
      setTimeout(() => setSupportSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert("Failed to send support request.");
    } finally {
      setSupportLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: UserIcon, action: () => setActiveTab('profile') },
    { id: 'trips', label: 'My Trips', icon: Calendar, action: () => navigate('/my-trips') },
    { id: 'vehicle', label: 'My Vehicle', icon: Car, action: () => navigate('/vehicles') },
    { id: 'payment', label: 'Payment Method', icon: Wallet, action: () => navigate('/wallet') },
    { id: 'history', label: 'Ride History', icon: History, action: () => navigate('/my-trips', { state: { tab: 'history' } }) },
    { id: 'support', label: 'Help & Support', icon: HelpCircle, action: () => setActiveTab('support') },
    { id: 'logout', label: 'Log Out', icon: LogOut, action: () => logout() }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Account & Corporate Settings</h2>
        <p className="text-muted-foreground text-xs">
          Manage your passenger profile, corporate coordinates, and access system portals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* SUB-SIDEBAR TAB SYSTEM */}
        <div className="md:col-span-1 bg-card border border-border rounded-2xl py-4 overflow-hidden shadow-sm space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={tab.action}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold transition-all text-left outline-none border-l-4 relative ${
                  isActive
                    ? 'border-rose-600 text-rose-600 bg-rose-500/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/10'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN PANEL CONTENT */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Coordinates Form Column */}
              <div className="lg:col-span-2 space-y-6 bg-card border border-border rounded-2xl p-6 shadow-sm">
                
                {/* Profile Card Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between border-b border-border pb-6 gap-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                    {/* Circle Profile Image */}
                    <div className="w-16 h-16 rounded-full bg-rose-600/10 text-rose-600 flex items-center justify-center font-extrabold text-2xl border border-rose-600/20 shadow-inner">
                      {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
                    </div>
                    
                    <div className="text-center sm:text-left space-y-1">
                      <h3 className="font-extrabold text-lg tracking-tight text-foreground">{fullName}</h3>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[10px] font-semibold text-muted-foreground">
                        <span>Employee</span>
                        <span>•</span>
                        <span>{department} Department</span>
                        <span>•</span>
                        <span className="flex items-center text-amber-500">
                          <Star size={10} className="fill-amber-500 mr-0.5" />
                          4.8 Trust
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Balance Card */}
                  <div className="bg-muted/40 border border-border rounded-xl p-3 px-5 text-center sm:text-right space-y-0.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">Wallet Balance</span>
                    <span className="text-lg font-black text-foreground">₹{parseFloat(walletBalance).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-extrabold text-[11px] text-muted-foreground tracking-wider uppercase">Corporate Coordinates</h4>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Verify and update your business department location and reporting contacts.
                  </p>
                </div>

                {successMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-3 font-semibold text-center">
                    {successMsg}
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 font-semibold text-center">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mobile Number</label>
                      <input
                        type="text"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reporting Manager</label>
                      <input
                        type="text"
                        required
                        value={reportingManager}
                        onChange={(e) => setReportingManager(e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Work Email</label>
                      <input
                        type="email"
                        disabled
                        value={email}
                        className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-xs text-muted-foreground outline-none cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Department</label>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Office Seat / Desk</label>
                      <input
                        type="text"
                        required
                        value={officeSeatDesk}
                        onChange={(e) => setOfficeSeatDesk(e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-rose-600 text-white hover:bg-rose-700 font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 flex items-center justify-center outline-none"
                  >
                    {actionLoading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    ) : (
                      "Save Profile Settings"
                    )}
                  </button>
                </form>

              </div>

              {/* Driver verification status & general info card */}
              <div className="space-y-6">
                
                {/* Rides offered & rides taken stats card */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="font-bold text-xs">Summary Metrics</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/40 p-3 rounded-xl text-center space-y-0.5">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Rides Offered</span>
                      <span className="text-xl font-black block text-foreground">0</span>
                      <span className="text-[8px] text-muted-foreground">As Driver</span>
                    </div>

                    <div className="bg-muted/40 p-3 rounded-xl text-center space-y-0.5">
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">Rides Taken</span>
                      <span className="text-xl font-black block text-foreground">0</span>
                      <span className="text-[8px] text-muted-foreground">As Passenger</span>
                    </div>
                  </div>
                </div>

                {/* Driver verification block */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center space-x-2 text-rose-600">
                    <ShieldCheck size={18} />
                    <h4 className="font-bold text-xs">Driver Verification Status</h4>
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Register or update your driving license to offer and host carpool pools. This is required for safety and insurance.
                  </p>

                  <div className="border border-dashed border-border rounded-xl p-3 text-center bg-muted/20">
                    <span className="text-[10px] font-bold text-rose-600 block">Not Verified</span>
                    <button 
                      onClick={() => navigate('/profile')}
                      className="text-[9px] font-bold text-muted-foreground hover:text-foreground underline mt-1 outline-none"
                    >
                      Update profile document verification
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm max-w-xl">
              <div className="flex items-center space-x-2">
                <HelpCircle size={20} className="text-rose-600" />
                <h3 className="font-bold text-base">Help & Support</h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Encountering trouble? Send our support team a ticket, and we will get back to you shortly.
              </p>

              {supportSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl p-4 flex items-center space-x-2 font-semibold">
                  <CheckCircle2 size={16} />
                  <span>Ticket submitted successfully!</span>
                </div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    required
                    value={supportName}
                    onChange={(e) => setSupportName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs transition-all outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-9 pr-4 py-2.5 text-xs transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Describe Issue</label>
                  <textarea
                    required
                    rows={4}
                    value={supportMsg}
                    onChange={(e) => setSupportMsg(e.target.value)}
                    placeholder="What seems to be the problem? Describe any errors..."
                    className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-xs transition-all outline-none resize-none leading-relaxed"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="w-full py-2.5 bg-rose-600 text-white hover:bg-rose-700 font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 flex items-center justify-center space-x-1.5 outline-none"
                >
                  {supportLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  ) : (
                    <>
                      <Send size={12} />
                      <span>Send Support Request</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
