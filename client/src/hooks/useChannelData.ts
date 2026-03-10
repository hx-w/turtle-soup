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
import type { Channel, ChannelMember, Question, QuestionReaction, ChannelStats, AiHint, HintsResponse } from '../types';

interface LocalOnlineUser {
  id: string;
  nickname: string;
  avatarSeed?: string;
  role?: 'creator' | 'host' | 'player';
}

export function useChannelData(
  channelId: string | undefined,
  user: { id: string; nickname: string } | null,
) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myRole, setMyRole] = useState<'creator' | 'host' | 'player'>('player');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<LocalOnlineUser[]>([]);
  const [channelEnded, setChannelEnded] = useState(false);
  const [truthText, setTruthText] = useState('');
  const [channelStats, setChannelStats] = useState<ChannelStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [hints, setHints] = useState<AiHint[]>([]);
  const [hintRemaining, setHintRemaining] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!channelId) return;
    try {
      const data = await api.get<ChannelStats>(`/channels/${channelId}/stats`);
      setChannelStats(data);
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

        // Initialize AI state
        if (data.aiProgress) setAiProgress(data.aiProgress);
        if (data.aiReview) setAiReview(data.aiReview);

        if (data.status === 'ended') {
          setChannelEnded(true);
          loadStats();
        }

        // Load hints quota if AI hints enabled and user is a player
        const myMembership = data.members?.find((m: ChannelMember) => m.userId === user?.id);
        if (data.aiHintEnabled && myMembership?.role === 'player') {
          api.get<HintsResponse>(`/channels/${channelId}/hints`).then((hintsData) => {
            setHints(hintsData.hints);
            setHintRemaining(hintsData.myRemaining);
          }).catch(() => {
            // Hints not critical
          });
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
    async (questionId: string, answer: 'yes' | 'no' | 'irrelevant' | 'partial', isKeyQuestion = false) => {
      if (!channelId) return;
      try {
        const res = await api.put<{
          question: Question;
          channelEnded: boolean;
        }>(`/channels/${channelId}/questions/${questionId}/answer`, { answer, isKeyQuestion });
        const answered = res.question || res;
        emitQuestionAnswered({ channelId, question: answered });
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  status: 'answered' as const,
                  answer,
                  isKeyQuestion,
                  answeredAt: new Date().toISOString(),
                  answerer: answered.answerer,
                }
              : q,
          ),
        );

        if (res.channelEnded) {
          setChannelEnded(true);
          emitChannelEnded({ channelId });
          loadStats();
          toast.success('已达到回答次数上限，游戏自动结束');
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

  const handleDeleteChannel = useCallback(async () => {
    if (!channelId) return;
    await api.del(`/channels/${channelId}`);
    toast.success('频道已删除');
  }, [channelId]);

  const handleEditSoup = useCallback(
    async (surface: string, truth: string) => {
      if (!channelId) return;
      const body: Record<string, string> = {};
      if (channel && surface !== channel.surface) body.surface = surface;
      if (channel && truth !== (channel.truth ?? '')) body.truth = truth;
      if (Object.keys(body).length === 0) return;

      const updated = await api.patch<{ id: string; surface: string; truth: string }>(
        `/channels/${channelId}`,
        body,
      );
      setChannel((prev) =>
        prev ? { ...prev, surface: updated.surface, truth: updated.truth } : prev,
      );
      if (updated.truth) setTruthText(updated.truth);
      toast.success('更新成功');
    },
    [channelId, channel],
  );

  const handleSocketChannelUpdated = useCallback(
    (data: { channelId: string; surface: string }) => {
      setChannel((prev) =>
        prev ? { ...prev, surface: data.surface } : prev,
      );
    },
    [],
  );

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
        setMyRole((prev) => (prev === 'player' ? 'host' : prev));
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

  const updateQuestionReactions = useCallback((questionId: string, reactions: QuestionReaction[]) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, reactions } : q)),
    );
  }, []);

  // AI methods
  const handleAiCorrect = useCallback(
    async (qid: string, answer: string, isKey: boolean) => {
      if (!channelId) return;
      try {
        const updated = await api.put<Question>(
          `/channels/${channelId}/questions/${qid}/ai-correct`,
          { answer, isKeyQuestion: isKey },
        );
        setQuestions((prev) =>
          prev.map((q) => (q.id === qid ? { ...q, ...updated } : q)),
        );
      } catch (err: any) {
        toast.error(err?.message || '修改AI回答失败');
        throw err;
      }
    },
    [channelId],
  );

  const handleRequestHint = useCallback(async () => {
    if (!channelId) return;
    setHintLoading(true);
    try {
      const res = await api.post<{ hint: AiHint; remaining: number }>(
        `/channels/${channelId}/hints`,
      );
      setHints((prev) => [...prev, res.hint]);
      setHintRemaining(res.remaining);
    } catch (err: any) {
      toast.error(err?.message || '请求线索失败');
    } finally {
      setHintLoading(false);
    }
  }, [channelId]);

  const handleToggleHintPublic = useCallback(
    async (hintId: string, isPublic: boolean) => {
      if (!channelId) return;
      const updated = await api.put<AiHint>(
        `/channels/${channelId}/hints/${hintId}/visibility`,
        { isPublic },
      );
      setHints((prev) => prev.map((h) => (h.id === hintId ? { ...h, ...updated } : h)));
    },
    [channelId],
  );

  const loadHints = useCallback(async () => {
    if (!channelId) return;
    try {
      const data = await api.get<HintsResponse>(`/channels/${channelId}/hints`);
      setHints(data.hints);
      setHintRemaining(data.myRemaining);
    } catch {
      // Hints not critical
    }
  }, [channelId]);

  const updateProgress = useCallback((progress: number) => {
    setAiProgress(progress);
  }, []);

  // Socket callback: AI answered a question
  const handleSocketAiAnswered = useCallback(
    (data: { question: Question; channelId: string }) => {
      const q = data.question;
      setQuestions((prev) => {
        const existing = prev.find((e) => e.id === q.id);
        if (existing) {
          return prev.map((e) => (e.id === q.id ? { ...e, ...q } : e));
        }
        return [...prev, q];
      });
    },
    [],
  );

  const handleSocketAiCorrected = useCallback(
    (data: { question: Question; channelId: string }) => {
      const q = data.question;
      setQuestions((prev) =>
        prev.map((e) => (e.id === q.id ? { ...e, ...q } : e)),
      );
    },
    [],
  );

  const handleSocketHintShared = useCallback(
    (data: { hint: AiHint; channelId: string }) => {
      setHints((prev) => {
        if (prev.some((h) => h.id === data.hint.id)) {
          return prev.map((h) => (h.id === data.hint.id ? data.hint : h));
        }
        return [...prev, data.hint];
      });
    },
    [],
  );

  // Refresh all channel data (used on visibility restore after mobile screen-off)
  const refreshData = useCallback(async () => {
    if (!channelId) return;
    try {
      const data = await api.get<Channel>(`/channels/${channelId}`);
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

      if (data.status === 'ended' && !channelEnded) {
        setChannelEnded(true);
        loadStats();
      }
    } catch {
      // Non-critical, silently fail
    }
  }, [channelId, user?.id, channelEnded, loadStats]);

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
    handleDeleteChannel,
    handleEditSoup,
    // Socket callbacks
    handleSocketChannelUpdated,
    updateQuestionReactions,
    addQuestion,
    markAnswered,
    removeQuestion,
    handleSocketRoleChanged,
    handleSocketChannelEnded,
    updateOnlineUsers,
    // AI state
    aiProgress,
    aiReview,
    setAiReview,
    aiReviewLoading,
    setAiReviewLoading,
    hints,
    hintRemaining,
    hintLoading,
    // AI methods
    handleAiCorrect,
    handleRequestHint,
    handleToggleHintPublic,
    loadHints,
    updateProgress,
    // AI socket callbacks
    handleSocketAiAnswered,
    handleSocketAiCorrected,
    handleSocketHintShared,
    refreshData,
  };
}
