import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { Avatar } from '../../components/common/Avatar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { usersService } from '../../services/users.js';
import { partnersService } from '../../services/partners.js';
import { relationshipsService } from '../../services/relationships.js';

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

  const galleryInputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const GALLERY_MAX = 6;

  async function loadPhotos() {
    try {
      setPhotos(await usersService.listPhotos());
    } catch { /* non-fatal */ }
  }

  useEffect(() => { loadPhotos(); }, []);

  async function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryUploading(true);
    setGalleryError('');
    try {
      await usersService.uploadPhoto(file);
      await loadPhotos();
    } catch (err) {
      setGalleryError(err.message);
    } finally {
      setGalleryUploading(false);
      e.target.value = '';
    }
  }

  async function removePhoto(id) {
    setGalleryUploading(true);
    setGalleryError('');
    try {
      await usersService.deletePhoto(id);
      await loadPhotos();
    } catch (err) {
      setGalleryError(err.message);
    } finally {
      setGalleryUploading(false);
    }
  }

  const [partners, setPartners] = useState([]);
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerBusy, setPartnerBusy] = useState(false);
  const [partnerError, setPartnerError] = useState('');

  const [relData, setRelData] = useState({ relationship: null, hallPass: [] });
  const [relPhone, setRelPhone] = useState('');
  const [relBusy, setRelBusy] = useState(false);
  const [relError, setRelError] = useState('');
  const [hallPassPhone, setHallPassPhone] = useState('');
  const [hallPassDays, setHallPassDays] = useState(30);
  const [pinAction, setPinAction] = useState(null); // { type: 'accept-relationship'|'end-relationship', id }

  async function loadRelationshipData() {
    try {
      const [links, rel] = await Promise.all([partnersService.list(), relationshipsService.mine()]);
      setPartners(links);
      setRelData(rel);
    } catch { /* non-fatal — leave previous state */ }
  }

  useEffect(() => { loadRelationshipData(); }, []);

  async function requestPartner() {
    setPartnerBusy(true);
    setPartnerError('');
    try {
      const found = await usersService.lookupByPhone(partnerPhone);
      await partnersService.request(found.id);
      setPartnerPhone('');
      await loadRelationshipData();
    } catch (err) {
      setPartnerError(err.message);
    } finally {
      setPartnerBusy(false);
    }
  }

  async function unlinkPartner(id) {
    setPartnerBusy(true);
    try {
      await partnersService.unlink(id);
      await loadRelationshipData();
    } catch (err) {
      setPartnerError(err.message);
    } finally {
      setPartnerBusy(false);
    }
  }

  async function acceptPartner(id) {
    await partnersService.accept(id);
    await loadRelationshipData();
  }

  async function requestRelationship() {
    setRelBusy(true);
    setRelError('');
    try {
      await relationshipsService.request(relPhone);
      setRelPhone('');
      await loadRelationshipData();
    } catch (err) {
      setRelError(err.message);
    } finally {
      setRelBusy(false);
    }
  }

  async function acceptRelationship(id, pin, reset, setPadError) {
    try {
      await relationshipsService.accept(id, pin);
      setPinAction(null);
      await loadRelationshipData();
    } catch (err) {
      reset();
      setPadError(err.message ?? 'Incorrect PIN');
    }
  }

  async function endRelationship(id, pin, reset, setPadError) {
    try {
      await relationshipsService.end(id, pin);
      setPinAction(null);
      await loadRelationshipData();
    } catch (err) {
      reset();
      setPadError(err.message ?? 'Incorrect PIN');
    }
  }

  async function updateRelSettings(id, settings) {
    setRelError('');
    try {
      await relationshipsService.updateSettings(id, settings);
      await loadRelationshipData();
    } catch (err) {
      setRelError(err.message);
    }
  }

  async function addHallPass(id) {
    setRelError('');
    try {
      const expiresAt = new Date(Date.now() + hallPassDays * 86400000).toISOString();
      await relationshipsService.addHallPass(id, hallPassPhone, expiresAt);
      setHallPassPhone('');
      await loadRelationshipData();
    } catch (err) {
      setRelError(err.message);
    }
  }

  async function removeHallPass(id, entryId) {
    try {
      await relationshipsService.removeHallPass(id, entryId);
      await loadRelationshipData();
    } catch (err) {
      setRelError(err.message);
    }
  }

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

  if (pinAction) {
    const labels = {
      'accept-relationship': 'Enter your PIN to confirm your Relationship Partner',
      'end-relationship':    'Enter your PIN to end the relationship',
    };
    const handlers = {
      'accept-relationship': (pin, reset, setPadError) => acceptRelationship(pinAction.id, pin, reset, setPadError),
      'end-relationship':    (pin, reset, setPadError) => endRelationship(pinAction.id, pin, reset, setPadError),
    };
    return (
      <div className='phone-inner'><StatusBar />
        <div className='screen' style={{ padding: '24px' }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 20 }} onClick={() => setPinAction(null)}>← Back</button>
          <PinPad onComplete={handlers[pinAction.type]} label={labels[pinAction.type]} />
        </div>
        <NavBar active={4} onTab={nav} />
      </div>
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

        {/* Gallery — extra photos shown on your Discovery profile, separate from the avatar above */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="t-label" style={{ marginBottom: 4 }}>Photos</p>
          <p className="t-small" style={{ marginBottom: 12 }}>Shown to people viewing your Discovery profile. Up to {GALLERY_MAX}.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {photos.map((p) => (
              <div key={p.id} style={{ position: 'relative', aspectRatio: '4/5', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border2)' }}>
                <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={() => removePhoto(p.id)}
                  disabled={galleryUploading}
                  style={{
                    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {photos.length < GALLERY_MAX && (
              <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={galleryUploading}
                style={{
                  aspectRatio: '4/5', borderRadius: 'var(--r-md)', border: '1px dashed var(--border2)',
                  background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, color: 'var(--ink3)',
                }}
              >
                {galleryUploading ? '…' : '+'}
              </button>
            )}
          </div>
          <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoPick} />
          {galleryError && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{galleryError}</p>}
        </div>

        {/* Linked Partners — saved contacts, faster Smart Connect, no consent obligations */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="t-label" style={{ marginBottom: 10 }}>Linked Partners</p>
          <p className="t-small" style={{ marginBottom: 12 }}>
            Saved contacts for faster Smart Connect. Every encounter still needs a full PIN.
          </p>

          {partners.map((p) => (
            <div key={p.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.partner.fullName}</div>
                  <span className="t-small">{p.status === 'active' ? 'Linked' : p.isProposer ? 'Pending — waiting on them' : 'Wants to link with you'}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {p.status === 'pending' && !p.isProposer && (
                    <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => acceptPartner(p.id)}>Accept</button>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} disabled={partnerBusy} onClick={() => unlinkPartner(p.id)}>
                    {p.status === 'pending' && p.isProposer ? 'Cancel' : 'Unlink'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field" placeholder="+27 82 123 4567" style={{ flex: 1 }}
              value={partnerPhone} onChange={(e) => setPartnerPhone(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} disabled={!partnerPhone.trim() || partnerBusy} onClick={requestPartner}>
              {partnerBusy ? '…' : 'Link'}
            </button>
          </div>
          {partnerError && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{partnerError}</p>}
        </div>

        {/* Relationship Partner — one at a time, mutually-PINned */}
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--pink-300)' }}>
          <p className="t-label" style={{ marginBottom: 10, color: 'var(--pink-500)' }}>Relationship Partner</p>

          {!relData.relationship && (
            <>
              <p className="t-small" style={{ marginBottom: 12 }}>
                One at a time, mutually confirmed with a PIN. Choose how much transparency you want between the two of you.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-field" placeholder="+27 82 123 4567" style={{ flex: 1 }}
                  value={relPhone} onChange={(e) => setRelPhone(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} disabled={!relPhone.trim() || relBusy} onClick={requestRelationship}>
                  {relBusy ? '…' : 'Request'}
                </button>
              </div>
            </>
          )}

          {relData.relationship?.status === 'pending' && relData.relationship.isProposer && (
            <p className="t-small">⏳ Waiting for <strong style={{ color: 'var(--ink)' }}>{relData.relationship.partner.fullName}</strong> to confirm with their PIN.</p>
          )}

          {relData.relationship?.status === 'pending' && !relData.relationship.isProposer && (
            <>
              <p className="t-small" style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--ink)' }}>{relData.relationship.partner.fullName}</strong> wants to be your Relationship Partner.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setPinAction({ type: 'accept-relationship', id: relData.relationship.id })}>
                Confirm with PIN →
              </button>
            </>
          )}

          {relData.relationship?.status === 'active' && (
            <>
              <p className="t-small" style={{ marginBottom: 14 }}>
                With <strong style={{ color: 'var(--ink)' }}>{relData.relationship.partner.fullName}</strong> since {new Date(relData.relationship.sealedAt).toLocaleDateString()}
              </p>

              <p className="t-small" style={{ marginBottom: 6 }}>Transparency mode</p>
              <select
                className="input-field" style={{ marginBottom: 12 }}
                value={relData.relationship.transparencyMode}
                onChange={(e) => updateRelSettings(relData.relationship.id, { transparencyMode: e.target.value })}
              >
                <option value="private">🔒 Private — just a contact bond</option>
                <option value="notify">🔔 Notify — read-only heads-up on other encounters</option>
                <option value="hall_pass">🤝 Hall Pass — pre-approve specific people</option>
              </select>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Public Relationship (others see "in a relationship" before PIN)</span>
                <input
                  type="checkbox" checked={relData.relationship.isPublic}
                  onChange={(e) => updateRelSettings(relData.relationship.id, { isPublic: e.target.checked })}
                  style={{ width: 20, height: 20, accentColor: 'var(--pink-500)', flexShrink: 0, marginLeft: 10 }}
                />
              </label>

              {relData.relationship.transparencyMode === 'hall_pass' && (
                <div style={{ marginBottom: 14 }}>
                  <p className="t-small" style={{ marginBottom: 8 }}>Hall Pass list — off-list encounters need your partner's approval</p>
                  {relData.hallPass.map((h) => (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13 }}>{h.approvedUser.fullName} — expires {new Date(h.expiresAt).toLocaleDateString()}</span>
                      <button className="btn btn-ghost btn-sm" style={{ width: 'auto', fontSize: 11, padding: '2px 8px' }} onClick={() => removeHallPass(relData.relationship.id, h.id)}>Remove</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      className="input-field" placeholder="+27 82 123 4567" style={{ flex: 1 }}
                      value={hallPassPhone} onChange={(e) => setHallPassPhone(e.target.value)}
                    />
                    <input
                      className="input-field" type="number" min={1} max={365} style={{ width: 64 }}
                      value={hallPassDays} onChange={(e) => setHallPassDays(parseInt(e.target.value) || 1)}
                    />
                    <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} disabled={!hallPassPhone.trim()} onClick={() => addHallPass(relData.relationship.id)}>
                      + Add
                    </button>
                  </div>
                </div>
              )}

              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setPinAction({ type: 'end-relationship', id: relData.relationship.id })}>
                I've Changed My Mind
              </button>
            </>
          )}

          {relError && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{relError}</p>}
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
