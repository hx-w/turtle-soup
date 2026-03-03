import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, PieChart, Minus, Target, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Question } from '../../types';

interface AnswerDrawerProps {
  pendingQuestions: Question[];
  onAnswer: (questionId: string, answer: 'yes' | 'no' | 'irrelevant' | 'partial', isKeyQuestion: boolean) => Promise<void>;
}

type AnswerType = 'yes' | 'no' | 'irrelevant' | 'partial';

const answerConfig = {
  yes: { label: '是', icon: Check, color: 'bg-yes/15 border-yes text-yes active:bg-yes/30' },
  no: { label: '否', icon: X, color: 'bg-no/15 border-no text-no active:bg-no/30' },
  partial: { label: '部分正确', icon: PieChart, color: 'bg-orange-500/15 border-orange-500 text-orange-600 dark:text-orange-400 active:bg-orange-500/30' },
  irrelevant: { label: '无关', icon: Minus, color: 'bg-irrelevant/15 border-irrelevant text-irrelevant active:bg-irrelevant/30' },
};

export default function AnswerDrawer({ pendingQuestions, onAnswer }: AnswerDrawerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerType | null>(null);
  const [isKeyQuestion, setIsKeyQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const currentQuestion = pendingQuestions[currentIndex];

  useEffect(() => {
    setSelectedAnswer(null);
    setIsKeyQuestion(false);
  }, [currentIndex]);

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
      handleSubmit();
      return;
    }
    setSelectedAnswer(answer);
    setIsKeyQuestion(false);
  };

  const handleSubmit = async () => {
    if (!selectedAnswer || !currentQuestion || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAnswer(currentQuestion.id, selectedAnswer, isKeyQuestion);
      if (currentIndex < pendingQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
      setSelectedAnswer(null);
      setIsKeyQuestion(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < pendingQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsKeyQuestion(false);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-6 text-center safe-area-bottom">
        <p className="text-text-muted">暂无待回答的问题</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border shadow-xl safe-area-bottom"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2 flex items-center justify-center text-text-muted"
      >
        <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? '' : 'rotate-180'}`} />
      </button>

      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                <span>待回答 ({currentIndex + 1}/{pendingQuestions.length})</span>
                <span>
                  {new Date(currentQuestion.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="bg-card border border-border rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <img
                    src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${currentQuestion.asker.avatarSeed}`}
                    className="w-6 h-6 rounded-full bg-surface flex-shrink-0"
                    alt={currentQuestion.asker.nickname}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-muted">@{currentQuestion.asker.nickname}</p>
                    <p className="text-sm text-text leading-relaxed line-clamp-2">{currentQuestion.content}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 pb-2 grid grid-cols-2 gap-2">
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
                      flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 font-medium text-base
                      transition-colors duration-150 active:scale-95
                      ${config.color}
                      ${isSelected ? 'ring-2 ring-offset-2 ring-offset-surface' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                    <span>{config.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {selectedAnswer && (selectedAnswer === 'yes' || selectedAnswer === 'no') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-2 overflow-hidden"
                >
                  <button
                    onClick={() => setIsKeyQuestion(!isKeyQuestion)}
                    className={`
                      w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2
                      transition-colors duration-150
                      ${isKeyQuestion
                         ? 'bg-orange-500/20 border-orange-500 text-orange-600 dark:text-orange-400'
                         : 'bg-card border-border text-text-muted'}
                    `}
                  >
                    <Target className="w-4 h-4" />
                    <span className="text-sm">标记为关键问题</span>
                    {isKeyQuestion && <Check className="w-4 h-4" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {selectedAnswer && (selectedAnswer === 'yes' || selectedAnswer === 'no') && (
              <div className="px-4 pb-4 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSkip}
                  className="flex-1 py-3 rounded-xl border border-border text-text-muted text-sm font-medium"
                >
                  跳过
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium"
                >
                  {isSubmitting ? '提交中...' : '确认回答'}
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isExpanded && (
        <div className="px-4 pb-4 flex items-center justify-between">
          <span className="text-sm text-text-muted">待回答: {pendingQuestions.length} 个问题</span>
          <button
            onClick={() => setIsExpanded(true)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm"
          >
            开始回答
          </button>
        </div>
      )}
    </motion.div>
  );
}
