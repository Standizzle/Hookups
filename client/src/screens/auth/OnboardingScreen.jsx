import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { authService } from '../../services/auth.js';
import { useAuth } from '../../context/AuthContext.jsx';

const STEPS = ['name', 'phone', 'otp', 'pin', 'duress', 'done'];

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step,    setStep]    = useState('name');
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [pin,     setPin]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function goNext() {
    const idx = STEPS.indexOf(step);
    setStep(STEPS[idx + 1]);
    setError('');
  }

  async function handleSendOTP(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.signup({ fullName: name, phone });
      goNext();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.verifyOTP({ phone, code: otp, fullName: name });
      goNext();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPIN(pinValue, reset, setPinError) {
    if (!pin) {
      setPin(pinValue);
      goNext(); // → duress step
      return;
    }
    // Setting duress PIN
    setLoading(true);
    try {
      await authService.setPIN({ pin, duressPin: pinValue });
      await refreshUser();
      goNext();
    } catch (err) {
      reset();
      setPinError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipDuress() {
    setLoading(true);
    try {
      await authService.setPIN({ pin });
      await refreshUser();
      goNext();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);
  const progress  = ((stepIndex) / (STEPS.length - 1)) * 100;

  return (
    <div className="phone-inner">
      <StatusBar />

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--bg2)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
      </div>

      <div className="screen" style={{ padding: '28px 24px' }}>

        {step === 'name' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 6 }}>What's your name?</div>
            <p className="t-body" style={{ marginBottom: 24 }}>This is how you'll appear to partners.</p>
            <input className="input-field" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={goNext} disabled={name.length < 2}>
              Continue
            </button>
          </div>
        )}

        {step === 'phone' && (
          <form className="anim-fade-up" onSubmit={handleSendOTP}>
            <div className="t-h2" style={{ marginBottom: 6 }}>Your mobile number</div>
            <p className="t-body" style={{ marginBottom: 24 }}>We'll send a one-time code to verify.</p>
            <input className="input-field" type="tel" placeholder="+27 82 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={!phone.trim() || loading}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form className="anim-fade-up" onSubmit={handleVerifyOTP}>
            <div className="t-h2" style={{ marginBottom: 6 }}>Enter the code</div>
            <p className="t-body" style={{ marginBottom: 24 }}>Sent to <strong>{phone}</strong>. Dev code: <code>123456</code></p>
            <input className="input-field" type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} autoFocus />
            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={otp.length < 6 || loading}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {step === 'pin' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 6 }}>Set your PIN</div>
            <p className="t-body" style={{ marginBottom: 16 }}>4 digits. Only you know this. It's how you confirm consent.</p>
            <PinPad onComplete={handleSetPIN} label="Choose a 4-digit PIN" disabled={loading} />
          </div>
        )}

        {step === 'duress' && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 6 }}>Set a Duress PIN <span style={{ color: 'var(--red)' }}>🆘</span></div>
            <p className="t-body" style={{ marginBottom: 8 }}>A second PIN that <strong>looks normal</strong> but silently alerts your trusted contacts. Enter it anywhere a PIN is expected if you feel unsafe.</p>
            <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(239,68,68,0.3)', background: 'var(--red-bg)' }}>
              <p style={{ fontSize: 13, color: 'var(--red)' }}>Must be different from your personal PIN. No one will ever know you entered it.</p>
            </div>
            <PinPad onComplete={handleSetPIN} label="Choose a different 4-digit PIN" disabled={loading} />
            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{error}</p>}
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={handleSkipDuress} disabled={loading}>
              Skip for now
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
            <div className="t-h2" style={{ marginBottom: 8 }}>You're all set, {name.split(' ')[0]}!</div>
            <p className="t-body" style={{ marginBottom: 32 }}>Your account is ready. Start by verifying your age to unlock all features.</p>
            <button className="btn btn-primary" onClick={() => navigate('/home')}>Let's go</button>
          </div>
        )}

      </div>
    </div>
  );
}
