import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, AlertTriangle, HelpCircle, ArrowUp, ArrowDown } from 'lucide-react';
import ClueBoard from '../components/clue/ClueBoard';
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
import SharePreviewModal from '../components/SharePreviewModal';

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
    aiProgress, aiReview, setAiReview, aiReviewLoading, setAiReviewLoading,
    hints, hintRemaining, hintLoading,
    handleAiCorrect, handleRequestHint, handleToggleHintPublic, loadHints,
    updateProgress,
    handleSocketAiAnswered, handleSocketAiCorrected, handleSocketHintShared,
    refreshData,
  } = useChannelData(channelId, user);

  const discussion = useDiscussion(channelId);

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
  const [showShareModal, setShowShareModal] = useState(false);

  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);


  const timelineRef = useRef<HTMLDivElement>(null);
  const discussionRef = useRef<DiscussionPanelHandle>(null);

  const answeredCount = questions.filter((q) => q.status === 'answered').length;
  const hasPending = questions.some(
    (q) => q.asker.id === user?.id && q.status === 'pending',
  );
  const isActive = channel?.status === 'active' && !channelEnded;
  const isHostOrCreator = myRole === 'host' || myRole === 'creator';

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [questions]);

  const checkScrollState = useCallback(() => {
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const threshold = 80;
    setCanScrollUp(scrollTop > threshold);
    setCanScrollDown(scrollHeight - scrollTop - clientHeight > threshold);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', checkScrollState, { passive: true });
    requestAnimationFrame(checkScrollState);
    return () => window.removeEventListener('scroll', checkScrollState);
  }, [checkScrollState]);

  useEffect(() => {
    checkScrollState();
  }, [questions.length, checkScrollState, activeTab]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, []);

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab);
      if (tab === 'discussion') {
        discussion.resetUnread();
        if (!discussion.initialLoaded) {
          discussion.fetchMessages();
        }
      }
      if (tab === 'clues') {
        loadHints();
      }
    },
    [discussion, loadHints],
  );

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
          className="px-6 py-2.5 bg-primary text-white rounded-xl cursor-pointer
                     transition-colors duration-150 hover:bg-primary-light font-medium"
        >
          返回大厅
        </button>
      </div>
    );
  }

  const showScrollFAB = canScrollUp || canScrollDown;

  return (
    <div className="flex-1 bg-bg flex flex-col">
      <ChannelHeader
        channel={channel}
        isActive={isActive}
        answeredCount={answeredCount}
        onlineUsersCount={channel.members?.length || 0}
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
        onShare={() => {
          loadStats();
          setShowShareModal(true);
        }}
        onDelete={() => setConfirmDelete(true)}
      />

      <ChannelTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        answeredCount={answeredCount}
        unreadCount={discussion.unreadCount}
        hintsCount={hints.length}
        aiHintEnabled={channel.aiHintEnabled}
      />


      {activeTab === 'clues' ? (
        <ClueBoard
          channelId={channelId!}
          hints={hints}
          myRemaining={hintRemaining}
          hintLoading={hintLoading}
          currentUserId={user?.id ?? ''}
          channelEnded={channelEnded}
          onRequestHint={handleRequestHint}
          onTogglePublic={handleToggleHintPublic}
        />
      ) : activeTab === 'qa' ? (
        <div className="flex flex-col pb-20">
          <div ref={timelineRef} className="flex flex-col pb-2 space-y-1">
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
        </div>
      ) : (
        <div className="flex flex-col pb-20">
          <DiscussionPanel
            ref={discussionRef}
            messages={discussion.messages}
            currentUserId={user?.id}
            hasMore={discussion.hasMore}
            loading={discussion.loading}
            onLoadMore={discussion.loadMore}
            endedAt={channel.endedAt}
          />
        </div>
      )}

      {/* Fixed bottom input bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-bg/95 backdrop-blur-md border-t border-border/30">
        <div className="w-full max-w-5xl mx-auto">
          {activeTab === 'qa' ? (
            isActive && !isHostOrCreator ? (
              <PlayerInputPanel
                hasPending={hasPending}
                questionText={questionText}
                onChangeText={setQuestionText}
                onSubmit={onSubmitQuestion}
                submitting={submitting}
              />
            ) : isActive && isHostOrCreator ? (
              <div className="px-4 py-3 pointer-events-none">
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-sm text-text-muted">主持人仅可回答问题</span>
                </div>
              </div>
            ) : null
          ) : activeTab === 'discussion' ? (
            <ChatInput
              myRole={myRole}
              isActive={isActive}
              channelEnded={channelEnded}
              onSend={discussion.sendMessage}
            />
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {showScrollFAB && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed right-3 z-30 flex flex-col gap-2.5
                       bottom-[calc(7rem+env(safe-area-inset-bottom,0px))]"
          >
            {/* Fixed position buttons - always render both, just toggle visibility */}
            <button
              onClick={scrollToTop}
              className={`w-10 h-10 flex items-center justify-center
                         bg-primary/90 hover:bg-primary text-white rounded-xl
                         active:scale-95 transition-all duration-150 cursor-pointer
                         shadow-lg shadow-primary/30 ${canScrollUp ? '' : 'invisible'}`}
              aria-label="滚动到顶部"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <button
              onClick={scrollToBottom}
              className={`w-10 h-10 flex items-center justify-center
                         bg-primary/90 hover:bg-primary text-white rounded-xl
                         active:scale-95 transition-all duration-150 cursor-pointer
                         shadow-lg shadow-primary/30 ${canScrollDown ? '' : 'invisible'}`}
              aria-label="滚动到底部"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOnlineUsers && (
          <OnlineUsers
            users={(channel.members || []).map((m) => {
              const isOnline = onlineUsers.some((u) => u.id === m.userId);
              return { 
                id: m.userId,
                nickname: m.user.nickname,
                avatarSeed: m.user.avatarSeed,
                role: m.role,
                isOnline
              };
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

      <AnimatePresence>
        {showShareModal && channel && (
          <SharePreviewModal
            channel={channel}
            stats={channelStats}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
