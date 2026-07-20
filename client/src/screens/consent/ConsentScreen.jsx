import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { consentService } from '../../services/consent.js';
import { usersService } from '../../services/users.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { getQuickLocation } from '../../utils/geo.js';

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
  const routerLocation = useLocation();

  // If coming from a deeplink: hookups://consent/<id>
  const incomingId = params.get('id');
  // If coming from Discovery/Matchups with a partner already chosen (no phone lookup needed)
  const preselectedPartner = routerLocation.state?.partner ?? null;

  const [role,   setRole]   = useState(incomingId ? 'consenter' : (preselectedPartner ? 'requester' : null));
  const [step,   setStep]   = useState(incomingId ? 'disclosure' : (preselectedPartner ? 'terms' : 'role'));
  const [method, setMethod] = useState(null);
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partner,      setPartner]      = useState(preselectedPartner);
  const [partnerError, setPartnerError] = useState('');
  const [terms,  setTerms]  = useState({
    holdingHandsHugging: false, kissingAffection: false,
    touchingAboveClothing: false, touchingUnderClothing: false, sexualIntimacy: false,
    photosVideo: false, overnightStays: false,
    safeWord: '', locationSharing: false,
  });
  const [locationAgree, setLocationAgree] = useState(false);
  const [disclosure, setDisclosure] = useState(null);
  const [consentId,  setConsentId]  = useState(incomingId);
  const [deeplink,   setDeeplink]   = useState('');
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [blockedReason, setBlockedReason] = useState(null);
  const [pendingPin, setPendingPin] = useState('');
  const [pendingLoc, setPendingLoc] = useState(null);

  const GATE_REASONS = [
    'NO_PARENTAL_LINK', 'LEVEL_BLOCKED', 'OVERRIDE_DENIED', 'OVERRIDE_PENDING',
    'RELATIONSHIP_OVERRIDE_PENDING', 'RELATIONSHIP_OVERRIDE_DENIED', 'SUBSCRIPTION_REQUIRED',
  ];
  const PENDING_REASONS = ['OVERRIDE_PENDING', 'RELATIONSHIP_OVERRIDE_PENDING'];

  // Deeplink/QR entry (hookups://consent/<id>) — fetch disclosure immediately
  useEffect(() => {
    if (incomingId) loadDisclosure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingId]);

  // Requester: poll while waiting for the partner to confirm
  useEffect(() => {
    if (step !== 'waiting' || !consentId) return;
    const interval = setInterval(async () => {
      try {
        await consentService.getDisclosure(consentId);
        // still pending — keep waiting
      } catch (err) {
        if (err.status !== 409) return;
        const finalStatus = err.body?.status;
        if (finalStatus === 'mutual') {
          const { records } = await consentService.list({});
          const record = records.find((r) => r.id === consentId);
          if (record) {
            setResult({
              status: record.status,
              recordId: record.recordId,
              confirmedAt: record.confirmedAt,
              expiresAt: record.expiresAt,
              locationSharing: record.locationSharing,
            });
            setStep('confirmed');
          }
        } else {
          // expired or revoked before confirmation
          clearInterval(interval);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [step, consentId]);

  // Consenter: while waiting on a Level 3 parental override OR a Relationship
  // Hall Pass approval, retry confirm periodically with the same (already-
  // correct) PIN — resolves automatically once the approver responds.
  useEffect(() => {
    if (step !== 'blocked' || !PENDING_REASONS.includes(blockedReason)) return;
    const interval = setInterval(async () => {
      try {
        const data = await consentService.confirm(consentId, { pin: pendingPin, agreedToLocation: locationAgree, lat: pendingLoc?.lat, lng: pendingLoc?.lng });
        setResult(data);
        setStep('confirmed');
      } catch (err) {
        if (err.code && !PENDING_REASONS.includes(err.code)) setBlockedReason(err.code);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [step, blockedReason, consentId, pendingPin, pendingLoc, locationAgree]);

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
      if (err.code === 'SUBSCRIPTION_REQUIRED') {
        setBlockedReason(err.code);
        setStep('blocked');
      } else {
        alert(err.message);
      }
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
    // Grabbed on every confirm attempt, not just a duress one — the app
    // never knows which case it is, so behavior must be identical either way.
    const loc = await getQuickLocation();
    try {
      const data = await consentService.confirm(consentId, { pin, agreedToLocation: locationAgree, lat: loc?.lat, lng: loc?.lng });
      setResult(data);
      setStep('confirmed');
    } catch (err) {
      if (err.code && GATE_REASONS.includes(err.code)) {
        // PIN was correct — this is a parental-controls block, not a wrong PIN
        setBlockedReason(err.code);
        setPendingPin(pin);
        setPendingLoc(loc);
        setStep('blocked');
      } else {
        reset();
        setPinError(err.message ?? 'Incorrect PIN');
      }
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
              { key: 'holdingHandsHugging',   label: 'Holding Hands & Hugging' },
              { key: 'kissingAffection',      label: 'Kissing & Affection' },
              { key: 'touchingAboveClothing', label: 'Touching Above Clothing' },
              { key: 'touchingUnderClothing', label: 'Touching Under Clothing' },
              { key: 'sexualIntimacy',        label: 'Sexual Intimacy' },
              { key: 'overnightStays',        label: 'Overnight Stays' },
              { key: 'photosVideo',           label: 'Photos / Video' },
              { key: 'locationSharing',       label: '📍 Live Location Sharing' },
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

            {disclosure.requester.relationship && (
              <div className="card" style={{ marginBottom: 16, borderColor: 'var(--pink-300)' }}>
                <p style={{ fontSize: 13 }}>
                  💗 <strong style={{ color: 'var(--ink)' }}>{disclosure.requester.name}</strong> is in a relationship with{' '}
                  <strong style={{ color: 'var(--ink)' }}>{disclosure.requester.relationship.inRelationshipWith}</strong>.
                </p>
              </div>
            )}

            <div className="card" style={{ marginBottom: 16 }}>
              <p className="t-label" style={{ marginBottom: 10 }}>Agreed terms</p>
              {[
                ['Holding Hands & Hugging',  disclosure.terms.holdingHandsHugging],
                ['Kissing & Affection',      disclosure.terms.kissingAffection],
                ['Touching Above Clothing',  disclosure.terms.touchingAboveClothing],
                ['Touching Under Clothing',  disclosure.terms.touchingUnderClothing],
                ['Sexual Intimacy',          disclosure.terms.sexualIntimacy],
                ['Overnight Stays',          disclosure.terms.overnightStays],
                ['Photos / Video',           disclosure.terms.photosVideo],
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

        {/* STEP: Blocked by parental controls */}
        {step === 'blocked' && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 32 }}>
            {blockedReason === 'SUBSCRIPTION_REQUIRED' ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
                <div className="t-h2" style={{ marginBottom: 8 }}>Your trial has ended</div>
                <p className="t-body" style={{ marginBottom: 20 }}>
                  Subscribe to keep recording consent — it's the safety net the app is built on.
                </p>
              </>
            ) : PENDING_REASONS.includes(blockedReason) ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <div className="t-h2" style={{ marginBottom: 8 }}>Waiting for approval</div>
                <p className="t-body" style={{ marginBottom: 20 }}>
                  {blockedReason === 'RELATIONSHIP_OVERRIDE_PENDING'
                    ? "This needs your Relationship Partner's approval. We've notified them — this screen will update automatically once they respond."
                    : "This needs your parent's approval. We've notified them — this screen will update automatically once they respond."}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', animation: 'pulse-ring 1.5s ease infinite' }} />
                  <span className="t-small">Checking…</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
                <div className="t-h2" style={{ marginBottom: 8 }}>
                  {blockedReason === 'OVERRIDE_DENIED' || blockedReason === 'RELATIONSHIP_OVERRIDE_DENIED' ? 'Request declined' : 'Not permitted'}
                </div>
                <p className="t-body" style={{ marginBottom: 20 }}>
                  {blockedReason === 'NO_PARENTAL_LINK' && 'You need a linked parent or guardian before you can confirm this.'}
                  {blockedReason === 'LEVEL_BLOCKED' && "This exceeds what's permitted for your account and can't be overridden."}
                  {blockedReason === 'OVERRIDE_DENIED' && 'Your parent declined this request.'}
                  {blockedReason === 'RELATIONSHIP_OVERRIDE_DENIED' && 'Your Relationship Partner declined this request.'}
                </p>
              </>
            )}
            {blockedReason === 'SUBSCRIPTION_REQUIRED' ? (
              <button className="btn btn-primary" onClick={() => navigate('/billing')}>See plans</button>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/home')}>Back to home</button>
            )}
            {blockedReason === 'NO_PARENTAL_LINK' && (
              <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/parental')}>Set up parental link</button>
            )}
            {blockedReason === 'SUBSCRIPTION_REQUIRED' && (
              <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/home')}>Back to home</button>
            )}
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
            {result.locationSharing && (
              <button
                className="btn btn-primary"
                style={{ marginBottom: 10 }}
                onClick={() => navigate(`/livemap/${consentId}`, {
                  state: { partnerName: role === 'consenter' ? disclosure?.requester?.name : partner?.fullName },
                })}
              >
                📍 Open Live Map
              </button>
            )}
            <button className="btn btn-primary" onClick={() => navigate('/home')}>Done</button>
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/logs')}>View logs</button>
          </div>
        )}

      </div>
      <NavBar active={1} onTab={(i) => ['/home', '/consent', '/discover', '/logs', '/profile'][i] && navigate(['/home', '/consent', '/discover', '/logs', '/profile'][i])} />
    </div>
  );
}
