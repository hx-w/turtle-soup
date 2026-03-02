import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccess, TokenPayload } from './lib/jwt';
import { SocketEvents } from './constants';

interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

// Track online users per channel: channelId -> Set of { userId, nickname }
const onlineUsers = new Map<string, Map<string, string>>();

export function setupSocket(httpServer: HttpServer) {
  const corsOrigin = process.env.CORS_ORIGIN;
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin ? corsOrigin.split(',') : '*',
      credentials: !!corsOrigin,
    },
  });

  // Auth middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      socket.user = verifyAccess(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;

    socket.on(SocketEvents.CHANNEL_JOIN, (channelId: string) => {
      socket.join(channelId);

      if (!onlineUsers.has(channelId)) {
        onlineUsers.set(channelId, new Map());
      }
      onlineUsers.get(channelId)!.set(user.userId, user.nickname);

      io.to(channelId).emit(SocketEvents.CHANNEL_USER_JOINED, {
        userId: user.userId,
        nickname: user.nickname,
        online: Array.from(onlineUsers.get(channelId)!.entries()).map(([id, nickname]) => ({ id, nickname })),
      });
    });

    socket.on(SocketEvents.CHANNEL_LEAVE, (channelId: string) => {
      socket.leave(channelId);
      onlineUsers.get(channelId)?.delete(user.userId);

      io.to(channelId).emit(SocketEvents.CHANNEL_USER_LEFT, {
        userId: user.userId,
        nickname: user.nickname,
        online: Array.from(onlineUsers.get(channelId)?.entries() || []).map(([id, nickname]) => ({ id, nickname })),
      });
    });

    // Broadcast events (called from API routes via io instance)
    socket.on(SocketEvents.QUESTION_NEW, (data) => {
      io.to(data.channelId).emit(SocketEvents.QUESTION_NEW, data);
    });

    socket.on(SocketEvents.QUESTION_ANSWERED, (data) => {
      io.to(data.channelId).emit(SocketEvents.QUESTION_ANSWERED, data);
    });

    socket.on(SocketEvents.QUESTION_WITHDRAWN, (data) => {
      io.to(data.channelId).emit(SocketEvents.QUESTION_WITHDRAWN, data);
    });

    socket.on(SocketEvents.ROLE_CHANGED, (data) => {
      io.to(data.channelId).emit(SocketEvents.ROLE_CHANGED, data);
    });

    socket.on(SocketEvents.CHANNEL_ENDED, (data) => {
      io.to(data.channelId).emit(SocketEvents.CHANNEL_ENDED, data);
    });

    socket.on('disconnect', () => {
      // Remove from all channels
      for (const [channelId, users] of onlineUsers) {
        if (users.has(user.userId)) {
          users.delete(user.userId);
          io.to(channelId).emit(SocketEvents.CHANNEL_USER_LEFT, {
            userId: user.userId,
            nickname: user.nickname,
            online: Array.from(users.entries()).map(([id, nickname]) => ({ id, nickname })),
          });
        }
      }
    });
  });

  return io;
}
