import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';

const ALERT_TYPES = [
  { type: 'silent_checkin', icon: '🤫', label: 'Silent Check-In', desc: 'Sends a quiet "I\'m OK" to your circle' },
  { type: 'come_get_me', icon: '🚗', label: 'Come Get Me', desc: 'Shares your location and asks for pickup' },
  { type: 'emergency', icon: '🚨', label: 'Emergency', desc: 'Urgent alert with location to all contacts' },
];

function loadContacts() {
  try { return JSON.parse(localStorage.getItem('guardian_contacts') || '[]'); } catch { return []; }
}
function saveContacts(c) { localStorage.setItem('guardian_contacts', JSON.stringify(c)); }

export function GuardianScreen() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState(loadContacts);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [alertSent, setAlertSent] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function addContact() {
    if (!name.trim() || !phone.trim()) return;
    const updated = [...contacts, { id: Date.now().toString(), name: name.trim(), phone: phone.trim() }];
    setContacts(updated);
    saveContacts(updated);
    setName('');
    setPhone('');
    setShowAdd(false);
  }

  function removeContact(id) {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveContacts(updated);
    setDeleting(null);
  }

  async function sendAlert(type) {
    const label = ALERT_TYPES.find((a) => a.type === type)?.label ?? type;
    setAlertSent(label);
    setTimeout(() => setAlertSent(null), 3000);
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

        {/* Alert buttons */}
        <p className="t-label" style={{ marginBottom: 10 }}>Send an alert</p>
        {contacts.length === 0 && (
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
              disabled={contacts.length === 0}
              onClick={() => sendAlert(type)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
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
              style={{ marginBottom: 12 }}
            />
            <button className="btn btn-primary btn-sm" onClick={addContact} disabled={!name.trim() || !phone.trim()}>
              Save contact
            </button>
          </div>
        )}

        {contacts.length === 0 && !showAdd && (
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
              <p className="t-small">{c.phone}</p>
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
