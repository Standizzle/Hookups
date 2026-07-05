import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function LoginScreen() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [step, setStep]   = useState('phone'); // phone | pin
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handlePhoneSubmit(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setStep('pin');
  }

  async function handlePIN(pin, reset, setPinError) {
    setLoading(true);
    try {
      await login({ phone, pin });
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
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 16 }}
              onClick={() => setStep('phone')}
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
