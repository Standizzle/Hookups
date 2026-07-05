import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/layout/StatusBar.jsx';
import { NavBar } from '../components/layout/NavBar.jsx';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

const CARDS = [
  {
    path: '/lookups',
    icon: '👀',
    label: 'Lookups',
    desc: 'Browse people near you',
    accent: 'var(--accent)',
    bg: 'var(--accent-bg)',
  },
  {
    path: '/matchups',
    icon: '💫',
    label: 'Matchups',
    desc: 'Your suggested connections',
    accent: 'var(--accent2)',
    bg: 'rgba(244,114,182,0.1)',
  },
  {
    path: '/meetups',
    icon: '📍',
    label: 'Meetups',
    desc: 'Plan & confirm a meetup',
    accent: 'var(--sealed)',
    bg: 'var(--sealed-bg)',
  },
  {
    path: '/suggestions',
    icon: '✨',
    label: 'Suggestions',
    desc: 'Handpicked for you',
    accent: 'var(--accent)',
    bg: 'var(--accent-bg)',
  },
];

export function DiscoverScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '24px' }}>
        <div className="t-h2" style={{ marginBottom: 4 }}>Discover</div>
        <p className="t-body" style={{ marginBottom: 24 }}>Find, match, and connect — safely.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CARDS.map((c) => (
            <button
              key={c.path}
              className="card"
              style={{ cursor: 'pointer', textAlign: 'left', borderColor: c.accent + '55' }}
              onClick={() => navigate(c.path)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--r-md)',
                  background: c.bg, border: `1px solid ${c.accent}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink)', marginBottom: 2 }}>{c.label}</div>
                  <p className="t-small">{c.desc}</p>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--ink3)', fontSize: 18 }}>›</span>
              </div>
            </button>
          ))}
        </div>

        {/* Tip */}
        <div style={{
          marginTop: 24, padding: '12px 14px', borderRadius: 'var(--r-md)',
          background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)',
        }}>
          <p className="t-small">
            <strong style={{ color: 'var(--accent)' }}>Tip:</strong> Any connection that goes further always starts with a signed consent. Your safety, your terms.
          </p>
        </div>
      </div>
      <NavBar active={2} onTab={nav} />
    </div>
  );
}
