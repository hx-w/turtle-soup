import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  Channel,
  ChannelListResponse,
  Question,
  OnlineUser,
  ChannelMember,
} from '../types';

interface ChannelState {
  channels: Channel[];
  totalPages: number;
  currentChannel: Channel | null;
  questions: Question[];
  onlineUsers: OnlineUser[];
  myRole: 'host' | 'player' | null;
  isLoadingList: boolean;
  isLoadingChannel: boolean;

  fetchChannels: (params?: {
    status?: string;
    search?: string;
    difficulty?: string;
    tag?: string;
    sort?: string;
    page?: number;
  }) => Promise<void>;

  fetchChannel: (id: string) => Promise<void>;

  submitQuestion: (channelId: string, content: string) => Promise<Question>;
  answerQuestion: (
    channelId: string,
    questionId: string,
    answer: 'yes' | 'no' | 'irrelevant',
  ) => Promise<{ question: Question; channelEnded: boolean }>;
  withdrawQuestion: (channelId: string, questionId: string) => Promise<void>;

  setOnlineUsers: (users: OnlineUser[]) => void;
  addQuestion: (question: Question) => void;
  updateQuestion: (question: Question) => void;
  removeQuestion: (questionId: string) => void;
  prependChannel: (channel: Channel) => void;
  setMyRole: (role: 'host' | 'player' | null) => void;
  setChannelStatus: (status: 'active' | 'ended' | 'archived') => void;
  reset: () => void;
}

export const useChannelStore = create<ChannelState>((set) => ({
  channels: [],
  totalPages: 1,
  currentChannel: null,
  questions: [],
  onlineUsers: [],
  myRole: null,
  isLoadingList: false,
  isLoadingChannel: false,

  fetchChannels: async (params) => {
    // Stale-while-revalidate: never show loading spinner, just refresh silently
    try {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
      if (params?.tag) searchParams.set('tag', params.tag);
      if (params?.sort) searchParams.set('sort', params.sort);
      if (params?.page) searchParams.set('page', String(params.page));

      const query = searchParams.toString();
      const data = await api.get<ChannelListResponse>(
        `/channels${query ? `?${query}` : ''}`,
      );
      set({ channels: data.channels, totalPages: data.totalPages });
    } catch (error) {
      // Silently fail - keep existing data on refresh errors
      console.error('Failed to fetch channels:', error);
    }
  },

  fetchChannel: async (id: string) => {
    set({ isLoadingChannel: true });
    try {
      const channel = await api.get<Channel>(`/channels/${id}`);

      // Determine user role
      const userStr = localStorage.getItem('user');
      let myRole: 'host' | 'player' | null = null;
      if (userStr && channel.members) {
        const user = JSON.parse(userStr);
        const member = channel.members.find(
          (m: ChannelMember) => m.userId === user.id,
        );
        myRole = (member?.role as 'host' | 'player') ?? null;
      }

      set({
        currentChannel: channel,
        questions: channel.questions ?? [],
        myRole,
      });
    } finally {
      set({ isLoadingChannel: false });
    }
  },

  submitQuestion: async (channelId: string, content: string) => {
    const question = await api.post<Question>(`/channels/${channelId}/questions`, {
      content,
    });
    set((state) => ({ questions: [...state.questions, question] }));
    return question;
  },

  answerQuestion: async (channelId, questionId, answer) => {
    const result = await api.put<{ question: Question; channelEnded: boolean }>(
      `/channels/${channelId}/questions/${questionId}/answer`,
      { answer },
    );
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === questionId ? result.question : q,
      ),
    }));
    if (result.channelEnded) {
      set((state) => ({
        currentChannel: state.currentChannel
          ? { ...state.currentChannel, status: 'ended' }
          : null,
      }));
    }
    return result;
  },

  withdrawQuestion: async (channelId, questionId) => {
    await api.put(`/channels/${channelId}/questions/${questionId}/withdraw`);
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== questionId),
    }));
  },

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addQuestion: (question) =>
    set((state) => {
      if (state.questions.find((q) => q.id === question.id)) return state;
      return { questions: [...state.questions, question] };
    }),

  updateQuestion: (question) =>
    set((state) => ({
      questions: state.questions.map((q) =>
        q.id === question.id ? question : q,
      ),
    })),

  removeQuestion: (questionId) =>
    set((state) => ({
      questions: state.questions.filter((q) => q.id !== questionId),
    })),

  prependChannel: (channel) =>
    set((state) => {
      // Avoid duplicates
      if (state.channels.find((c) => c.id === channel.id)) return state;
      // Only prepend if showing active channels (default view)
      return { channels: [channel, ...state.channels] };
    }),

  setMyRole: (role) => set({ myRole: role }),

  setChannelStatus: (status) =>
    set((state) => ({
      currentChannel: state.currentChannel
        ? { ...state.currentChannel, status }
        : null,
    })),

  reset: () =>
    set({
      currentChannel: null,
      questions: [],
      onlineUsers: [],
      myRole: null,
      isLoadingChannel: false,
    }),
}));
