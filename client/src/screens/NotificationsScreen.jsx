import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar } from '../components/layout/StatusBar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { consentService } from '../services/consent.js';
import { discoverService } from '../services/discover.js';
import { parentalService } from '../services/parental.js';
import { meetupsService } from '../services/meetups.js';
import { relationshipsService } from '../services/relationships.js';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [consentRes, matches, links, overrides, meetups, relApprovals] = await Promise.all([
        consentService.list({ status: 'pending' }),
        discoverService.matches(),
        parentalService.myLinks(),
        parentalService.overrides().catch(() => []),
        meetupsService.list(),
        relationshipsService.approvals().catch(() => []),
      ]);

      const feed = [];

      for (const r of consentRes.records) {
        if (r.consenterId !== user.id) continue;
        feed.push({
          id: `consent-${r.id}`, type: 'consent', icon: '🔒', createdAt: r.createdAt,
          text: <><strong>{r.requester.fullName}</strong> is requesting your consent</>,
          onReview: () => navigate(`/consent?id=${r.id}`),
        });
      }

      for (const m of matches) {
        if (m.direction !== 'received' || m.status !== 'pending') continue;
        feed.push({
          id: `match-${m.id}`, type: 'match', icon: '💫', createdAt: m.createdAt,
          text: <><strong>{m.partner.handle ?? m.partner.name}</strong> wants to match</>,
          onSkip: () => actOn(m.partner.id, 'skip'),
          onAccept: () => actOn(m.partner.id, 'connect'),
        });
      }

      for (const l of links.asMinor) {
        if (l.status !== 'pending') continue;
        feed.push({
          id: `parentlink-${l.id}`, type: 'parentlink', icon: '👨‍👩‍👧', createdAt: l.createdAt,
          text: <><strong>{l.parent.fullName}</strong> wants to be your linked parent/guardian</>,
          onAccept: () => acceptLink(l.id),
        });
      }

      for (const o of overrides) {
        feed.push({
          id: `override-${o.id}`, type: 'override', icon: '🛡️', createdAt: o.requestedAt,
          text: <><strong>{o.minor.fullName}</strong> needs approval for Level {o.requestedLevel} with <strong>{o.requester.fullName}</strong></>,
          onSkip: () => decideOverride(o.id, 'deny'),
          onAccept: () => decideOverride(o.id, 'approve'),
        });
      }

      for (const a of relApprovals) {
        feed.push({
          id: `relapproval-${a.id}`, type: 'relapproval', icon: '🤝', createdAt: a.requestedAt,
          text: <><strong>{a.requester.fullName}</strong> wants to record consent with <strong>{a.thirdParty.fullName}</strong> — not on your Hall Pass list</>,
          onSkip: () => decideRelApproval(a.id, 'deny'),
          onAccept: () => decideRelApproval(a.id, 'approve'),
        });
      }

      for (const mu of meetups) {
        if (mu.isProposer || mu.status !== 'pending') continue;
        feed.push({
          id: `meetup-${mu.id}`, type: 'meetup', icon: '📍', createdAt: mu.scheduledAt,
          text: <><strong>{mu.partner.fullName}</strong> proposed a meetup at {mu.place}</>,
          onReview: () => navigate('/meetups'),
        });
      }

      feed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setItems(feed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function actOn(targetUserId, action) {
    setActingId(targetUserId);
    try {
      await discoverService.action(targetUserId, action);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  }

  async function acceptLink(id) {
    setActingId(id);
    try {
      await parentalService.accept(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  }

  async function decideOverride(id, action) {
    setActingId(id);
    try {
      if (action === 'approve') await parentalService.approveOverride(id);
      else await parentalService.denyOverride(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  }

  async function decideRelApproval(id, action) {
    setActingId(id);
    try {
      if (action === 'approve') await relationshipsService.approveApproval(id);
      else await relationshipsService.denyApproval(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className='phone-inner'><StatusBar />
      <div className='screen' style={{ padding: '24px' }}>
        <div className='t-h2' style={{ marginBottom: 16 }}>Notifications</div>

        {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        {loading && <p className='t-body'>Loading…</p>}

        {!loading && items.map((it) => (
          <div key={it.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{it.icon}</span>
              <div style={{ flex: 1 }}>
                <p className="t-body" style={{ fontSize: 14, marginBottom: 4 }}>{it.text}</p>
                <span className="t-small">{timeAgo(it.createdAt)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {it.onSkip && (
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={it.onSkip} disabled={!!actingId}>
                  {it.type === 'override' || it.type === 'relapproval' ? 'Deny' : 'Skip'}
                </button>
              )}
              {it.onAccept && (
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={it.onAccept} disabled={!!actingId}>
                  {it.type === 'override' || it.type === 'relapproval' ? 'Approve' : it.type === 'parentlink' ? 'Accept' : 'Match back'}
                </button>
              )}
              {it.onReview && (
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={it.onReview}>
                  Review
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && items.length === 0 && (
          <p className='t-body'>No new notifications.</p>
        )}

        <button className='btn btn-ghost' style={{ marginTop: 20 }} onClick={() => navigate('/home')}>Back</button>
      </div>
    </div>
  );
}
