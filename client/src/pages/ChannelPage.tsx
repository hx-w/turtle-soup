import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, AlertTriangle, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import HintsPanel, { type HintsPanelHandle } from '../components/ai/HintsPanel';
import { toast } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { useChannelData } from '../hooks/useChannelData';
import { useChannelSocket } from '../hooks/useChannelSocket';
import { useDiscussion } from '../hooks/useDiscussion';
import ChannelHeader from '../components/channel/ChannelHeader';
import SurfacePanel from '../components/channel/SurfacePanel';
import ActionButtons from '../components/channel/ActionButtons';
import ChannelTabs from '../components/channel/ChannelTabs';
import type { TabKey } from '../components/channel/ChannelTabs';
import PlayerInputPanel from '../components/channel/PlayerInputPanel';
import DiscussionPanel from '../components/channel/DiscussionPanel';
import type { DiscussionPanelHandle } from '../components/channel/DiscussionPanel';
import ChatInput from '../components/channel/ChatInput';
import EditSoupModal from '../components/channel/EditSoupModal';
import ConfirmDialog from '../components/ConfirmDialog';
import QuestionBubble from '../components/QuestionBubble';
import TruthReveal from '../components/TruthReveal';
import OnlineUsers from '../components/OnlineUsers';
import StatsModal from '../components/StatsModal';

