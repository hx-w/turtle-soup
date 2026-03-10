import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { api } from '../lib/api';
import { connectSocket } from '../lib/socket';
import type { ClueGraphData, ClueNode, ClueEdge, AiHint } from '../types';
import dagre from '@dagrejs/dagre';

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
  lastError: string | null;
  lastErrorAt: string | null;
}

// Layout constants
export const LAYOUT = {
  COLS: 3,
  GAP_X: 160,
  GAP_Y: 110,
  START_X: 40,
  START_Y: 30,
  HINT_AREA_OFFSET: 80,
  MIN_CANVAS_SIZE: 2000,
  CLUE_LIST_WIDTH: 340, // Width for the clue list panel
  CLUE_LIST_GAP: 80, // Gap between nodes and clue list
  NODE_WIDTH: 220,
  NODE_HEIGHT: 160,
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

// Dagre-based hierarchical layout algorithm
function layoutNodes(
  nodes: ClueNode[],
  edges: ClueEdge[],
  savedPositions?: Record<string, { x: number; y: number }>,
): PositionedClueNode[] {
  if (nodes.length === 0) return [];

  // If all nodes have saved positions, use them directly
  const allSaved = nodes.every(n => savedPositions?.[n.id]);
  if (allSaved && savedPositions) {
    return nodes.map(node => ({
      ...node,
      position: savedPositions[node.id],
    }));
  }

  // Split connected and orphan nodes
  const connectedNodeIds = new Set<string>();
  const validEdges = edges.filter(e =>
    nodes.some(n => n.id === e.sourceId) && nodes.some(n => n.id === e.targetId)
  );
  validEdges.forEach(e => {
    connectedNodeIds.add(e.sourceId);
    connectedNodeIds.add(e.targetId);
  });

  const connectedNodes = nodes.filter(n => connectedNodeIds.has(n.id));
  const orphanNodes = nodes.filter(n => !connectedNodeIds.has(n.id));

  const positions: Record<string, { x: number; y: number }> = {};

  // Layout connected nodes with dagre
  if (connectedNodes.length > 0 && validEdges.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: 'TB',     // Top to bottom (good for mobile)
      nodesep: 100,      // Horizontal spacing between nodes
      ranksep: 140,      // Vertical spacing between ranks
      marginx: LAYOUT.START_X,
      marginy: LAYOUT.START_Y,
    });
    g.setDefaultEdgeLabel(() => ({}));

    connectedNodes.forEach(node => {
      g.setNode(node.id, { width: LAYOUT.NODE_WIDTH, height: LAYOUT.NODE_HEIGHT });
    });
    validEdges.forEach(edge => {
      g.setEdge(edge.sourceId, edge.targetId);
    });

    dagre.layout(g);

    connectedNodes.forEach(node => {
      const dagreNode = g.node(node.id);
      positions[node.id] = savedPositions?.[node.id] || {
        x: dagreNode.x - LAYOUT.NODE_WIDTH / 2,
        y: dagreNode.y - LAYOUT.NODE_HEIGHT / 2,
      };
    });
  }

  // Layout orphan nodes in a compact grid below the dagre graph
  if (orphanNodes.length > 0) {
    const maxDagreY = Object.values(positions).length > 0
      ? Math.max(...Object.values(positions).map(p => p.y)) + LAYOUT.NODE_HEIGHT + 40
      : LAYOUT.START_Y;

    orphanNodes.forEach((node, i) => {
      positions[node.id] = savedPositions?.[node.id] || {
        x: LAYOUT.START_X + (i % LAYOUT.COLS) * (LAYOUT.NODE_WIDTH + 30),
        y: maxDagreY + Math.floor(i / LAYOUT.COLS) * (LAYOUT.NODE_HEIGHT + 30),
      };
    });
  }

  return nodes.map(node => ({
    ...node,
    position: positions[node.id] || { x: LAYOUT.START_X, y: LAYOUT.START_Y },
  }));
}

