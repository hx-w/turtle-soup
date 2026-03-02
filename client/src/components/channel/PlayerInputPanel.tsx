import { useRef } from 'react';
import { Loader2, Send } from 'lucide-react';

interface PlayerInputPanelProps {
  hasPending: boolean;
  questionText: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

export default function PlayerInputPanel({
  hasPending,
  questionText,
  onChangeText,
  onSubmit,
  submitting,
}: PlayerInputPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="sticky bottom-0 bg-surface/80 backdrop-blur-xl border-t border-border px-4 py-3">
      {hasPending ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-text-muted">等待回答中...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={questionText}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="输入你的问题..."
            maxLength={500}
            className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5
                       text-sm text-text placeholder:text-text-muted/50
                       focus:outline-none focus:border-primary/50
                       transition-colors duration-200"
          />
          <button
            onClick={onSubmit}
            disabled={!questionText.trim() || submitting}
            className="p-2.5 bg-primary hover:bg-primary-light disabled:opacity-40
                       disabled:cursor-not-allowed rounded-xl text-white
                       transition-all duration-200 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
