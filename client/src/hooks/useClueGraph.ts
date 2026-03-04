import { useState, useCallback, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import type { ClueGraphData, ClueNode, ClueEdge, AiHint } from '../types';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

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

// Force-directed layout algorithm using d3-force
function layoutNodes(
  nodes: ClueNode[],
  edges: ClueEdge[],
  savedPositions?: Record<string, { x: number; y: number }>,
): PositionedClueNode[] {
  if (nodes.length === 0) return [];

  const NODE_RADIUS = 180; // Collision radius, larger for spreading
  const IDEAL_EDGE_LENGTH = 380; // Longer edges to untangle knots
  const REPULSION = -6000; // Very strong repulsion to act like tiling
  const SIMULATION_TICKS = 400; // More ticks to ensure graph unfolds without crossing

  // Create D3 nodes. Note we must pass objects D3 can mutate.
  // We use fx/fy to pin nodes that have saved positions.
  const d3Nodes = nodes.map((node, i) => {
    const saved = savedPositions?.[node.id];
    return {
      ...node,
      // D3 uses x, y for current pos, and fx, fy for fixed pos (pinned)
      x: saved ? saved.x : undefined,
      y: saved ? saved.y : undefined,
      fx: saved ? saved.x : undefined,
      fy: saved ? saved.y : undefined,
      index: i,
    } as any;
  });

  const d3Links = edges.map(edge => ({
    source: edge.sourceId,
    target: edge.targetId,
  }));

  // Run simulation only if there are unpinned nodes
  const unpinned = d3Nodes.filter((n: any) => n.fx === undefined);
  if (unpinned.length === 0) {
    return d3Nodes.map((n: any) => {
      const { index, vx, vy, x, y, fx, fy, ...node } = n;
      return { ...node, position: { x: fx!, y: fy! } } as PositionedClueNode;
    });
  }

  // Calculate center of pinned nodes to pull unpinned nodes towards them
  let cx = LAYOUT.START_X + 400, cy = LAYOUT.START_Y + 300;
  const pinned = d3Nodes.filter((n: any) => n.fx !== undefined);
  if (pinned.length > 0) {
    cx = pinned.reduce((sum: number, n: any) => sum + n.fx, 0) / pinned.length;
    cy = pinned.reduce((sum: number, n: any) => sum + n.fy, 0) / pinned.length;
  }

  // Create simulation
  const simulation = forceSimulation(d3Nodes)
    .force("link", forceLink(d3Links).id((d: any) => d.id).distance(IDEAL_EDGE_LENGTH).iterations(2))
    .force("charge", forceManyBody().strength(REPULSION).distanceMax(1500))
    .force("collide", forceCollide().radius(NODE_RADIUS).iterations(4))
    .force("center", forceCenter(cx, cy).strength(0.01)); // Lower center gravity for broader spread

  // Run simulation statically to completion
  simulation.stop();
  simulation.tick(SIMULATION_TICKS);

  // Normalize coordinates so the minimum is at least START_X, START_Y
  const hasSavedPositions = Object.keys(savedPositions || {}).length > 0;
  const minX = Math.min(...d3Nodes.map((n: any) => n.x || 0));
  const minY = Math.min(...d3Nodes.map((n: any) => n.y || 0));

  return d3Nodes.map((n: any) => {
    const { index, vx, vy, x, y, fx, fy, ...node } = n;
    return {
      ...(node as ClueNode),
      position: {
        x: fx !== undefined ? fx : (hasSavedPositions ? x : x - minX + LAYOUT.START_X),
        y: fy !== undefined ? fy : (hasSavedPositions ? y : y - minY + LAYOUT.START_Y),
      }
    };
  });
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

  return {
    width: Math.max(800, maxX),
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
