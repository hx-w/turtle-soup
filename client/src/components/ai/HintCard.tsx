import { Eye, EyeOff, Lightbulb } from 'lucide-react';
import type { AiHint } from '../../types';

interface HintCardProps {
  hint: AiHint;
  index: number;
  isMine: boolean;
  onTogglePublic: (hintId: string, isPublic: boolean) => void;
}

export default function HintCard({ hint, index, isMine, onTogglePublic }: HintCardProps) {
  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border rounded-xl px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb size={12} className="text-text-muted" />
            <span className="text-xs text-text-muted">#{index + 1}</span>
            {!isMine && (
              <span className="text-xs text-text-muted">
                @{hint.user.nickname}
              </span>
            )}
            {isMine && hint.isPublic && (
              <span className="text-xs text-primary">已公开</span>
            )}
            {isMine && !hint.isPublic && (
              <span className="text-xs text-text-muted">仅自己可见</span>
            )}
          </div>
          <p className="text-sm text-text leading-relaxed">{hint.content}</p>
        </div>

        {isMine && (
          <button
            type="button"
            onClick={() => onTogglePublic(hint.id, !hint.isPublic)}
            className="flex-shrink-0 p-1.5 rounded-lg text-text-muted hover:text-text
                       hover:bg-surface/50 transition-colors cursor-pointer"
            title={hint.isPublic ? '取消公开' : '公开给所有人'}
          >
            {hint.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}
