import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

const MOCK_MATCHES = [
  { id: 'm1', name: 'Lerato M.', avatar: '👩🏾', uni: 'UCT', mutual: ['Art', 'Music'], compatibility: 94, status: 'matched', time: '2h ago' },
  { id: 'm2', name: 'Kagiso D.', avatar: '👨🏾', uni: 'UWC', mutual: ['Sport', 'Travel'], compatibility: 81, status: 'matched', time: '1d ago' },
  { id: 'm3', name: 'Zara N.', avatar: '👩🏽', uni: 'Stellenbosch', mutual: ['Food', 'Music'], compatibility: 76, status: 'pending', time: '3d ago' },
];

const SUGGESTED = [
  { id: 's1', name: 'Ayesha P.', avatar: '👩🏽', uni: 'UCT', mutual: ['Yoga', 'Coffee'], compatibility: 88 },
  { id: 's2', name: 'Luca F.', avatar: '👨🏻', uni: 'CPUT', mutual: ['Music', 'Gaming'], compatibility: 72 },
];

function CompatBar({ value }) {
  const color = value >= 85 ? 'var(--sealed)' : value >= 70 ? 'var(--accent)' : 'var(--accent2)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28 }}>{value}%</span>
    </div>
  );
}

export function MatchupsScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);
  const [tab, setTab] = useState('matches');

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '24px' }}>
        <div className="t-h2" style={{ marginBottom: 16 }}>Matchups</div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[['matches', 'Your Matches'], ['suggested', 'Suggested']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: '8px', borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', border: '1px solid',
                background: tab === key ? 'var(--accent)' : 'transparent',
                color: tab === key ? 'var(--navy-900)' : 'var(--ink2)',
                borderColor: tab === key ? 'var(--accent)' : 'var(--border2)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'matches' && (
          <div>
            {MOCK_MATCHES.map((m) => (
              <div key={m.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', fontSize: 22,
                    background: 'var(--bg)', border: '1.5px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {m.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</span>
                      <span className={`pill ${m.status === 'matched' ? 'pill-sealed' : 'pill-pending'}`}>
                        {m.status === 'matched' ? '✓ Matched' : '⏳ Pending'}
                      </span>
                    </div>
                    <span className="t-small">{m.uni} · {m.time}</span>
                  </div>
                </div>
                <CompatBar value={m.compatibility} />
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  <span className="t-small">Mutual:</span>
                  {m.mutual.map((i) => (
                    <span key={i} className="pill pill-sky" style={{ fontSize: 10 }}>{i}</span>
                  ))}
                </div>
                {m.status === 'matched' && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 12 }}
                    onClick={() => navigate('/consent')}
                  >
                    ✅ Start consent
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'suggested' && (
          <div>
            <p className="t-body" style={{ marginBottom: 16 }}>Based on your interests and connections.</p>
            {SUGGESTED.map((s) => (
              <div key={s.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', fontSize: 22,
                    background: 'var(--bg)', border: '1.5px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {s.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                    <span className="t-small">{s.uni}</span>
                  </div>
                </div>
                <CompatBar value={s.compatibility} />
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  <span className="t-small">Mutual:</span>
                  {s.mutual.map((i) => (
                    <span key={i} className="pill pill-sky" style={{ fontSize: 10 }}>{i}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => navigate('/suggestions')}>
                    Skip
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => navigate('/consent')}>
                    Connect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <NavBar active={2} onTab={nav} />
    </div>
  );
}
