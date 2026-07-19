import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { Avatar } from '../../components/common/Avatar.jsx';
import { meetupsService } from '../../services/meetups.js';
import { discoverService } from '../../services/discover.js';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

const PLACES = [
  'UCT Upper Campus', 'Kalk Bay Harbour', 'V&A Waterfront', 'Stellenbosch Wine Estate',
  'Sea Point Promenade', 'Truth Coffee, CBD',
];

function fmtTime(iso) {
  return new Date(iso).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function MeetupsScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);

  const [step, setStep] = useState('list'); // list | propose-partner | propose-place | propose-time | done | confirm-pin
  const [meetups, setMeetups] = useState([]);
  const [matchedPartners, setMatchedPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [partner, setPartner] = useState(null);
  const [place, setPlace] = useState('');
  const [customPlace, setCustomPlace] = useState('');
  const [datetime, setDatetime] = useState('');
  const [proposing, setProposing] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  async function loadMeetups() {
    setLoading(true);
    try {
      setMeetups(await meetupsService.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMeetups(); }, []);

  async function openProposeFlow() {
    setError('');
    try {
      const matches = await discoverService.matches();
      setMatchedPartners(matches.filter((m) => m.status === 'matched').map((m) => m.partner));
      setStep('propose-partner');
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitProposal() {
    setProposing(true);
    setError('');
    try {
      await meetupsService.propose({ partnerId: partner.id, place: place || customPlace, scheduledAt: new Date(datetime).toISOString() });
      setStep('done');
    } catch (err) {
      setError(err.message);
    } finally {
      setProposing(false);
    }
  }

  async function handleConfirmPIN(pin, reset, setPinError) {
    try {
      await meetupsService.confirm(confirmTarget.id, pin);
      setConfirmTarget(null);
      setStep('list');
      await loadMeetups();
    } catch (err) {
      reset();
      setPinError(err.message ?? 'Incorrect PIN');
    }
  }

  function backToList() {
    setStep('list');
    setPartner(null);
    setPlace('');
    setCustomPlace('');
    setDatetime('');
    loadMeetups();
  }

  if (step === 'done') {
    return (
      <div className="phone-inner">
        <StatusBar />
        <div className="screen" style={{ padding: '24px', textAlign: 'center', paddingTop: 60 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📍</div>
          <div className="t-h2" style={{ marginBottom: 8, color: 'var(--sealed)' }}>Meetup Proposed!</div>
          <p className="t-body" style={{ marginBottom: 8 }}>
            Sent to <strong style={{ color: 'var(--ink)' }}>{partner?.name}</strong>
          </p>
          <div className="card" style={{ marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{place || customPlace}</div>
            <p className="t-small">{fmtTime(datetime)}</p>
          </div>
          <button className="btn btn-primary" onClick={backToList}>
            Back to meetups
          </button>
        </div>
        <NavBar active={2} onTab={nav} />
      </div>
    );
  }

  if (step === 'confirm-pin' && confirmTarget) {
    return (
      <div className="phone-inner">
        <StatusBar />
        <div className="screen" style={{ padding: '24px' }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 20 }} onClick={() => { setConfirmTarget(null); setStep('list'); }}>← Back</button>
          <div className="t-h2" style={{ marginBottom: 8 }}>Confirm meetup</div>
          <p className="t-body" style={{ marginBottom: 20 }}>
            With <strong style={{ color: 'var(--ink)' }}>{confirmTarget.partner.fullName}</strong> at {confirmTarget.place}, {fmtTime(confirmTarget.scheduledAt)}. Entering your PIN confirms you'll be there.
          </p>
          <PinPad onComplete={handleConfirmPIN} label="Enter your PIN to confirm" />
        </div>
        <NavBar active={2} onTab={nav} />
      </div>
    );
  }

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '24px' }}>

        {step === 'list' && (
          <div className="anim-fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="t-h2">Meetups</div>
              <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={openProposeFlow}>
                + Propose
              </button>
            </div>

            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            {loading && <p className="t-body" style={{ textAlign: 'center', marginTop: 20 }}>Loading…</p>}

            {!loading && meetups.map((m) => (
              <div key={m.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar avatarUrl={m.partner.avatarUrl} seed={m.partner.id} label={m.partner.fullName} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>with {m.partner.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 2 }}>📍 {m.place}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>🕐 {fmtTime(m.scheduledAt)}</div>
                  </div>
                  <span className={`pill ${m.status === 'confirmed' ? 'pill-sealed' : m.status === 'cancelled' ? 'pill-revoked' : 'pill-pending'}`}>
                    {m.status === 'confirmed' ? '✓ Confirmed' : m.status === 'cancelled' ? 'Cancelled' : '⏳ Pending'}
                  </span>
                </div>
                {m.status === 'pending' && !m.isProposer && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setConfirmTarget(m); setStep('confirm-pin'); }}>
                    Confirm with PIN →
                  </button>
                )}
                {m.status === 'pending' && m.isProposer && (
                  <p className="t-small" style={{ marginTop: 10 }}>Waiting for {m.partner.fullName} to confirm…</p>
                )}
              </div>
            ))}

            {!loading && meetups.length === 0 && (
              <p className="t-body" style={{ textAlign: 'center', marginTop: 40 }}>No meetups yet. Propose one!</p>
            )}
          </div>
        )}

        {step === 'propose-partner' && (
          <div className="anim-fade-up">
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 20 }} onClick={() => setStep('list')}>← Back</button>
            <div className="t-h2" style={{ marginBottom: 8 }}>Who's the meetup with?</div>
            <p className="t-body" style={{ marginBottom: 20 }}>Choose from your matched connections.</p>
            {matchedPartners.map((p) => (
              <button
                key={p.id}
                className="card"
                style={{ width: '100%', cursor: 'pointer', textAlign: 'left', marginBottom: 10, borderColor: partner?.id === p.id ? 'var(--accent)' : undefined }}
                onClick={() => { setPartner(p); setStep('propose-place'); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar avatarUrl={p.avatarUrl} seed={p.id} label={p.name} size={40} />
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                </div>
              </button>
            ))}
            {matchedPartners.length === 0 && (
              <p className="t-body" style={{ textAlign: 'center', marginTop: 20 }}>
                You don't have any mutual matches yet — head to Matchups to connect with someone first.
              </p>
            )}
          </div>
        )}

        {step === 'propose-place' && (
          <div className="anim-fade-up">
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 20 }} onClick={() => setStep('propose-partner')}>← Back</button>
            <div className="t-h2" style={{ marginBottom: 8 }}>Where to meet?</div>
            <p className="t-body" style={{ marginBottom: 16 }}>Pick a spot or enter your own.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {PLACES.map((pl) => (
                <button
                  key={pl}
                  className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', borderColor: place === pl ? 'var(--accent)' : undefined }}
                  onClick={() => setPlace(pl)}
                >
                  <span style={{ fontSize: 14 }}>📍 {pl}</span>
                </button>
              ))}
            </div>
            <input
              className="input-field"
              placeholder="Or enter a custom location…"
              value={customPlace}
              onChange={(e) => { setCustomPlace(e.target.value); setPlace(''); }}
              style={{ marginBottom: 16 }}
            />
            <button className="btn btn-primary" onClick={() => setStep('propose-time')} disabled={!place && !customPlace.trim()}>
              Set time →
            </button>
          </div>
        )}

        {step === 'propose-time' && (
          <div className="anim-fade-up">
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 20 }} onClick={() => setStep('propose-place')}>← Back</button>
            <div className="t-h2" style={{ marginBottom: 8 }}>When?</div>
            <p className="t-body" style={{ marginBottom: 16 }}>Your partner will need to confirm with their PIN.</p>
            <input
              className="input-field"
              type="datetime-local"
              value={datetime}
              onChange={(e) => setDatetime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              style={{ marginBottom: 20 }}
            />
            <div className="card" style={{ marginBottom: 20 }}>
              <p className="t-label" style={{ marginBottom: 8 }}>Summary</p>
              <div style={{ fontSize: 13, marginBottom: 4 }}>👤 With: <strong>{partner?.name}</strong></div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>📍 At: <strong>{place || customPlace}</strong></div>
              {datetime && <div style={{ fontSize: 13 }}>🕐 When: <strong>{fmtTime(datetime)}</strong></div>}
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button className="btn btn-primary" onClick={submitProposal} disabled={!datetime || proposing}>
              {proposing ? 'Sending…' : 'Propose meetup →'}
            </button>
          </div>
        )}

      </div>
      <NavBar active={2} onTab={nav} />
    </div>
  );
}
