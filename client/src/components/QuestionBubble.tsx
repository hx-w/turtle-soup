import { motion } from 'framer-motion';
import { Undo2, Check, X, Minus } from 'lucide-react';
import AnswerStamp from './AnswerStamp';
import type { Question } from '../types';

interface QuestionBubbleProps {
  question: Question;
  currentUserId?: string;
  isHost?: boolean;
  onWithdraw?: (questionId: string) => void;
  onAnswer?: (questionId: string, answer: 'yes' | 'no' | 'irrelevant') => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-3 px-4 py-3"
    >
      {/* Avatar */}
      <img
        src={avatarUrl}
        alt={question.asker.nickname}
        className="w-9 h-9 rounded-full bg-surface flex-shrink-0 mt-0.5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text truncate">
            {question.asker.nickname}
          </span>
          <span className="text-xs text-text-muted flex-shrink-0">
            {formatTime(question.createdAt)}
          </span>
        </div>

        {/* Question text */}
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl rounded-tl-md px-4 py-3">
          <p className="text-sm text-text leading-relaxed break-words">
            {question.content}
          </p>
        </div>

        {/* Answer stamp / host answer buttons / withdraw */}
        <div className="mt-2 flex items-center gap-2">
          {isAnswered && question.answer && (
            <AnswerStamp answer={question.answer} />
          )}

          {isPending && isHost && onAnswer && (
            <>
              <button
                onClick={() => onAnswer(question.id, 'yes')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-yes/15 text-yes border border-yes/30 hover:bg-yes/25
                           transition-colors duration-200 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                是
              </button>
              <button
                onClick={() => onAnswer(question.id, 'no')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-no/15 text-no border border-no/30 hover:bg-no/25
                           transition-colors duration-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                否
              </button>
              <button
                onClick={() => onAnswer(question.id, 'irrelevant')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-irrelevant/15 text-irrelevant border border-irrelevant/30
                           hover:bg-irrelevant/25 transition-colors duration-200 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
                无关
              </button>
            </>
          )}

          {isPending && isOwn && !isHost && onWithdraw && (
            <button
              onClick={() => onWithdraw(question.id)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-text-muted
                         hover:text-no hover:bg-no/10 border border-border hover:border-no/30
                         transition-all duration-200 cursor-pointer"
            >
              <Undo2 className="w-3 h-3" />
              <span>撤回</span>
            </button>
          )}

          {isPending && !isOwn && !isHost && (
            <span className="text-xs text-text-muted">等待回答中...</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
