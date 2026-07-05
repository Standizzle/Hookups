import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { LoginScreen }      from './screens/auth/LoginScreen.jsx';
import { OnboardingScreen } from './screens/auth/OnboardingScreen.jsx';
import { AgeGateScreen }    from './screens/auth/AgeGateScreen.jsx';
import { ConsentScreen }    from './screens/consent/ConsentScreen.jsx';
import './styles/globals.css';

// Lazy-load heavier screens to keep the bundle small
import { lazy, Suspense } from 'react';
const HomeScreen       = lazy(() => import('./screens/HomeScreen.jsx').then(m => ({ default: m.HomeScreen })));
const LogsScreen       = lazy(() => import('./screens/LogsScreen.jsx').then(m => ({ default: m.LogsScreen })));
const ProfileScreen    = lazy(() => import('./screens/profile/ProfileScreen.jsx').then(m => ({ default: m.ProfileScreen })));
const GuardianScreen   = lazy(() => import('./screens/safety/GuardianScreen.jsx').then(m => ({ default: m.GuardianScreen })));
const ParentalScreen   = lazy(() => import('./screens/safety/ParentalScreen.jsx').then(m => ({ default: m.ParentalScreen })));
const DuressScreen     = lazy(() => import('./screens/safety/DuressScreen.jsx').then(m => ({ default: m.DuressScreen })));
const RevokeScreen     = lazy(() => import('./screens/consent/RevokeScreen.jsx').then(m => ({ default: m.RevokeScreen })));
const LiveMapScreen    = lazy(() => import('./screens/profile/LiveMapScreen.jsx').then(m => ({ default: m.LiveMapScreen })));
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen.jsx').then(m => ({ default: m.NotificationsScreen })));

function PhoneWrapper({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
      <div className="phone-shell">
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink3)' }}>Loading…</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <PhoneWrapper>
      <Routes>
        <Route path="/"           element={<Navigate to="/login" replace />} />
        <Route path="/login"      element={<LoginScreen />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/agegate"    element={<AgeGateScreen />} />

        <Route path="/home"       element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
        <Route path="/consent"    element={<ProtectedRoute><ConsentScreen /></ProtectedRoute>} />
        <Route path="/logs"       element={<ProtectedRoute><LogsScreen /></ProtectedRoute>} />
        <Route path="/profile"    element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
        <Route path="/revoke/:id" element={<ProtectedRoute><RevokeScreen /></ProtectedRoute>} />
        <Route path="/guardian"   element={<ProtectedRoute><GuardianScreen /></ProtectedRoute>} />
        <Route path="/parental"   element={<ProtectedRoute><ParentalScreen /></ProtectedRoute>} />
        <Route path="/duress"     element={<ProtectedRoute><DuressScreen /></ProtectedRoute>} />
        <Route path="/livemap/:id" element={<ProtectedRoute><LiveMapScreen /></ProtectedRoute>} />
        <Route path="/notifs"     element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
      </Routes>
    </PhoneWrapper>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
