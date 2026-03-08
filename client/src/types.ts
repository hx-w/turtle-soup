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
  role: 'creator' | 'host' | 'player';
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
  answer: 'yes' | 'no' | 'irrelevant' | 'partial' | null;
  answeredBy: string | null;
  isKeyQuestion: boolean;
  createdAt: string;
  answeredAt: string | null;
  asker: { id: string; nickname: string; avatarSeed: string };
  answerer?: { id: string; nickname: string } | null;
  isAiAnswered: boolean;
  aiReasoning?: string | null;
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
  aiHostEnabled: boolean;
  aiHostDelaySeconds: number;
  aiHintEnabled: boolean;
  aiHintPerPlayer: number;
  aiReview: string | null;
  aiProgress: number;
  averageRating?: number | null;
  ratingCount?: number;
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
  partial: number;
  total: number;
}

export interface HostContribution {
  id: string;
  nickname: string;
  avatarSeed: string;
  role: 'creator' | 'host';
  answeredCount: number;
  yesCount: number;
  noCount: number;
  keyQuestions: number;
}

export interface TimelineBucket {
  time: string;
  timeLabel: string;
  yes: number;
  no: number;
  partial: number;
  irrelevant: number;
  cumulativeYes: number;
  cumulativeNo: number;
  cumulativePartial: number;
  cumulativeIrrelevant: number;
  total: number;
}

export interface ChannelStats {
  totalQuestions: number;
  distribution: { yes: number; no: number; irrelevant: number; partial: number };
  timelineDistribution: TimelineBucket[];
  keyQuestionCount: number;
  playerCount: number;
  hosts: { id: string; nickname: string; avatarSeed: string; role: 'creator' | 'host'; becameHostAt: string | null }[];
  hostContributions: HostContribution[];
  duration: number | null;
  awards: {
    bestDetective: PlayerAward | null;
    mostWrong: PlayerAward | null;
    mostActive: PlayerAward | null;
    lastYes: Question | null;
  };
  averageRating?: number;
  ratingCount?: number;
  myRating?: { score: number; comment?: string } | null;
  aiReview?: string | null;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { id: string; nickname: string; avatarSeed: string; role: 'creator' | 'host' | 'player' };
}

export interface ChatListResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface UserStats {
  created: number;
  hosted: number;
  participated: number;
  totalQuestions: number;
  distribution: { yes: number; no: number; irrelevant: number; partial: number };
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

export type EventType =
  | 'channel_created'
  | 'player_joined'
  | 'first_question'
  | 'question_asked'
  | 'question_answered'
  | 'key_question'
  | 'role_changed'
  | 'truth_revealed'
  | 'channel_ended'
  | 'ai_answered'
  | 'ai_answer_modified'
  | 'hint_used'
  | 'hint_shared';

export interface AiHint {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
  user: { id: string; nickname: string; avatarSeed: string };
}

export interface HintsResponse {
  hints: AiHint[];
  myRemaining: number;
}

export interface TimelineEvent {
  id: string;
  channelId: string;
  type: EventType;
  userId: string | null;
  user: { id: string; nickname: string; avatarSeed: string } | null;
  questionId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export type ClueNodeStatus = 'confirmed' | 'partial' | 'excluded' | 'hint';

export type ClueCategory = '人物' | '时间' | '地点' | '原因' | '方式' | '物品' | '状态' | '关系' | '事件' | '其他';

export type ClueEdgeRelation = 'temporal' | 'causal' | 'contradictory' | 'related';

export interface ClueNode {
  id: string;
  content: string;
  category: ClueCategory;
  status: ClueNodeStatus;
  sourceQuestionIds: string[];
  isKey: boolean;
}

export interface ClueEdge {
  sourceId: string;
  targetId: string;
  relation: ClueEdgeRelation;
  description?: string;
}

export interface ClueGraphData {
  nodes: ClueNode[];
  edges: ClueEdge[];
}

export interface ApiError {
  error: string;
  status?: number;
}
