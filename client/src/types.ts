/* Shared TypeScript interfaces matching backend API responses */

export interface User {
  id: string;
  nickname: string;
  avatarSeed: string;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: 'host' | 'player';
  joinedAt: string;
  becameHostAt: string | null;
  user: { id: string; nickname: string; avatarSeed: string };
}

export interface Question {
  id: string;
  channelId: string;
  askerId: string;
  content: string;
  status: 'pending' | 'answered' | 'withdrawn';
  answer: 'yes' | 'no' | 'irrelevant' | null;
  answeredBy: string | null;
  createdAt: string;
  answeredAt: string | null;
  asker: { id: string; nickname: string; avatarSeed: string };
  answerer?: { id: string; nickname: string } | null;
}

export interface Channel {
  id: string;
  title: string;
  surface: string;
  truth?: string;
  maxQuestions: number;
  status: 'active' | 'ended' | 'archived';
  difficulty: 'easy' | 'medium' | 'hard' | 'hell';
  tags: string[];
  creatorId: string;
  creator: { id: string; nickname: string; avatarSeed: string };
  createdAt: string;
  endedAt: string | null;
  members?: ChannelMember[];
  questions?: Question[];
  _count?: { members: number; questions: number };
}

export interface ChannelListResponse {
  channels: Channel[];
  total: number;
  page: number;
  totalPages: number;
}

export interface OnlineUser {
  id: string;
  nickname: string;
}

export interface PlayerAward {
  id: string;
  nickname: string;
  yes: number;
  no: number;
  irrelevant: number;
  total: number;
}

export interface ChannelStats {
  totalQuestions: number;
  distribution: { yes: number; no: number; irrelevant: number };
  playerCount: number;
  hosts: { id: string; nickname: string; avatarSeed: string; becameHostAt: string | null }[];
  duration: number | null;
  awards: {
    bestDetective: PlayerAward | null;
    mostWrong: PlayerAward | null;
    mostActive: PlayerAward | null;
    lastYes: Question | null;
  };
  // Rating data
  averageRating?: number;
  ratingCount?: number;
  myRating?: { score: number; comment?: string } | null;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { id: string; nickname: string; avatarSeed: string };
}

export interface ChatListResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface UserStats {
  hosted: number;
  participated: number;
  totalQuestions: number;
  distribution: { yes: number; no: number; irrelevant: number };
  hitRate: number;
}

export interface Rating {
  id: string;
  channelId: string;
  userId: string;
  score: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; nickname: string; avatarSeed: string };
}

export interface RatingsResponse {
  ratings: Rating[];
  average: number;
  count: number;
}
