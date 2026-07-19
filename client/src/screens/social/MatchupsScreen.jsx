import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { Avatar } from '../../components/common/Avatar.jsx';
import { discoverService } from '../../services/discover.js';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

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

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function MatchupsScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);
  const [tab, setTab] = useState('matches');

  const [matches, setMatches] = useState([]);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  async function loadMatches() {
    setMatches(await discoverService.matches());
  }

  useEffect(() => {
    (async () => {
      try {
        const [m, s] = await Promise.all([discoverService.matches(), discoverService.nearby()]);
        setMatches(m);
        setSuggested(s);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function act(person, action) {
    setActionLoading(person.id);
    try {
      const res = await discoverService.action(person.id, action);
      setSuggested((prev) => prev.filter((p) => p.id !== person.id));
      if (res.matched) {
        // Refetch rather than splice client-side — a match reveals the
        // partner's real name server-side, which we don't have locally.
        await loadMatches();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  function startConsent(partner) {
    navigate('/consent', { state: { partner: { id: partner.id, fullName: partner.name, verified: partner.verified } } });
  }

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

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {loading && <p className="t-body" style={{ textAlign: 'center', marginTop: 20 }}>Loading…</p>}

        {!loading && tab === 'matches' && (
          <div>
            {matches.map((m) => (
              <div key={m.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <Avatar avatarUrl={m.partner.avatarUrl} seed={m.partner.id} label={m.partner.name ?? m.partner.handle} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{m.partner.name ?? m.partner.handle}</span>
                      <span className={`pill ${m.status === 'matched' ? 'pill-sealed' : 'pill-pending'}`}>
                        {m.status === 'matched' ? '✓ Matched' : m.direction === 'received' ? '⏳ Wants to match' : '⏳ Pending'}
                      </span>
                    </div>
                    <span className="t-small">
                      {m.partner.name && m.partner.handle ? `${m.partner.handle} · ` : ''}{m.partner.university} · {timeAgo(m.createdAt)}
                    </span>
                  </div>
                </div>
                <CompatBar value={m.compatibility} />
                {m.sharedInterests.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    <span className="t-small">Mutual:</span>
                    {m.sharedInterests.map((i) => (
                      <span key={i} className="pill pill-sky" style={{ fontSize: 10 }}>{i}</span>
                    ))}
                  </div>
                )}
                {m.status === 'matched' && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 12 }}
                    onClick={() => startConsent(m.partner)}
                  >
                    ✅ Start consent
                  </button>
                )}
                {m.status === 'pending' && m.direction === 'received' && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 12 }}
                    onClick={() => act({ id: m.partner.id }, 'connect')}
                  >
                    💫 Match back
                  </button>
                )}
              </div>
            ))}
            {matches.length === 0 && (
              <p className="t-body" style={{ textAlign: 'center', marginTop: 20 }}>No matches yet — check Suggested.</p>
            )}
          </div>
        )}

        {!loading && tab === 'suggested' && (
          <div>
            <p className="t-body" style={{ marginBottom: 16 }}>Based on your interests and connections.</p>
            {suggested.map((s) => (
              <div key={s.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <Avatar avatarUrl={s.avatarUrl} seed={s.id} label={s.handle} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{s.handle}</div>
                    <span className="t-small">{s.university}</span>
                  </div>
                </div>
                <CompatBar value={s.compatibility} />
                {s.sharedInterests.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <span className="t-small">Mutual:</span>
                    {s.sharedInterests.map((i) => (
                      <span key={i} className="pill pill-sky" style={{ fontSize: 10 }}>{i}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => act(s, 'skip')} disabled={actionLoading === s.id}>
                    Skip
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => act(s, 'connect')} disabled={actionLoading === s.id}>
                    {actionLoading === s.id ? '…' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
            {suggested.length === 0 && (
              <p className="t-body" style={{ textAlign: 'center', marginTop: 20 }}>No new suggestions right now.</p>
            )}
          </div>
        )}
      </div>
      <NavBar active={2} onTab={nav} />
    </div>
  );
}
