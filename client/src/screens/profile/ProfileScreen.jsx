import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { Avatar } from '../../components/common/Avatar.jsx';
import { usersService } from '../../services/users.js';

const ALL_INTERESTS = ['Art', 'Music', 'Tech', 'Sport', 'Hiking', 'Fashion', 'Food', 'Dance', 'Gaming', 'Yoga', 'Coffee', 'Travel'];

export function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const nav = (i) => navigate(['/home', '/consent', '/discover', '/logs', '/profile'][i]);
  const fileInputRef = useRef(null);
  const handleCheckTimer = useRef(null);

  const [username, setUsername] = useState(user?.username ?? '');
  const [handleStatus, setHandleStatus] = useState(null); // null | 'checking' | { available, reason }
  const [university, setUniversity] = useState(user?.university ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [interests, setInterests] = useState(user?.interests ?? []);
  const [discoverable, setDiscoverable] = useState(user?.discoverable ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationSaved, setLocationSaved] = useState(!!user?.lastLocatedAt);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? null);

  useEffect(() => {
    if (!username || username === user?.username) { setHandleStatus(null); return; }
    setHandleStatus('checking');
    clearTimeout(handleCheckTimer.current);
    handleCheckTimer.current = setTimeout(async () => {
      try {
        const res = await usersService.checkHandle(username.toLowerCase());
        setHandleStatus(res);
      } catch {
        setHandleStatus({ available: false, reason: 'Could not check right now' });
      }
    }, 400);
    return () => clearTimeout(handleCheckTimer.current);
  }, [username, user?.username]);

  function toggleInterest(i) {
    setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  async function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setError('');
    try {
      const res = await usersService.uploadAvatar(file);
      setAvatarUrl(res.avatarUrl);
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  }

  async function removeAvatar() {
    setAvatarUploading(true);
    try {
      await usersService.deleteAvatar();
      setAvatarUrl(null);
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function saveProfile() {
    if (username && username !== user?.username && handleStatus && handleStatus.available === false) {
      setError(handleStatus.reason ?? 'Choose a different handle');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await usersService.updateProfile({
        username: username ? username.toLowerCase() : undefined,
        university, bio, interests, discoverable,
      });
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
          <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 12px' }}>
            <Avatar avatarUrl={avatarUrl} seed={user?.id} label={user?.fullName} size={80} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              style={{
                position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent)', border: '2px solid var(--bg)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}
            >
              📷
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarPick} />
          </div>
          {avatarUploading && <p className="t-small">Uploading…</p>}
          {avatarUrl && !avatarUploading && (
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto', fontSize: 11, padding: '2px 10px' }} onClick={removeAvatar}>
              Remove photo
            </button>
          )}
          <div className='t-h2' style={{ marginTop: 8 }}>{user?.fullName}</div>
          <p className='t-small'>{user?.phone}</p>
        </div>

        {/* Discovery profile */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="t-label" style={{ marginBottom: 10 }}>Discovery profile</p>

          <p className="t-small" style={{ marginBottom: 6 }}>Handle</p>
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink3)', fontSize: 14 }}>@</span>
            <input
              className="input-field"
              placeholder="yourhandle"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              style={{ paddingLeft: 26 }}
            />
          </div>
          {handleStatus === 'checking' && <p className="t-small" style={{ marginBottom: 12 }}>Checking…</p>}
          {handleStatus && handleStatus !== 'checking' && (
            <p className="t-small" style={{ marginBottom: 12, color: handleStatus.available ? 'var(--sealed)' : 'var(--red)' }}>
              {handleStatus.available ? '✓ Available' : handleStatus.reason}
            </p>
          )}
          {!handleStatus && <div style={{ marginBottom: 12 }} />}

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
          <p className="t-small" style={{ marginBottom: 12 }}>
            Strangers see your handle and photo only — your real name is revealed once you mutually match.
          </p>

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
