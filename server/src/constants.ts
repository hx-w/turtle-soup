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
  CHANNEL_UPDATED: 'channel:updated',
  QUESTION_NEW: 'question:new',
  QUESTION_ANSWERED: 'question:answered',
  QUESTION_WITHDRAWN: 'question:withdrawn',
  ROLE_CHANGED: 'role:changed',
  CHAT_NEW: 'chat:new',

  // AI events
  QUESTION_AI_ANSWERED: 'question:ai_answered',
  QUESTION_AI_CORRECTED: 'question:ai_corrected',
  HINT_SHARED: 'hint:shared',
  PROGRESS_UPDATED: 'progress:updated',
  AI_REVIEW_READY: 'ai:review_ready',
  CLUE_GRAPH_UPDATED: 'clue_graph:updated',
  QUESTION_REACTION_UPDATED: 'question:reaction_updated',
} as const;
