import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';

export function AgeGateScreen() {
  const navigate = useNavigate();
  const [dob, setDob]   = useState('');
  const [result, setResult] = useState(null); // null | 'minor' | 'adult'

  function check() {
    if (!dob) return;
    const birth = new Date(dob);
    const age   = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    setResult(age >= 18 ? 'adult' : 'minor');
  }

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '32px 24px' }}>

        {!result && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 8 }}>How old are you?</div>
            <p className="t-body" style={{ marginBottom: 24 }}>We need to verify your age before you can use consent features.</p>
            <p className="t-label" style={{ marginBottom: 8 }}>Date of birth</p>
            <input className="input-field" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={check} disabled={!dob}>Confirm</button>
          </div>
        )}

        {result === 'adult' && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
            <div className="t-h2" style={{ marginBottom: 8 }}>Verify your ID</div>
            <p className="t-body" style={{ marginBottom: 24 }}>A quick selfie + ID check to confirm you're 18+. Handled by Onfido — not stored by us.</p>
            <button className="btn btn-primary" onClick={() => navigate('/home')}>Start verification →</button>
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/home')}>Skip for now</button>
          </div>
        )}

        {result === 'minor' && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
            <div className="t-h2" style={{ marginBottom: 8 }}>Hookups is for 18+</div>
            <p className="t-body" style={{ marginBottom: 16 }}>
              You need a verified parent or guardian linked to your account to use consent features.
            </p>
            <div className="card" style={{ marginBottom: 20, textAlign: 'left' }}>
              <p className="t-small">Need help? Call <strong>Childline SA: 116</strong> (free, 24/7)</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/parental')}>Is your parent on Hookups?</button>
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/home')}>Back to home</button>
          </div>
        )}

      </div>
    </div>
  );
}
