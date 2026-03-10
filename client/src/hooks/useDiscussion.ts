import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { emitChatNew } from '../lib/socket';
import type { ChatMessage, ChatListResponse } from '../types';

export function useDiscussion(channelId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const initialLoaded = useRef(false);

  const fetchMessages = useCallback(
    async (before?: string) => {
      if (!channelId || loading) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (before) params.set('before', before);
        params.set('limit', '50');
        const data = await api.get<ChatListResponse>(
          `/channels/${channelId}/chat?${params}`,
        );
        setHasMore(data.hasMore);
        if (before) {
          // Prepend older messages
          setMessages((prev) => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
        }
        initialLoaded.current = true;
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    },
    [channelId, loading],
  );

  const loadMore = useCallback(() => {
    if (messages.length === 0 || !hasMore) return;
    fetchMessages(messages[0].createdAt);
  }, [messages, hasMore, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!channelId) return;
      const msg = await api.post<ChatMessage>(
        `/channels/${channelId}/chat`,
        { content: content.trim() },
      );
      emitChatNew({ channelId, message: msg });
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      return msg;
    },
    [channelId],
  );

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const markAsRead = useCallback(async () => {
    if (!channelId) return;
    try {
      await api.put(`/channels/${channelId}/chat/read`, {});
    } catch {
      // Non-critical
    }
  }, [channelId]);

  // Refresh latest messages (used on visibility restore after mobile screen-off)
  const refreshLatest = useCallback(async () => {
    if (!channelId) return;
    try {
      const data = await api.get<ChatListResponse>(
        `/channels/${channelId}/chat?limit=50`,
      );
      setMessages(data.messages);
      setHasMore(data.hasMore);
    } catch {
      // Non-critical
    }
  }, [channelId]);

  return {
    messages,
    hasMore,
    loading,
    initialLoaded: initialLoaded.current,
    fetchMessages,
    loadMore,
    sendMessage,
    addMessage,
    markAsRead,
    refreshLatest,
  };
}
