import { io } from 'socket.io-client';

// Derive the socket server URL from the API base URL (strip /api suffix)
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:3001');

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.debug('[socket] connected', socket.id);
    });
    socket.on('disconnect', (reason) => {
      console.debug('[socket] disconnected', reason);
    });
    socket.on('connect_error', (err) => {
      console.warn('[socket] connect error', err.message);
    });
  }
  return socket;
}

export function connectSocket(token) {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
