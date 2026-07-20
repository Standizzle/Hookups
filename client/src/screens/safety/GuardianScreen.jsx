import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { guardianService } from '../../services/guardian.js';

const ALERT_TYPES = [
  { type: 'silent_checkin', icon: '🤫', label: 'Silent Check-In', desc: 'Sends a quiet "I\'m OK" to your circle' },
  { type: 'come_get_me', icon: '🚗', label: 'Come Get Me', desc: 'Shares your location and asks for pickup' },
  { type: 'emergency', icon: '🚨', label: 'Emergency', desc: 'Urgent alert with location to all contacts' },
];

const RELATIONS = ['parent', 'sibling', 'friend', 'partner', 'other'];

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}),
      { timeout: 3000 }
    );
  });
}

export function GuardianScreen() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('friend');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [alertSent, setAlertSent] = useState(null);
  const [alertLoading, setAlertLoading] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const data = await guardianService.listContacts();
      setContacts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingContacts(false);
    }
  }

  useEffect(() => { loadContacts(); }, []);

  async function addContact() {
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    setError('');
    try {
      await guardianService.addContact({ name: name.trim(), phone: phone.trim(), relation });
      setName('');
      setPhone('');
      setRelation('friend');
      setShowAdd(false);
      await loadContacts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(id) {
    try {
      await guardianService.removeContact(id);
      setDeleting(null);
      await loadContacts();
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendAlert(type) {
    const label = ALERT_TYPES.find((a) => a.type === type)?.label ?? type;
    setAlertLoading(type);
    try {
      const loc = await getLocation();
      await guardianService.sendAlert(type, loc);
      setAlertSent(label);
      setTimeout(() => setAlertSent(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setAlertLoading(null);
    }
  }

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '24px' }}>

        {/* Alert sent toast */}
        {alertSent && (
          <div style={{
            position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--sealed)', color: 'var(--navy-900)', padding: '10px 18px',
            borderRadius: 'var(--r-full)', fontSize: 13, fontWeight: 700,
            zIndex: 100, whiteSpace: 'nowrap',
          }}>
            ✓ {alertSent} sent
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto' }} onClick={() => navigate(-1)}>←</button>
          <div className="t-h2">🛡 Trusted Circle</div>
        </div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        {/* Alert buttons */}
        <p className="t-label" style={{ marginBottom: 10 }}>Send an alert</p>
        {!loadingContacts && contacts.length === 0 && (
          <p className="t-body" style={{ marginBottom: 16, fontSize: 13, color: 'var(--amber)' }}>
            Add at least one contact to send alerts.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {ALERT_TYPES.map(({ type, icon, label, desc }) => (
            <button
              key={type}
              className="card"
              style={{
                cursor: contacts.length > 0 ? 'pointer' : 'not-allowed',
                opacity: contacts.length > 0 ? 1 : 0.4,
                textAlign: 'left',
                borderColor: type === 'emergency' ? 'rgba(239,68,68,0.3)' : undefined,
              }}
              disabled={contacts.length === 0 || alertLoading === type}
              onClick={() => sendAlert(type)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{alertLoading === type ? 'Sending…' : label}</div>
                  <p className="t-small">{desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Contacts list */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p className="t-label">Your contacts ({contacts.length})</p>
          <button
            className="btn btn-primary btn-sm"
            style={{ width: 'auto' }}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 16 }}>
            <input
              className="input-field"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ marginBottom: 10 }}
              autoFocus
            />
            <input
              className="input-field"
              placeholder="Mobile number (+27…)"
              value={phone}
              type="tel"
              onChange={(e) => setPhone(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <select
              className="input-field"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={addContact} disabled={!name.trim() || !phone.trim() || saving}>
              {saving ? 'Saving…' : 'Save contact'}
            </button>
          </div>
        )}

        {loadingContacts && <p className="t-body" style={{ textAlign: 'center', marginTop: 8 }}>Loading…</p>}

        {!loadingContacts && contacts.length === 0 && !showAdd && (
          <p className="t-body" style={{ textAlign: 'center', marginTop: 8 }}>
            No contacts yet. Add someone you trust.
          </p>
        )}

        {contacts.map((c) => (
          <div key={c.id} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'var(--bg)',
              border: '1.5px solid var(--border2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18, flexShrink: 0,
            }}>
              👤
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
              <p className="t-small">{c.phone} · {c.relation}</p>
            </div>
            {deleting === c.id ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-danger btn-sm" style={{ width: 'auto', fontSize: 12, padding: '4px 10px' }} onClick={() => removeContact(c.id)}>
                  Delete
                </button>
                <button className="btn btn-ghost btn-sm" style={{ width: 'auto', fontSize: 12, padding: '4px 10px' }} onClick={() => setDeleting(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="btn btn-ghost btn-sm" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => setDeleting(c.id)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
