import { Check, X, Minus } from 'lucide-react';
import type { Question } from '../../types';

interface HostAnswerPanelProps {
  pendingQuestions: Question[];
  onConfirmAnswer: (
    questionId: string,
    answer: 'yes' | 'no' | 'irrelevant',
  ) => void;
}

export default function HostAnswerPanel({
  pendingQuestions,
  onConfirmAnswer,
}: HostAnswerPanelProps) {
  if (pendingQuestions.length === 0) {
    return (
      <div className="flex-shrink-0 bg-surface border-t border-border px-4 py-4">
        <p className="text-sm text-text-muted text-center">
          暂无待回答的问题
        </p>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 bg-surface border-t border-border">
      <div className="px-4 py-2 border-b border-border">
        <p className="text-xs font-medium text-text-muted">
          待回答 ({pendingQuestions.length})
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {pendingQuestions.map((q) => (
          <div key={q.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <img
                src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${q.asker.avatarSeed}`}
                alt={q.asker.nickname}
                className="w-7 h-7 rounded-full bg-surface flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted mb-0.5">
                  {q.asker.nickname}
                </p>
                <p className="text-sm text-text break-words">{q.content}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 ml-10">
              <button
                onClick={() => onConfirmAnswer(q.id, 'yes')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-yes/15 text-yes border border-yes/30 hover:bg-yes/25
                           transition-colors duration-200 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                是
              </button>
              <button
                onClick={() => onConfirmAnswer(q.id, 'no')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-no/15 text-no border border-no/30 hover:bg-no/25
                           transition-colors duration-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                否
              </button>
              <button
                onClick={() => onConfirmAnswer(q.id, 'irrelevant')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                           bg-irrelevant/15 text-irrelevant border border-irrelevant/30
                           hover:bg-irrelevant/25 transition-colors duration-200 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
                无关
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
