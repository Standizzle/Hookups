import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { parentalService } from '../../services/parental.js';

const LEVELS = [
  { value: 1, label: 'Level 1 — Holding hands & hugging' },
  { value: 2, label: 'Level 2 — Kissing' },
  { value: 3, label: 'Level 3 — Touching above clothing (override required)' },
  { value: 4, label: 'Level 4 — Touching under clothing (blocked)' },
  { value: 5, label: 'Level 5 — Sexual intimacy (blocked)' },
];

function LevelControls({ link, onSaved }) {
  const [permittedLevel, setPermittedLevel] = useState(link.permittedLevel);
  const [locationAlerts, setLocationAlerts] = useState(link.locationAlerts);
  const [autoCheckIn, setAutoCheckIn] = useState(link.autoCheckIn);
  const [checkInWindowMinutes, setCheckInWindowMinutes] = useState(link.checkInWindowMinutes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await parentalService.updateSettings(link.id, {
        permittedLevel, locationAlerts, autoCheckIn, checkInWindowMinutes,
      });
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{link.minor.fullName}</div>

      <p className="t-small" style={{ marginBottom: 6 }}>Permitted level</p>
      <select
        className="input-field"
        value={permittedLevel}
        onChange={(e) => setPermittedLevel(Number(e.target.value))}
        style={{ marginBottom: 12, fontSize: 13 }}
      >
        {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
      </select>

      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13 }}>Location alerts</span>
        <input type="checkbox" checked={locationAlerts} onChange={(e) => setLocationAlerts(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
      </label>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13 }}>Auto check-in</span>
        <input type="checkbox" checked={autoCheckIn} onChange={(e) => setAutoCheckIn(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span className="t-small" style={{ display: 'block', marginBottom: 6 }}>Check-in window (minutes)</span>
        <input
          className="input-field"
          type="number" min={5} max={60}
          value={checkInWindowMinutes}
          onChange={(e) => setCheckInWindowMinutes(Number(e.target.value))}
        />
      </label>

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  );
}

export function ParentalScreen() {
  const navigate = useNavigate();
  const [links, setLinks] = useState({ asParent: [], asMinor: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingId, setAcceptingId] = useState(null);

  const [minorPhone, setMinorPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function loadLinks() {
    try {
      setLinks(await parentalService.myLinks());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLinks(); }, []);

  async function acceptLink(id) {
    setAcceptingId(id);
    try {
      await parentalService.accept(id);
      await loadLinks();
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingId(null);
    }
  }

  async function sendLinkRequest() {
    setSending(true);
    setError('');
    try {
      await parentalService.link(minorPhone.trim());
      setSent(true);
      setMinorPhone('');
      await loadLinks();
    } catch (err) {
      setError(err.message ?? 'Could not send link request');
    } finally {
      setSending(false);
    }
  }

  function updateLinkInState(updated) {
    setLinks((prev) => ({
      ...prev,
      asParent: prev.asParent.map((l) => l.id === updated.id ? { ...l, ...updated } : l),
    }));
  }

  const pendingAsMinor = links.asMinor.filter((l) => l.status === 'pending');
  const activeAsMinor = links.asMinor.filter((l) => l.status === 'active');
  const pendingAsParent = links.asParent.filter((l) => l.status === 'pending');
  const activeAsParent = links.asParent.filter((l) => l.status === 'active');

  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{ padding: '24px' }}>
        <div className='t-h2' style={{ marginBottom: 16 }}>👨‍👩‍👧 Parental Controls</div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {loading && <p className="t-body">Loading…</p>}

        {!loading && pendingAsMinor.length > 0 && (
          <>
            <p className="t-label" style={{ marginBottom: 8 }}>Requests to you</p>
            {pendingAsMinor.map((l) => (
              <div key={l.id} className="card" style={{ marginBottom: 10, borderColor: 'rgba(245,158,11,0.3)' }}>
                <p className="t-body" style={{ marginBottom: 10 }}>
                  <strong style={{ color: 'var(--ink)' }}>{l.parent.fullName}</strong> wants to be your linked parent/guardian.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => acceptLink(l.id)} disabled={acceptingId === l.id}>
                  {acceptingId === l.id ? 'Accepting…' : 'Accept'}
                </button>
              </div>
            ))}
          </>
        )}

        {!loading && activeAsMinor.length > 0 && (
          <>
            <p className="t-label" style={{ marginBottom: 8 }}>Your linked parent</p>
            {activeAsMinor.map((l) => (
              <div key={l.id} className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700 }}>{l.parent.fullName}</div>
                <p className="t-small">Permitted level {l.permittedLevel} of 5</p>
              </div>
            ))}
          </>
        )}

        {!loading && activeAsParent.length > 0 && (
          <>
            <p className="t-label" style={{ marginBottom: 8 }}>Children you oversee</p>
            {activeAsParent.map((l) => <LevelControls key={l.id} link={l} onSaved={updateLinkInState} />)}
          </>
        )}

        {!loading && pendingAsParent.length > 0 && (
          <>
            <p className="t-label" style={{ marginBottom: 8 }}>Waiting for them to accept</p>
            {pendingAsParent.map((l) => (
              <div key={l.id} className="card" style={{ marginBottom: 10 }}>
                <p className="t-body">⏳ {l.minor.fullName} hasn't accepted your link request yet.</p>
              </div>
            ))}
          </>
        )}

        <p className="t-label" style={{ marginBottom: 8, marginTop: 4 }}>Link a new account</p>
        {sent ? (
          <p className='t-body' style={{ marginBottom: 16 }}>Link request sent. They'll need to accept it from their account.</p>
        ) : (
          <div className="card" style={{ marginBottom: 16 }}>
            <p className='t-small' style={{ marginBottom: 10 }}>
              As a parent or guardian, link your teen's account by entering their mobile number.
            </p>
            <input
              className='input-field'
              type='tel'
              placeholder="Teen's mobile number (+27…)"
              value={minorPhone}
              onChange={(e) => setMinorPhone(e.target.value)}
              style={{ marginBottom: 10 }}
            />
            <button className='btn btn-primary btn-sm' onClick={sendLinkRequest} disabled={!minorPhone.trim() || sending}>
              {sending ? 'Sending…' : 'Send parent link request'}
            </button>
          </div>
        )}

        <button className='btn btn-ghost' onClick={() => navigate(-1)}>Back</button>
      </div>
    </div>
  );
}
