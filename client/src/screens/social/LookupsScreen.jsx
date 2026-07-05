import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

const MOCK_PROFILES = [
  { id: '1', name: 'Lerato M.', age: 21, uni: 'UCT', verified: true, distance: '0.4km', interests: ['Art', 'Music', 'Yoga'], avatar: '👩🏾' },
  { id: '2', name: 'Sipho K.', age: 22, uni: 'Wits', verified: true, distance: '1.2km', interests: ['Tech', 'Gaming', 'Coffee'], avatar: '👨🏿' },
  { id: '3', name: 'Anika V.', age: 20, uni: 'UCT', verified: false, distance: '0.7km', interests: ['Hiking', 'Reading', 'Baking'], avatar: '👩🏻' },
  { id: '4', name: 'Kagiso D.', age: 23, uni: 'UWC', verified: true, distance: '2.1km', interests: ['Sport', 'Music', 'Travel'], avatar: '👨🏾' },
  { id: '5', name: 'Zara N.', age: 21, uni: 'Stellenbosch', verified: true, distance: '3.5km', interests: ['Fashion', 'Food', 'Dance'], avatar: '👩🏽' },
  { id: '6', name: 'Ruan B.', age: 24, uni: 'UCT', verified: false, distance: '0.9km', interests: ['Surf', 'Photography', 'Film'], avatar: '👨🏻' },
];

const ALL_INTERESTS = ['Art', 'Music', 'Tech', 'Sport', 'Hiking', 'Fashion', 'Food', 'Dance', 'Gaming', 'Yoga', 'Coffee', 'Travel'];

export function LookupsScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);

  const [filterVerified, setFilterVerified] = useState(false);
  const [filterInterests, setFilterInterests] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);

  const profiles = MOCK_PROFILES.filter((p) => {
    if (filterVerified && !p.verified) return false;
    if (filterInterests.length > 0 && !filterInterests.some((i) => p.interests.includes(i))) return false;
    return true;
  });

  function toggleInterest(i) {
    setFilterInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  if (selected) {
    return (
      <div className="phone-inner">
        <StatusBar />
        <div className="screen" style={{ padding: '24px' }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 20 }} onClick={() => setSelected(null)}>
            ← Back
          </button>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', fontSize: 40,
              background: 'var(--bg2)', border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              {selected.avatar}
            </div>
            <div className="t-h2">{selected.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
              <span className="t-small">{selected.age} · {selected.uni}</span>
              {selected.verified && <span className="pill pill-sky">✓ Verified</span>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <p className="t-label" style={{ marginBottom: 10 }}>Interests</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {selected.interests.map((i) => (
                <span key={i} className="pill pill-sky">{i}</span>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="t-body">{selected.distance} away</span>
            <span className="t-small">📍 Approximate</span>
          </div>

          <button className="btn btn-primary" onClick={() => navigate(`/consent?to=${selected.id}`)}>
            ✅ Request consent
          </button>
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/suggestions')}>
            ✨ See suggestions like this
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
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div className="t-h2">Lookups</div>
            <p className="t-small">{profiles.length} people nearby</p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ width: 'auto' }}
            onClick={() => setShowFilters((v) => !v)}
          >
            {showFilters ? 'Hide' : '⚙ Filter'}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card" style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Verified only</span>
              <input type="checkbox" checked={filterVerified} onChange={(e) => setFilterVerified(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
            </label>
            <p className="t-label" style={{ marginBottom: 8 }}>Interests</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_INTERESTS.map((i) => (
                <button
                  key={i}
                  onClick={() => toggleInterest(i)}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid',
                    background: filterInterests.includes(i) ? 'var(--accent)' : 'transparent',
                    color: filterInterests.includes(i) ? 'var(--navy-900)' : 'var(--ink2)',
                    borderColor: filterInterests.includes(i) ? 'var(--accent)' : 'var(--border2)',
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profile list */}
        {profiles.map((p) => (
          <button
            key={p.id}
            className="card"
            style={{ width: '100%', cursor: 'pointer', textAlign: 'left', marginBottom: 10 }}
            onClick={() => setSelected(p)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', fontSize: 24,
                background: 'var(--bg)', border: '1.5px solid var(--border2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {p.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                  <span className="t-small">{p.age}</span>
                  {p.verified && <span className="pill pill-sky" style={{ fontSize: 10 }}>✓</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>{p.uni} · {p.distance}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {p.interests.slice(0, 3).map((i) => (
                    <span key={i} style={{ fontSize: 10, color: 'var(--ink2)', background: 'var(--bg)', padding: '2px 6px', borderRadius: 'var(--r-full)', border: '1px solid var(--border)' }}>
                      {i}
                    </span>
                  ))}
                </div>
              </div>
              <span style={{ color: 'var(--ink3)', fontSize: 18, flexShrink: 0 }}>›</span>
            </div>
          </button>
        ))}

        {profiles.length === 0 && (
          <p className="t-body" style={{ textAlign: 'center', marginTop: 40 }}>
            No profiles match your filters. Try broadening your search.
          </p>
        )}
      </div>
      <NavBar active={2} onTab={nav} />
    </div>
  );
}
