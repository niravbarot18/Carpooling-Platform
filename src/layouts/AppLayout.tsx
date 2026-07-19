import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import {
  LayoutDashboard,
  MapPin,
  PlusCircle,
  Car,
  Wallet,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Settings
} from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { getNotificationSocket, closeSocket } = useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const notifiedIdsRef = useRef<Set<number>>(new Set());

  // Request browser notification permission
  useEffect(() => {
    if (user && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch((err) => {
          console.error("Error requesting notification permission:", err);
        });
      }
    }
  }, [user]);

  const showNativeNotification = (title: string, message: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.svg',
        });
      } catch (err) {
        console.error("Error displaying native notification:", err);
      }
    }
  };

  useEffect(() => {
    const fetchNotifications = async (isFirstLoad = false) => {
      try {
        const res = await api.get('/notifications/');
        const fetchedNotifications: Notification[] = res.data.results || res.data;

        if (isFirstLoad) {
          // On first load, record existing IDs so we don't trigger alerts for past notifications
          const ids = fetchedNotifications.map(n => n.id);
          notifiedIdsRef.current = new Set(ids);
        } else {
          // Check for new unread notifications
          fetchedNotifications.forEach(n => {
            if (!n.is_read && !notifiedIdsRef.current.has(n.id)) {
              showNativeNotification(n.title, n.message);
              notifiedIdsRef.current.add(n.id);
            }
          });
        }

        setNotifications(fetchedNotifications);
      } catch (err) {
        console.error("Error loading notifications:", err);
      }
    };

    if (user) {
      fetchNotifications(true);
      // Poll notifications every 10 seconds as a reliable background backup
      const timer = setInterval(() => fetchNotifications(false), 10000);
      return () => clearInterval(timer);
    }
  }, [user]);

  // Connect real-time WebSocket notifications stream
  useEffect(() => {
    if (!user) return;

    const wsUrl = `/ws/notifications/${user.id}/`;
    const socket = getNotificationSocket(user.id);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification' && data.notification) {
        const n = data.notification;
        // Broadcast browser native notification push
        showNativeNotification(n.title, n.message);
        // Prepend new incoming notification to context lists instantly
        setNotifications((prev) => [n, ...prev]);
      }
    };

    return () => {
      closeSocket(wsUrl);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read/');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = user && user.role === 'admin'
    ? [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Admin Panel', path: '/admin', icon: ShieldCheck },
      ]
    : [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Find a Ride', path: '/find-ride', icon: MapPin },
        { label: 'Offer a Ride', path: '/offer-ride', icon: PlusCircle },
        { label: 'My Trips', path: '/my-trips', icon: Clock },
        { label: 'Wallet', path: '/wallet', icon: Wallet },
        { label: 'Vehicles', path: '/vehicles', icon: Car },
        { label: 'Profile', path: '/profile', icon: User },
        { label: 'Settings', path: '/settings', icon: Settings },
      ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:flex lg:flex-col lg:h-screen`}>
        {/* Header */}
        <div className="h-16 px-6 border-b border-border flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <span className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg">
              Ω
            </span>
            <span className="font-bold text-lg tracking-tight font-sans">
              Carpool<span className="text-primary">Org</span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="px-6 py-4 border-b border-border flex items-center space-x-3 bg-muted/30">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base border border-primary/20">
              {user.first_name[0] || user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-none">
                {user.first_name} {user.last_name}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-border space-y-1">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* HEADER BAR */}
        <header className="relative z-30 h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-lg hidden sm:block">
              {navItems.find(item => item.path === location.pathname)?.label || 'Enterprise Carpooling'}
            </h1>
          </div>

          <div className="flex items-center space-x-4 relative">
            {/* Notification Badge */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full relative transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-destructive text-[10px] font-bold text-destructive-foreground rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popup Modal */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-card border border-border shadow-xl rounded-xl z-50 overflow-hidden flex flex-col max-h-96">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/40">
                    <span className="font-bold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary font-semibold hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-xs">
                        No new notifications.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                            !n.is_read ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <span className="mt-0.5 text-primary">
                              <CheckCircle2 size={14} />
                            </span>
                            <div className="flex-1">
                              <p className={`text-xs font-semibold ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {n.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                {n.message}
                              </p>
                              <span className="text-[9px] text-muted-foreground/60 mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Wallet Pill */}
            {user && (
              <Link
                to="/wallet"
                className="flex items-center space-x-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
              >
                <Wallet size={14} />
                <span>₹{user.money_saved ? Number(user.money_saved).toFixed(2) : '0.00'} Saved</span>
              </Link>
            )}
          </div>
        </header>

        {/* CONTAINER FOR CONTENT */}
        <main className="flex-1 overflow-y-auto bg-background/50 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
