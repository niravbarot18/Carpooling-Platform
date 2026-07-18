import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Home, Search, PlusCircle, Calendar, Car, Wallet, BarChart3, Settings,
  User, Bell, LogOut, Shield, CheckCircle, Clock, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Hook into live notifications
  const { messages: liveMessages } = useSocket('/ws/notifications/');

  // Sync notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Update notification list on new websocket alert
  useEffect(() => {
    if (liveMessages.length > 0) {
      const latestMsg = liveMessages[liveMessages.length - 1];
      if (latestMsg && latestMsg.type === 'notification') {
        setNotifications((prev) => [latestMsg.data, ...prev]);
        // Trigger browser notification or visual state
      }
    }
  }, [liveMessages]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('notifications/');
      // Django returns paginated results, extract .results
      const data = response.data.results || response.data;
      setNotifications(data);
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('notifications/mark_all_read/');
      setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Find Ride', path: '/find-ride', icon: Search },
    { name: 'Offer Ride', path: '/offer-ride', icon: PlusCircle },
    { name: 'My Trips', path: '/my-trips', icon: Calendar },
    { name: 'Vehicles', path: '/vehicles', icon: Car },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-lg">
                C
              </div>
              <span className="font-semibold text-gray-800 text-lg tracking-tight">CoRoute</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium ml-1">Enterprise</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile section in sidebar footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </p>
              <p className="text-[10px] text-gray-400 truncate">{user?.department}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-40">
          {/* Search bar */}
          <div className="w-96 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trips, locations..."
              className="w-full h-10 bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 text-sm outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50/20 transition-all"
            />
          </div>

          {/* Right Header Panel */}
          <div className="flex items-center gap-4">
            {/* Wallet balance display widget */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>₹{parseFloat(user?.wallet_balance?.toString() || '0').toFixed(2)}</span>
            </div>

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 border border-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-50 relative transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-emerald-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center ring-4 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 py-2">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
                    <span className="font-semibold text-xs text-gray-800">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-gray-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 flex gap-3 hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-emerald-50/20' : ''
                            }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-gray-800">{n.title}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[8px] text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile display widget */}
            <div className="h-10 border-l border-gray-100 pl-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-semibold flex items-center justify-center text-xs">
                {user?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-gray-700">
                  {user?.first_name || user?.username}
                </p>
                <p className="text-[9px] text-gray-400">Employee ID: {user?.employee_id || 'N/A'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
