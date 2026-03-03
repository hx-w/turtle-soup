import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, PieChart, Minus, Target, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import AnswerStamp from './AnswerStamp';
import type { Question } from '../types';

interface QuestionBubbleProps {
  question: Question;
  currentUserId?: string;
  isHost?: boolean;
  onWithdraw?: (questionId: string) => void;
  onAnswer?: (questionId: string, answer: 'yes' | 'no' | 'irrelevant' | 'partial', isKeyQuestion: boolean) => Promise<void>;
}

type AnswerType = 'yes' | 'no' | 'irrelevant' | 'partial';

const answerConfig = {
  yes: { label: '是', icon: Check, color: 'bg-yes/15 border-yes text-yes hover:bg-yes/25' },
  no: { label: '否', icon: X, color: 'bg-no/15 border-no text-no hover:bg-no/25' },
  partial: { label: '部分', icon: PieChart, color: 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25' },
  irrelevant: { label: '无关', icon: Minus, color: 'bg-irrelevant/15 border-irrelevant text-irrelevant hover:bg-irrelevant/25' },
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

  // Auto-submit for partial/irrelevant
  useEffect(() => {
    if (selectedAnswer && (selectedAnswer === 'partial' || selectedAnswer === 'irrelevant')) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedAnswer]);

  const handleAnswerSelect = (answer: AnswerType) => {
    if (selectedAnswer === answer && (answer === 'yes' || answer === 'no')) {
      // Double-click to submit for yes/no
      handleSubmit(answer);
      return;
    }
    setSelectedAnswer(answer);
    setIsKeyQuestion(false);
  };

  const handleSubmit = async (answer?: AnswerType) => {
    const answerToSubmit = answer || selectedAnswer;
    if (!answerToSubmit || !onAnswer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAnswer(question.id, answerToSubmit, isKeyQuestion);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showAnswerOptions = isPending && isHost && onAnswer;

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

        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-sm text-text leading-relaxed break-words">{question.content}</p>
        </div>

        {/* Answer options for host - Mobile Optimized */}
        <AnimatePresence>
          {showAnswerOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              {/* Answer buttons - 2x2 on mobile, 1x4 on tablet+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['yes', 'no', 'partial', 'irrelevant'] as AnswerType[]).map((answer) => {
                  const config = answerConfig[answer];
                  const Icon = config.icon;
                  const isSelected = selectedAnswer === answer;

                  return (
                    <motion.button
                      key={answer}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAnswerSelect(answer)}
                      disabled={isSubmitting}
                      className={`
                        flex flex-col items-center justify-center gap-1.5 sm:gap-1
                        py-3 sm:py-2.5 px-3 sm:px-2 rounded-xl sm:rounded-lg border-2
                        text-sm sm:text-xs font-medium transition-all duration-150
                        min-h-[56px] sm:min-h-0 touch-manipulation
                        ${config.color}
                        ${isSelected ? 'ring-2 ring-offset-1 ring-offset-card' : ''}
                        disabled:opacity-50 active:scale-95
                      `}
                    >
                      {isSubmitting && isSelected ? (
                        <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
                      )}
                      <span>{config.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Key question toggle for yes/no - Mobile Optimized */}
              <AnimatePresence>
                {selectedAnswer && (selectedAnswer === 'yes' || selectedAnswer === 'no') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 overflow-hidden"
                  >
                    <button
                      onClick={() => setIsKeyQuestion(!isKeyQuestion)}
                      className={`
                        flex items-center justify-center gap-2 py-3 sm:py-2 px-3 rounded-lg border-2
                        text-sm sm:text-xs font-medium transition-all duration-150
                        min-h-[48px] sm:min-h-0 touch-manipulation
                        ${isKeyQuestion
                          ? 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-400'
                          : 'bg-surface border-border text-text-muted hover:border-orange-500/50'
                        }
                      `}
                    >
                      <Target className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span>关键问题</span>
                      {isKeyQuestion && <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                    </button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmit()}
                      disabled={isSubmitting}
                      className="flex-1 py-3 sm:py-2 px-3 rounded-lg bg-primary text-white
                                 text-sm sm:text-xs font-medium
                                 disabled:opacity-50 transition-opacity
                                 min-h-[48px] sm:min-h-0 touch-manipulation"
                    >
                      {isSubmitting ? '提交中...' : '确认回答'}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {isAnswered && question.answer && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AnswerStamp answer={question.answer} isKeyQuestion={question.isKeyQuestion} />
            
            {question.answerer && (
              <span className="text-xs text-text-muted">
                <span className="text-primary">@{question.answerer.nickname}</span> 回答
              </span>
            )}
            
            {question.answeredAt && (
              <span className="text-xs text-text-muted">
                {formatTime(question.answeredAt)}
              </span>
            )}
          </div>
        )}

        {isPending && isOwn && !isHost && onWithdraw && (
          <button
            onClick={() => onWithdraw(question.id)}
            className="mt-2 text-xs text-text-muted hover:text-no transition-colors"
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
