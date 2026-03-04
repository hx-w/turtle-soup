import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ZoomIn, ZoomOut, Maximize2, Lightbulb, ChevronDown, ChevronUp, CheckCircle, XCircle, PieChart, RefreshCw, Eye, EyeOff, Lock } from 'lucide-react';

import { useClueGraph, calculateCanvasSize, type PositionedClueNode } from '../../hooks/useClueGraph';
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
  const [showPublicHints, setShowPublicHints] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const exhausted = myRemaining <= 0;
  const disabled = hintLoading || exhausted || channelEnded;

  // Calculate bounds
  const calculateBounds = useCallback(() => {
    if (nodes.length === 0 && hintNodes.length === 0) {
      return { minX: 0, maxX: 400, minY: 0, maxY: 300 };
    }
    
    const allNodes = [...nodes, ...hintNodes];
    const minX = Math.min(...allNodes.map(n => n.position.x)) - 20;
    const maxX = Math.max(...allNodes.map(n => n.position.x)) + 180;
    const minY = Math.min(...allNodes.map(n => n.position.y)) - 20;
    const maxY = Math.max(...allNodes.map(n => n.position.y)) + 80;
    
    return { minX, maxX, minY, maxY };
  }, [nodes, hintNodes]);

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

  // Fit to screen on first load
  useEffect(() => {
    if ((nodes.length > 0 || hintNodes.length > 0) && scale === 1 && position.x === 0 && position.y === 0) {
      fitToScreen();
    }
  }, [nodes.length, hintNodes.length, fitToScreen, scale, position]);

  // Filter hints
  const myHints = hints.filter(h => h.userId === currentUserId);
  const otherPublicHints = hints.filter(h => h.isPublic && h.userId !== currentUserId);
  // Empty state
  if (!loading && nodes.length === 0 && hintNodes.length === 0) {
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
           }}
        >
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

        <button onClick={fitToScreen} className="p-2.5 bg-surface/80 backdrop-blur-xl border border-border/40 hover:bg-surface rounded-xl shadow-lg pointer-events-auto text-text-muted hover:text-text transition-colors" title="适应屏幕">
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

      {/* Left Overlay Layer - Clue List & Request Button */}
      {(!loading) && (
        <div className="absolute top-4 left-4 bottom-4 w-72 max-w-[calc(100vw-5rem)] z-10 flex flex-col gap-3 pointer-events-none">
          
          {/* Scrollable hints list area */}
          <div className="flex-1 overflow-y-auto min-h-0 pointer-events-auto flex flex-col gap-3 items-start content-start scrollbar-hide py-1">
            {/* My hints */}
            {myHints.length > 0 && (
              <div className="w-full bg-surface/80 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 flex flex-col max-h-full">
                  <MyHintsSection hints={myHints} onTogglePublic={onTogglePublic} />
              </div>
            )}

            {/* Other users' public hints */}
            {otherPublicHints.length > 0 && (
              <div className="w-full bg-surface/80 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 flex flex-col max-h-full">
                <button
                  onClick={() => setShowPublicHints(!showPublicHints)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-text bg-surface/50 border-b border-border/20 hover:bg-surface/80 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" /> 公开线索 ({otherPublicHints.length})
                  </span>
                  {showPublicHints ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                </button>

                <AnimatePresence>
                  {showPublicHints && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col">
                      <div className="px-3 py-3 space-y-2 max-h-[40vh] overflow-y-auto scrollbar-hide flex-1">
                        {otherPublicHints.map((hint, i) => (
                          <div key={hint.id} className="bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-xl border border-primary/30 rounded-xl px-3 py-2.5">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-semibold text-primary">#{i + 1}</span>
                                  <span className="text-xs text-text-muted">@{hint.user.nickname}</span>
                                </div>
                                <p className="text-[13px] text-text leading-relaxed">{hint.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Request Hint Button */}
          <div className="pointer-events-auto flex-shrink-0 mt-auto">
            <button
              type="button"
              onClick={onRequestHint}
              disabled={disabled}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl
                font-medium text-[15px] shadow-xl backdrop-blur-xl transition-all duration-300
                ${disabled
                  ? 'bg-surface/80 text-text-muted cursor-not-allowed border border-border/40'
                  : 'bg-primary text-white hover:bg-primary-light cursor-pointer shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 border border-primary/20'
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
      )}

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
  );
}

// My hints section component with toggle public functionality
interface MyHintsSectionProps {
  hints: AiHint[];
  onTogglePublic: (hintId: string, isPublic: boolean) => void;
}

function MyHintsSection({ hints, onTogglePublic }: MyHintsSectionProps) {
  const [showMyHints, setShowMyHints] = useState(true);
  const publicCount = hints.filter(h => h.isPublic).length;

  return (
    <div className="flex flex-col min-h-0">
      <button
        onClick={() => setShowMyHints(!showMyHints)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-text bg-surface/50 border-b border-border/20 hover:bg-surface/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-text-muted" />
          我的线索 ({hints.length})
          {publicCount > 0 && (
            <span className="text-xs font-medium text-primary ml-1 bg-primary/10 px-1.5 py-0.5 rounded-md">
              {publicCount}个已公开
            </span>
          )}
        </span>
        {showMyHints ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>

      <AnimatePresence>
        {showMyHints && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex flex-col"
          >
            <div className="px-3 py-3 space-y-2 overflow-y-auto scrollbar-hide flex-1 max-h-[40vh]">
              {hints.map((hint, i) => (
                <div
                  key={hint.id}
                  className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-xl px-3 py-2.5 transition-colors hover:border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb size={12} className="text-text-muted" />
                        <span className="text-xs font-semibold text-text-muted">#{i + 1}</span>
                        {hint.isPublic ? (
                          <span className="text-xs font-medium text-primary flex items-center gap-0.5 bg-primary/5 px-1 py-0.5 rounded">
                            <Eye size={10} /> 已公开
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-text-muted flex items-center gap-0.5 bg-surface px-1 py-0.5 rounded">
                            <EyeOff size={10} /> 私密
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-text leading-relaxed mt-1.5">{hint.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTogglePublic(hint.id, !hint.isPublic)}
                      className={`flex-shrink-0 p-1.5 rounded-lg transition-colors cursor-pointer border ${
                        hint.isPublic 
                          ? 'border-primary/20 text-primary hover:bg-primary/10 bg-primary/5' 
                          : 'border-border/40 text-text-muted hover:text-text hover:bg-surface/80 bg-surface/30'
                      }`}
                      title={hint.isPublic ? '取消公开' : '公开给所有人'}
                    >
                      {hint.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
