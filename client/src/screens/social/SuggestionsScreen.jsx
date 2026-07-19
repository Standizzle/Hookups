import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { discoverService } from '../../services/discover.js';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

function ScoreRing({ value }) {
  const color = value >= 85 ? 'var(--sealed)' : value >= 70 ? 'var(--accent)' : 'var(--accent2)';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--bg2)" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column',
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>{value}%</span>
      </div>
    </div>
  );
}

export function SuggestionsScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);

  const [pool, setPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sent, setSent] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setPool(await discoverService.nearby());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const remaining = pool.filter((p) => !sent.includes(p.id) && !skipped.includes(p.id));
  const current = remaining[0];

  async function skip() {
    if (!current) return;
    try {
      await discoverService.action(current.id, 'skip');
      setSkipped((prev) => [...prev, current.id]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function connect() {
    if (!current) return;
    setSending(true);
    try {
      await discoverService.action(current.id, 'connect');
      setSent((prev) => [...prev, current.id]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="phone-inner">
        <StatusBar />
        <div className="screen" style={{ padding: '24px', textAlign: 'center', paddingTop: 60 }}>
          <p className="t-body">Loading suggestions…</p>
        </div>
        <NavBar active={2} onTab={nav} />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="phone-inner">
        <StatusBar />
        <div className="screen" style={{ padding: '24px', textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
          <div className="t-h2" style={{ marginBottom: 8 }}>All caught up!</div>
          <p className="t-body" style={{ marginBottom: 24 }}>
            You've reviewed all suggestions. Check back later or browse Lookups.
          </p>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</p>}
          {sent.length > 0 && (
            <div className="card" style={{ marginBottom: 20, textAlign: 'left' }}>
              <p className="t-label" style={{ marginBottom: 10 }}>Connection requests sent</p>
              {pool.filter((p) => sent.includes(p.id)).map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{p.avatarEmoji ?? '🙂'}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                  <span className="pill pill-sealed" style={{ marginLeft: 'auto', fontSize: 10 }}>Sent</span>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-ghost" onClick={() => navigate('/lookups')}>
            Browse Lookups
          </button>
        </div>
        <NavBar active={2} onTab={nav} />
      </div>
    );
  }

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="t-h2">✨ For You</div>
          <span className="t-small">{remaining.length} left</span>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        {/* Hero card */}
        <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(56,189,248,0.25)', background: 'var(--bg2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', fontSize: 36,
              background: 'var(--bg)', border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {current.avatarEmoji ?? '🙂'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 2 }}>{current.name}</div>
              <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{current.university ?? 'No university set'}</div>
            </div>
            <ScoreRing value={current.compatibility} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {current.interests.map((i) => (
              <span key={i} className="pill pill-sky">{i}</span>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <p className="t-label" style={{ marginBottom: 8 }}>Why we suggest them</p>
            {current.reasons.map((w) => (
              <div key={w} style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 4 }}>✓ {w}</div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={skip}>
            Skip
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={connect} disabled={sending}>
            {sending ? 'Sending…' : '✅ Connect'}
          </button>
        </div>

        {sent.length > 0 && (
          <p className="t-small" style={{ textAlign: 'center', marginTop: 16 }}>
            {sent.length} request{sent.length > 1 ? 's' : ''} sent this session
          </p>
        )}
      </div>
      <NavBar active={2} onTab={nav} />
    </div>
  );
}
