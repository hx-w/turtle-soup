import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ZoomIn, ZoomOut, Maximize2, Lightbulb, CheckCircle, XCircle, PieChart, RefreshCw, Eye, Lock, X } from 'lucide-react';

import { useClueGraph, calculateCanvasSize, type PositionedClueNode, LAYOUT } from '../../hooks/useClueGraph';
import ClueNode from './ClueNode';
import ClueEdge from './ClueEdge';
import type { AiHint } from '../../types';

interface ClueBoardProps {
  channelId: string;
  hints: AiHint[];
  myRemaining: number;
  hintLoading: boolean;
  currentUserId: string;
  channelEnded: boolean;
  onRequestHint: () => void;
  onTogglePublic: (hintId: string, isPublic: boolean) => void;
}

export default function ClueBoard({
  channelId,
  hints,
  myRemaining,
  hintLoading,
  currentUserId,
  channelEnded,
  onRequestHint,
  onTogglePublic,
}: ClueBoardProps) {
  const {
    nodes,
    edges,
    hintNodes,
    loading,
    error,
    fetchClueGraph,
  } = useClueGraph({ channelId, enabled: true });

  // Calculate canvas size dynamically
  const canvasSize = useMemo(() => {
    const allNodes = [...nodes, ...hintNodes];
    return calculateCanvasSize(allNodes);
  }, [nodes, hintNodes]);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<PositionedClueNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const exhausted = myRemaining <= 0;
  const disabled = hintLoading || exhausted || channelEnded;

  // Filter hints
  const myHints = hints.filter(h => h.userId === currentUserId);
  const otherPublicHints = hints.filter(h => h.isPublic && h.userId !== currentUserId);

  // Calculate clue list position (right side of all nodes)
  const clueListPosition = useMemo(() => {
    const allNodes = [...nodes, ...hintNodes];
    
    if (allNodes.length === 0) {
      return { x: 40, y: 20 };
    }
    
    const maxX = Math.max(...allNodes.map(n => n.position.x)) + 200; // Node max width
    return {
      x: maxX + LAYOUT.CLUE_LIST_GAP,
      y: 20,
    };
  }, [nodes, hintNodes]);

  // Calculate bounds (including clue list)
  const calculateBounds = useCallback(() => {
    const allNodes = [...nodes, ...hintNodes];
    
    // Calculate node bounds
    let minX = 20, maxX = 400, minY = 20, maxY = 300;
    
    if (allNodes.length > 0) {
      minX = Math.min(...allNodes.map(n => n.position.x)) - 20;
      maxX = Math.max(...allNodes.map(n => n.position.x)) + 180;
      minY = Math.min(...allNodes.map(n => n.position.y)) - 20;
      maxY = Math.max(...allNodes.map(n => n.position.y)) + 100;
    }
    
    // Include clue list bounds if there are hints
    const totalHints = myHints.length + otherPublicHints.length + hintNodes.length;
    if (totalHints > 0) {
      // Estimate clue list height based on content
      const headerHeight = 60; // "线索列表" header
      const sectionHeaderHeight = 30; // each section header
      const cardHeight = 60; // approximate card height
      
      let clueListHeight = headerHeight;
      if (myHints.length > 0) clueListHeight += sectionHeaderHeight + myHints.length * cardHeight;
      if (otherPublicHints.length > 0) clueListHeight += sectionHeaderHeight + otherPublicHints.length * cardHeight;
      if (hintNodes.length > 0) clueListHeight += sectionHeaderHeight + hintNodes.length * cardHeight;
      
      // Extend maxX to include clue list width
      maxX = clueListPosition.x + LAYOUT.CLUE_LIST_WIDTH + 40;
      
      // Extend maxY if clue list is taller than nodes
      maxY = Math.max(maxY, clueListPosition.y + clueListHeight + 40);
    }
    
    return { minX, maxX, minY, maxY };
  }, [nodes, hintNodes, myHints, otherPublicHints, clueListPosition]);

  // Fit to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    
    const bounds = calculateBounds();
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight - 200; // Account for header and footer
    
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    
    const newScale = Math.min(
      containerWidth / contentWidth,
      containerHeight / contentHeight,
      1, // Don't zoom in beyond 100%
    );
    
    const newPosX = (containerWidth - contentWidth * newScale) / 2 - bounds.minX * newScale;
    const newPosY = (containerHeight - contentHeight * newScale) / 2 - bounds.minY * newScale + 60;
    
    setScale(newScale);
    setPosition({ x: newPosX, y: newPosY });
  }, [calculateBounds]);

  // Zoom handlers
  const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 2));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.2, 0.3));

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('clue-canvas')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile with pinch zoom support
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState<number>(1);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      // Two fingers: init pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setInitialDistance(dist);
      setInitialScale(scale);
      setIsDragging(false); // Stop panning when zooming
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent default scrolling when interacting with the canvas
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && initialDistance !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate new scale with boundaries
      const newScale = Math.max(0.3, Math.min(2, initialScale * (dist / initialDistance)));
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialDistance(null);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.min(Math.max(s * delta, 0.3), 2));
    }
  };

  // Fit to screen on first load (only in non-fullscreen mode)
  useEffect(() => {
    const hasAnyContent = nodes.length > 0 || hintNodes.length > 0 || myHints.length > 0 || otherPublicHints.length > 0;
    if (hasAnyContent && scale === 1 && position.x === 0 && position.y === 0 && !isFullscreen) {
      fitToScreen();
    }
  }, [nodes.length, hintNodes.length, myHints.length, otherPublicHints.length, fitToScreen, scale, position, isFullscreen]);

  // Handle fullscreen change - fit to screen when entering fullscreen
  useEffect(() => {
    if (isFullscreen && containerRef.current) {
      // Delay to allow the fullscreen container to render
      const timer = setTimeout(() => {
        fitToScreen();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, fitToScreen]);

  // Close fullscreen on Escape key
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Empty state - only show when there's truly no content at all
  const hasAnyClueContent = nodes.length > 0 || hintNodes.length > 0 || myHints.length > 0 || otherPublicHints.length > 0;
  if (!loading && !hasAnyClueContent) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-text-muted">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
            <Search className="w-8 h-8 opacity-50" />
          </div>
          <h3 className="text-lg font-medium text-text mb-2">开始提问吧！</h3>
          <p className="text-sm text-center max-w-[240px]">
            主持人的回答会自动整理成线索，帮助你梳理推理思路
          </p>
        </div>
        
        {/* Hint button */}
        <div className="flex-shrink-0 border-t border-border/30 bg-bg/95 backdrop-blur-md">
        <div className="w-full max-w-5xl mx-auto px-4 py-2">
            <button
              type="button"
              onClick={onRequestHint}
              disabled={disabled}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                font-medium text-sm transition-all duration-200
                ${disabled
                  ? 'bg-surface text-text-muted cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-light text-white cursor-pointer active:scale-[0.98]'
                }`}
            >
              {hintLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>请求中...</span>
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  <span>{channelEnded ? '游戏已结束' : exhausted ? '线索已用完' : `请求线索 (${myRemaining})`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-text-muted">
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={fetchClueGraph}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 w-full h-full relative min-h-0 bg-bg overflow-hidden flex flex-col">
      {/* Canvas Layer */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing clue-canvas pointer-events-auto"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <motion.div
           className="relative clue-canvas"
           style={{
             transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
             transformOrigin: '0 0',
             width: 'fit-content',
             height: 'fit-content',
             willChange: 'transform',
           }}
        >
          {/* Grid Background */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="rgb(var(--color-border))"
                  strokeWidth="0.5"
                  opacity="0.15"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Edges (SVG layer) */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="rgb(var(--color-primary))" />
              </marker>
            </defs>
            {edges.map((edge, i) => {
              const sourceNode = [...nodes, ...hintNodes].find(n => n.id === edge.sourceId);
              const targetNode = [...nodes, ...hintNodes].find(n => n.id === edge.targetId);
              if (!sourceNode || !targetNode) return null;
              return (
                <ClueEdge key={i} edge={edge} sourcePos={sourceNode.position} targetPos={targetNode.position} />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <ClueNode key={node.id} node={node} onClick={() => setSelectedNode(node)} />
          ))}

          {/* Hint nodes */}
          {hintNodes.length > 0 && (
            <div className="mt-8 pt-4 border-t border-border/20">
              <div className="text-xs text-text-muted px-2 mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                AI 线索
              </div>
              {hintNodes.map((node) => (
                <ClueNode key={node.id} node={node} onClick={() => setSelectedNode(node)} />
              ))}
            </div>
          )}

          {/* Clue List Panel - flat design on canvas */}
          <div
            className="absolute pointer-events-auto"
            style={{
              left: clueListPosition.x,
              top: clueListPosition.y,
              width: LAYOUT.CLUE_LIST_WIDTH,
            }}
          >
            {/* Panel Header */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-text/90 select-none">
                线索列表
              </h3>
              <div className="h-px bg-border/30 mt-2" />
            </div>

            {/* My Hints Section */}
            {myHints.length > 0 && (
              <div className="mb-6">
                <div className="text-sm font-semibold text-text/70 mb-3 select-none flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  我的线索 ({myHints.length})
                </div>
                <div className="space-y-2">
                  {myHints.map((hint, i) => (
                    <ClueCard
                      key={hint.id}
                      hint={hint}
                      index={i + 1}
                      isMine={true}
                      onTogglePublic={onTogglePublic}
                      onClick={() => {
                        const hintNode: PositionedClueNode = {
                          id: `hint_${hint.id}`,
                          content: hint.content,
                          category: '其他',
                          status: 'hint',
                          sourceQuestionIds: [],
                          isKey: false,
                          position: { x: 0, y: 0 },
                        };
                        setSelectedNode(hintNode);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Public Hints Section */}
            {otherPublicHints.length > 0 && (
              <div className="mb-6">
                <div className="text-sm font-semibold text-text/70 mb-3 select-none flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  公开线索 ({otherPublicHints.length})
                </div>
                <div className="space-y-2">
                  {otherPublicHints.map((hint, i) => (
                    <ClueCard
                      key={hint.id}
                      hint={hint}
                      index={i + 1}
                      isMine={false}
                      onClick={() => {
                        const hintNode: PositionedClueNode = {
                          id: `hint_${hint.id}`,
                          content: hint.content,
                          category: '其他',
                          status: 'hint',
                          sourceQuestionIds: [],
                          isKey: false,
                          position: { x: 0, y: 0 },
                        };
                        setSelectedNode(hintNode);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* AI Hint Nodes Section */}
            {hintNodes.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-text/70 mb-3 select-none flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  AI 分析线索 ({hintNodes.length})
                </div>
                <div className="space-y-2">
                  {hintNodes.map((node, i) => (
                    <ClueCard
                      key={node.id}
                      hint={{
                        id: node.id.replace('hint_', ''),
                        channelId: '',
                        content: node.content,
                        isPublic: true,
                        userId: '',
                        createdAt: new Date().toISOString(),
                        user: { id: 'ai', nickname: 'AI', avatarSeed: 'ai' },
                      }}
                      index={i + 1}
                      isMine={false}
                      isAIGenerated={true}
                      onClick={() => setSelectedNode(node)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {myHints.length === 0 && otherPublicHints.length === 0 && hintNodes.length === 0 && (
              <div className="text-center py-8 text-text/40 text-xs select-none">
                暂无线索
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top Right Controls Layer */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-3 items-end pointer-events-none">
        <div className="flex items-center gap-1 bg-surface/80 backdrop-blur-xl border border-border/40 p-1 rounded-xl shadow-lg pointer-events-auto">
          <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-text-muted w-12 text-center font-medium">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <button onClick={() => setIsFullscreen(true)} className="p-2.5 bg-surface/80 backdrop-blur-xl border border-border/40 hover:bg-surface rounded-xl shadow-lg pointer-events-auto text-text-muted hover:text-text transition-colors" title="全屏">
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Legend */}
        <div className="bg-surface/80 backdrop-blur-xl border border-border/40 p-3 rounded-xl shadow-lg pointer-events-auto text-xs flex flex-col gap-2.5 min-w-[100px]">
          <div className="flex items-center gap-1.5 text-text-muted font-medium"><CheckCircle className="w-3.5 h-3.5 text-yes" /> 已确认</div>
          <div className="flex items-center gap-1.5 text-text-muted font-medium"><PieChart className="w-3.5 h-3.5 text-orange-500" /> 部分</div>
          <div className="flex items-center gap-1.5 text-text-muted font-medium"><XCircle className="w-3.5 h-3.5 text-no" /> 已排除</div>
          <div className="flex items-center gap-1.5 text-text-muted font-medium"><Lightbulb className="w-3.5 h-3.5 text-primary" /> AI线索</div>
        </div>
      </div>

      {/* Left Overlay Layer removed - clue list now embedded in canvas */}
      {/* Bottom Request Button (Restored to bottom center like input) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl z-30 pointer-events-none px-4 pb-safe flex justify-center">
        <div className="pointer-events-auto w-full">
          <button
            type="button"
            onClick={onRequestHint}
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl
              font-bold text-[15px] shadow-2xl backdrop-blur-2xl transition-all duration-300 border
              ${disabled
                ? 'bg-surface/90 text-text-muted cursor-not-allowed border-border/40'
                : 'bg-primary text-white hover:bg-primary/90 cursor-pointer shadow-primary/20 hover:-translate-y-0.5 border-primary/20'
              }`}
          >
            {hintLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>请求中...</span>
              </>
            ) : (
              <>
                <Lightbulb className="w-5 h-5" />
                <span>{channelEnded ? '游戏已结束' : exhausted ? '线索已用完' : `请求线索 (${myRemaining})`}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selected node detail modal */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedNode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-md w-full shadow-xl border border-border/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedNode.status === 'confirmed' ? 'bg-yes/20 text-yes' :
                  selectedNode.status === 'partial' ? 'bg-orange-500/20 text-orange-500' :
                  selectedNode.status === 'excluded' ? 'bg-no/20 text-no' :
                  selectedNode.status === 'hint' ? 'bg-primary/20 text-primary' :
                  'bg-accent/20 text-accent'
                }`}>
                  {selectedNode.isKey && '🎯'}
                  {!selectedNode.isKey && (
                    selectedNode.status === 'confirmed' ? '✓' :
                    selectedNode.status === 'partial' ? '◐' :
                    selectedNode.status === 'excluded' ? '✗' :
                    '💡'
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-surface text-text-muted font-medium">
                      {selectedNode.category}
                    </span>
                    {selectedNode.isKey && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                        关键
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] text-text leading-relaxed">{selectedNode.content}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="mt-5 w-full py-2.5 bg-surface hover:bg-surface/80 rounded-xl text-sm font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                关闭
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      {/* Fullscreen Modal */}

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={() => setIsFullscreen(false)} />

            {/* Modal Panel */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full h-full sm:h-auto sm:max-h-[90vh] bg-card border border-border
                         rounded-t-2xl sm:rounded-2xl shadow-2xl
                         flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border/30">
                <h2 className="text-lg font-heading font-bold text-text">线索面板</h2>
                <div className="flex items-center gap-2">
                  <button onClick={fitToScreen} className="p-2 rounded-xl hover:bg-surface text-text-muted hover:text-text transition-colors cursor-pointer" title="适应屏幕">
                    <Maximize2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsFullscreen(false)} className="p-2 rounded-xl hover:bg-surface text-text-muted hover:text-text transition-colors cursor-pointer" title="关闭">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Canvas Content */}
              <div className="flex-1 relative overflow-hidden">
                <div
                  ref={containerRef}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing clue-canvas pointer-events-auto"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                >
                  <motion.div
                    className="relative clue-canvas"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transformOrigin: '0 0',
                      width: 'fit-content',
                      height: 'fit-content',
                      willChange: 'transform',
                    }}
                  >
                    {/* Grid Background */}
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: canvasSize.width, height: canvasSize.height }}
                    >
                      <defs>
                        <pattern id="grid-fullscreen" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgb(var(--color-border))" strokeWidth="0.5" opacity="0.15" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid-fullscreen)" />
                    </svg>

                    {/* Edges */}
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: canvasSize.width, height: canvasSize.height }}
                    >
                      <defs>
                        <marker id="arrowhead-fullscreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="rgb(var(--color-primary))" />
                        </marker>
                      </defs>
                      {edges.map((edge, i) => {
                        const sourceNode = [...nodes, ...hintNodes].find(n => n.id === edge.sourceId);
                        const targetNode = [...nodes, ...hintNodes].find(n => n.id === edge.targetId);
                        if (!sourceNode || !targetNode) return null;
                        return <ClueEdge key={i} edge={edge} sourcePos={sourceNode.position} targetPos={targetNode.position} />;
                      })}
                    </svg>

                    {/* Nodes */}
                    {nodes.map((node) => (
                      <ClueNode key={node.id} node={node} onClick={() => setSelectedNode(node)} />
                    ))}

                    {/* Hint nodes */}
                    {hintNodes.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-border/20">
                        <div className="text-xs text-text-muted px-2 mb-2 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" />
                          AI 线索
                        </div>
                        {hintNodes.map((node) => (
                          <ClueNode key={node.id} node={node} onClick={() => setSelectedNode(node)} />
                        ))}
                      </div>
                    )}

                    {/* Clue List Panel */}
                    <div
                      className="absolute pointer-events-auto"
                      style={{
                        left: clueListPosition.x,
                        top: clueListPosition.y,
                        width: LAYOUT.CLUE_LIST_WIDTH,
                      }}
                    >
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-text/90 select-none">线索列表</h3>
                        <div className="h-px bg-border/30 mt-2" />
                      </div>

                      {myHints.length > 0 && (
                        <div className="mb-6">
                          <div className="text-sm font-semibold text-text/70 mb-3 select-none flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            我的线索 ({myHints.length})
                          </div>
                          <div className="space-y-2">
                            {myHints.map((hint, i) => (
                              <ClueCard
                                key={hint.id}
                                hint={hint}
                                index={i + 1}
                                isMine={true}
                                onTogglePublic={onTogglePublic}
                                onClick={() => {
                                  const hintNode: PositionedClueNode = {
                                    id: `hint_${hint.id}`,
                                    content: hint.content,
                                    category: '其他',
                                    status: 'hint',
                                    sourceQuestionIds: [],
                                    isKey: false,
                                    position: { x: 0, y: 0 },
                                  };
                                  setSelectedNode(hintNode);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {otherPublicHints.length > 0 && (
                        <div className="mb-6">
                          <div className="text-sm font-semibold text-text/70 mb-3 select-none flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            公开线索 ({otherPublicHints.length})
                          </div>
                          <div className="space-y-2">
                            {otherPublicHints.map((hint, i) => (
                              <ClueCard
                                key={hint.id}
                                hint={hint}
                                index={i + 1}
                                isMine={false}
                                onClick={() => {
                                  const hintNode: PositionedClueNode = {
                                    id: `hint_${hint.id}`,
                                    content: hint.content,
                                    category: '其他',
                                    status: 'hint',
                                    sourceQuestionIds: [],
                                    isKey: false,
                                    position: { x: 0, y: 0 },
                                  };
                                  setSelectedNode(hintNode);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {hintNodes.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-text/70 mb-3 select-none flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            AI 分析线索 ({hintNodes.length})
                          </div>
                          <div className="space-y-2">
                            {hintNodes.map((node, i) => (
                              <ClueCard
                                key={node.id}
                                hint={{
                                  id: node.id.replace('hint_', ''),
                                  channelId: '',
                                  content: node.content,
                                  isPublic: true,
                                  userId: '',
                                  createdAt: new Date().toISOString(),
                                  user: { id: 'ai', nickname: 'AI', avatarSeed: 'ai' },
                                }}
                                index={i + 1}
                                isMine={false}
                                isAIGenerated={true}
                                onClick={() => setSelectedNode(node)}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {myHints.length === 0 && otherPublicHints.length === 0 && hintNodes.length === 0 && (
                        <div className="text-center py-8 text-text/40 text-xs select-none">
                          暂无线索
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Top Right Controls */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-3 items-end pointer-events-none">
                  <div className="flex items-center gap-1 bg-surface/80 backdrop-blur-xl border border-border/40 p-1 rounded-xl shadow-lg pointer-events-auto">
                    <button onClick={handleZoomOut} className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-text-muted w-12 text-center font-medium">
                      {Math.round(scale * 100)}%
                    </span>
                    <button onClick={handleZoomIn} className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-surface/80 backdrop-blur-xl border border-border/40 p-3 rounded-xl shadow-lg pointer-events-auto text-xs flex flex-col gap-2.5 min-w-[100px]">
                    <div className="flex items-center gap-1.5 text-text-muted font-medium"><CheckCircle className="w-3.5 h-3.5 text-yes" /> 已确认</div>
                    <div className="flex items-center gap-1.5 text-text-muted font-medium"><PieChart className="w-3.5 h-3.5 text-orange-500" /> 部分</div>
                    <div className="flex items-center gap-1.5 text-text-muted font-medium"><XCircle className="w-3.5 h-3.5 text-no" /> 已排除</div>
                    <div className="flex items-center gap-1.5 text-text-muted font-medium"><Lightbulb className="w-3.5 h-3.5 text-primary" /> AI线索</div>
                  </div>
                </div>
              </div>

              {/* Bottom Request Button */}
              <div className="flex-shrink-0 border-t border-border/30 bg-bg/95 backdrop-blur-md px-4 py-3">
                <button
                  type="button"
                  onClick={onRequestHint}
                  disabled={disabled}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    font-medium text-sm transition-all duration-200
                    ${disabled
                      ? 'bg-surface text-text-muted cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-light text-white cursor-pointer active:scale-[0.98]'
                    }`}
                >
                  {hintLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>请求中...</span>
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4" />
                      <span>{channelEnded ? '游戏已结束' : exhausted ? '线索已用完' : `请求线索 (${myRemaining})`}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Clue Card component for embedded clue list
interface ClueCardProps {
  hint: AiHint;
  index: number;
  isMine: boolean;
  isAIGenerated?: boolean;
  onTogglePublic?: (hintId: string, isPublic: boolean) => void;
  onClick?: () => void;
}

function ClueCard({ hint, index, isMine, isAIGenerated = false, onTogglePublic, onClick }: ClueCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer transition-all duration-150 hover:translate-x-0.5"
    >
      {/* Flat card design */}
      <div className="flex items-start gap-3 py-2.5 px-3 border-l-2 border-transparent hover:border-primary/40 transition-colors">
        {/* Index */}
        <span className="text-sm font-bold text-text/30 select-none mt-1 w-5 flex-shrink-0">
          {String(index).padStart(2, '0')}
        </span>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {isAIGenerated && (
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary font-semibold select-none rounded">
                AI
              </span>
            )}
            {!isAIGenerated && (
              <span className="text-xs text-text/50 select-none font-medium">
                @{hint.user.nickname}
              </span>
            )}
          </div>
          <p className="text-sm text-text/90 leading-relaxed line-clamp-2 select-none font-medium">
            {hint.content}
          </p>
          {isMine && !isAIGenerated && onTogglePublic && (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePublic(hint.id, !hint.isPublic);
                }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                  transition-all duration-200 active:scale-95
                  touch-manipulation min-h-[32px]
                  ${hint.isPublic 
                    ? 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20' 
                    : 'bg-surface text-text-muted border border-border hover:bg-surface/80 hover:text-text'
                  }
                `}
              >
                {hint.isPublic ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>已公开</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>私密</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


