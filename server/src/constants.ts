export const PRESET_TAGS = ['经典', '恐怖', '温情', '脑洞', '日常'] as const;

export const SocketEvents = {
  // Lobby events
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  CHANNEL_CREATED: 'channel:created',

  // Channel events
  CHANNEL_JOIN: 'channel:join',
  CHANNEL_LEAVE: 'channel:leave',
  CHANNEL_USER_JOINED: 'channel:user_joined',
  CHANNEL_USER_LEFT: 'channel:user_left',
  CHANNEL_ENDED: 'channel:ended',
  QUESTION_NEW: 'question:new',
  QUESTION_ANSWERED: 'question:answered',
  QUESTION_WITHDRAWN: 'question:withdrawn',
  ROLE_CHANGED: 'role:changed',
} as const;
