import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBar } from '../components/layout/StatusBar.jsx';
import { NavBar } from '../components/layout/NavBar.jsx';
import { consentService } from '../services/consent.js';
import { logsService } from '../services/logs.js';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

const ACTIVITY_ICONS = {
  registration:        '👤',
  pin_set:             '🔑',
  pin_attempt_failed:  '⚠️',
  consent_confirmed:   '✅',
  consent_revoked:     '🚫',
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function HomeScreen() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);

  const [activeBanner, setActiveBanner] = useState(null); // { type: 'pending'|'mutual', record }
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [{ records: pending }, { records: mutual }, { logs }] = await Promise.all([
          consentService.list({ status: 'pending', limit: 20 }),
          consentService.list({ status: 'mutual', limit: 5 }),
          logsService.list({ limit: 3 }),
        ]);

        const needsMyAction = pending.find((r) => r.consenterId === user?.id);
        if (needsMyAction) {
          setActiveBanner({ type: 'pending', record: needsMyAction });
        } else if (mutual.length > 0) {
          setActiveBanner({ type: 'mutual', record: mutual[0] });
        }

        setRecentActivity(logs);
      } catch { /* fall back to the static safety banner below */ }
    })();
  }, [user?.id]);

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

        {/* Active consent banner */}
        {activeBanner?.type === 'pending' && (
          <button
            className="card"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', borderColor: 'rgba(245,158,11,0.4)', background: 'var(--amber-bg)', marginBottom: 16 }}
            onClick={() => navigate(`/consent?id=${activeBanner.record.id}`)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>⏳</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Awaiting your response</div>
                <p className="t-small"><strong style={{ color: 'var(--ink)' }}>{activeBanner.record.requester.fullName}</strong> is requesting your consent</p>
              </div>
            </div>
          </button>
        )}

        {activeBanner?.type === 'mutual' && (
          <button
            className="card"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', borderColor: 'var(--sealed-border)', background: 'var(--sealed-bg)', marginBottom: 16 }}
            onClick={() => navigate(`/revoke/${activeBanner.record.id}`)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Active consent</div>
                <p className="t-small">
                  Sealed with <strong style={{ color: 'var(--ink)' }}>
                    {activeBanner.record.requesterId === user?.id ? activeBanner.record.consenter.fullName : activeBanner.record.requester.fullName}
                  </strong>
                </p>
              </div>
            </div>
          </button>
        )}

        {!activeBanner && (
          <div className="card" style={{ borderColor: 'rgba(56,189,248,0.3)', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🔐</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Consent-first hookups</div>
                <p className="t-small">Every interaction is recorded, signed & revocable.</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentActivity.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p className="t-label">Recent activity</p>
              <button className="btn btn-ghost btn-sm" style={{ width: 'auto', fontSize: 11, padding: '2px 8px' }} onClick={() => navigate('/logs')}>See all</button>
            </div>
            {recentActivity.map((l) => (
              <div key={l.id} className="card" style={{ marginBottom: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>{ACTIVITY_ICONS[l.type] ?? '🔔'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{l.title}</div>
                  <span className="t-small">{timeAgo(l.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
      </div>
      <NavBar active={0} onTab={nav} />
    </div>
  );
}
