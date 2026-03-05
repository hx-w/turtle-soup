import { Router, Response } from 'express';
import { streamText } from 'ai';
import { getCreationModel, isCreationAiAvailable } from '../services/ai/provider';
import { CREATION_SYSTEM_PROMPT } from '../services/ai/creation-prompts';
import { prisma } from '../lib/prisma';
import { authRequired } from '../middleware/auth';
import { randomUUID } from 'crypto';

const router = Router();

// Constants based on DeepSeek-chat 128K context window
const MAX_MESSAGE_LENGTH = 5000; // ~10K tokens for Chinese text
const MAX_CONTEXT_MESSAGES = 30; // ~48K tokens for 30 messages

interface GeneratedStory {
  title?: string;
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

/**
 * Extract all JSON code blocks from AI response.
 * Returns single story or multiple stories depending on count.
 */
function parseStories(content: string): {
  generatedStory?: GeneratedStory;
  generatedStories?: Array<GeneratedStory & { id: string; title: string }>;
} | null {
  const jsonBlocks = [...content.matchAll(/```json\n([\s\S]+?)\n```/g)];

  if (jsonBlocks.length === 0) return null;

  if (jsonBlocks.length === 1) {
    try {
      const parsed = JSON.parse(jsonBlocks[0][1]);
      return {
        generatedStory: {
          title: parsed.title,
          surface: parsed.surface,
          truth: parsed.truth,
          tags: parsed.tags,
          difficulty: parsed.difficulty,
        },
      };
    } catch {
      return null;
    }
  }

  // Multiple stories
  const stories: Array<GeneratedStory & { id: string; title: string }> = [];
  jsonBlocks.forEach((block, index) => {
    try {
      const parsed = JSON.parse(block[1]);
      stories.push({
        id: randomUUID(),
        title: parsed.title || `方案 #${index + 1}`,
        surface: parsed.surface,
        truth: parsed.truth,
        tags: parsed.tags,
        difficulty: parsed.difficulty,
      });
    } catch {
      // Skip invalid JSON blocks
    }
  });

  return stories.length > 0 ? { generatedStories: stories } : null;
}

// Get or create session
router.get('/', authRequired, async (req, res: Response) => {
  const userId = req.user!.userId;

  let session = await prisma.creationSession.findUnique({
    where: { userId },
  });

  if (!session) {
    session = await prisma.creationSession.create({
      data: { userId, messages: [] },
    });
  }

  res.json(session);
});

// Send message (streaming)
router.post('/chat/stream', authRequired, async (req, res: Response) => {
  const userId = req.user!.userId;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    res.status(400).json({ error: '消息不能为空' });
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `消息过长，最多 ${MAX_MESSAGE_LENGTH} 字` });
    return;
  }

  // Check AI availability before setting SSE headers
  if (!isCreationAiAvailable()) {
    res.status(503).json({ error: 'AI服务不可用' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let responseClosed = false;
  res.on('close', () => {
    responseClosed = true;
  });

  const safeSend = (data: string) => {
    if (!responseClosed) {
      res.write(`data: ${data}\n\n`);
    }
  };

  try {
    // Get session
    let session = await prisma.creationSession.findUnique({
      where: { userId },
    });

    if (!session) {
      session = await prisma.creationSession.create({
        data: { userId, messages: [] },
      });
    }

    // Build context with sliding window
    const allMessages = session.messages as unknown as Message[];
    const recentMessages = allMessages.slice(-MAX_CONTEXT_MESSAGES);
    const context = [
      { role: 'system' as const, content: CREATION_SYSTEM_PROMPT },
      ...recentMessages.map((m: Message) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    const model = getCreationModel()!;

    // Stream text
    const stream = await streamText({
      model,
      messages: context,
    });

    // Stream output
    let fullContent = '';

    for await (const chunk of stream.textStream) {
      fullContent += chunk;
      safeSend(JSON.stringify({ type: 'text', content: chunk }));
    }

    // Parse generated stories
    const storyMetadata = parseStories(fullContent);

    if (storyMetadata?.generatedStory) {
      safeSend(JSON.stringify({ type: 'story', ...storyMetadata.generatedStory }));
    } else if (storyMetadata?.generatedStories) {
      safeSend(JSON.stringify({ type: 'stories', stories: storyMetadata.generatedStories }));
    }

    // Save messages to database BEFORE ending response
    const userMessage: Message = {
      id: randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    const assistantMessage: Message = {
      id: randomUUID(),
      role: 'assistant',
      content: fullContent,
      timestamp: new Date().toISOString(),
      metadata: storyMetadata || undefined,
    };

    try {
      await prisma.creationSession.update({
        where: { userId },
        data: {
          messages: [...allMessages, userMessage, assistantMessage] as unknown as never[],
        },
      });
    } catch (dbError) {
      console.error('Failed to save messages:', dbError);
      // DB failure is non-fatal for the user experience
    }

    safeSend(JSON.stringify({ type: 'done' }));
    if (!responseClosed) res.end();
  } catch (error) {
    console.error('Chat error:', error);
    safeSend(JSON.stringify({ type: 'error', message: '对话失败' }));
    if (!responseClosed) res.end();
  }
});

// Clear session
router.delete('/', authRequired, async (req, res: Response) => {
  const userId = req.user!.userId;

  await prisma.creationSession.deleteMany({
    where: { userId },
  });

  res.json({ success: true });
});

export default router;
