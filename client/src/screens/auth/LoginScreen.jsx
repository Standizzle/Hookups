import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/auth.js';
import { getQuickLocation } from '../../utils/geo.js';

export function LoginScreen() {
  const { login, refreshUser } = useAuth();
  const navigate   = useNavigate();
  const [step, setStep]   = useState('phone'); // phone | pin | reset-otp | reset-newpin
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const [resetCode, setResetCode] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  async function handleForgotPin() {
    setResetLoading(true);
    setResetError('');
    try {
      await authService.forgotPin(phone);
      setStep('reset-otp');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  }

  function handleVerifyResetCode(e) {
    e.preventDefault();
    if (resetCode.length < 6) return;
    setResetError('');
    setStep('reset-newpin');
  }

  async function handleSetNewPin(newPin, reset, setPinError) {
    setResetLoading(true);
    try {
      await authService.resetPin({ phone, code: resetCode, newPin });
      await refreshUser();
      navigate('/home');
    } catch (err) {
      reset();
      setPinError(err.message ?? 'Could not reset PIN');
    } finally {
      setResetLoading(false);
    }
  }

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setStep('pin');
  }

  async function handlePIN(pin, reset, setPinError) {
    setLoading(true);
    try {
      // Grabbed on every login attempt, not just a duress one — the app
      // never knows which case it is, so behavior must be identical either way.
      const loc = await getQuickLocation();
      await login({ phone, pin, lat: loc?.lat, lng: loc?.lng });
      navigate('/home');
    } catch (err) {
      reset();
      setPinError(err.message ?? 'Incorrect PIN');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '32px 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em' }}>
            hook<span style={{ color: 'var(--accent)' }}>u</span><span style={{ color: 'var(--accent2)' }}>ps</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4, letterSpacing: '0.08em' }}>SAFETY. ALWAYS.</div>
        </div>

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="anim-fade-up">
            <p className="t-label" style={{ marginBottom: 8 }}>Mobile number</p>
            <input
              className="input-field"
              type="tel"
              placeholder="+27 82 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={!phone.trim()}>
              Continue
            </button>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 10 }}
              type="button"
              onClick={() => navigate('/onboarding')}
            >
              Create account
            </button>
          </form>
        )}

        {step === 'pin' && (
          <div className="anim-fade-up">
            <p style={{ textAlign: 'center', color: 'var(--ink2)', marginBottom: 8 }}>
              Welcome back, <strong style={{ color: 'var(--ink)' }}>{phone}</strong>
            </p>
            <PinPad onComplete={handlePIN} label="Enter your PIN" disabled={loading} />
            {resetError && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{resetError}</p>}
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 16 }}
              onClick={handleForgotPin}
              disabled={resetLoading}
            >
              {resetLoading ? 'Sending code…' : 'Forgot PIN?'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 4 }}
              onClick={() => setStep('phone')}
            >
              ← Back
            </button>
          </div>
        )}

        {step === 'reset-otp' && (
          <form className="anim-fade-up" onSubmit={handleVerifyResetCode}>
            <div className="t-h2" style={{ marginBottom: 6 }}>Enter the code</div>
            <p className="t-body" style={{ marginBottom: 24 }}>Sent to <strong>{phone}</strong>. Dev code: <code>123456</code></p>
            <input
              className="input-field" type="text" inputMode="numeric" maxLength={6}
              placeholder="123456" value={resetCode} onChange={(e) => setResetCode(e.target.value)} autoFocus
            />
            {resetError && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{resetError}</p>}
            <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={resetCode.length < 6}>
              Continue
            </button>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} type="button" onClick={() => setStep('pin')}>
              ← Back
            </button>
          </form>
        )}

        {step === 'reset-newpin' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 6, textAlign: 'center' }}>Set a new PIN</div>
            <p className="t-body" style={{ marginBottom: 16, textAlign: 'center' }}>
              Any duress PIN you had set will be cleared — set a new one from your profile once you're back in.
            </p>
            <PinPad onComplete={handleSetNewPin} label="Choose a new 4-digit PIN" disabled={resetLoading} />
          </div>
        )}

      </div>
    </div>
  );
}
