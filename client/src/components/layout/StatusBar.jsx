export function StatusBar({ time }) {
  const now = time ?? new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className="status-bar">
      <span>{now}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 14 }}>📶</span>
        <span style={{ fontSize: 14 }}>🔋</span>
      </div>
    </div>
  );
}
