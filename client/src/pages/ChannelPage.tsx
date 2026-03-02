import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
import { toast } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { useChannelData } from '../hooks/useChannelData';
import { useChannelSocket } from '../hooks/useChannelSocket';
import { useDiscussion } from '../hooks/useDiscussion';
import { api } from '../lib/api';
import ChannelHeader from '../components/channel/ChannelHeader';
import SurfacePanel from '../components/channel/SurfacePanel';
import ActionButtons from '../components/channel/ActionButtons';
import ChannelTabs from '../components/channel/ChannelTabs';
import type { TabKey } from '../components/channel/ChannelTabs';
import PlayerInputPanel from '../components/channel/PlayerInputPanel';
import AnswerDrawer from '../components/channel/AnswerDrawer';
import DiscussionPanel from '../components/channel/DiscussionPanel';
import ChatInput from '../components/channel/ChatInput';
import ConfirmDialog from '../components/ConfirmDialog';
import QuestionBubble from '../components/QuestionBubble';
import TruthReveal from '../components/TruthReveal';
import OnlineUsers from '../components/OnlineUsers';
import StatsPanel from '../components/StatsPanel';
import Timeline from '../components/Timeline';
import RatingStars from '../components/RatingStars';
import type { TimelineEvent } from '../types';

export default function ChannelPage() {
  const { id: channelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
    channel, questions, myRole, loading, error, onlineUsers,
    channelEnded, truthText, channelStats,
    loadStats, handleSubmitQuestion, handleWithdraw, handleAnswer,
    handleRevealTruth, handleEndChannel,
    addQuestion, markAnswered, removeQuestion,
    handleSocketRoleChanged, handleSocketChannelEnded, updateOnlineUsers,
  } = useChannelData(channelId, user);

  const discussion = useDiscussion(channelId);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [statsTab, setStatsTab] = useState<'stats' | 'timeline'>('stats');

  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('qa');
  const [surfaceCollapsed, setSurfaceCollapsed] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [showTruth, setShowTruth] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const timelineRef = useRef<HTMLDivElement>(null);

  const loadTimeline = useCallback(async () => {
    if (!channelId) return;
    try {
      const data = await api.get<TimelineEvent[]>(`/channels/${channelId}/timeline`);
      setTimeline(data);
    } catch {
      // Timeline not critical
    }
  }, [channelId]);

  // Derived
  const answeredCount = questions.filter((q) => q.status === 'answered').length;
  const hasPending = questions.some(
    (q) => q.asker.id === user?.id && q.status === 'pending',
  );
  const isActive = channel?.status === 'active' && !channelEnded;
  const isHostOrCreator = myRole === 'host' || myRole === 'creator';
  const pendingQuestions = questions.filter((q) => q.status === 'pending');

  // Scroll to bottom on new questions
  const scrollToBottom = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [questions, scrollToBottom]);

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
    onOnlineUsersUpdate: updateOnlineUsers,
    onNewChatMessage: (msg) => {
      // Don't add own messages (already added optimistically)
      if (msg.userId === user?.id) return;
      discussion.addMessage(msg);
      if (activeTab !== 'discussion') {
        discussion.incrementUnread();
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
      />

      <SurfacePanel
        surface={channel.surface}
        collapsed={surfaceCollapsed}
        onToggle={() => setSurfaceCollapsed(!surfaceCollapsed)}
      />

      <ActionButtons
        isActive={isActive}
        myRole={myRole}
        truthText={truthText}
        channelEnded={channelEnded}
        onReveal={() => setConfirmReveal(true)}
        onEnd={() => setConfirmEnd(true)}
        onViewTruth={() => setShowTruth(true)}
        onViewStats={loadStats}
      />

      {/* Tabs */}
      <ChannelTabs
        channelId={channel.id}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        answeredCount={answeredCount}
        unreadCount={discussion.unreadCount}
      />

      {/* Tab Content */}
      {activeTab === 'qa' ? (
        <>
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
                />
              ))}
          </div>

          {isActive && isHostOrCreator && pendingQuestions.length > 0 && (
            <AnswerDrawer
              pendingQuestions={pendingQuestions}
              onAnswer={handleAnswer}
            />
          )}

          {isActive && myRole === 'player' && (
            <PlayerInputPanel
              hasPending={hasPending}
              questionText={questionText}
              onChangeText={setQuestionText}
              onSubmit={onSubmitQuestion}
              submitting={submitting}
            />
          )}
        </>
      ) : (
        <>
          {/* Discussion */}
          <DiscussionPanel
            messages={discussion.messages}
            currentUserId={user?.id}
            hasMore={discussion.hasMore}
            loading={discussion.loading}
            onLoadMore={discussion.loadMore}
          />

          {/* Chat Input */}
          <ChatInput
            isHost={isHostOrCreator}
            isActive={isActive}
            onSend={discussion.sendMessage}
          />
        </>
      )}

      {channelEnded && (
        <div className="flex-shrink-0 border-t border-border bg-surface/50 overflow-y-auto max-h-[50vh]">
          <div className="flex border-b border-border">
            <button
              onClick={() => setStatsTab('stats')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                statsTab === 'stats' ? 'text-primary border-b-2 border-primary' : 'text-text-muted'
              }`}
            >
              统计
            </button>
            <button
              onClick={() => {
                setStatsTab('timeline');
                if (timeline.length === 0) loadTimeline();
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                statsTab === 'timeline' ? 'text-primary border-b-2 border-primary' : 'text-text-muted'
              }`}
            >
              时间线
            </button>
          </div>

          <div className="p-4">
            {statsTab === 'stats' && channelStats && <StatsPanel stats={channelStats} />}
            {statsTab === 'timeline' && <Timeline events={timeline} />}
          </div>

          {statsTab === 'stats' && myRole === 'player' && channelStats && (
            <div className="p-4 pt-0">
              <RatingStars
                channelId={channel.id}
                existingRating={channelStats.myRating ?? undefined}
                averageRating={channelStats.averageRating}
                ratingCount={channelStats.ratingCount}
                onSubmit={() => loadStats()}
              />
            </div>
          )}
        </div>
      )}

      {/* Overlays / Modals */}
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
    </div>
  );
}
