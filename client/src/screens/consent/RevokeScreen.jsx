import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { PinPad } from '../../components/consent/PinPad.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { consentService } from '../../services/consent.js';

const TERM_LABELS = [
  ['holdingHandsHugging',   'Holding Hands & Hugging'],
  ['kissingAffection',      'Kissing & Affection'],
  ['touchingAboveClothing', 'Touching Above Clothing'],
  ['touchingUnderClothing', 'Touching Under Clothing'],
  ['sexualIntimacy',        'Sexual Intimacy'],
  ['photosVideo',           'Photos / Video'],
  ['overnightStays',        'Overnight Stays'],
];

export function RevokeScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState('loading'); // loading | detail | warn | pin | done
  const [record, setRecord] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reason, setReason] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await consentService.getRecord(id);
        setRecord(data);
        setStep('detail');
      } catch (err) {
        setLoadError(err.message ?? 'Could not load this record');
      }
    })();
  }, [id]);

  async function handlePIN(pin, reset, setErr) {
    try {
      await consentService.revoke(id, { pin, reason });
      setStep('done');
    } catch (e) {
      reset();
      setErr(e.message);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    setExportError('');
    try {
      await consentService.downloadPdf(id, `${record.recordId}.pdf`);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    setExportError('');
    try {
      await consentService.downloadAllCsv();
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  if (step === 'loading') {
    return (
      <div className='phone-inner'><StatusBar />
        <div className='screen' style={{ padding: '24px', textAlign: 'center', paddingTop: 60 }}>
          {loadError ? (
            <>
              <p style={{ color: 'var(--red)', marginBottom: 16 }}>{loadError}</p>
              <button className='btn btn-ghost' onClick={() => navigate(-1)}>Back</button>
            </>
          ) : (
            <p className='t-body'>Loading record…</p>
          )}
        </div>
      </div>
    );
  }

  if (step === 'detail' && record) {
    const isRequester = record.requesterId === user?.id;
    const terms = TERM_LABELS.filter(([key]) => record[key]);

    return (
      <div className='phone-inner'><StatusBar />
        <div className='screen' style={{ padding: '24px' }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 16 }} onClick={() => navigate(-1)}>← Back</button>

          <div className='t-h2' style={{ marginBottom: 4 }}>Consent Record</div>
          <p className="t-mono" style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 16 }}>{record.recordId}</p>

          <div className="card" style={{ marginBottom: 16 }}>
            <span className={`pill ${record.status === 'mutual' ? 'pill-sealed' : record.status === 'revoked' ? 'pill-revoked' : 'pill-pending'}`} style={{ marginBottom: 12, display: 'inline-block' }}>
              {record.status === 'mutual' ? '✓ Sealed' : record.status === 'revoked' ? 'Revoked' : record.status}
            </span>
            <p style={{ fontSize: 13, marginBottom: 4 }}>
              Requester: <strong style={{ color: 'var(--ink)' }}>{record.requester.fullName}{isRequester ? ' (you)' : ''}</strong>
            </p>
            <p style={{ fontSize: 13 }}>
              Consenter: <strong style={{ color: 'var(--ink)' }}>{record.consenter.fullName}{!isRequester ? ' (you)' : ''}</strong>
            </p>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <p className="t-label" style={{ marginBottom: 10 }}>Agreed Terms</p>
            {terms.length === 0 && <p className="t-small">(none)</p>}
            {terms.map(([key, label]) => (
              <div key={key} style={{ fontSize: 13, marginBottom: 6 }}>✅ {label}</div>
            ))}
            {record.safeWord && (
              <p className="t-small" style={{ marginTop: 8 }}>Safe word: <strong style={{ color: 'var(--ink)' }}>{record.safeWord}</strong></p>
            )}
            <p className="t-small" style={{ marginTop: 8 }}>
              📍 Location sharing: {record.locationSharing ? 'agreed by both parties' : 'not active'}
            </p>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <p className="t-label" style={{ marginBottom: 8 }}>Timeline</p>
            <p className="t-mono" style={{ fontSize: 11, marginBottom: 4 }}>Started: {new Date(record.startedAt).toLocaleString()}</p>
            {record.confirmedAt && <p className="t-mono" style={{ fontSize: 11, marginBottom: 4 }}>Confirmed: {new Date(record.confirmedAt).toLocaleString()}</p>}
            {record.revokedAt && <p className="t-mono" style={{ fontSize: 11 }}>Revoked: {new Date(record.revokedAt).toLocaleString()}</p>}
          </div>

          {record.signature && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="t-label" style={{ marginBottom: 8 }}>Tamper-Evidence</p>
              <p className="t-mono" style={{ fontSize: 10, color: 'var(--ink3)', wordBreak: 'break-all', marginBottom: 4 }}>Sig: {record.signature.slice(0, 40)}…</p>
              <p className="t-mono" style={{ fontSize: 10, color: 'var(--ink3)', wordBreak: 'break-all' }}>Chain: {(record.chainHash ?? '').slice(0, 40)}…</p>
            </div>
          )}

          {exportError && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{exportError}</p>}

          <button className="btn btn-primary btn-sm" style={{ marginBottom: 8 }} onClick={handleExportPdf} disabled={exporting}>
            {exporting ? 'Exporting…' : '⬇ Export this record (PDF)'}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={handleExportCsv} disabled={exporting}>
            ⬇ Export all my records (CSV)
          </button>

          {record.status === 'mutual' && (
            <button className='btn btn-danger btn-sm' onClick={() => setStep('warn')}>
              I've Changed My Mind
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{ padding: '24px' }}>
        {step === 'warn' && <>
          <div className='t-h2' style={{ marginBottom: 8, color: 'var(--red)' }}>⚠️ I've Changed My Mind</div>
          <p className='t-body' style={{ marginBottom: 16 }}>Revoking consent creates a permanent record. Your partner will be notified.</p>
          <p className='t-label' style={{ marginBottom: 8 }}>Reason (optional, not shared)</p>
          <input className='input-field' placeholder='Your reason...' value={reason} onChange={e => setReason(e.target.value)} style={{ marginBottom: 20 }} />
          <button className='btn btn-danger' onClick={() => setStep('pin')}>Continue to revoke</button>
          <button className='btn btn-ghost' style={{ marginTop: 10 }} onClick={() => setStep('detail')}>Cancel</button>
        </>}
        {step === 'pin' && <PinPad onComplete={handlePIN} label='Enter your PIN to confirm revocation' />}
        {step === 'done' && <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔴</div>
          <div className='t-h2' style={{ marginBottom: 8 }}>Consent Revoked</div>
          <p className='t-body' style={{ marginBottom: 24 }}>A permanent record has been created. Your partner has been notified.</p>
          <button className='btn btn-primary' onClick={() => navigate('/home')}>Done</button>
        </div>}
      </div>
    </div>
  );
}
