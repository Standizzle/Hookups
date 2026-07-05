export function NavBar({ active = 0, onTab }) {
  const tabs = [
    { icon: '🏠', label: 'Home' },
    { icon: '✅', label: 'Consent' },
    { icon: '🔍', label: 'Discover' },
    { icon: '📋', label: 'Logs' },
    { icon: '👤', label: 'Profile' },
  ];

  return (
    <nav className="nav-bar">
      {tabs.map((t, i) => (
        <div
          key={i}
          className={`nav-item${i === active ? ' active' : ''}`}
          onClick={() => onTab?.(i)}
        >
          <div className="nav-icon">{t.icon}</div>
          <span className="nav-label">{t.label}</span>
        </div>
      ))}
    </nav>
  );
}
