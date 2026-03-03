import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '../constants';

function createSocket(): Socket {
  const token = localStorage.getItem('accessToken');
  return io(window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
  });
}

// Singleton socket instance
export let socket: Socket = createSocket();

export function getSocket(): Socket {
  return socket;
}

export function connectSocket(): Socket {
  if (!socket.connected) {
    const token = localStorage.getItem('accessToken');
    socket.auth = { token };
    socket.connect();
  }

  // Handle auth errors on reconnect
  socket.off('connect_error').on('connect_error', (err) => {
    if (err.message === 'Invalid token' || err.message === 'Authentication required') {
      const newToken = localStorage.getItem('accessToken');
      if (newToken) {
        socket.auth = { token: newToken };
      }
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
  socket = createSocket();
}

export function reconnectSocket() {
  disconnectSocket();
  return connectSocket();
}

export function joinChannel(channelId: string) {
  socket.emit(SocketEvents.CHANNEL_JOIN, channelId);
}

export function leaveChannel(channelId: string) {
  socket.emit(SocketEvents.CHANNEL_LEAVE, channelId);
}

// Lobby events
export function joinLobby() {
  socket.emit(SocketEvents.LOBBY_JOIN);
}

export function leaveLobby() {
  socket.emit(SocketEvents.LOBBY_LEAVE);
}

export function onChannelCreated(callback: (channel: unknown) => void) {
  socket.on(SocketEvents.CHANNEL_CREATED, callback);
}

export function offChannelCreated(callback: (channel: unknown) => void) {
  socket.off(SocketEvents.CHANNEL_CREATED, callback);
}

export function emitQuestionNew(data: { channelId: string; question: unknown }) {
  socket.emit(SocketEvents.QUESTION_NEW, data);
}

export function emitQuestionAnswered(data: { channelId: string; question: unknown }) {
  socket.emit(SocketEvents.QUESTION_ANSWERED, data);
}

export function emitQuestionWithdrawn(data: { channelId: string; questionId: string }) {
  socket.emit(SocketEvents.QUESTION_WITHDRAWN, data);
}

export function emitRoleChanged(data: {
  channelId: string;
  userId: string;
  nickname: string;
}) {
  socket.emit(SocketEvents.ROLE_CHANGED, data);
}

export function emitChannelEnded(data: { channelId: string }) {
  socket.emit(SocketEvents.CHANNEL_ENDED, data);
}

export function emitChannelUpdated(data: { channelId: string; surface: string }) {
  socket.emit(SocketEvents.CHANNEL_UPDATED, data);
}

export function emitChatNew(data: { channelId: string; message: unknown }) {
  socket.emit(SocketEvents.CHAT_NEW, data);
}

// Auto-reconnect when page becomes visible after being hidden (mobile screen-off)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && socket && !socket.connected) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        socket.auth = { token };
        socket.connect();
      }
    }
  });
}