export default function ChannelPage() {
  const { id: channelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
    channel, questions, myRole, loading, error, onlineUsers,
    channelEnded, truthText, channelStats,
    loadStats, handleSubmitQuestion, handleWithdraw, handleAnswer,
    handleRevealTruth, handleEndChannel, handleDeleteChannel,
    addQuestion, markAnswered, removeQuestion,
    handleSocketRoleChanged, handleSocketChannelEnded, updateOnlineUsers,
    handleEditSoup,
    handleSocketChannelUpdated,
    // AI
    aiProgress, aiReview, setAiReview, aiReviewLoading, setAiReviewLoading,
    hints, hintRemaining, hintLoading,
    handleAiCorrect, handleRequestHint, handleToggleHintPublic, loadHints,
    updateProgress,
    handleSocketAiAnswered, handleSocketAiCorrected, handleSocketHintShared,
    refreshData,
  } = useChannelData(channelId, user);

  const discussion = useDiscussion(channelId);

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('qa');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [showTruth, setShowTruth] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showEditSoup, setShowEditSoup] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Scroll FAB state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const scrollListenerRef = useRef<(() => void) | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const discussionRef = useRef<DiscussionPanelHandle>(null);
  const hintsRef = useRef<HintsPanelHandle>(null);

  // Derived
  const answeredCount = questions.filter((q) => q.status === 'answered').length;
  const hasPending = questions.some(
    (q) => q.asker.id === user?.id && q.status === 'pending',
  );
  const isActive = channel?.status === 'active' && !channelEnded;
  const isHostOrCreator = myRole === 'host' || myRole === 'creator';


  // Scroll to bottom on new questions
  const scrollToBottom = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [questions, scrollToBottom]);

  // 检查滚动状态
  const checkScrollState = useCallback(() => {
    const el = scrollElementRef.current;
    if (!el) {
      setShowScrollTop(false);
      setShowScrollBottom(false);
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = el;
    const canScroll = scrollHeight > clientHeight + 10;
    const showTop = canScroll && scrollTop > 20;
    const showBottom = canScroll && scrollHeight - scrollTop - clientHeight > 20;
    setShowScrollTop(showTop);
    setShowScrollBottom(showBottom);
  }, []);

  // 设置滚动容器并绑定观察者
  useEffect(() => {
    // 清理旧的监听器
    if (scrollElementRef.current && scrollListenerRef.current) {
      scrollElementRef.current.removeEventListener('scroll', scrollListenerRef.current);
    }
    resizeObserverRef.current?.disconnect();
    mutationObserverRef.current?.disconnect();

    const setupElement = (el: HTMLDivElement | null) => {
      // 先清理之前的监听器
      if (scrollElementRef.current && scrollListenerRef.current) {
        scrollElementRef.current.removeEventListener('scroll', scrollListenerRef.current);
      }
      scrollElementRef.current = el;

      if (!el) {
        scrollListenerRef.current = null;
        setShowScrollTop(false);
        setShowScrollBottom(false);
        return;
      }

      // 使用 requestAnimationFrame 确保 DOM 已渲染
      requestAnimationFrame(() => {
        checkScrollState();
      });

      // 监听滚动事件
      const onScroll = () => checkScrollState();
      scrollListenerRef.current = onScroll;
      el.addEventListener('scroll', onScroll, { passive: true });

      // ResizeObserver: 监听容器大小变化
      resizeObserverRef.current = new ResizeObserver(() => checkScrollState());
      resizeObserverRef.current.observe(el);

      // MutationObserver: 监听子元素变化
      mutationObserverRef.current = new MutationObserver(() => checkScrollState());
      mutationObserverRef.current.observe(el, { childList: true, subtree: true });
    };

    // 获取当前 tab 的滚动容器
    const getScrollEl = (): HTMLDivElement | null => {
      if (activeTab === 'qa') return timelineRef.current;
      if (activeTab === 'discussion') return discussionRef.current?.scrollRef ?? null;
      if (activeTab === 'hints') return hintsRef.current?.scrollRef ?? null;
      return null;
    };

    const el = getScrollEl();
    setupElement(el);

    // 延迟重试：处理 ref 还未就绪的情况
    const retryTimer = setTimeout(() => {
      const retryEl = getScrollEl();
      if (retryEl && retryEl !== scrollElementRef.current) {
        setupElement(retryEl);
      }
    }, 50);

    // 二次重试：确保复杂组件完全渲染
    const retryTimer2 = setTimeout(() => {
      const retryEl = getScrollEl();
      if (retryEl && retryEl !== scrollElementRef.current) {
        setupElement(retryEl);
      }
    }, 200);

    return () => {
      clearTimeout(retryTimer);
      clearTimeout(retryTimer2);
      if (scrollElementRef.current && scrollListenerRef.current) {
        scrollElementRef.current.removeEventListener('scroll', scrollListenerRef.current);
      }
      resizeObserverRef.current?.disconnect();
      mutationObserverRef.current?.disconnect();
    };
  }, [activeTab, checkScrollState, channel]); // 依赖 channel: 当 loading 结束后 channel 从 undefined 变成实际值，需要重新绑定滚动容器


  // 内容变化时重新检查
  useEffect(() => {
    checkScrollState();
  }, [questions.length, discussion.messages.length, hints.length, checkScrollState]);

  const scrollToTopFAB = useCallback(() => {
    scrollElementRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToBottomFAB = useCallback(() => {
    const el = scrollElementRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, []);

  // Load discussion messages when tab is first opened
  const handleTabChange = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab);
      if (tab === 'discussion') {
        discussion.resetUnread();
        if (!discussion.initialLoaded) {
          discussion.fetchMessages();
        }
      }
      if (tab === 'hints') {
        loadHints();
      }
    },
    [discussion],
  );

  // Socket events
  useChannelSocket(channelId, user?.id, {
    onNewQuestion: addQuestion,
    onQuestionAnswered: markAnswered,
    onQuestionWithdrawn: removeQuestion,
    onRoleChanged: handleSocketRoleChanged,
    onChannelEnded: (truth) => {
      handleSocketChannelEnded(truth);
      if (truth) setShowTruth(true);
    },
    onChannelUpdated: handleSocketChannelUpdated,
    onOnlineUsersUpdate: updateOnlineUsers,
    onNewChatMessage: (msg) => {
      // Don't add own messages (already added optimistically)
      if (msg.userId === user?.id) return;
      discussion.addMessage(msg);
      if (activeTab !== 'discussion') {
        discussion.incrementUnread();
      }
    },
    onAiAnswered: handleSocketAiAnswered,
    onAiCorrected: handleSocketAiCorrected,
    onHintShared: handleSocketHintShared,
    onProgressUpdated: (data) => updateProgress(data.progress),
    onAiReviewReady: (data) => {
      setAiReview(data.review);
      setAiReviewLoading(false);
    },
    onVisibilityRestore: () => {
      refreshData();
      if (discussion.initialLoaded) {
        discussion.refreshLatest();
      }
    },
  });

  // Actions
  async function onSubmitQuestion() {
    if (!questionText.trim() || submitting || !channelId || hasPending) return;
    setSubmitting(true);
    try {
      await handleSubmitQuestion(questionText);
      setQuestionText('');
    } catch (err: any) {
      toast.error(err?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function onRevealTruth() {
    try {
      await handleRevealTruth();
      setShowTruth(true);
      setConfirmReveal(false);
    } catch (err: any) {
      toast.error(err?.message || '查看失败');
      setConfirmReveal(false);
    }
  }

  async function onEndChannel() {
    try {
      await handleEndChannel();
      setConfirmEnd(false);
    } catch (err: any) {
      toast.error(err?.message || '结束失败');
      setConfirmEnd(false);
    }
  }

  async function onDeleteChannel() {
    try {
      await handleDeleteChannel();
      setConfirmDelete(false);
      navigate('/');
    } catch (err: any) {
      toast.error(err?.message || '删除失败');
      setConfirmDelete(false);
    }
  }

  // Loading / Error states
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-6">
        <AlertTriangle className="w-12 h-12 text-no" />
        <p className="text-text">{error || '频道不存在'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-primary text-white rounded-xl cursor-pointer
                     transition-colors duration-200 hover:bg-primary-light"
        >
          返回大厅
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 bg-bg flex flex-col overflow-hidden">
      <ChannelHeader
        channel={channel}
        isActive={isActive}
        answeredCount={answeredCount}
        onlineUsersCount={onlineUsers.length}
        onShowOnlineUsers={() => setShowOnlineUsers(true)}
        aiProgress={
          channel.aiHostEnabled || channel.aiHintEnabled ? aiProgress : undefined
        }
        aiProgressFrozen={channelEnded}
      />

      <SurfacePanel
        surface={channel.surface}
        isCreator={myRole === 'creator'}
        isActive={isActive}
        onEdit={() => setShowEditSoup(true)}
      />

      <ActionButtons
        isActive={isActive}
        myRole={myRole}
        truthText={truthText}
        channelEnded={channelEnded}
        onReveal={() => setConfirmReveal(true)}
        onEnd={() => setConfirmEnd(true)}
        onViewTruth={() => setShowTruth(true)}
        onViewStats={() => {
          loadStats();
          setShowStatsModal(true);
        }}
        onDelete={() => setConfirmDelete(true)}
      />

      {/* Tabs */}

      {/* Tabs */}
      <ChannelTabs
        channelId={channel.id}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        answeredCount={answeredCount}
        unreadCount={discussion.unreadCount}
        aiHintEnabled={channel.aiHintEnabled}
      />

      {/* Tab Content */}
      {activeTab === 'hints' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          <HintsPanel
            ref={hintsRef}
            hints={hints}
            myRemaining={hintRemaining}
            hintLoading={hintLoading}
            currentUserId={user?.id ?? ''}
            channelEnded={channelEnded}
            onRequestHint={handleRequestHint}
            onTogglePublic={handleToggleHintPublic}
          />
        </div>
      ) : activeTab === 'qa' ? (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Question Timeline */}
          <div ref={timelineRef} className="flex-1 min-h-0 overflow-y-auto py-3 space-y-1 overscroll-none">
            {questions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                <HelpCircle className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">还没有人提问</p>
                <p className="text-xs mt-1">成为第一个提问者吧!</p>
              </div>
            )}
            {questions
              .filter((q) => q.status !== 'withdrawn')
              .map((q) => (
                <QuestionBubble
                  key={q.id}
                  question={q}
                  currentUserId={user?.id}
                  isHost={isHostOrCreator}
                  onWithdraw={isActive ? handleWithdraw : undefined}
                  onAnswer={isActive && isHostOrCreator ? handleAnswer : undefined}
                  onAiCorrect={isHostOrCreator ? handleAiCorrect : undefined}
                />
              ))}
          </div>

          {isActive && !isHostOrCreator ? (
            <PlayerInputPanel
              hasPending={hasPending}
              questionText={questionText}
              onChangeText={setQuestionText}
              onSubmit={onSubmitQuestion}
              submitting={submitting}
            />
          ) : isActive && isHostOrCreator ? (
            <div className="flex-shrink-0 bg-surface/80 backdrop-blur-xl border-t border-border px-4 py-3 safe-area-bottom pointer-events-none">
              <div className="flex items-center justify-center gap-2 py-2">
                <span className="text-sm text-text-muted">主持人仅可回答问题</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Discussion */}
          <DiscussionPanel
            ref={discussionRef}
            messages={discussion.messages}
            currentUserId={user?.id}
            hasMore={discussion.hasMore}
            loading={discussion.loading}
            onLoadMore={discussion.loadMore}
            endedAt={channel.endedAt}
          />

          {/* Chat Input */}
          <ChatInput
            isHost={isHostOrCreator}
            isActive={isActive}
            channelEnded={channelEnded}
            onSend={discussion.sendMessage}
          />
        </div>
      )}


      {/* Floating scroll buttons */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToTopFAB}
            className="fixed right-4 z-30 w-11 h-11 flex items-center justify-center
                       bg-surface/95 backdrop-blur-md border border-border rounded-full shadow-md
                       text-text-muted hover:text-primary hover:bg-surface hover:border-primary/30
                       active:scale-95 transition-all duration-150 cursor-pointer
                       touch-manipulation"
            style={{ bottom: showScrollBottom ? 'calc(7.5rem + env(safe-area-inset-bottom, 0px))' : 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
            aria-label="滚动到顶部"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            key="scroll-bottom"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToBottomFAB}
            className="fixed right-4 z-30 w-11 h-11 flex items-center justify-center
                       bg-surface/95 backdrop-blur-md border border-border rounded-full shadow-md
                       text-text-muted hover:text-primary hover:bg-surface hover:border-primary/30
                       active:scale-95 transition-all duration-150 cursor-pointer
                       touch-manipulation"
            style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
            aria-label="滚动到底部"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlays / Modals */}
      <AnimatePresence>
        {showStatsModal && channelId && (
<StatsModal
            channelId={channelId}
            stats={channelStats}
            canRate={myRole === 'host' || myRole === 'player'}
            onClose={() => setShowStatsModal(false)}
            onStatsReload={loadStats}
            aiReview={aiReview}
            aiReviewLoading={aiReviewLoading}
            currentNickname={user?.nickname ?? ''}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnlineUsers && (
          <OnlineUsers
            users={onlineUsers.map((u) => {
              const member = channel.members?.find((m) => m.userId === u.id);
              return { ...u, role: member?.role ?? u.role };
            })}
            onClose={() => setShowOnlineUsers(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTruth && truthText && (
          <TruthReveal truth={truthText} onClose={() => setShowTruth(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditSoup && channel && (
          <EditSoupModal
            surface={channel.surface}
            truth={truthText || ''}
            onSave={handleEditSoup}
            onClose={() => setShowEditSoup(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmReveal && (
          <ConfirmDialog
            title="确认查看汤底"
            message="查看后你将成为主持人，无法再提问。"
            confirmLabel="确认查看"
            onConfirm={onRevealTruth}
            onCancel={() => setConfirmReveal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmEnd && myRole === 'creator' && (
          <ConfirmDialog
            title="确认结束游戏"
            message="结束后将公布汤底，所有人可查看。此操作不可撤销。"
            confirmLabel="结束游戏"
            variant="danger"
            onConfirm={onEndChannel}
            onCancel={() => setConfirmEnd(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && myRole === 'creator' && (
          <ConfirmDialog
            title="确认删除频道"
            message="删除后该频道将不再对任何人可见。此操作不可撤销。"
            confirmLabel="删除频道"
            variant="danger"
            onConfirm={onDeleteChannel}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
