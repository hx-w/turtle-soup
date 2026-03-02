import { motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import AnswerStamp from './AnswerStamp';
import type { Question } from '../types';

interface QuestionBubbleProps {
  question: Question;
  currentUserId?: string;
  isHost?: boolean;
  onWithdraw?: (questionId: string) => void;
}

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

        {isPending && !isOwn && !isHost && (
          <span className="mt-2 text-xs text-text-muted">等待回答中...</span>
        )}
      </div>
    </motion.div>
  );
}
