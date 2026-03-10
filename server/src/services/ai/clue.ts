import { generateText } from 'ai';
import { getModel, getRequestTimeout } from './provider';
import { loadGameContext, fillTemplate } from './context';
import { CLUE_ANALYSIS_PROMPT } from './prompts';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { getIO } from '../../socket';
import type { Question, Prisma } from '@prisma/client';

// Types for clue graph
export interface ClueNode {
  id: string;
  content: string;
  category: string;
  status: 'confirmed' | 'partial' | 'excluded' | 'hint';
  sourceQuestionIds: string[];
  isKey: boolean;
}

export interface ClueEdge {
  sourceId: string;
  targetId: string;
  relation: 'temporal' | 'causal' | 'contradictory' | 'related';
  description?: string;
}

export interface ClueGraphData {
  nodes: ClueNode[];
  edges: ClueEdge[];
}

interface RawAnalysisResult {
  nodes: ClueNode[];
  edges: ClueEdge[];
}

/**
 * Format answered questions for AI analysis
 */
function formatQuestionsForAnalysis(questions: Question[]): string {
  const answerMap: Record<string, string> = {
    yes: '是',
    no: '否',
    partial: '部分正确',
    irrelevant: '无关',
  };

  return questions
    .filter((q) => q.status === 'answered' && q.answer && q.answer !== 'irrelevant')
    .map((q, i) => {
      const answerLabel = answerMap[q.answer!] || q.answer;
      const keyMarker = q.isKeyQuestion ? ' [关键问题]' : '';
      return `${i + 1}. 问题ID: ${q.id}\n   问：${q.content}\n   答：${answerLabel}${keyMarker}`;
    })
    .join('\n\n');
}

function sanitizeJsonResponse(text: string): string {
  let cleaned = text;
  // 去除 markdown code fence
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '');
  // 去除可能的前导/后缀文字（只保留 { ... } 部分）
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    cleaned = match[0];
  }
  // 修复尾逗号（在 ] 或 } 之前的逗号）
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  return cleaned;
}

/**
 * Parse AI response to extract clue graph data
 */
function parseAnalysisResult(text: string): RawAnalysisResult | null {
  try {
    const sanitized = sanitizeJsonResponse(text);
    const parsed = JSON.parse(sanitized) as RawAnalysisResult;

    // Validate structure
    if (!Array.isArray(parsed.nodes)) {
      logger.warn('Invalid clue analysis result: missing nodes array');
      return null;
    }

    // Ensure each node has required fields
    const validNodes = parsed.nodes.filter(
      (node) =>
        node.id &&
        node.content &&
        node.category &&
        node.status &&
        Array.isArray(node.sourceQuestionIds),
    );

    // Ensure edges reference valid nodes
    const nodeIds = new Set(validNodes.map((n) => n.id));
    const validEdges = (parsed.edges || []).filter(
      (edge) => edge.sourceId && edge.targetId && nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId),
    );

    return {
      nodes: validNodes,
      edges: validEdges,
    };
  } catch (error) {
    logger.warn('Failed to parse clue analysis result', { error: String(error) });
    return null;
  }
}

// In-flight analysis lock to prevent duplicate concurrent analyses
const analyzingChannels = new Set<string>();

const MAX_RETRIES = 3;

/**
 * Generate clue graph from answered questions
 */
