import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { AppLayout } from './layouts/AppLayout';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { FindRide } from './pages/FindRide';
import { OfferRide } from './pages/OfferRide';
import { MyTrips } from './pages/MyTrips';
import { TripTracking } from './pages/TripTracking';
import { Wallet } from './pages/Wallet';
import { Vehicles } from './pages/Vehicles';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { AdminDashboard } from './pages/AdminDashboard';

// Route guard for authenticated users
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return isAuthenticated ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace />;
};

// Route guard for regular users only
const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  return <AppLayout>{children}</AppLayout>;
};

// Route guard for admin users only
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <AppLayout>{children}</AppLayout>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected dashboard route (both admin and user) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Protected user routes */}
              <Route
                path="/find-ride"
                element={
                  <UserRoute>
                    <FindRide />
                  </UserRoute>
                }
              />
              <Route
                path="/offer-ride"
                element={
                  <UserRoute>
                    <OfferRide />
                  </UserRoute>
                }
              />
              <Route
                path="/my-trips"
                element={
                  <UserRoute>
                    <MyTrips />
                  </UserRoute>
                }
              />
              <Route
                path="/tracking/:tripId"
                element={
                  <UserRoute>
                    <TripTracking />
                  </UserRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <UserRoute>
                    <Wallet />
                  </UserRoute>
                }
              />
              <Route
                path="/vehicles"
                element={
                  <UserRoute>
                    <Vehicles />
                  </UserRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <UserRoute>
                    <Profile />
                  </UserRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <UserRoute>
                    <Settings />
                  </UserRoute>
                }
              />

              {/* Protected Admin routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />

              {/* Redirects */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
