import { useState, useEffect } from 'react';
import { subscribe } from '../../lib/toaster';
import './Toaster.scss';

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration);
    });
    return unsub;
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          <span className="toast__icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span className="toast__msg">{t.message}</span>
          <button
            className="toast__close"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