export async function analyzeClueGraph(channelId: string): Promise<ClueGraphData | null> {
  // Prevent concurrent analysis for the same channel
  if (analyzingChannels.has(channelId)) {
    logger.info('Clue analysis already in progress, skipping', { channelId });
    return null;
  }
  analyzingChannels.add(channelId);

  try {
    const model = getModel();
    if (!model) {
      logger.warn('AI model not available for clue analysis');
      return null;
    }

    // Load game context
    const ctx = await loadGameContext(channelId);

    // Get all answered questions
    const questions = await prisma.question.findMany({
      where: {
        channelId,
        status: 'answered',
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Filter out irrelevant answers
    const relevantQuestions = questions.filter((q) => q.answer && q.answer !== 'irrelevant');

    if (relevantQuestions.length === 0) {
      logger.info('No relevant answered questions for clue analysis', { channelId });
      return { nodes: [], edges: [] };
    }

    // Format questions for AI
    const questionsText = formatQuestionsForAnalysis(relevantQuestions);

    // Build prompt
    const prompt = fillTemplate(CLUE_ANALYSIS_PROMPT, {
      surface: ctx.surface,
      questions: questionsText,
    });

    let lastError: string | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }

        // Call AI
        const result = await generateText({
          model,
          system: '你是一个精确的数据分析助手，只输出JSON格式数据。不要使用markdown代码块包裹。',
          prompt,
          abortSignal: AbortSignal.timeout(getRequestTimeout()),
        });

        // Parse result
        const analysisResult = parseAnalysisResult(result.text);

        if (analysisResult && analysisResult.nodes.length > 0) {
          // Save to database — clear error fields on success
          await prisma.clueGraph.upsert({
            where: { channelId },
            create: {
              channelId,
              nodes: analysisResult.nodes as unknown as Prisma.InputJsonValue,
              edges: analysisResult.edges as unknown as Prisma.InputJsonValue,
              questionCount: relevantQuestions.length,
              lastError: null,
              lastErrorAt: null,
            },
            update: {
              nodes: analysisResult.nodes as unknown as Prisma.InputJsonValue,
              edges: analysisResult.edges as unknown as Prisma.InputJsonValue,
              questionCount: relevantQuestions.length,
              version: { increment: 1 },
              lastError: null,
              lastErrorAt: null,
            },
          });

          logger.info('Clue graph analyzed and saved', {
            channelId,
            nodeCount: analysisResult.nodes.length,
            edgeCount: analysisResult.edges.length,
            attempt,
          });

          try {
            const io = getIO();
            io.to(channelId).emit('clue_graph:updated', {
              channelId,
              nodes: analysisResult.nodes,
              edges: analysisResult.edges,
            });
            logger.info('Emitted clue_graph:updated event', { channelId });
          } catch (socketError) {
            logger.warn('Failed to emit clue_graph:updated event', { channelId, error: String(socketError) });
          }

          return analysisResult;
        }

        lastError = 'Parsed result empty or invalid';
        logger.warn('Clue analysis attempt returned empty result', { channelId, attempt });
      } catch (err) {
        lastError = String(err);
        logger.warn('Clue analysis attempt failed', { channelId, attempt, error: lastError });
      }
    }

    // All retries exhausted — persist error state
    await prisma.clueGraph.upsert({
      where: { channelId },
      create: {
        channelId,
        nodes: [] as unknown as Prisma.InputJsonValue,
        edges: [] as unknown as Prisma.InputJsonValue,
        questionCount: relevantQuestions.length,
        lastError,
        lastErrorAt: new Date(),
      },
      update: {
        lastError,
        lastErrorAt: new Date(),
      },
    });

    logger.error('Clue graph analysis failed after all retries', { channelId, lastError });
    return null;
  } finally {
    analyzingChannels.delete(channelId);
  }
}

/**
 * Get existing clue graph for a channel
 */
export async function getClueGraph(channelId: string): Promise<ClueGraphData | null> {
  try {
    const graph = await prisma.clueGraph.findUnique({
      where: { channelId },
    });

    if (!graph) {
      return null;
    }

    return {
      nodes: graph.nodes as unknown as ClueNode[],
      edges: graph.edges as unknown as ClueEdge[],
    };
  } catch (error) {
    logger.error('Failed to get clue graph', { channelId, error: String(error) });
    return null;
  }
}

/**
 * Check if clue graph needs re-analysis
 */
export async function shouldReanalyze(channelId: string): Promise<boolean> {
  try {
    const [graph, answeredCount] = await Promise.all([
      prisma.clueGraph.findUnique({
        where: { channelId },
        select: { questionCount: true, analyzedAt: true },
      }),
      prisma.question.count({
        where: {
          channelId,
          status: 'answered',
          answer: { not: 'irrelevant' },
        },
      }),
    ]);

    if (!graph) {
      return answeredCount >= 1; // First analysis when at least 1 question
    }

    // Reanalyze if more questions answered since last analysis
    if (answeredCount > graph.questionCount) {
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to check reanalysis status', { channelId, error: String(error) });
    return false;
  }
}

/**
 * Add a hint node to the clue graph
 */
export async function addHintToGraph(
  channelId: string,
  hintId: string,
  hintContent: string,
): Promise<void> {
  try {
    const graph = await prisma.clueGraph.findUnique({
      where: { channelId },
    });

    const hintNode: ClueNode = {
      id: `hint_${hintId}`,
      content: hintContent,
      category: '其他',
      status: 'hint',
      sourceQuestionIds: [],
      isKey: false,
    };

    if (graph) {
      const existingNodes = graph.nodes as unknown as ClueNode[];
      const existingEdges = graph.edges as unknown as ClueEdge[];

      // Check if hint node already exists
      const hintExists = existingNodes.some((n) => n.id === hintNode.id);
      if (hintExists) {
        return;
      }

      await prisma.clueGraph.update({
        where: { channelId },
        data: {
          nodes: [...existingNodes, hintNode] as unknown as Prisma.InputJsonValue,
          edges: existingEdges as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      // Create new graph with just this hint
      await prisma.clueGraph.create({
        data: {
          channelId,
          nodes: [hintNode] as unknown as Prisma.InputJsonValue,
          edges: [] as unknown as Prisma.InputJsonValue,
          questionCount: 0,
        },
      });
    }

    logger.info('Hint added to clue graph', { channelId, hintId });
  } catch (error) {
    logger.error('Failed to add hint to clue graph', { channelId, hintId, error: String(error) });
  }
}
