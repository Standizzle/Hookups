import { getInitials, seedToColor } from '../../utils/avatar.js';

// Shows a real photo when avatarUrl is set; otherwise initials on a colour
// deterministically derived from the seed (id/handle/name), never emoji.
export function Avatar({ avatarUrl, seed, label, size = 44 }) {
  const initials = getInitials(label ?? seed ?? '');
  const style = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.4, fontWeight: 700, color: '#fff', overflow: 'hidden',
  };

  if (avatarUrl) {
    return (
      <div style={{ ...style, border: '1.5px solid var(--border2)' }}>
        <img src={avatarUrl} alt={label ?? 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div style={{ ...style, background: seedToColor(seed ?? label ?? '?') }}>
      {initials}
    </div>
  );
}
