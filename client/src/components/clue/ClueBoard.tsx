import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ZoomIn, ZoomOut, Lightbulb, CheckCircle2, CircleDashed, XCircle, RefreshCw, Eye, Lock, X, Network, Target, AlertTriangle } from 'lucide-react';

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
  lastError?: string | null;
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
  lastError,
}: ClueBoardProps) {
  const {
    nodes,
    edges,
    hintNodes,
    loading,
    error,
    fetchClueGraph,
  } = useClueGraph({ channelId, enabled: true });

  const canvasSize = useMemo(() => {
    const allNodes = [...nodes, ...hintNodes];
    return calculateCanvasSize(allNodes);
  }, [nodes, hintNodes]);

  const drawerContainerRef = useRef<HTMLDivElement>(null);

  const [selectedNode, setSelectedNode] = useState<PositionedClueNode | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [drawerScale, setDrawerScale] = useState(1);
  const [drawerPosition, setDrawerPosition] = useState({ x: 0, y: 0 });
  const [drawerIsDragging, setDrawerIsDragging] = useState(false);
  const [drawerDragStart, setDrawerDragStart] = useState({ x: 0, y: 0 });
  const [drawerInitialDistance, setDrawerInitialDistance] = useState<number | null>(null);
  const [drawerInitialScale, setDrawerInitialScale] = useState<number>(1);

  const exhausted = myRemaining <= 0;
  const disabled = hintLoading || exhausted || channelEnded;

  const myHints = hints.filter(h => h.userId === currentUserId);
  const otherPublicHints = hints.filter(h => h.isPublic && h.userId !== currentUserId);

  const calculateBounds = useCallback(() => {
    const allNodes = [...nodes, ...hintNodes];
    let minX = 20, maxX = 400, minY = 20, maxY = 300;

    if (allNodes.length > 0) {
      minX = Math.min(...allNodes.map(n => n.position.x)) - 20;
      maxX = Math.max(...allNodes.map(n => n.position.x)) + 180;
      minY = Math.min(...allNodes.map(n => n.position.y)) - 20;
      maxY = Math.max(...allNodes.map(n => n.position.y)) + 100;
    }

    return { minX, maxX, minY, maxY };
  }, [nodes, hintNodes]);

  const fitToScreen = useCallback(() => {
    if (!drawerContainerRef.current) return;

    const bounds = calculateBounds();
    const containerWidth = drawerContainerRef.current.clientWidth;
    const containerHeight = Math.max(drawerContainerRef.current.clientHeight - 60, 400);

    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    const newScale = Math.min(
      containerWidth / Math.max(contentWidth, 1),
      containerHeight / Math.max(contentHeight, 1),
      1.5,
    );

    const newPosX = (containerWidth - contentWidth * newScale) / 2 - bounds.minX * newScale;
    const newPosY = (containerHeight - contentHeight * newScale) / 2 - bounds.minY * newScale;

    setDrawerScale(newScale);
    setDrawerPosition({ x: newPosX, y: newPosY });
  }, [calculateBounds]);

  const handleDrawerZoomIn = () => setDrawerScale(s => Math.min(s * 1.2, 2));
  const handleDrawerZoomOut = () => setDrawerScale(s => Math.max(s / 1.2, 0.3));

  const handleDrawerMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('clue-canvas')) {
      setDrawerIsDragging(true);
      setDrawerDragStart({ x: e.clientX - drawerPosition.x, y: e.clientY - drawerPosition.y });
    }
  };

  const handleDrawerMouseMove = (e: React.MouseEvent) => {
    if (!drawerIsDragging) return;
    setDrawerPosition({
      x: e.clientX - drawerDragStart.x,
      y: e.clientY - drawerDragStart.y,
    });
  };

  const handleDrawerMouseUp = () => {
    setDrawerIsDragging(false);
  };

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setDrawerIsDragging(true);
      setDrawerDragStart({ x: e.touches[0].clientX - drawerPosition.x, y: e.touches[0].clientY - drawerPosition.y });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setDrawerInitialDistance(dist);
      setDrawerInitialScale(drawerScale);
      setDrawerIsDragging(false);
    }
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && drawerIsDragging) {
      setDrawerPosition({
        x: e.touches[0].clientX - drawerDragStart.x,
        y: e.touches[0].clientY - drawerDragStart.y,
      });
    } else if (e.touches.length === 2 && drawerInitialDistance !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const newScale = Math.max(0.3, Math.min(2, drawerInitialScale * (dist / drawerInitialDistance)));
      setDrawerScale(newScale);
    }
  };

  const handleDrawerTouchEnd = () => {
    setDrawerIsDragging(false);
    setDrawerInitialDistance(null);
  };

  const handleDrawerWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      if (!drawerContainerRef.current) return;

      const rect = drawerContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - drawerPosition.x) / drawerScale;
      const worldY = (mouseY - drawerPosition.y) / drawerScale;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(drawerScale * delta, 0.3), 2);

      const newPosX = mouseX - worldX * newScale;
      const newPosY = mouseY - worldY * newScale;

      setDrawerScale(newScale);
      setDrawerPosition({ x: newPosX, y: newPosY });
    }
  };

  useEffect(() => {
    if (isDrawerOpen && drawerContainerRef.current) {
      setDrawerScale(1);
      setDrawerPosition({ x: 0, y: 0 });
      
      const timer = setTimeout(() => {
        fitToScreen();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isDrawerOpen, fitToScreen, nodes.length, hintNodes.length, edges.length]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);
  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isDrawerOpen]);
  // Lock background scroll when node detail modal is open
  useEffect(() => {
    if (selectedNode) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [selectedNode]);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

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
      <div className="flex-1 flex flex-col overflow-auto pb-20">
        {lastError && (
          <div className="mx-4 mt-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-xs text-text-muted">图谱生成暂时遇到问题，可点击刷新重试</span>
          </div>
        )}
        <div className="flex-1 px-4 py-6 space-y-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-text/90 select-none">
              线索列表
            </h3>
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
            <div className="mb-6">
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

          {(nodes.length > 0 || hintNodes.length > 0) && (
            <div className="pt-4 border-t border-border/30">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl
                  bg-black/5 dark:bg-white/10 
                  hover:bg-black/10 dark:hover:bg-white/15
                  text-gray-700 dark:text-gray-200
                  font-medium text-[13px]
                  transition-colors duration-200
                  cursor-pointer"
              >
                <Network className="w-4 h-4" />
                <span>查看知识图谱</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-bg/95 backdrop-blur-md border-t border-border/30">
        <div className="w-full max-w-5xl mx-auto px-4 py-3 pointer-events-none">
          <div className="pointer-events-auto">
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
      </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
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
                  selectedNode.status === 'partial' ? 'bg-primary/20 text-primary' :
                  selectedNode.status === 'excluded' ? 'bg-surface text-text-muted' :
                  selectedNode.status === 'hint' ? 'bg-primary/20 text-primary' :
                  'bg-surface text-text-muted'
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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yes/15 text-yes font-medium">
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

      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setIsDrawerOpen(false)} />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full h-[95vh] sm:h-auto sm:min-h-[600px] sm:max-h-[90vh] bg-card border border-border
                         rounded-t-2xl sm:rounded-2xl shadow-2xl
                         flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-border/30">
                <h2 className="text-lg font-heading font-bold text-text">知识图谱</h2>
                <div className="flex items-center gap-2">
                  <button onClick={fitToScreen} className="p-2 rounded-xl hover:bg-surface text-text-muted hover:text-text transition-colors cursor-pointer" title="适应屏幕">
                    <Network className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 rounded-xl hover:bg-surface text-text-muted hover:text-text transition-colors cursor-pointer" title="关闭">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative overflow-hidden min-h-[300px]">
                <div
                  ref={drawerContainerRef}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing clue-canvas pointer-events-auto"
                  onMouseDown={handleDrawerMouseDown}
                  onMouseMove={handleDrawerMouseMove}
                  onMouseUp={handleDrawerMouseUp}
                  onMouseLeave={handleDrawerMouseUp}
                  onTouchStart={handleDrawerTouchStart}
                  onTouchMove={handleDrawerTouchMove}
                  onTouchEnd={handleDrawerTouchEnd}
                  onWheel={handleDrawerWheel}
                >
                  <motion.div
                    className="relative clue-canvas"
                    style={{
                      transform: `translate(${drawerPosition.x}px, ${drawerPosition.y}px) scale(${drawerScale})`,
                      transformOrigin: '0 0',
                      width: canvasSize.width,
                      height: canvasSize.height,
                      willChange: 'transform',
                    }}
                  >
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: canvasSize.width, height: canvasSize.height }}
                    >
                      <defs>
                        <pattern id="grid-drawer" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d1d5db" strokeWidth="0.5" className="dark:stroke-gray-600" opacity="0.4" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid-drawer)" />
                    </svg>

                    <svg
                      className="absolute inset-0 pointer-events-none"
                      style={{ width: canvasSize.width, height: canvasSize.height }}
                    >
                      <defs>
                        <marker id="arrowhead-drawer" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
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

                    {nodes.map((node) => (
                      <ClueNode key={node.id} node={node} onClick={() => setSelectedNode(node)} />
                    ))}

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

                <div className="absolute top-4 right-4 z-10 flex flex-col gap-3 items-end pointer-events-none">
                  <div className="flex items-center gap-1 bg-surface/80 backdrop-blur-xl border border-border/40 p-1 rounded-xl shadow-lg pointer-events-auto">
                    <button onClick={handleDrawerZoomOut} className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-text-muted w-12 text-center font-medium">
                      {Math.round(drawerScale * 100)}%
                    </span>
                    <button onClick={handleDrawerZoomIn} className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text transition-colors">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-surface/80 backdrop-blur-xl border border-border/40 p-3 rounded-xl shadow-lg pointer-events-auto text-xs flex flex-col gap-2.5 min-w-[100px]">
                    <div className="flex items-center gap-1.5 text-text-muted font-medium"><CheckCircle2 className="w-3.5 h-3.5 text-yes" /> 已确认</div>
                    <div className="flex items-center gap-1.5 text-text-muted font-medium"><CircleDashed className="w-3.5 h-3.5 text-primary" /> 部分确认</div>
                    <div className="flex items-center gap-1.5 text-text-muted font-medium"><XCircle className="w-3.5 h-3.5 text-text-muted" /> 已排除</div>
                    <div className="flex items-center gap-1.5 text-text-muted font-medium"><Target className="w-3.5 h-3.5 text-yes" /> 关键线索</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

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
      className="group relative cursor-pointer transition-all duration-150 md:hover:translate-x-0.5 active:translate-x-0.5"
    >
      <div className="flex items-start gap-3 py-2.5 px-3 border-l-2 border-transparent md:hover:border-primary/40 transition-colors bg-surface/50 rounded-r-lg active:border-primary/40">
        <span className="text-sm font-bold text-text/30 select-none mt-1 w-5 flex-shrink-0">
          {String(index).padStart(2, '0')}
        </span>

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
                    ? 'bg-primary/15 text-primary border border-primary/30 md:hover:bg-primary/20 active:bg-primary/25' 
                    : 'bg-surface text-text-muted border border-border md:hover:bg-surface/80 md:hover:text-text active:bg-surface'
                  }
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
