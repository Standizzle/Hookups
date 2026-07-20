import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../../components/layout/StatusBar.jsx';
import { NavBar } from '../../components/layout/NavBar.jsx';
import { billingService } from '../../services/billing.js';

function fmt(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function daysLeft(dateStr) {
  if (!dateStr) return 0;
  return Math.max(0, Math.ceil((new Date(dateStr) - new Date()) / 86400000));
}

export function BillingScreen() {
  const navigate = useNavigate();
  const nav = (i) => navigate(['/home', '/consent', '/discover', '/logs', '/profile'][i]);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  async function load() {
    try {
      setStatus(await billingService.status());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function subscribe(plan) {
    setBusy(true);
    setError('');
    try {
      const result = await billingService.checkout(plan);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm("Cancel your subscription? You'll lose access to recording new consent once it ends.")) return;
    setBusy(true);
    setError('');
    try {
      await billingService.cancel();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addGuardian() {
    if (!guardianPhone.trim()) return;
    setBusy(true);
    setError('');
    try {
      await billingService.addGuardian(guardianPhone.trim());
      setGuardianPhone('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeGuardian(id) {
    setBusy(true);
    setError('');
    try {
      await billingService.removeGuardian(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="phone-inner"><StatusBar />
        <div className="screen" style={{ padding: '24px' }}><p className="t-body">Loading…</p></div>
        <NavBar active={4} onTab={nav} />
      </div>
    );
  }

  const hasActivePlan = status?.status === 'active';

  return (
    <div className="phone-inner"><StatusBar />
      <div className="screen" style={{ padding: '24px' }}>
        <button className="btn btn-ghost btn-sm" style={{ width: 'auto', marginBottom: 16 }} onClick={() => navigate('/profile')}>← Back</button>
        <div className="t-h2" style={{ marginBottom: 6 }}>Plan & Billing</div>
        <p className="t-body" style={{ marginBottom: 20 }}>
          Recording consent is Hookups' core safety mechanism — a subscription keeps it active for you and, if you add them, your family.
        </p>

        {/* Current status */}
        <div className="card" style={{ marginBottom: 16 }}>
          {hasActivePlan ? (
            <>
              <p className="t-label" style={{ marginBottom: 6 }}>
                {status.plan === 'family' ? 'Family plan' : 'Individual plan'}
                {status.role === 'guardian' && ' (member)'}
              </p>
              {status.priceBreakdown && (
                <p className="t-body" style={{ marginBottom: 4 }}>
                  {fmt(status.priceBreakdown.totalCents)}/mo
                  {status.priceBreakdown.capped && ' — capped, unlimited family members'}
                </p>
              )}
              {status.plan === 'individual' && (
                <p className="t-body" style={{ marginBottom: 4 }}>{fmt(status.prices.individual)}/mo</p>
              )}
              <p className="t-small" style={{ marginBottom: 12 }}>Status: {status.status}</p>
              {status.isOwner && (
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} disabled={busy} onClick={cancel}>
                  Cancel subscription
                </button>
              )}
            </>
          ) : status.trialing ? (
            <>
              <p className="t-label" style={{ marginBottom: 6 }}>Free trial</p>
              <p className="t-body">{daysLeft(status.trialEndsAt)} days left</p>
            </>
          ) : (
            <>
              <p className="t-label" style={{ marginBottom: 6, color: 'var(--red)' }}>Trial ended</p>
              <p className="t-body">Subscribe below to keep recording consent.</p>
            </>
          )}
        </div>

        {/* Plan picker — only when no active plan already covers this user */}
        {!hasActivePlan && (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <p className="t-label" style={{ marginBottom: 6 }}>Individual</p>
              <p className="t-body" style={{ marginBottom: 10 }}>{fmt(status.prices.individual)}/mo — full app, one person.</p>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => subscribe('individual')}>Subscribe</button>
            </div>

            <div className="card" style={{ marginBottom: 16, borderColor: 'var(--pink-300)' }}>
              <p className="t-label" style={{ marginBottom: 6, color: 'var(--pink-500)' }}>Family</p>
              <p className="t-body" style={{ marginBottom: 4 }}>{fmt(status.prices.familyBase)}/mo base — 1 guardian + 1 child.</p>
              <p className="t-small" style={{ marginBottom: 4 }}>+{fmt(status.prices.extraGuardian)}/mo per extra guardian</p>
              <p className="t-small" style={{ marginBottom: 4 }}>+{fmt(status.prices.extraChild)}/mo per extra child</p>
              <p className="t-small" style={{ marginBottom: 10 }}>Capped at {fmt(status.prices.familyCap)}/mo flat — however many kids you add.</p>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => subscribe('family')}>Subscribe</button>
            </div>
          </>
        )}

        {/* Family management — owner of an active family plan */}
        {hasActivePlan && status.plan === 'family' && status.isOwner && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'var(--pink-300)' }}>
            <p className="t-label" style={{ marginBottom: 10, color: 'var(--pink-500)' }}>Guardians</p>
            <p className="t-small" style={{ marginBottom: 12 }}>
              Add a second parent/guardian for {fmt(status.prices.extraGuardian)}/mo — they get full access to manage the same family's parental controls.
            </p>

            {status.guardians.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>{g.fullName ?? g.phone}</span>
                <button className="btn btn-ghost btn-sm" style={{ width: 'auto', fontSize: 11, padding: '2px 8px' }} disabled={busy} onClick={() => removeGuardian(g.id)}>
                  Remove
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                className="input-field" placeholder="+27 82 123 4567" style={{ flex: 1 }}
                value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} disabled={!guardianPhone.trim() || busy} onClick={addGuardian}>
                + Add
              </button>
            </div>

            {status.priceBreakdown && (
              <p className="t-small" style={{ marginTop: 12 }}>
                Currently covering {status.priceBreakdown.guardianCount} guardian{status.priceBreakdown.guardianCount !== 1 ? 's' : ''} and {status.priceBreakdown.childCount} child{status.priceBreakdown.childCount !== 1 ? 'ren' : ''} — {fmt(status.priceBreakdown.totalCents)}/mo{status.priceBreakdown.capped ? ' (cap reached)' : ''}.
              </p>
            )}
          </div>
        )}

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
      </div>
      <NavBar active={4} onTab={nav} />
    </div>
  );
}
