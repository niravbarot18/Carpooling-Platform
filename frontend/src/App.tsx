import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { FindRide } from './pages/FindRide';
import { OfferRide } from './pages/OfferRide';
import { MyTrips } from './pages/MyTrips';
import { ActiveRide } from './pages/ActiveRide';
import { Vehicles } from './pages/Vehicles';
import { Wallet } from './pages/Wallet';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Guest Auth Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Home />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/find-ride" element={
            <ProtectedRoute>
              <Layout>
                <FindRide />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/offer-ride" element={
            <ProtectedRoute>
              <Layout>
                <OfferRide />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/my-trips" element={
            <ProtectedRoute>
              <Layout>
                <MyTrips />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/active-ride/:tripId" element={
            <ProtectedRoute>
              <Layout>
                <ActiveRide />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/vehicles" element={
            <ProtectedRoute>
              <Layout>
                <Vehicles />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/wallet" element={
            <ProtectedRoute>
              <Layout>
                <Wallet />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <Layout>
                <Analytics />
              </Layout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Catch-all fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
