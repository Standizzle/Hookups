import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { consentService } from '../../services/consent.js';
import { usersService } from '../../services/users.js';
import { useAuth } from '../../context/AuthContext.jsx';

const METHODS = [
  { id: 'qr',     icon: '📱', label: 'QR Code',      desc: 'Show a QR to scan' },
  { id: 'nfc',    icon: '📡', label: 'NFC Tap',       desc: 'Tap phones together' },
  { id: 'airdrop',icon: '🌐', label: 'AirDrop',       desc: 'iOS to iOS' },
  { id: 'manual', icon: '⌨️', label: 'Manual',        desc: 'Enter ID manually' },
];

export function ConsentScreen() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();

  // If coming from a deeplink: hookups://consent/<id>
  const incomingId = params.get('id');

  const [role,   setRole]   = useState(incomingId ? 'consenter' : null); // null | requester | consenter
  const [step,   setStep]   = useState(incomingId ? 'disclosure' : 'role');
  const [method, setMethod] = useState(null);
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partner,      setPartner]      = useState(null);
  const [partnerError, setPartnerError] = useState('');
  const [terms,  setTerms]  = useState({
    physicalIntimacy: false, kissingAffection: false,
    photosVideo: false, overnightStays: false,
    safeWord: '', locationSharing: false,
  });
  const [locationAgree, setLocationAgree] = useState(false);
  const [disclosure, setDisclosure] = useState(null);
  const [consentId,  setConsentId]  = useState(incomingId);
  const [deeplink,   setDeeplink]   = useState('');
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);

  // Deeplink/QR entry (hookups://consent/<id>) — fetch disclosure immediately
  useEffect(() => {
    if (incomingId) loadDisclosure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingId]);

  // ── Requester flow ──────────────────────────────────────────────────────────
  async function findPartner() {
    setLoading(true);
    setPartnerError('');
    try {
      const found = await usersService.lookupByPhone(partnerPhone.trim());
      setPartner(found);
      setStep('terms');
    } catch (err) {
      setPartnerError(err.message ?? 'No matching user found');
    } finally {
      setLoading(false);
    }
  }

  async function createConsent() {
    setLoading(true);
    try {
      const data = await consentService.request({
        consenterId: partner.id,
        method,
        terms,
        expiresInMinutes: 60,
      });
      setConsentId(data.id);
      setDeeplink(data.deeplink);
      setStep('waiting');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Consenter flow ──────────────────────────────────────────────────────────
  async function loadDisclosure() {
    setLoading(true);
    try {
      const data = await consentService.getDisclosure(consentId);
      setDisclosure(data);
      setStep('disclosure');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPIN(pin, reset, setPinError) {
    setLoading(true);
    try {
      const data = await consentService.confirm(consentId, { pin, agreedToLocation: locationAgree });
      setResult(data);
      setStep('confirmed');
    } catch (err) {
      reset();
      setPinError(err.message ?? 'Incorrect PIN');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '24px' }}>

        {/* STEP: Role select */}
        {step === 'role' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 6 }}>New Consent</div>
            <p className="t-body" style={{ marginBottom: 24 }}>Who are you in this request?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button className="card" style={{ border: '1px solid var(--accent-border)', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => { setRole('requester'); setStep('partner'); }}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>🙋 I'm Requesting</div>
                <p className="t-small">You're initiating — you'll share a QR/NFC/AirDrop link for your partner to confirm.</p>
              </button>
              <button className="card" style={{ cursor: 'pointer', textAlign: 'left' }}
                onClick={() => { setRole('consenter'); setStep('scan'); }}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>✋ I'm Consenting</div>
                <p className="t-small">Your partner has a code or link — enter the consent ID to review and confirm.</p>
              </button>
            </div>
          </div>
        )}

        {/* STEP: Requester — find partner */}
        {step === 'partner' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 6 }}>Who's this with?</div>
            <p className="t-body" style={{ marginBottom: 16 }}>Enter your partner's mobile number — they need an existing Hookups account.</p>
            <input
              className="input-field"
              type="tel"
              placeholder="+27 82 123 4567"
              value={partnerPhone}
              onChange={(e) => setPartnerPhone(e.target.value)}
              autoFocus
            />
            {partnerError && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{partnerError}</p>}
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={findPartner} disabled={!partnerPhone.trim() || loading}>
              {loading ? 'Looking up…' : 'Find partner →'}
            </button>
          </div>
        )}

        {/* STEP: Requester — set terms */}
        {step === 'terms' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 4 }}>Terms of this consent</div>
            {partner && (
              <p className="t-body" style={{ marginBottom: 16 }}>
                With <strong style={{ color: 'var(--ink)' }}>{partner.fullName}</strong>
                {partner.verified && <span className="pill pill-sky" style={{ marginLeft: 6 }}>✓ Verified</span>}
              </p>
            )}
            {[
              { key: 'kissingAffection',  label: 'Kissing & Affection' },
              { key: 'physicalIntimacy',  label: 'Physical Intimacy' },
              { key: 'overnightStays',    label: 'Overnight Stays' },
              { key: 'photosVideo',       label: 'Photos / Video' },
              { key: 'locationSharing',   label: '📍 Live Location Sharing' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
                <input type="checkbox" checked={terms[key]} onChange={(e) => setTerms((t) => ({ ...t, [key]: e.target.checked }))} style={{ width: 20, height: 20, accentColor: 'var(--accent)' }} />
              </label>
            ))}
            <label style={{ display: 'block', marginBottom: 20 }}>
              <p className="t-label" style={{ marginBottom: 6 }}>Safe word</p>
              <input className="input-field" placeholder="e.g. pineapple" value={terms.safeWord} onChange={(e) => setTerms((t) => ({ ...t, safeWord: e.target.value }))} />
            </label>
            <button className="btn btn-primary" onClick={() => setStep('method')}>Choose method →</button>
          </div>
        )}

        {/* STEP: Requester — pick method */}
        {step === 'method' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 16 }}>How to connect?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {METHODS.map((m) => (
                <button key={m.id} className="card"
                  style={{ cursor: 'pointer', textAlign: 'left', borderColor: method === m.id ? 'var(--accent)' : undefined, background: method === m.id ? 'var(--accent-bg)' : undefined }}
                  onClick={() => setMethod(m.id)}>
                  <div style={{ fontWeight: 700 }}>{m.icon} {m.label}</div>
                  <p className="t-small">{m.desc}</p>
                </button>
              ))}
            </div>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={createConsent} disabled={!method || loading}>
              {loading ? 'Creating…' : 'Generate request →'}
            </button>
          </div>
        )}

        {/* STEP: Requester — waiting */}
        {step === 'waiting' && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 16 }}>
            <div className="t-h2" style={{ marginBottom: 6 }}>Share with your partner</div>
            <p className="t-body" style={{ marginBottom: 20 }}>Scan the QR code or copy the link below.</p>

            {/* QR code */}
            <div style={{
              display: 'inline-flex', padding: 16, background: '#fff', borderRadius: 'var(--r-md)',
              border: '2px solid var(--accent)', marginBottom: 16,
            }}>
              <QRCodeSVG
                value={deeplink || `hookups://consent/${consentId}`}
                size={180}
                bgColor="#ffffff"
                fgColor="#0E1720"
                level="M"
              />
            </div>

            {/* Method badge */}
            {method && (
              <div style={{ marginBottom: 12 }}>
                <span className="pill pill-sky">
                  {METHODS.find((m) => m.id === method)?.icon} {METHODS.find((m) => m.id === method)?.label}
                </span>
              </div>
            )}

            {/* Deeplink */}
            <div className="card" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all', background: 'var(--bg)', marginBottom: 16, textAlign: 'left' }}>
              {deeplink || `hookups://consent/${consentId}`}
            </div>

            {/* Pulsing status */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-ring 1.5s ease infinite' }} />
              <span className="t-small">Waiting for partner to confirm…</span>
            </div>

            <button className="btn btn-ghost" onClick={() => navigate('/home')}>Back to home</button>
          </div>
        )}

        {/* STEP: Consenter — enter ID */}
        {step === 'scan' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 8 }}>Enter consent ID</div>
            <p className="t-body" style={{ marginBottom: 16 }}>Your partner's QR / NFC / AirDrop contains this ID.</p>
            <input className="input-field" placeholder="Consent ID (UUID)" value={consentId ?? ''} onChange={(e) => setConsentId(e.target.value)} />
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={loadDisclosure} disabled={!consentId || loading}>
              {loading ? 'Loading…' : 'Review terms →'}
            </button>
          </div>
        )}

        {/* STEP: Consenter — disclosure */}
        {step === 'disclosure' && disclosure && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 4 }}>Review & Confirm</div>
            <p className="t-body" style={{ marginBottom: 16 }}>
              <strong style={{ color: 'var(--ink)' }}>{disclosure.requester.name}</strong>{' '}
              {disclosure.requester.verified && <span className="pill pill-sky">✓ Verified</span>}
              {' '}is requesting your consent.
            </p>

            <div className="card" style={{ marginBottom: 16 }}>
              <p className="t-label" style={{ marginBottom: 10 }}>Agreed terms</p>
              {[
                ['Kissing & Affection', disclosure.terms.kissingAffection],
                ['Physical Intimacy',   disclosure.terms.physicalIntimacy],
                ['Overnight Stays',     disclosure.terms.overnightStays],
                ['Photos / Video',      disclosure.terms.photosVideo],
              ].map(([label, agreed]) => agreed && (
                <div key={label} style={{ fontSize: 13, marginBottom: 6 }}>✅ {label}</div>
              ))}
              {disclosure.terms.safeWord && (
                <div style={{ fontSize: 13, marginTop: 8, color: 'var(--ink2)' }}>
                  Safe word: <strong style={{ color: 'var(--ink)' }}>{disclosure.terms.safeWord}</strong>
                </div>
              )}
            </div>

            {disclosure.terms.locationSharing && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(56,189,248,0.3)' }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📍 Location sharing requested</p>
                <p className="t-small" style={{ marginBottom: 10 }}>
                  You can agree to the intimacy terms without agreeing to location sharing — this is always your choice.
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={locationAgree} onChange={(e) => setLocationAgree(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 13 }}>I agree to share my live location</span>
                </label>
              </div>
            )}

            <p className="t-small" style={{ marginBottom: 16, textAlign: 'center' }}>
              Expires {new Date(disclosure.expiresAt).toLocaleTimeString()}. Entering your PIN creates a signed, tamper-resistant record.
            </p>

            <PinPad onComplete={handleConfirmPIN} label="Enter your PIN to confirm" disabled={loading} />
          </div>
        )}

        {/* STEP: Confirmed */}
        {step === 'confirmed' && result && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 24 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--sealed-bg)', border: '2px solid var(--sealed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>✅</div>
            <div className="t-h2" style={{ color: 'var(--sealed)', marginBottom: 8 }}>Consent Sealed</div>
            <p className="t-body" style={{ marginBottom: 4 }}>Record ID</p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)', marginBottom: 16 }}>{result.recordId}</div>
            <p className="t-small" style={{ marginBottom: 24 }}>
              Expires {new Date(result.expiresAt).toLocaleString()}<br />
              {result.locationSharing && '📍 Live location sharing is active'}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/home')}>Done</button>
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/logs')}>View logs</button>
          </div>
        )}

      </div>
      <NavBar active={1} onTab={(i) => ['/home', '/consent', '/discover', '/logs', '/profile'][i] && navigate(['/home', '/consent', '/discover', '/logs', '/profile'][i])} />
    </div>
  );
}
