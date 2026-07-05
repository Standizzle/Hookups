import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/layout/StatusBar.jsx';
import { NavBar } from '../components/layout/NavBar.jsx';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

const MOCK_LOGS = [
  {
    id: 'cl-001', type: 'consent_sealed', icon: '✅', title: 'Consent sealed with Lerato M.',
    detail: 'Physical Intimacy, Kissing & Affection · Safe word: pineapple',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), status: 'sealed',
  },
  {
    id: 'cl-002', type: 'consent_requested', icon: '🔗', title: 'Consent request sent to Kagiso D.',
    detail: 'Kissing & Affection, Live Location · Expires in 45 min',
    time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), status: 'pending',
  },
  {
    id: 'cl-003', type: 'consent_revoked', icon: '🚫', title: 'Consent revoked with Sipho K.',
    detail: 'Revoked by you · All location sharing stopped',
    time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: 'revoked',
  },
  {
    id: 'cl-004', type: 'guardian_checkin', icon: '🛡', title: 'Silent check-in sent',
    detail: 'Alert delivered to Thabo N. · No response required',
    time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'info',
  },
  {
    id: 'cl-005', type: 'consent_sealed', icon: '✅', title: 'Consent sealed with Zara N.',
    detail: 'Overnight Stays, Photos/Video · Location sharing agreed',
    time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), status: 'sealed',
  },
  {
    id: 'cl-006', type: 'meetup_proposed', icon: '📍', title: 'Meetup proposed with Ayesha P.',
    detail: 'UCT Upper Campus · Sat 12 Jul 7pm',
    time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending',
  },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sealed', label: '✅ Sealed' },
  { key: 'pending', label: '⏳ Pending' },
  { key: 'revoked', label: '🚫 Revoked' },
  { key: 'info', label: '🛡 Alerts' },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LogsScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);
  const [filter, setFilter] = useState('all');

  const logs = filter === 'all' ? MOCK_LOGS : MOCK_LOGS.filter((l) => l.status === filter);

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '24px' }}>
        <div className="t-h2" style={{ marginBottom: 16 }}>Activity Log</div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '5px 12px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: '1px solid', whiteSpace: 'nowrap', flexShrink: 0,
                background: filter === key ? 'var(--accent)' : 'transparent',
                color: filter === key ? 'var(--navy-900)' : 'var(--ink2)',
                borderColor: filter === key ? 'var(--accent)' : 'var(--border2)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Log entries */}
        {logs.map((l) => (
          <div
            key={l.id}
            className="card"
            style={{ marginBottom: 10, cursor: l.status === 'sealed' ? 'pointer' : 'default' }}
            onClick={() => l.status === 'sealed' && navigate(`/revoke/${l.id}`)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--r-md)', flexShrink: 0, fontSize: 18,
                background: l.status === 'sealed' ? 'var(--sealed-bg)' :
                  l.status === 'revoked' ? 'var(--red-bg)' :
                  l.status === 'pending' ? 'var(--amber-bg)' : 'var(--bg)',
                border: `1px solid ${
                  l.status === 'sealed' ? 'var(--sealed-border)' :
                  l.status === 'revoked' ? 'rgba(239,68,68,0.3)' :
                  l.status === 'pending' ? 'rgba(245,158,11,0.3)' : 'var(--border)'
                }`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {l.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{l.title}</div>
                <p className="t-small" style={{ marginBottom: 4 }}>{l.detail}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="t-mono">{timeAgo(l.time)}</span>
                  <span className={`pill ${
                    l.status === 'sealed' ? 'pill-sealed' :
                    l.status === 'revoked' ? 'pill-revoked' :
                    l.status === 'pending' ? 'pill-pending' : 'pill-sky'
                  }`} style={{ fontSize: 10 }}>
                    {l.status}
                  </span>
                </div>
              </div>
              {l.status === 'sealed' && (
                <span style={{ color: 'var(--ink3)', fontSize: 16, flexShrink: 0 }}>›</span>
              )}
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <p className="t-body" style={{ textAlign: 'center', marginTop: 40 }}>No entries for this filter.</p>
        )}
      </div>
      <NavBar active={3} onTab={nav} />
    </div>
  );
}
