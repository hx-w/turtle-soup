import { useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Clamp to max ~4 lines (approx 96px)
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [questionText, autoResize]);

  return (
    <div className="flex-shrink-0 bg-bg/80 backdrop-blur-md border-t border-border/40 px-4 py-3 safe-area-bottom">
      {hasPending ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-sm text-text-muted">等待回答中...</span>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
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
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5
                       text-base text-text placeholder:text-text-muted/50
                       focus:outline-none focus:border-primary/50
                       resize-none transition-colors duration-200 leading-normal"
          />
          <button
            onClick={onSubmit}
            disabled={!questionText.trim() || submitting}
            aria-label="提交问题"
            className="flex-shrink-0 w-11 h-11 flex items-center justify-center
                       bg-primary hover:bg-primary-light disabled:opacity-40
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
