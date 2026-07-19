import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usersService } from '../../services/users.js';
import { parentalService } from '../../services/parental.js';

export function AgeGateScreen() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [dob, setDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isMinor, setIsMinor] = useState(user?.isMinor ?? null);
  const [parentLink, setParentLink] = useState(null); // undefined while loading, null if none
  const [loadingLink, setLoadingLink] = useState(!!user?.dateOfBirth && user?.isMinor);

  useEffect(() => {
    if (user?.dateOfBirth && user?.isMinor) {
      (async () => {
        try {
          const { asMinor } = await parentalService.myLinks();
          setParentLink(asMinor[0] ?? null);
        } catch {
          setParentLink(null);
        } finally {
          setLoadingLink(false);
        }
      })();
    }
  }, [user?.dateOfBirth, user?.isMinor]);

  async function submitDob() {
    if (!dob) return;
    setSaving(true);
    setError('');
    try {
      const res = await usersService.setDob(dob);
      await refreshUser();
      setIsMinor(res.isMinor);
      if (res.isMinor) {
        setLoadingLink(true);
        const { asMinor } = await parentalService.myLinks();
        setParentLink(asMinor[0] ?? null);
        setLoadingLink(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const dobAlreadySet = !!user?.dateOfBirth;
  const effectiveIsMinor = dobAlreadySet ? user.isMinor : isMinor;

  return (
    <div className="phone-inner">
      <StatusBar />
      <div className="screen" style={{ padding: '32px 24px' }}>

        {!dobAlreadySet && isMinor === null && (
          <div className="anim-fade-up">
            <div className="t-h2" style={{ marginBottom: 8 }}>How old are you?</div>
            <p className="t-body" style={{ marginBottom: 24 }}>We need to verify your age before you can use consent features.</p>
            <p className="t-label" style={{ marginBottom: 8 }}>Date of birth</p>
            <input className="input-field" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            {error && <p style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={submitDob} disabled={!dob || saving}>
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        )}

        {effectiveIsMinor === false && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🪪</div>
            <div className="t-h2" style={{ marginBottom: 8 }}>Verify your ID</div>
            <p className="t-body" style={{ marginBottom: 24 }}>A quick selfie + ID check to confirm you're 18+. Handled by Onfido — not stored by us.</p>
            <button className="btn btn-primary" onClick={() => navigate('/home')}>Start verification →</button>
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/home')}>Skip for now</button>
          </div>
        )}

        {effectiveIsMinor === true && loadingLink && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 32 }}>
            <p className="t-body">Checking your parental link…</p>
          </div>
        )}

        {effectiveIsMinor === true && !loadingLink && (!parentLink || parentLink.status === 'pending') && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
            <div className="t-h2" style={{ marginBottom: 8 }}>Hookups is for 18+</div>
            <p className="t-body" style={{ marginBottom: 16 }}>
              You need a verified parent or guardian linked to your account to use consent features.
            </p>
            {parentLink?.status === 'pending' ? (
              <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(245,158,11,0.3)' }}>
                <p className="t-small">
                  ⏳ Waiting for <strong style={{ color: 'var(--ink)' }}>{parentLink.parent.fullName}</strong> to accept your link request.
                </p>
              </div>
            ) : (
              <div className="card" style={{ marginBottom: 20, textAlign: 'left' }}>
                <p className="t-small">Need help? Call <strong>Childline SA: 116</strong> (free, 24/7)</p>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => navigate('/parental')}>
              {parentLink?.status === 'pending' ? 'View parental controls' : 'Is your parent on Hookups?'}
            </button>
            <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('/home')}>Back to home</button>
          </div>
        )}

        {effectiveIsMinor === true && !loadingLink && parentLink?.status === 'active' && (
          <div className="anim-fade-up" style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div className="t-h2" style={{ marginBottom: 8 }}>You're linked</div>
            <p className="t-body" style={{ marginBottom: 24 }}>
              <strong style={{ color: 'var(--ink)' }}>{parentLink.parent.fullName}</strong> is your verified parent/guardian. You can use consent features within the boundaries they've set.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/home')}>Continue</button>
          </div>
        )}

      </div>
    </div>
  );
}
