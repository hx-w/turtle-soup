import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, PieChart, Minus, Target, Loader2, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import AnswerStamp from './AnswerStamp';
import AiBadge from './ai/AiBadge';
import AiReasoningToggle from './ai/AiReasoningToggle';
import AiCorrectDropdown from './ai/AiCorrectDropdown';
import type { Question } from '../types';

interface QuestionBubbleProps {
  question: Question;
  currentUserId?: string;
  isHost?: boolean;
  onWithdraw?: (questionId: string) => void;
  onAnswer?: (questionId: string, answer: 'yes' | 'no' | 'irrelevant' | 'partial', isKeyQuestion: boolean) => Promise<void>;
  onAiCorrect?: (qid: string, answer: string, isKey: boolean) => Promise<void>;
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
}: QuestionBubbleProps) {
  const isOwn = currentUserId === question.asker.id;
  const isPending = question.status === 'pending';
  const isAnswered = question.status === 'answered';
  const avatarUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${question.asker.avatarSeed}`;

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

        {isPending && isOwn && !isHost && onWithdraw && (
          <button
            onClick={() => onWithdraw(question.id)}
            aria-label="撤回问题"
            className="mt-2 text-xs text-text-muted hover:text-no transition-colors duration-200 cursor-pointer"
          >
            撤回问题
          </button>
        )}

        {isPending && !isOwn && !isHost && !showAnswerOptions && (
          <span className="mt-2 text-xs text-text-muted">等待回答中...</span>
        )}
      </div>
    </motion.div>
  );
}
