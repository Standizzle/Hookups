import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { usersService } from '../../services/users.js';

const AVATARS = ['🙂', '😎', '👩🏾', '👨🏿', '👩🏻', '👨🏾', '👩🏽', '👨🏻', '👩🏿', '👨🏽'];
const ALL_INTERESTS = ['Art', 'Music', 'Tech', 'Sport', 'Hiking', 'Fashion', 'Food', 'Dance', 'Gaming', 'Yoga', 'Coffee', 'Travel'];

export function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const nav = (i) => navigate(['/home', '/consent', '/discover', '/logs', '/profile'][i]);

  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatarEmoji ?? '🙂');
  const [university, setUniversity] = useState(user?.university ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [interests, setInterests] = useState(user?.interests ?? []);
  const [discoverable, setDiscoverable] = useState(user?.discoverable ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationSaved, setLocationSaved] = useState(user?.lastLocatedAt ? true : false);

  function toggleInterest(i) {
    setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  async function saveProfile() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await usersService.updateProfile({ university, bio, avatarEmoji, interests, discoverable });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function captureLocation() {
    if (!navigator.geolocation) { setError('Geolocation is not available in this browser.'); return; }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await usersService.updateLocation(pos.coords.latitude, pos.coords.longitude);
          setLocationSaved(true);
        } catch (err) {
          setError(err.message);
        } finally {
          setLocating(false);
        }
      },
      (err) => { setError(err.message ?? 'Could not get your location'); setLocating(false); },
      { enableHighAccuracy: true }
    );
  }

  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-bg)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>{avatarEmoji}</div>
          <div className='t-h2'>{user?.fullName}</div>
          <p className='t-small'>{user?.phone}</p>
        </div>

        {/* Discovery profile */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="t-label" style={{ marginBottom: 10 }}>Discovery profile</p>

          <p className="t-small" style={{ marginBottom: 6 }}>Avatar</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatarEmoji(a)}
                style={{
                  width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer',
                  background: avatarEmoji === a ? 'var(--accent-bg)' : 'var(--bg)',
                  border: avatarEmoji === a ? '2px solid var(--accent)' : '1px solid var(--border2)',
                }}
              >
                {a}
              </button>
            ))}
          </div>

          <p className="t-small" style={{ marginBottom: 6 }}>University</p>
          <input className="input-field" placeholder="e.g. UCT" value={university} onChange={(e) => setUniversity(e.target.value)} style={{ marginBottom: 12 }} />

          <p className="t-small" style={{ marginBottom: 6 }}>Bio</p>
          <textarea
            className="input-field"
            placeholder="A short bio…"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            style={{ marginBottom: 12, resize: 'vertical', fontFamily: 'inherit' }}
          />

          <p className="t-small" style={{ marginBottom: 8 }}>Interests</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {ALL_INTERESTS.map((i) => (
              <button
                key={i}
                onClick={() => toggleInterest(i)}
                style={{
                  padding: '4px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  background: interests.includes(i) ? 'var(--accent)' : 'transparent',
                  color: interests.includes(i) ? 'var(--navy-900)' : 'var(--ink2)',
                  borderColor: interests.includes(i) ? 'var(--accent)' : 'var(--border2)',
                }}
              >
                {i}
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Visible in Discovery</span>
            <input type="checkbox" checked={discoverable} onChange={(e) => setDiscoverable(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
          </label>

          <button className="btn btn-ghost btn-sm" onClick={captureLocation} disabled={locating} style={{ marginBottom: 10 }}>
            {locating ? 'Getting location…' : locationSaved ? '📍 Location set — update' : '📍 Set my location'}
          </button>

          {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
          <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save profile'}
          </button>
        </div>

        {[['🛡', 'Guardian', '/guardian'], ['🔐', 'Duress PIN', '/duress'], ['👨‍👩‍👧', 'Parental Controls', '/parental'], ['🔔', 'Notifications', '/notifs']].map(([icon, label, path]) => (
          <button key={path} className='card' style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 10, width: '100%' }} onClick={() => navigate(path)}>
            <span style={{ fontSize: 22 }}>{icon}</span><span style={{ fontWeight: 700 }}>{label}</span>
          </button>
        ))}
      </div>
      <NavBar active={4} onTab={nav} />
    </div>
  );
}
