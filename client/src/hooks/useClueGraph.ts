import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import type { ClueGraphData, ClueNode, ClueEdge, AiHint } from '../types';

interface UseClueGraphOptions {
  channelId: string | undefined;
  enabled?: boolean;
}

export interface PositionedClueNode extends ClueNode {
  position: { x: number; y: number };
}

export interface ClueGraphState {
  nodes: PositionedClueNode[];
  edges: ClueEdge[];
  hintNodes: PositionedClueNode[];
  loading: boolean;
  error: string | null;
}

// Layout constants
const LAYOUT = {
  COLS: 3,
  GAP_X: 160,
  GAP_Y: 110,
  START_X: 40,
  START_Y: 30,
  HINT_AREA_OFFSET: 80,
  MIN_CANVAS_SIZE: 2000,
};

// Position persistence versioning
const POSITION_VERSION = 1;

interface SavedLayout {
  version: number;
  positions: Record<string, { x: number; y: number }>;
  updatedAt: string;
}

// Category icons mapping (using Lucide icon names)
export const categoryIcons: Record<string, string> = {
  '人物': 'User',
  '时间': 'Clock',
  '地点': 'MapPin',
  '原因': 'HelpCircle',
  '方式': 'Settings',
  '物品': 'Package',
  '状态': 'Activity',
  '关系': 'GitBranch',
  '事件': 'Zap',
  '其他': 'Circle',
};

// Simple grid layout algorithm
function layoutNodes(
  nodes: ClueNode[],
  savedPositions?: Record<string, { x: number; y: number }>,
): PositionedClueNode[] {
  if (nodes.length === 0) return [];

  // Group nodes by status
  const groups = {
    key: nodes.filter((n) => n.isKey),
    confirmed: nodes.filter((n) => n.status === 'confirmed' && !n.isKey),
    partial: nodes.filter((n) => n.status === 'partial'),
    excluded: nodes.filter((n) => n.status === 'excluded'),
  };

  const result: PositionedClueNode[] = [];
  let currentY = LAYOUT.START_Y;

  // Layout each group
  Object.entries(groups).forEach(([, groupNodes]) => {
    if (groupNodes.length === 0) return;

    // Add spacing between groups
    if (result.length > 0) {
      currentY += 30;
    }

    groupNodes.forEach((node, i) => {
      // Check for saved position first
      const savedPos = savedPositions?.[node.id];
      
      result.push({
        ...node,
        position: savedPos || {
          x: LAYOUT.START_X + (i % LAYOUT.COLS) * LAYOUT.GAP_X,
          y: currentY + Math.floor(i / LAYOUT.COLS) * LAYOUT.GAP_Y,
        },
      });
    });

    // Update Y for next group
    const rows = Math.ceil(groupNodes.length / LAYOUT.COLS);
    currentY += rows * LAYOUT.GAP_Y;
  });

  return result;
}

// Layout hint nodes separately (below main nodes)
function layoutHints(
  hints: { id: string; content: string }[],
  yOffset: number,
): PositionedClueNode[] {
  return hints.map((hint, i) => ({
    id: `hint_${hint.id}`,
    content: hint.content,
    category: '其他' as const,
    status: 'hint' as const,
    sourceQuestionIds: [],
    isKey: false,
    position: {
      x: LAYOUT.START_X + (i % LAYOUT.COLS) * LAYOUT.GAP_X,
      y: yOffset + Math.floor(i / LAYOUT.COLS) * LAYOUT.GAP_Y,
    },
  }));
}

// Calculate canvas size dynamically based on nodes
export function calculateCanvasSize(nodes: PositionedClueNode[]): { width: number; height: number } {
  if (nodes.length === 0) {
    return { width: LAYOUT.MIN_CANVAS_SIZE, height: LAYOUT.MIN_CANVAS_SIZE };
  }

  const maxX = Math.max(...nodes.map((n) => n.position.x)) + 200; // Node width + padding
  const maxY = Math.max(...nodes.map((n) => n.position.y)) + 120; // Node height + padding

  return {
    width: Math.max(LAYOUT.MIN_CANVAS_SIZE, maxX),
    height: Math.max(LAYOUT.MIN_CANVAS_SIZE, maxY),
  };
}


// Load saved positions from localStorage with version migration
function loadSavedPositions(channelId: string): Record<string, { x: number; y: number }> | undefined {
  try {
    const key = `clue-positions-v${POSITION_VERSION}-${channelId}`;
    const saved = localStorage.getItem(key);
    if (!saved) return undefined;
    
    const data = JSON.parse(saved) as SavedLayout;
    
    // Version migration if needed
    if (data.version !== POSITION_VERSION) {
      // Future: implement migration logic here
      console.warn('Layout version mismatch, resetting positions');
      return undefined;
    }
    
    return data.positions;
  } catch {
    return undefined;
  }
}

