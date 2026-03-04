import { generateText } from 'ai';
import { getModel, getRequestTimeout } from './provider';
import { loadGameContext, fillTemplate } from './context';
import { CLUE_ANALYSIS_PROMPT } from './prompts';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
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

/**
 * Parse AI response to extract clue graph data
 */
function parseAnalysisResult(text: string): RawAnalysisResult | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('No JSON found in AI response for clue analysis');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as RawAnalysisResult;

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

/**
 * Generate clue graph from answered questions
 */
export async function analyzeClueGraph(channelId: string): Promise<ClueGraphData | null> {
  const model = getModel();
  if (!model) {
    logger.warn('AI model not available for clue analysis');
    return null;
  }

  try {
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

    // Call AI
    const result = await generateText({
      model,
      system: '你是一个精确的数据分析助手，只输出JSON格式数据。',
      prompt,
      abortSignal: AbortSignal.timeout(getRequestTimeout()),
    });

    // Parse result
    const analysisResult = parseAnalysisResult(result.text);

    if (!analysisResult) {
      return { nodes: [], edges: [] };
    }

    // Save to database
    await prisma.clueGraph.upsert({
      where: { channelId },
      create: {
        channelId,
        nodes: analysisResult.nodes as unknown as Prisma.InputJsonValue,
        edges: analysisResult.edges as unknown as Prisma.InputJsonValue,
        questionCount: relevantQuestions.length,
      },
      update: {
        nodes: analysisResult.nodes as unknown as Prisma.InputJsonValue,
        edges: analysisResult.edges as unknown as Prisma.InputJsonValue,
        questionCount: relevantQuestions.length,
        version: { increment: 1 },
      },
    });

    logger.info('Clue graph analyzed and saved', {
      channelId,
      nodeCount: analysisResult.nodes.length,
      edgeCount: analysisResult.edges.length,
    });

    return analysisResult;
  } catch (error) {
    logger.error('Clue graph analysis failed', { channelId, error: String(error) });
    return null;
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
