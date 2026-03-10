import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, PieChart, Minus, Target, Loader2, Send, SmilePlus } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import AnswerStamp from './AnswerStamp';
import AiBadge from './ai/AiBadge';
import AiReasoningToggle from './ai/AiReasoningToggle';
import AiCorrectDropdown from './ai/AiCorrectDropdown';
import EmojiReactionPopover from './channel/EmojiReactionPopover';
import type { Question } from '../types';

interface QuestionBubbleProps {
  question: Question;
  currentUserId?: string;
  isHost?: boolean;
  onWithdraw?: (questionId: string) => void;
  onAnswer?: (questionId: string, answer: 'yes' | 'no' | 'irrelevant' | 'partial', isKeyQuestion: boolean) => Promise<void>;
  onAiCorrect?: (qid: string, answer: string, isKey: boolean) => Promise<void>;
  onReaction?: (questionId: string, emoji: string) => void;
  onRemoveReaction?: (questionId: string) => void;
}

type AnswerType = 'yes' | 'no' | 'irrelevant' | 'partial';

const answerConfig = {
  yes: {
    label: '是',
    icon: Check,
    color: 'bg-yes/15 border-yes/40 text-yes',
    selectedColor: 'bg-yes/25 border-yes text-yes ring-2 ring-yes/30 ring-offset-1 ring-offset-card',
  },
  no: {
    label: '否',
    icon: X,
    color: 'bg-no/15 border-no/40 text-no',
    selectedColor: 'bg-no/25 border-no text-no ring-2 ring-no/30 ring-offset-1 ring-offset-card',
  },
  partial: {
    label: '部分',
    icon: PieChart,
    color: 'bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400',
    selectedColor: 'bg-orange-500/25 border-orange-500 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/30 ring-offset-1 ring-offset-card',
  },
  irrelevant: {
    label: '无关',
    icon: Minus,
    color: 'bg-irrelevant/15 border-irrelevant/40 text-irrelevant',
    selectedColor: 'bg-irrelevant/25 border-irrelevant text-irrelevant ring-2 ring-irrelevant/30 ring-offset-1 ring-offset-card',
  },
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function QuestionBubble({
  question,
  currentUserId,
  isHost,
  onWithdraw,
  onAnswer,
  onAiCorrect,
  onReaction,
  onRemoveReaction,
}: QuestionBubbleProps) {
  const isOwn = currentUserId === question.asker.id;
  const isPending = question.status === 'pending';
  const isAnswered = question.status === 'answered';
  const avatarUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${question.asker.avatarSeed}`;

  // Emoji reaction state
  const [showPicker, setShowPicker] = useState(false);
  const [selectedBubbleEmoji, setSelectedBubbleEmoji] = useState<string | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const bubbleRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pickerAnchor, setPickerAnchor] = useState<React.RefObject<HTMLElement | null>>(addBtnRef);

  const [showAllReactions, setShowAllReactions] = useState(false);
  const MAX_VISIBLE_REACTIONS = 5;

  const aggregatedReactions = useMemo(() => {
    const map = new Map<string, number>();
    (question.reactions || []).forEach((r) => {
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    });
    // 按数量降序排列，相同数量按 emoji 出现顺序
    return Array.from(map.entries())
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count);
  }, [question.reactions]);

  const visibleReactions = showAllReactions
    ? aggregatedReactions
    : aggregatedReactions.slice(0, MAX_VISIBLE_REACTIONS);
  const hiddenCount = aggregatedReactions.length - MAX_VISIBLE_REACTIONS;

  const myReaction = useMemo(
    () => (question.reactions || []).find((r) => r.userId === currentUserId)?.emoji,
    [question.reactions, currentUserId],
  );

  const emojiUsers = useMemo(
    () => (question.reactions || []).map((r) => ({
      emoji: r.emoji,
      nickname: r.user.nickname,
      avatarSeed: r.user.avatarSeed,
    })),
    [question.reactions],
  );

  const handleEmojiSelect = (emoji: string) => {
    if (emoji === myReaction) {
      onRemoveReaction?.(question.id);
    } else {
      onReaction?.(question.id, emoji);
    }
  };

  const handleBubbleClick = (emoji: string) => {
    setSelectedBubbleEmoji(emoji);
    setPickerAnchor({ current: bubbleRefs.current[emoji] });
    setShowPicker(true);
  };

  const handleAddClick = () => {
    setSelectedBubbleEmoji(null);
    setPickerAnchor(addBtnRef);
    setShowPicker(true);
  };

  // Answer state for host
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerType | null>(null);
  const [isKeyQuestion, setIsKeyQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setIsKeyQuestion(false);
  }, [question.id]);

  const handleAnswerSelect = (answer: AnswerType) => {
    if (selectedAnswer === answer) {
      // Deselect on re-tap
      setSelectedAnswer(null);
      setIsKeyQuestion(false);
      return;
    }
    setSelectedAnswer(answer);
    setIsKeyQuestion(false);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !onAnswer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAnswer(question.id, selectedAnswer, isKeyQuestion);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showAnswerOptions = isPending && isHost && onAnswer;
  const showConfirmBar = selectedAnswer !== null;
  const showKeyToggle = selectedAnswer === 'yes' || selectedAnswer === 'no';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-3 px-3 py-2"
    >
      <img
        src={avatarUrl}
        alt={question.asker.nickname}
        className="w-7 h-7 rounded-full bg-surface flex-shrink-0 mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm font-medium text-text truncate">
            @{question.asker.nickname}
          </span>
          <span className="text-xs text-text-muted flex-shrink-0">
            {formatTime(question.createdAt)}
          </span>
        </div>

        <div className={`backdrop-blur-xl rounded-2xl rounded-tl-sm px-4 py-3 border ${
          isOwn
            ? 'bg-primary/15 border-primary/25'
            : 'bg-card/60 border-border'
        }`}>
          <p className="text-sm text-text leading-relaxed break-words">{question.content}</p>
        </div>

        {/* Answer options for host */}
        <AnimatePresence>
          {showAnswerOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2.5 overflow-hidden"
            >
              {/* Answer type selector — 4 inline pills */}
              <div className="flex gap-1.5">
                {(['yes', 'no', 'partial', 'irrelevant'] as AnswerType[]).map((answer) => {
                  const config = answerConfig[answer];
                  const Icon = config.icon;
                  const isSelected = selectedAnswer === answer;

                  return (
                    <button
                      key={answer}
                      onClick={() => handleAnswerSelect(answer)}
                      disabled={isSubmitting}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5
                        py-2.5 px-2 rounded-xl border-2
                        text-xs font-medium transition-all duration-200
                        touch-manipulation cursor-pointer
                        ${isSelected ? config.selectedColor : config.color}
                        disabled:opacity-50
                      `}
                    >
                      {isSubmitting && isSelected ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Confirm bar — shown after selecting any answer */}
              <AnimatePresence>
                {showConfirmBar && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      {/* Key question toggle (only for yes/no) */}
                      {showKeyToggle && (
                        <button
                          onClick={() => setIsKeyQuestion(!isKeyQuestion)}
                          className={`
                            flex items-center gap-1.5 py-2.5 px-3 rounded-xl border-2
                            text-xs font-medium transition-all duration-200
                            touch-manipulation cursor-pointer
                            ${isKeyQuestion
                              ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-400'
                              : 'bg-surface border-border text-text-muted hover:border-orange-500/50'
                            }
                          `}
                        >
                          <Target className="w-3.5 h-3.5" />
                          <span>关键</span>
                          {isKeyQuestion && <Check className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Confirm button */}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-1.5
                                   py-2.5 px-3 rounded-xl bg-primary text-white
                                   text-xs font-medium cursor-pointer
                                   disabled:opacity-50 transition-opacity
                                   touch-manipulation"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{isSubmitting ? '提交中...' : '确认回答'}</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {isAnswered && question.answer && (
          <div className="mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <AnswerStamp answer={question.answer} isKeyQuestion={question.isKeyQuestion} />

              {question.isAiAnswered ? (
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <AiBadge /> 回答
                </span>
              ) : question.answerer ? (
                <span className="text-xs text-text-muted">
                  <span className="text-primary">@{question.answerer.nickname}</span> 回答
                </span>
              ) : null}

              {question.answeredAt && (
                <span className="text-xs text-text-muted">
                  {formatTime(question.answeredAt)}
                </span>
              )}
            </div>

            {/* AI-specific controls for host */}
            {isHost && question.isAiAnswered && (
              <div className="mt-1.5 flex items-center gap-3">
                {onAiCorrect && (
                  <AiCorrectDropdown
                    questionId={question.id}
                    currentAnswer={question.answer}
                    currentIsKey={question.isKeyQuestion}
                    onCorrect={onAiCorrect}
                  />
                )}
                {question.aiReasoning && (
                  <AiReasoningToggle reasoning={question.aiReasoning} />
                )}
              </div>
            )}
          </div>
        )}

        {/* Emoji Reactions */}
        {(aggregatedReactions.length > 0 || (onReaction && !isPending)) && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <AnimatePresence mode="popLayout">
              {visibleReactions.map(({ emoji, count }) => (
                <motion.button
                  key={emoji}
                  ref={(el) => { bubbleRefs.current[emoji] = el; }}
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleBubbleClick(emoji)}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs
                    transition-colors cursor-pointer touch-manipulation
                    ${myReaction === emoji
                      ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                      : 'bg-surface hover:bg-surface-hover text-text-secondary'
                    }`}
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  <span>{count}</span>
                </motion.button>
              ))}
            </AnimatePresence>
            {!showAllReactions && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllReactions(true)}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs
                  bg-surface hover:bg-surface-hover text-text-muted cursor-pointer
                  transition-colors touch-manipulation active:scale-95"
              >
                +{hiddenCount}
              </button>
            )}
            {showAllReactions && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllReactions(false)}
                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs
                  bg-surface hover:bg-surface-hover text-text-muted cursor-pointer
                  transition-colors touch-manipulation active:scale-95"
              >
                收起
              </button>
            )}
            {onReaction && (
              <motion.button
                ref={addBtnRef}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={handleAddClick}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full
                  bg-surface hover:bg-surface-hover text-text-muted cursor-pointer
                  transition-colors touch-manipulation"
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        )}

        <EmojiReactionPopover
          anchorRef={pickerAnchor}
          isOpen={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={handleEmojiSelect}
          currentEmoji={myReaction}
          emojiUsers={selectedBubbleEmoji ? emojiUsers : undefined}
          selectedBubbleEmoji={selectedBubbleEmoji || undefined}
        />

        <div className="mt-2 text-xs text-text-muted flex items-center justify-between">
          {isPending && !isOwn && !isHost && !showAnswerOptions && (
            <span>等待回答中...</span>
          )}

          {isPending && isOwn && !isHost && onWithdraw && (
            <button
              onClick={() => onWithdraw(question.id)}
              aria-label="撤回问题"
              className="hover:text-no transition-colors duration-200 cursor-pointer"
            >
              撤回问题
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
