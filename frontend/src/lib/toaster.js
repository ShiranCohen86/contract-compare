// Lightweight event-bus toast — no context/provider needed
const listeners = new Set();
let idSeq = 0;

export function toast(message, { type = 'success', duration = 4000 } = {}) {
  const id = ++idSeq;
  listeners.forEach((fn) => fn({ id, message, type, duration }));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
