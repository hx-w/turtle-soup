import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
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
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [direction, setDirection] = useState<'up' | 'down'>('down');

  const calcPosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverHeight = popover.offsetHeight;
    const popoverWidth = popover.offsetWidth;

    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const spaceAbove = anchorRect.top;
    const dir = spaceBelow >= popoverHeight + 8 ? 'down' : spaceAbove >= popoverHeight + 8 ? 'up' : 'down';
    setDirection(dir);

    let top: number;
    if (dir === 'down') {
      top = anchorRect.bottom + 8;
    } else {
      top = anchorRect.top - popoverHeight - 8;
    }

    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));

    setPosition({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(calcPosition);
  }, [isOpen, calcPosition]);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // Defer to avoid closing immediately on open
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredUsers = selectedBubbleEmoji && emojiUsers
    ? emojiUsers.filter((u) => u.emoji === selectedBubbleEmoji)
    : undefined;

  return createPortal(
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.95, y: direction === 'down' ? -4 : 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ top: position.top, left: position.left, transformOrigin: `center ${direction === 'down' ? 'top' : 'bottom'}` }}
      className="fixed z-[9999] bg-card/90 backdrop-blur-xl border border-border rounded-xl
        shadow-lg shadow-black/10 dark:shadow-black/40 p-3 w-72"
    >
      {/* 谁点了这个 emoji */}
      {filteredUsers && filteredUsers.length > 0 && (
        <div className="mb-2 pb-2 border-b border-border">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-lg leading-none">{selectedBubbleEmoji}</span>
            <span className="text-xs text-text-muted">{filteredUsers.length} 人</span>
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
                  className="w-4 h-4 rounded-full bg-surface"
                />
                <span className="truncate max-w-[80px]">{u.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emoji 网格 */}
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
              cursor-pointer transition-all duration-150
              active:scale-90 touch-manipulation
              ${currentEmoji === emoji
                ? 'bg-primary/20 ring-1 ring-primary/40'
                : 'hover:bg-surface active:bg-surface-hover'
              }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>,
    document.body,
  );
}
