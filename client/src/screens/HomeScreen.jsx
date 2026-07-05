import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBar } from '../components/layout/StatusBar.jsx';
import { NavBar } from '../components/layout/NavBar.jsx';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

export function HomeScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '24px' }}>
        <div className="t-h2" style={{ marginBottom: 4 }}>
          Hey {user?.fullName?.split(' ')[0] ?? 'there'} 👋
        </div>
        <p className="t-body" style={{ marginBottom: 24 }}>Safety. Always.</p>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            ['✅', 'New Consent', '/consent'],
            ['🔍', 'Discover', '/discover'],
            ['🛡', 'Guardian', '/guardian'],
            ['👨‍👩‍👧', 'Parental', '/parental'],
          ].map(([icon, label, path]) => (
            <button
              key={path}
              className="card"
              style={{ cursor: 'pointer', textAlign: 'center', paddingTop: 20, paddingBottom: 20 }}
              onClick={() => navigate(path)}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
            </button>
          ))}
        </div>

        {/* Safety banner */}
        <div className="card" style={{ borderColor: 'rgba(56,189,248,0.3)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔐</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Consent-first hookups</div>
              <p className="t-small">Every interaction is recorded, signed & revocable.</p>
            </div>
          </div>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
      </div>
      <NavBar active={0} onTab={nav} />
    </div>
  );
}
