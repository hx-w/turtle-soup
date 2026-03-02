import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { toast } from '../stores/toastStore';
import {
  emitQuestionNew,
  emitQuestionAnswered,
  emitQuestionWithdrawn,
  emitRoleChanged,
  emitChannelEnded,
} from '../lib/socket';
import type { Channel, ChannelMember, Question, ChannelStats } from '../types';

interface LocalOnlineUser {
  id: string;
  nickname: string;
  avatarSeed?: string;
  role?: 'host' | 'player';
}

export function useChannelData(
  channelId: string | undefined,
  user: { id: string; nickname: string } | null,
) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myRole, setMyRole] = useState<'host' | 'player'>('player');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<LocalOnlineUser[]>([]);
  const [channelEnded, setChannelEnded] = useState(false);
  const [truthText, setTruthText] = useState('');
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [showStats, setShowStats] = useState(false);

  const loadStats = useCallback(async () => {
    if (!channelId) return;
    try {
      const data = await api.get<ChannelStats>(`/channels/${channelId}/stats`);
      setChannelStats(data);
      setShowStats(true);
    } catch {
      // Stats not critical
    }
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;

    async function fetchChannel() {
      try {
        setLoading(true);
        let data = await api.get<Channel>(`/channels/${channelId}`);

        // Auto-join if not a member and channel is active
        const membership = data.members?.find(
          (m: ChannelMember) => m.userId === user?.id,
        );
        if (!membership && data.status === 'active') {
          await api.post(`/channels/${channelId}/join`);
          data = await api.get<Channel>(`/channels/${channelId}`);
        }

        setChannel(data);
        setQuestions(data.questions ?? []);

        const updatedMembership = data.members?.find(
          (m: ChannelMember) => m.userId === user?.id,
        );
        if (updatedMembership) {
          setMyRole(updatedMembership.role);
        }

        if (data.truth) {
          setTruthText(data.truth);
        }

        if (data.status === 'ended') {
          setChannelEnded(true);
          loadStats();
        }

        setOnlineUsers(
          (data.members ?? []).map((m: ChannelMember) => ({
            id: m.user.id,
            nickname: m.user.nickname,
            avatarSeed: m.user.avatarSeed,
            role: m.role,
          })),
        );
      } catch (err: any) {
        setError(err?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    }

    fetchChannel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id]);

  const handleSubmitQuestion = useCallback(
    async (questionText: string) => {
      if (!channelId) return;
      const newQ = await api.post<Question>(
        `/channels/${channelId}/questions`,
        { content: questionText.trim() },
      );
      emitQuestionNew({ channelId, question: newQ });
      setQuestions((prev) => {
        if (prev.some((q) => q.id === newQ.id)) return prev;
        return [...prev, newQ];
      });
    },
    [channelId],
  );

  const handleWithdraw = useCallback(
    async (questionId: string) => {
      if (!channelId) return;
      try {
        await api.put(
          `/channels/${channelId}/questions/${questionId}/withdraw`,
        );
        emitQuestionWithdrawn({ channelId, questionId });
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      } catch (err: any) {
        toast.error(err?.message || '撤回失败');
      }
    },
    [channelId],
  );

  const handleAnswer = useCallback(
    async (questionId: string, answer: 'yes' | 'no' | 'irrelevant') => {
      if (!channelId) return;
      try {
        const res = await api.put<{
          question: Question;
          channelEnded: boolean;
        }>(`/channels/${channelId}/questions/${questionId}/answer`, { answer });
        const answered = res.question || res;
        emitQuestionAnswered({ channelId, question: answered });
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  status: 'answered' as const,
                  answer,
                  answeredAt: new Date().toISOString(),
                }
              : q,
          ),
        );

        if (res.channelEnded) {
          setChannelEnded(true);
          emitChannelEnded({ channelId });
          loadStats();
        }
      } catch (err: any) {
        toast.error(err?.message || '回答失败');
      }
    },
    [channelId, loadStats],
  );

  const handleRevealTruth = useCallback(async () => {
    if (!channelId) return;
    const res = await api.post<{ truth: string; alreadyHost: boolean }>(
      `/channels/${channelId}/reveal`,
    );
    setTruthText(res.truth);
    setMyRole('host');
    if (!res.alreadyHost) {
      emitRoleChanged({
        channelId,
        userId: user?.id ?? '',
        nickname: user?.nickname ?? '',
      });
    }
    return res;
  }, [channelId, user?.id, user?.nickname]);

  const handleEndChannel = useCallback(async () => {
    if (!channelId) return;
    await api.post(`/channels/${channelId}/end`);
    setChannelEnded(true);
    emitChannelEnded({ channelId });
    loadStats();
  }, [channelId, loadStats]);

  // Socket callback helpers
  const addQuestion = useCallback((q: Question) => {
    setQuestions((prev) => {
      if (prev.some((existing) => existing.id === q.id)) return prev;
      return [...prev, q];
    });
  }, []);

  const markAnswered = useCallback(
    (data: {
      question?: Question;
      questionId?: string;
      answer?: 'yes' | 'no' | 'irrelevant';
      answeredAt?: string;
      answerer?: Question['answerer'];
    }) => {
      const q = data.question;
      setQuestions((prev) =>
        prev.map((existing) =>
          existing.id === q?.id || existing.id === data.questionId
            ? {
                ...existing,
                status: 'answered' as const,
                answer: data.answer ?? null,
                answeredAt: data.answeredAt ?? new Date().toISOString(),
                answerer: data.answerer,
              }
            : existing,
        ),
      );
    },
    [],
  );

  const removeQuestion = useCallback((questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  }, []);

  const handleSocketRoleChanged = useCallback(
    (userId: string) => {
      if (userId === user?.id) {
        setMyRole('host');
      }
      setOnlineUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: 'host' as const } : u,
        ),
      );
    },
    [user?.id],
  );

  const handleSocketChannelEnded = useCallback(
    (truth?: string) => {
      setChannelEnded(true);
      if (truth) {
        setTruthText(truth);
      }
      loadStats();
    },
    [loadStats],
  );

  const updateOnlineUsers = useCallback((users: LocalOnlineUser[]) => {
    setOnlineUsers(users);
  }, []);

  return {
    channel,
    questions,
    myRole,
    loading,
    error,
    onlineUsers,
    channelEnded,
    truthText,
    channelStats,
    showStats,
    setShowStats,
    loadStats,
    handleSubmitQuestion,
    handleWithdraw,
    handleAnswer,
    handleRevealTruth,
    handleEndChannel,
    // Socket callbacks
    addQuestion,
    markAnswered,
    removeQuestion,
    handleSocketRoleChanged,
    handleSocketChannelEnded,
    updateOnlineUsers,
  };
}
