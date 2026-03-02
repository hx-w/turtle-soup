import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
import { toast } from '../stores/toastStore';
import { useAuthStore } from '../stores/authStore';
import { useChannelData } from '../hooks/useChannelData';
import { useChannelSocket } from '../hooks/useChannelSocket';
import ChannelHeader from '../components/channel/ChannelHeader';
import SurfacePanel from '../components/channel/SurfacePanel';
import ActionButtons from '../components/channel/ActionButtons';
import PlayerInputPanel from '../components/channel/PlayerInputPanel';
import HostAnswerPanel from '../components/channel/HostAnswerPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import QuestionBubble from '../components/QuestionBubble';
import TruthReveal from '../components/TruthReveal';
import OnlineUsers from '../components/OnlineUsers';
import StatsPanel from '../components/StatsPanel';
import RatingStars from '../components/RatingStars';

export default function ChannelPage() {
  const { id: channelId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const {
    channel, questions, myRole, loading, error, onlineUsers,
    channelEnded, truthText, channelStats, showStats, setShowStats,
    loadStats, handleSubmitQuestion, handleWithdraw, handleAnswer,
    handleRevealTruth, handleEndChannel,
    addQuestion, markAnswered, removeQuestion,
    handleSocketRoleChanged, handleSocketChannelEnded, updateOnlineUsers,
  } = useChannelData(channelId, user);

  // UI state
  const [surfaceCollapsed, setSurfaceCollapsed] = useState(false);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [showTruth, setShowTruth] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmAnswer, setConfirmAnswer] = useState<{
    questionId: string;
    answer: 'yes' | 'no' | 'irrelevant';
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);

  // Derived
  const answeredCount = questions.filter((q) => q.status === 'answered').length;
  const hasPending = questions.some(
    (q) => q.asker.id === user?.id && q.status === 'pending',
  );
  const pendingQuestions = questions.filter((q) => q.status === 'pending');
  const isActive = channel?.status === 'active' && !channelEnded;

  // Scroll to bottom on new questions
  const scrollToBottom = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [questions, scrollToBottom]);

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

  async function onConfirmAnswer() {
    if (!confirmAnswer) return;
    await handleAnswer(confirmAnswer.questionId, confirmAnswer.answer);
    setConfirmAnswer(null);
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
    <div className="min-h-screen bg-bg flex flex-col">
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
        onViewStats={() => {
          if (channelStats) setShowStats(true);
          else loadStats();
        }}
      />

      {/* Question Timeline */}
      <div ref={timelineRef} className="flex-1 overflow-y-auto py-3 space-y-1">
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
              onWithdraw={isActive ? handleWithdraw : undefined}
            />
          ))}
      </div>

      {/* Bottom Input / Host Panel / Ended Area */}
      {isActive && myRole === 'player' && (
        <PlayerInputPanel
          hasPending={hasPending}
          questionText={questionText}
          onChangeText={setQuestionText}
          onSubmit={onSubmitQuestion}
          submitting={submitting}
        />
      )}

      {isActive && myRole === 'host' && (
        <HostAnswerPanel
          pendingQuestions={pendingQuestions}
          onConfirmAnswer={(qId, ans) => setConfirmAnswer({ questionId: qId, answer: ans })}
        />
      )}

      {channelEnded && (
        <div className="border-t border-border bg-surface/50 p-4 space-y-4">
          {channelStats && showStats && <StatsPanel stats={channelStats} />}
          <RatingStars channelId={channel.id} existingRating={undefined} />
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
        {confirmEnd && (
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
        {confirmAnswer && (
          <ConfirmDialog
            title="确认回答"
            message={`确认将此问题标记为「${
              confirmAnswer.answer === 'yes'
                ? '是'
                : confirmAnswer.answer === 'no'
                  ? '否'
                  : '无关'
            }」？`}
            confirmLabel="确认"
            onConfirm={onConfirmAnswer}
            onCancel={() => setConfirmAnswer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