// Layout hint nodes separately
function layoutHints(
  hints: { id: string; content: string }[],
  yOffset: number,
  savedPositions?: Record<string, { x: number; y: number }>,
): PositionedClueNode[] {
  // Use simple grid for hints since they have no edges
  return hints.map((hint, i) => {
    const id = `hint_${hint.id}`;
    return {
      id,
      content: hint.content,
      category: '其他' as const,
      status: 'hint' as const,
      sourceQuestionIds: [],
      isKey: false,
      position: savedPositions?.[id] || {
        x: LAYOUT.START_X + (i % 4) * (180 + 20),
        y: yOffset + Math.floor(i / 4) * (120 + 20),
      },
    };
  });
}

// Calculate canvas size dynamically based on nodes
export function calculateCanvasSize(nodes: PositionedClueNode[]): { width: number; height: number } {
  if (nodes.length === 0) {
    return { width: 800, height: 600 };
  }

  const maxX = Math.max(...nodes.map((n) => n.position.x)) + 300; // Node width + padding
  const maxY = Math.max(...nodes.map((n) => n.position.y)) + 200; // Node height + padding

  // Add space for clue list on the right side
  const totalWidth = maxX + LAYOUT.CLUE_LIST_GAP + LAYOUT.CLUE_LIST_WIDTH;

  return {
    width: Math.max(800, totalWidth),
    height: Math.max(600, maxY),
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
    lastError: null,
    lastErrorAt: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply clue graph data (shared by fetch and socket push)
  const applyClueData = useCallback((data: ClueGraphData) => {
    if (!channelId) return;

    const savedPositions = loadSavedPositions(channelId);

    // Separate hint nodes from regular nodes
    const regularNodes = data.nodes.filter((n) => n.status !== 'hint');
    const hintNodesData = data.nodes.filter((n) => n.status === 'hint');

    // Layout regular nodes
    const positionedNodes = layoutNodes(regularNodes, data.edges, savedPositions);

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
      savedPositions
    );

    setState((prev) => ({
      ...prev,
      nodes: positionedNodes,
      edges: data.edges,
      hintNodes: positionedHints,
      loading: false,
      error: null,
    }));
  }, [channelId]);

  // Fetch clue graph (initial load only)
  const fetchClueGraph = useCallback(async () => {
    if (!channelId || !enabled) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const data = await api.get<ClueGraphData>(`/channels/${channelId}/clues`);
      applyClueData(data);
      setState((prev) => ({
        ...prev,
        lastError: data.lastError || null,
        lastErrorAt: data.lastErrorAt || null,
      }));
    } catch (err) {
      const apiError = err as Error;
      console.error('fetchClueGraph error:', apiError);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: apiError.message || '加载线索图失败',
      }));
    }
  }, [channelId, enabled, applyClueData]);

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

  useEffect(() => {
    if (enabled && channelId) {
      fetchClueGraph();
    }
  }, [enabled, channelId, fetchClueGraph]);

  useEffect(() => {
    if (!enabled || !channelId) return;

    const s = connectSocket();

    const handleClueGraphUpdate = (data: { channelId: string; nodes?: ClueNode[]; edges?: ClueEdge[] }) => {
      if (data.channelId !== channelId) return;

      // Debounce: if multiple updates arrive in quick succession, only process the last one
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (data.nodes && data.edges) {
          // Use pushed data directly — no need for another GET request
          applyClueData({ nodes: data.nodes, edges: data.edges });
        } else {
          // Fallback: fetch if socket didn't include full data
          fetchClueGraph();
        }
      }, 1500);
    };

    s.on('clue_graph:updated', handleClueGraphUpdate);

    return () => {
      s.off('clue_graph:updated', handleClueGraphUpdate);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, channelId, fetchClueGraph, applyClueData]);

  // Calculate canvas size based on all nodes
  const canvasSize = useMemo(() => {
    const allNodes = [...state.nodes, ...state.hintNodes];
    return calculateCanvasSize(allNodes);
  }, [state.nodes, state.hintNodes]);

  const { lastError, lastErrorAt } = state;

  return {
    ...state,
    lastError,
    lastErrorAt,
    canvasSize,
    fetchClueGraph,
    updateNodePosition,
    addHintNode,
  };
}