// Save positions to localStorage with version
function savePositions(channelId: string, positions: Record<string, { x: number; y: number }>) {
  try {
    const data: SavedLayout = {
      version: POSITION_VERSION,
      positions,
      updatedAt: new Date().toISOString(),
    };
    const key = `clue-positions-v${POSITION_VERSION}-${channelId}`;
    localStorage.setItem(key, JSON.stringify(data));
    
    // Clean up old versions
    for (let v = 1; v < POSITION_VERSION; v++) {
      localStorage.removeItem(`clue-positions-v${v}-${channelId}`);
    }
  } catch {
    // Ignore localStorage errors (e.g., quota exceeded)
  }
}

export function useClueGraph({ channelId, enabled = true }: UseClueGraphOptions) {
  const [state, setState] = useState<ClueGraphState>({
    nodes: [],
    edges: [],
    hintNodes: [],
    loading: false,
    error: null,
  });

  // Fetch clue graph
  const fetchClueGraph = useCallback(async () => {
    if (!channelId || !enabled) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await api.get<ClueGraphData>(`/channels/${channelId}/clues`);
      const savedPositions = loadSavedPositions(channelId);
      
      // Separate hint nodes from regular nodes
      const regularNodes = data.nodes.filter((n) => n.status !== 'hint');
      const hintNodesData = data.nodes.filter((n) => n.status === 'hint');
      
      // Layout regular nodes
      const positionedNodes = layoutNodes(regularNodes, savedPositions);
      
      // Calculate Y offset for hints
      const maxY = positionedNodes.length > 0
        ? Math.max(...positionedNodes.map((n) => n.position.y))
        : LAYOUT.START_Y;
      
      // Layout hint nodes
      const positionedHints = layoutHints(
        hintNodesData.map((h) => ({
          id: h.id.replace('hint_', ''),
          content: h.content,
        })),
        maxY + LAYOUT.HINT_AREA_OFFSET,
      );

      setState({
        nodes: positionedNodes,
        edges: data.edges,
        hintNodes: positionedHints,
        loading: false,
        error: null,
      });
    } catch (err) {
      const apiError = err as Error;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: apiError.message || '加载线索图失败',
      }));
    }
  }, [channelId, enabled]);

  // Update node position (for drag)
  const updateNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      setState((prev) => {
        const newNodes = prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n,
        );
        const newHintNodes = prev.hintNodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n,
        );

        // Save to localStorage
        const positions: Record<string, { x: number; y: number }> = {};
        [...newNodes, ...newHintNodes].forEach((n) => {
          positions[n.id] = n.position;
        });
        if (channelId) {
          savePositions(channelId, positions);
        }

        return { ...prev, nodes: newNodes, hintNodes: newHintNodes };
      });
    },
    [channelId],
  );

  // Add hint node (when new hint is received via socket)
  const addHintNode = useCallback((hint: AiHint) => {
    setState((prev) => {
      // Check if already exists
      if (prev.hintNodes.some((n) => n.id === `hint_${hint.id}`)) {
        return prev;
      }

      const maxY = prev.nodes.length > 0
        ? Math.max(...prev.nodes.map((n) => n.position.y))
        : LAYOUT.START_Y;
      const hintMaxY = prev.hintNodes.length > 0
        ? Math.max(...prev.hintNodes.map((n) => n.position.y))
        : maxY + LAYOUT.HINT_AREA_OFFSET;
      
      const newHintNode: PositionedClueNode = {
        id: `hint_${hint.id}`,
        content: hint.content,
        category: '其他',
        status: 'hint',
        sourceQuestionIds: [],
        isKey: false,
        position: {
          x: LAYOUT.START_X + (prev.hintNodes.length % LAYOUT.COLS) * LAYOUT.GAP_X,
          y: hintMaxY + LAYOUT.GAP_Y,
        },
      };

      return {
        ...prev,
        hintNodes: [...prev.hintNodes, newHintNode],
      };
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    if (enabled && channelId) {
      fetchClueGraph();
    }
  }, [enabled, channelId, fetchClueGraph]);

  // Calculate canvas size based on all nodes
  const canvasSize = useMemo(() => {
    const allNodes = [...state.nodes, ...state.hintNodes];
    return calculateCanvasSize(allNodes);
  }, [state.nodes, state.hintNodes]);

  return {
    ...state,
    canvasSize,
    fetchClueGraph,
    updateNodePosition,
    addHintNode,
  };
}
