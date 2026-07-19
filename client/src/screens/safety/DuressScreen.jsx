import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { authService } from '../../services/auth.js';

export function DuressScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState('intro'); // intro | currentPin | set | confirm | done
  const [currentPin, setCurrentPin] = useState('');
  const [newDuressPin, setNewDuressPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleCurrentPin(value) {
    setCurrentPin(value);
    setError('');
    setStep('set');
  }

  function handleSet(value, reset, setErr) {
    if (value === currentPin) {
      reset();
      setErr('Must differ from your personal PIN');
      return;
    }
    setNewDuressPin(value);
    setStep('confirm');
  }

  async function handleConfirm(value, reset, setErr) {
    if (value !== newDuressPin) {
      reset();
      setErr("Doesn't match — try again");
      return;
    }
    setSaving(true);
    try {
      // The real personal PIN authorizes this change — the server verifies
      // it and only ever updates the duress hash, never the login PIN.
      await authService.setDuressPin({ currentPin, duressPin: value });
      setStep('done');
    } catch (e) {
      setError(e.message ?? 'Incorrect PIN');
      setStep('currentPin');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{ padding: '24px' }}>
        {step === 'intro' && <>
          <div className='t-h2' style={{ marginBottom: 8 }}>🆘 Duress PIN</div>
          <p className='t-body' style={{ marginBottom: 16 }}>A secret PIN that looks exactly like a normal login — but silently alerts your trusted circle with your location.</p>
          <button className='btn btn-primary' onClick={() => setStep('currentPin')}>Set up Duress PIN</button>
          <button className='btn btn-ghost' style={{ marginTop: 10 }} onClick={() => navigate(-1)}>Back</button>
        </>}
        {step === 'currentPin' && <>
          {error && <p style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center', marginBottom: 8 }}>{error}</p>}
          <PinPad onComplete={(v) => handleCurrentPin(v)} label='Enter your personal PIN to continue' disabled={saving} />
        </>}
        {step === 'set' && <PinPad onComplete={handleSet} label='Choose duress PIN' />}
        {step === 'confirm' && <PinPad onComplete={handleConfirm} label='Confirm duress PIN' disabled={saving} />}
        {step === 'done' && <>
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div className='t-h2' style={{ marginBottom: 8 }}>Duress PIN set</div>
            <p className='t-body' style={{ marginBottom: 24 }}>Enter it anywhere a PIN is expected to silently alert your trusted circle.</p>
            <button className='btn btn-primary' onClick={() => navigate(-1)}>Done</button>
          </div>
        </>}
      </div>
    </div>
  );
}
