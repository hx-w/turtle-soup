import { useEffect } from 'react';
import {
  connectSocket,
  joinChannel as socketJoinChannel,
  leaveChannel as socketLeaveChannel,
} from '../lib/socket';
import type { Question, ChatMessage, AiHint } from '../types';

interface LocalOnlineUser {
  id: string;
  nickname: string;
  avatarSeed?: string;
  role?: 'host' | 'player';
}

interface UseChannelSocketCallbacks {
  onNewQuestion: (question: Question) => void;
  onQuestionAnswered: (data: {
    question?: Question;
    questionId?: string;
    answer?: 'yes' | 'no' | 'irrelevant';
    answeredAt?: string;
    answerer?: Question['answerer'];
  }) => void;
  onQuestionWithdrawn: (questionId: string) => void;
  onRoleChanged: (userId: string) => void;
  onChannelEnded: (truth?: string) => void;
  onOnlineUsersUpdate: (users: LocalOnlineUser[]) => void;
  onChannelUpdated?: (data: { channelId: string; surface: string }) => void;
  onNewChatMessage?: (message: ChatMessage) => void;
  onAiAnswered?: (data: { question: Question; channelId: string }) => void;
  onAiCorrected?: (data: { question: Question; channelId: string; modifiedBy: string }) => void;
  onHintShared?: (data: { hint: AiHint; channelId: string }) => void;
  onProgressUpdated?: (data: { channelId: string; progress: number }) => void;
  onAiReviewReady?: (data: { channelId: string; review: string }) => void;
  onVisibilityRestore?: () => void;
}

export function useChannelSocket(
  channelId: string | undefined,
  userId: string | undefined,
  callbacks: UseChannelSocketCallbacks,
) {
  useEffect(() => {
    if (!channelId) return;

    const s = connectSocket();
    socketJoinChannel(channelId);

    function handleNewQuestion(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      const q: Question = data.question || data;
      callbacks.onNewQuestion(q);
    }

    function handleAnswered(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      const q: Question = data.question || data;
      callbacks.onQuestionAnswered({
        question: q,
        questionId: data.questionId,
        answer: q.answer || data.answer,
        answeredAt: q.answeredAt || new Date().toISOString(),
        answerer: q.answerer || data.answerer,
      });
    }

    function handleWithdrawn(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      const qId = data.questionId || data.id;
      callbacks.onQuestionWithdrawn(qId);
    }

    function handleRoleChanged(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      callbacks.onRoleChanged(data.userId);
    }

    function handleChannelEnded(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      callbacks.onChannelEnded(data.truth);
    }

    function handleUserJoined(data: any) {
      if (data.online) {
        callbacks.onOnlineUsersUpdate(
          data.online.map((u: any) => ({
            id: u.id,
            nickname: u.nickname,
            avatarSeed: u.avatarSeed,
          })),
        );
      }
    }

    function handleUserLeft(data: any) {
      if (data.online) {
        callbacks.onOnlineUsersUpdate(
          data.online.map((u: any) => ({
            id: u.id,
            nickname: u.nickname,
            avatarSeed: u.avatarSeed,
          })),
        );
      }
    }

    function handleChannelUpdated(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      callbacks.onChannelUpdated?.(data);
    }

    function handleNewChat(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      const msg: ChatMessage = data.message || data;
      callbacks.onNewChatMessage?.(msg);
    }

    function handleAiAnswered(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      callbacks.onAiAnswered?.(data);
    }

    function handleAiCorrected(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      callbacks.onAiCorrected?.(data);
    }

    function handleHintShared(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      callbacks.onHintShared?.(data);
    }

    function handleProgressUpdated(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      callbacks.onProgressUpdated?.(data);
    }

    function handleAiReviewReady(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      callbacks.onAiReviewReady?.(data);
    }

    // Re-sync data when page becomes visible (mobile screen-off recovery)
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        if (!s.connected) {
          s.connect();
        }
        socketJoinChannel(channelId!);
        callbacks.onVisibilityRestore?.();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    s.on('question:new', handleNewQuestion);
    s.on('question:answered', handleAnswered);
    s.on('question:withdrawn', handleWithdrawn);
    s.on('role:changed', handleRoleChanged);
    s.on('channel:ended', handleChannelEnded);
    s.on('channel:updated', handleChannelUpdated);
    s.on('channel:user_joined', handleUserJoined);
    s.on('channel:user_left', handleUserLeft);
    s.on('chat:new', handleNewChat);
    s.on('question:ai_answered', handleAiAnswered);
    s.on('question:ai_corrected', handleAiCorrected);
    s.on('hint:shared', handleHintShared);
    s.on('progress:updated', handleProgressUpdated);
    s.on('ai:review_ready', handleAiReviewReady);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socketLeaveChannel(channelId);
      s.off('question:new', handleNewQuestion);
      s.off('question:answered', handleAnswered);
      s.off('question:withdrawn', handleWithdrawn);
      s.off('role:changed', handleRoleChanged);
      s.off('channel:ended', handleChannelEnded);
      s.off('channel:updated', handleChannelUpdated);
      s.off('channel:user_joined', handleUserJoined);
      s.off('channel:user_left', handleUserLeft);
      s.off('chat:new', handleNewChat);
      s.off('question:ai_answered', handleAiAnswered);
      s.off('question:ai_corrected', handleAiCorrected);
      s.off('hint:shared', handleHintShared);
      s.off('progress:updated', handleProgressUpdated);
      s.off('ai:review_ready', handleAiReviewReady);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, userId]);
}
