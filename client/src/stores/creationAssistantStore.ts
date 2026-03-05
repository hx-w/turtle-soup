import { create } from 'zustand';
import { api } from '../lib/api';

interface GeneratedStory {
  surface: string;
  truth: string;
  tags?: string[];
  difficulty?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    generatedStory?: GeneratedStory;
    generatedStories?: Array<GeneratedStory & { id: string; title: string }>;
  };
}

interface CreationAssistantState {
  messages: Message[];
  isLoading: boolean;
  sessionId: string | null;
  isStreaming: boolean;
  aiAvailable: boolean;

  checkAiAvailability: () => Promise<void>;
  loadSession: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useCreationAssistant = create<CreationAssistantState>((set, get) => ({
  messages: [],
  isLoading: false,
  sessionId: null,
  isStreaming: false,
  aiAvailable: false,

  checkAiAvailability: async () => {
    try {
      const data = await api.get<{ available: boolean }>('/ai/status');
      set({ aiAvailable: data.available });
    } catch {
      set({ aiAvailable: false });
    }
  },

  loadSession: async () => {
    try {
      set({ isLoading: true });
      const session = await api.get<{ id: string; messages: Message[] }>('/creation-sessions');
      set({
        sessionId: session.id,
        messages: (session.messages as Message[]) || [],
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load session:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    const { messages } = get();

    // Optimistic update: immediately show user message
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set({ isLoading: true, isStreaming: true, messages: [...messages, userMessage] });

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/creation-sessions/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      let assistantContent = '';
      let assistantMetadata: Message['metadata'] = undefined;

      // Create temporary AI message
      const assistantMessage: Message = {
        id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      set({ messages: [...get().messages, assistantMessage] });

      // SSE buffer to handle chunk boundaries correctly
      let sseBuffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // Split on double newline (SSE message boundary)
        const sseMessages = sseBuffer.split('\n\n');
        // Keep the last incomplete chunk in buffer
        sseBuffer = sseMessages.pop() || '';

        for (const sseMsg of sseMessages) {
          const line = sseMsg.trim();
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              assistantContent += data.content;
              set({
                messages: get().messages.map((m) =>
                  m.id === assistantMessage.id ? { ...m, content: assistantContent } : m,
                ),
              });
            } else if (data.type === 'story') {
              assistantMetadata = {
                generatedStory: {
                  surface: data.surface,
                  truth: data.truth,
                  tags: data.tags,
                  difficulty: data.difficulty,
                },
              };
            } else if (data.type === 'stories') {
              assistantMetadata = {
                generatedStories: data.stories,
              };
            } else if (data.type === 'done') {
              set({
                messages: get().messages.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: assistantContent, metadata: assistantMetadata }
                    : m,
                ),
              });
            } else if (data.type === 'error') {
              set({
                messages: get().messages.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: `错误：${data.message}` }
                    : m,
                ),
              });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the temporary assistant message on error
      set({
        messages: get().messages.filter((m) => !m.id.startsWith('temp-assistant-')),
      });
    } finally {
      set({ isLoading: false, isStreaming: false });
    }
  },

  clearSession: async () => {
    try {
      await api.del('/creation-sessions');
      set({ messages: [], sessionId: null });
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  },
}));
