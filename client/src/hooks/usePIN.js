import { useState, useCallback } from 'react';

export function usePIN(length = 4) {
  const [digits, setDigits] = useState([]);
  const [error,  setError]  = useState('');

  const press = useCallback((key) => {
    setError('');
    if (key === 'del') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    if (digits.length < length) {
      setDigits((d) => [...d, key]);
    }
  }, [digits, length]);

  const reset = useCallback(() => {
    setDigits([]);
    setError('');
  }, []);

  const value = digits.join('');
  const complete = digits.length === length;

  return { digits, value, complete, press, reset, error, setError };
}
