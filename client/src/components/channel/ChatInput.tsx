import { useRef, useEffect, useCallback, useState } from 'react';
import { Loader2, Send, ShieldAlert } from 'lucide-react';

interface ChatInputProps {
  isHost: boolean;
  isActive: boolean;
  channelEnded: boolean;
  onSend: (content: string) => Promise<unknown>;
}

export default function ChatInput({ isHost, isActive, channelEnded, onSend }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [text, autoResize]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setText('');
    } catch {
      // Toast handled upstream
    } finally {
      setSending(false);
    }
  }

  // During active game: hosts can only view. After game ends: everyone can chat.
  if (isActive && isHost) {
    return (
      <div className="flex-shrink-0 bg-surface border-t border-border px-4 py-3 safe-area-bottom">
        <div className="flex items-center justify-center gap-2 py-2">
          <ShieldAlert className="w-4 h-4 text-text-muted/60" />
          <span className="text-sm text-text-muted">游戏进行中主持人仅可查看讨论</span>
        </div>
      </div>
    );
  }

  // Archived or otherwise unavailable
  if (!isActive && !channelEnded) {
    return (
      <div className="flex-shrink-0 bg-surface border-t border-border px-4 py-3 safe-area-bottom">
        <div className="flex items-center justify-center gap-2 py-2">
          <ShieldAlert className="w-4 h-4 text-text-muted/60" />
          <span className="text-sm text-text-muted">频道不可用</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 bg-surface border-t border-border px-4 py-3 safe-area-bottom">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="说点什么..."
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
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="发送消息"
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center
                     bg-primary hover:bg-primary-light disabled:opacity-40
                     disabled:cursor-not-allowed rounded-xl text-white
                     transition-all duration-200 cursor-pointer"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
