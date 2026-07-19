export function getInitials(seed) {
  if (!seed) return '?';
  const clean = seed.replace(/^@/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function seedToColor(seed) {
  let hash = 0;
  for (let i = 0; i < (seed ?? '').length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 42%)`;
}
