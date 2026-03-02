import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import type { Channel } from '../../types';

const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  hell: '地狱',
};

const difficultyColors: Record<string, string> = {
  easy: 'text-yes bg-yes/15',
  medium: 'text-accent bg-accent/15',
  hard: 'text-no bg-no/15',
  hell: 'text-no bg-no/25',
};

interface ChannelHeaderProps {
  channel: Channel;
  isActive: boolean;
  answeredCount: number;
  onlineUsersCount: number;
  onShowOnlineUsers: () => void;
}

export default function ChannelHeader({
  channel,
  isActive,
  answeredCount,
  onlineUsersCount,
  onShowOnlineUsers,
}: ChannelHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-xl border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-heading font-bold text-text truncate">
            {channel.title}
          </h1>
          <span
            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
              isActive
                ? 'bg-yes/15 text-yes'
                : 'bg-text-muted/15 text-text-muted'
            }`}
          >
            {isActive ? '进行中' : '已结束'}
          </span>
          <span
            className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
              difficultyColors[channel.difficulty] ||
              'text-text-muted bg-surface'
            }`}
          >
            {difficultyLabels[channel.difficulty] || channel.difficulty}
          </span>
        </div>

        <button
          onClick={onShowOnlineUsers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     bg-surface hover:bg-card border border-border
                     text-text-muted text-sm transition-colors duration-200 cursor-pointer"
        >
          <Users className="w-4 h-4" />
          <span>{onlineUsersCount}</span>
        </button>
      </div>

      {channel.maxQuestions > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>进度</span>
            <span>
              {answeredCount} / {channel.maxQuestions}
            </span>
          </div>
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(
                  (answeredCount / channel.maxQuestions) * 100,
                  100,
                )}%`,
              }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
