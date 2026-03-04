import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Loader2, ChevronUp } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface DiscussionPanelProps {
  messages: ChatMessage[];
  currentUserId?: string;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  endedAt?: string | null;
}

export interface DiscussionPanelHandle {
  scrollRef: HTMLDivElement | null;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Check whether two messages should be visually grouped (same sender, <2min apart). */
function shouldGroup(prev: ChatMessage | undefined, curr: ChatMessage): boolean {
  if (!prev) return false;
  if (prev.userId !== curr.userId) return false;
  const gap = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap < 2 * 60 * 1000; // 2 minutes
}

function ChatBubble({
  message,
  isOwn,
  grouped,
}: {
  message: ChatMessage;
  isOwn: boolean;
  grouped: boolean;
}) {
  const avatarUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${message.user.avatarSeed}`;

  if (isOwn) {
    return (
      <div className={`flex justify-end px-4 ${grouped ? 'mt-0.5' : 'mt-3'}`}>
        <div className="max-w-[75%] flex flex-col items-end">
          {!grouped && (
            <span className="text-xs text-text-muted mb-1 mr-1">
              {formatTime(message.createdAt)}
            </span>
          )}
          <div className="bg-primary/20 border border-primary/20 rounded-2xl rounded-tr-md px-3.5 py-2">
            <p className="text-sm text-text leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 px-4 ${grouped ? 'mt-0.5 pl-[52px]' : 'mt-3'}`}>
      {!grouped && (
        <img
          src={avatarUrl}
          alt={message.user.nickname}
          className="w-8 h-8 rounded-full bg-surface flex-shrink-0 mt-0.5"
        />
      )}
      <div className="max-w-[75%] flex flex-col">
        {!grouped && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-text-muted">
              {message.user.nickname}
            </span>
            <span className="text-xs text-text-muted/60">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}
        <div className="bg-card/70 border border-border rounded-2xl rounded-tl-md px-3.5 py-2">
          <p className="text-sm text-text leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
}

const DiscussionPanel = forwardRef<DiscussionPanelHandle, DiscussionPanelProps>(
  function DiscussionPanel(
    { messages, currentUserId, hasMore, loading, onLoadMore, endedAt },
    ref,
  ) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevLengthRef = useRef(messages.length);

    useImperativeHandle(ref, () => ({
      get scrollRef() {
        return scrollRef.current;
      },
    }));

    // Auto-scroll on new messages (only when already near bottom)
    useEffect(() => {
      if (messages.length > prevLengthRef.current) {
        const el = scrollRef.current;
        if (el) {
          const isNearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          if (isNearBottom) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
      prevLengthRef.current = messages.length;
    }, [messages.length]);

    // Scroll to bottom on first render
    useEffect(() => {
      bottomRef.current?.scrollIntoView();
    }, []);

    const endTime = endedAt ? new Date(endedAt).getTime() : null;

    return (
      <div ref={scrollRef} className="flex flex-col pb-4">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center text-text-muted py-16">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">还没有讨论</p>
            <p className="text-xs mt-1">和其他玩家一起整理思路吧</p>
          </div>
        ) : (
          <>
            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-3">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted
                             hover:text-text bg-surface/60 hover:bg-surface border border-border
                             rounded-full transition-colors duration-150 cursor-pointer
                             disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                  加载更多
                </button>
              </div>
            )}

        {/* Messages */}
            {messages.map((msg, i) => {
              const isOwn = msg.userId === currentUserId;
              const grouped = shouldGroup(messages[i - 1], msg);

              let showEndDivider = false;
              if (endTime) {
                const msgTime = new Date(msg.createdAt).getTime();
                if (msgTime > endTime) {
                  if (i === 0) {
                    showEndDivider = true;
                  } else {
                    const prevTime = new Date(messages[i - 1].createdAt).getTime();
                    showEndDivider = prevTime <= endTime;
                  }
                }
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {showEndDivider && (
                    <div className="flex items-center gap-3 px-4 my-4">
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-[11px] text-text-muted/50 whitespace-nowrap">
                        游戏结束
                      </span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                  )}
                  <ChatBubble
                    message={msg}
                    isOwn={isOwn}
                    grouped={showEndDivider ? false : grouped}
                  />
                </motion.div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>
    );
  },
);

export default DiscussionPanel;
