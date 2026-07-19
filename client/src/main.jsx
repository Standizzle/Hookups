import { StrictMode, lazy, Suspense, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { LoginScreen }      from './screens/auth/LoginScreen.jsx';
import { OnboardingScreen } from './screens/auth/OnboardingScreen.jsx';
import { AgeGateScreen }    from './screens/auth/AgeGateScreen.jsx';
import { ConsentScreen }    from './screens/consent/ConsentScreen.jsx';
import { parentalService }  from './services/parental.js';
import './styles/globals.css';

const HomeScreen       = lazy(() => import('./screens/HomeScreen.jsx').then(m => ({ default: m.HomeScreen })));
const DiscoverScreen   = lazy(() => import('./screens/DiscoverScreen.jsx').then(m => ({ default: m.DiscoverScreen })));
const LookupsScreen    = lazy(() => import('./screens/social/LookupsScreen.jsx').then(m => ({ default: m.LookupsScreen })));
const MatchupsScreen   = lazy(() => import('./screens/social/MatchupsScreen.jsx').then(m => ({ default: m.MatchupsScreen })));
const MeetupsScreen    = lazy(() => import('./screens/social/MeetupsScreen.jsx').then(m => ({ default: m.MeetupsScreen })));
const SuggestionsScreen = lazy(() => import('./screens/social/SuggestionsScreen.jsx').then(m => ({ default: m.SuggestionsScreen })));
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
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink3)' }}>
            Loading…
          </div>
        }>
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

function P({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

// Gates consent features behind real age verification: DOB must be set, and
// a minor additionally needs an active (accepted) parental link.
function AgeGatedRoute({ children }) {
  const { user, loading } = useAuth();
  const [checkingLink, setCheckingLink] = useState(false);
  const [hasActiveLink, setHasActiveLink] = useState(null);

  useEffect(() => {
    if (!user?.dateOfBirth || !user?.isMinor) return;
    setCheckingLink(true);
    parentalService.myLinks()
      .then(({ asMinor }) => setHasActiveLink(asMinor.some((l) => l.status === 'active')))
      .catch(() => setHasActiveLink(false))
      .finally(() => setCheckingLink(false));
  }, [user?.dateOfBirth, user?.isMinor]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.dateOfBirth) return <Navigate to="/agegate" replace />;
  if (user.isMinor) {
    if (checkingLink || hasActiveLink === null) return null;
    if (!hasActiveLink) return <Navigate to="/agegate" replace />;
  }
  return children;
}

function AG({ children }) {
  return <AgeGatedRoute>{children}</AgeGatedRoute>;
}

function AppRoutes() {
  return (
    <PhoneWrapper>
      <Routes>
        <Route path="/"             element={<Navigate to="/login" replace />} />
        <Route path="/login"        element={<LoginScreen />} />
        <Route path="/onboarding"   element={<OnboardingScreen />} />
        <Route path="/agegate"      element={<P><AgeGateScreen /></P>} />

        {/* Core */}
        <Route path="/home"         element={<P><HomeScreen /></P>} />
        <Route path="/consent"      element={<P><AG><ConsentScreen /></AG></P>} />
        <Route path="/logs"         element={<P><LogsScreen /></P>} />
        <Route path="/profile"      element={<P><ProfileScreen /></P>} />
        <Route path="/revoke/:id"   element={<P><RevokeScreen /></P>} />
        <Route path="/livemap/:id"  element={<P><LiveMapScreen /></P>} />
        <Route path="/notifs"       element={<P><NotificationsScreen /></P>} />

        {/* Safety */}
        <Route path="/guardian"     element={<P><GuardianScreen /></P>} />
        <Route path="/parental"     element={<P><ParentalScreen /></P>} />
        <Route path="/duress"       element={<P><DuressScreen /></P>} />

        {/* Social / Discover */}
        <Route path="/discover"     element={<P><DiscoverScreen /></P>} />
        <Route path="/lookups"      element={<P><LookupsScreen /></P>} />
        <Route path="/matchups"     element={<P><MatchupsScreen /></P>} />
        <Route path="/meetups"      element={<P><MeetupsScreen /></P>} />
        <Route path="/suggestions"  element={<P><SuggestionsScreen /></P>} />
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
