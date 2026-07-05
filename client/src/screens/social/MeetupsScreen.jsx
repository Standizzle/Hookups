import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';

const NAV = ['/home', '/consent', '/discover', '/logs', '/profile'];

const MOCK_MEETUPS = [
  { id: 'mu1', partner: 'Lerato M.', avatar: '👩🏾', place: 'UCT Upper Campus', time: 'Sat 12 Jul · 7pm', status: 'confirmed' },
  { id: 'mu2', partner: 'Kagiso D.', avatar: '👨🏾', place: 'Kalk Bay Harbour', time: 'Sun 13 Jul · 2pm', status: 'pending' },
];

const PARTNERS = [
  { id: 'p1', name: 'Lerato M.', avatar: '👩🏾' },
  { id: 'p2', name: 'Kagiso D.', avatar: '👨🏾' },
  { id: 'p3', name: 'Zara N.', avatar: '👩🏽' },
];

const PLACES = [
  'UCT Upper Campus', 'Kalk Bay Harbour', 'V&A Waterfront', 'Stellenbosch Wine Estate',
  'Sea Point Promenade', 'Truth Coffee, CBD',
];

export function MeetupsScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(NAV[i]);

  const [step, setStep] = useState('list'); // list | propose-partner | propose-place | propose-time | pin | done
  const [partner, setPartner] = useState(null);
  const [place, setPlace] = useState('');
  const [customPlace, setCustomPlace] = useState('');
  const [datetime, setDatetime] = useState('');
  const [pinError, setPinError] = useState('');

  function handlePIN(pin, reset, setErr) {
    if (pin === '1234') {
      setStep('done');
    } else {
      reset();
      setErr('Incorrect PIN. Try again.');
    }
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
            <p className="t-small">{datetime}</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setStep('list'); setPartner(null); setPlace(''); setDatetime(''); }}>
            Back to meetups
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

        {step === 'list' && (
          <div className="anim-fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="t-h2">Meetups</div>
              <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => setStep('propose-partner')}>
                + Propose
              </button>
            </div>

            {MOCK_MEETUPS.map((m) => (
              <div key={m.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', fontSize: 20,
                    background: 'var(--bg)', border: '1.5px solid var(--border2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {m.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>with {m.partner}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 2 }}>📍 {m.place}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>🕐 {m.time}</div>
                  </div>
                  <span className={`pill ${m.status === 'confirmed' ? 'pill-sealed' : 'pill-pending'}`}>
                    {m.status === 'confirmed' ? '✓ Confirmed' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            ))}

            {MOCK_MEETUPS.length === 0 && (
              <p className="t-body" style={{ textAlign: 'center', marginTop: 40 }}>No meetups yet. Propose one!</p>
            )}
          </div>
        )}

        {step === 'propose-partner' && (
          <div className="anim-fade-up">
            <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 20 }} onClick={() => setStep('list')}>← Back</button>
            <div className="t-h2" style={{ marginBottom: 8 }}>Who's the meetup with?</div>
            <p className="t-body" style={{ marginBottom: 20 }}>Choose from your connected partners.</p>
            {PARTNERS.map((p) => (
              <button
                key={p.id}
                className="card"
                style={{ width: '100%', cursor: 'pointer', textAlign: 'left', marginBottom: 10, borderColor: partner?.id === p.id ? 'var(--accent)' : undefined }}
                onClick={() => { setPartner(p); setStep('propose-place'); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>{p.avatar}</span>
                  <span style={{ fontWeight: 700 }}>{p.name}</span>
                </div>
              </button>
            ))}
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
            <p className="t-body" style={{ marginBottom: 16 }}>Your partner will need to confirm.</p>
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
              {datetime && <div style={{ fontSize: 13 }}>🕐 When: <strong>{new Date(datetime).toLocaleString()}</strong></div>}
            </div>
            <button className="btn btn-primary" onClick={() => setStep('pin')} disabled={!datetime}>
              Confirm with PIN →
            </button>
          </div>
        )}

        {step === 'pin' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 8 }}>Confirm with your PIN</div>
            <p className="t-body" style={{ marginBottom: 20 }}>This records your intent to meet. You can cancel up to 1h before.</p>
            <PinPad onComplete={handlePIN} label="Enter your PIN" />
          </div>
        )}

      </div>
      <NavBar active={2} onTab={nav} />
    </div>
  );
}
