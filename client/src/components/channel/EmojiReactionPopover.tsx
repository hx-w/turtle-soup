import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { REACTION_EMOJIS } from '../../lib/emojis';

interface EmojiReactionPopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  currentEmoji?: string;
  emojiUsers?: { emoji: string; nickname: string; avatarSeed: string }[];
  selectedBubbleEmoji?: string;
}

export default function EmojiReactionPopover({
  anchorRef,
  isOpen,
  onClose,
  onSelect,
  currentEmoji,
  emojiUsers,
  selectedBubbleEmoji,
}: EmojiReactionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; direction: 'up' | 'down' }>({
    top: 0,
    left: 0,
    direction: 'down',
  });

  const calcPosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverHeight = popover.offsetHeight;
    const popoverWidth = popover.offsetWidth;

    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    const direction = spaceBelow >= popoverHeight + 8 ? 'down' : spaceAbove >= popoverHeight + 8 ? 'up' : 'down';

    let top: number;
    if (direction === 'down') {
      top = anchorRect.bottom + 8;
    } else {
      top = anchorRect.top - popoverHeight - 8;
    }

    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));

    setPosition({ top, left, direction });
  }, [anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    // Defer position calculation so the popover is rendered and measurable
    requestAnimationFrame(calcPosition);
  }, [isOpen, calcPosition]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredUsers = selectedBubbleEmoji && emojiUsers
    ? emojiUsers.filter((u) => u.emoji === selectedBubbleEmoji)
    : undefined;

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-72"
      style={{ top: position.top, left: position.left }}
    >
      {/* User list for the selected bubble emoji */}
      {filteredUsers && filteredUsers.length > 0 && (
        <div className="mb-2 pb-2 border-b border-border">
          <div className="text-xs text-text-muted mb-1.5">
            {selectedBubbleEmoji} 的反应
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filteredUsers.map((u) => (
              <div
                key={u.nickname}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-surface text-xs text-text"
              >
                <img
                  src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${u.avatarSeed}`}
                  alt={u.nickname}
                  className="w-4 h-4 rounded-full"
                />
                <span className="truncate max-w-[80px]">{u.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg
              cursor-pointer transition-colors
              ${currentEmoji === emoji
                ? 'bg-primary/20 ring-1 ring-primary/40'
                : 'hover:bg-surface'
              }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
