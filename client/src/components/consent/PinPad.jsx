import { usePIN } from '../../hooks/usePIN.js';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

export function PinPad({ onComplete, label = 'Enter your PIN', disabled }) {
  const { digits, value, complete, press, reset, error, setError } = usePIN(4);

  function handleKey(key) {
    if (disabled || !key) return;
    press(key);
    if (key !== 'del' && digits.length === 3) {
      // About to complete
      setTimeout(() => {
        const fullValue = [...digits, key].join('');
        onComplete?.(fullValue, reset, setError);
      }, 80);
    }
  }

  return (
    <div>
      <p style={{ textAlign: 'center', marginBottom: 4, fontWeight: 600, color: 'var(--ink2)' }}>{label}</p>

      <div className="pin-dots">
        {[0,1,2,3].map((i) => (
          <div key={i} className={`pin-dot${i < digits.length ? ' filled' : ''}`} />
        ))}
      </div>

      {error && (
        <p style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      <div className="pin-grid">
        {KEYS.map((k, i) => (
          <button
            key={i}
            className={`pin-key${k === '' ? ' empty' : ''}`}
            onClick={() => handleKey(k)}
            disabled={disabled}
          >
            {k === 'del' ? '⌫' : k}
          </button>
        ))}
      </div>
    </div>
  );
}
