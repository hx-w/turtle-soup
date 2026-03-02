import { useEffect } from 'react';
import {
  connectSocket,
  joinChannel as socketJoinChannel,
  leaveChannel as socketLeaveChannel,
} from '../lib/socket';
import type { Question, ChatMessage } from '../types';

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
  onNewChatMessage?: (message: ChatMessage) => void;
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

    function handleNewChat(data: any) {
      if (data.channelId && data.channelId !== channelId) return;
      const msg: ChatMessage = data.message || data;
      callbacks.onNewChatMessage?.(msg);
    }

    s.on('question:new', handleNewQuestion);
    s.on('question:answered', handleAnswered);
    s.on('question:withdrawn', handleWithdrawn);
    s.on('role:changed', handleRoleChanged);
    s.on('channel:ended', handleChannelEnded);
    s.on('channel:user_joined', handleUserJoined);
    s.on('channel:user_left', handleUserLeft);
    s.on('chat:new', handleNewChat);

    return () => {
      socketLeaveChannel(channelId);
      s.off('question:new', handleNewQuestion);
      s.off('question:answered', handleAnswered);
      s.off('question:withdrawn', handleWithdrawn);
      s.off('role:changed', handleRoleChanged);
      s.off('channel:ended', handleChannelEnded);
      s.off('channel:user_joined', handleUserJoined);
      s.off('channel:user_left', handleUserLeft);
      s.off('chat:new', handleNewChat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, userId]);
}
