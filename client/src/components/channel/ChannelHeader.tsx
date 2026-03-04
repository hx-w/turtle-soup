import { Users } from 'lucide-react';
import type { Channel } from '../../types';
import ProgressBar from '../ProgressBar';

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
  /** AI 破案进度 0-100 */
  aiProgress?: number;
  /** 游戏是否已结束 */
  aiProgressFrozen?: boolean;
}

export default function ChannelHeader({
  channel,
  isActive,
  answeredCount,
  onlineUsersCount,
  onShowOnlineUsers,
  aiProgress,
  aiProgressFrozen,
}: ChannelHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-bg border-b border-border/40 px-4 py-3">
      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
          <h1 className="text-base font-heading font-bold text-text truncate max-w-[50vw] sm:max-w-none sm:text-lg">
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
          aria-label="在线用户"
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-surface hover:bg-card border border-border
                     text-text-muted text-sm transition-colors duration-200 cursor-pointer"
        >
          <Users className="w-4 h-4" />
          <span>{onlineUsersCount}</span>
        </button>
      </div>

      {channel.maxQuestions > 0 && (
        <div className="mt-2">
          <ProgressBar
            label="问题配额"
            progress={(answeredCount / channel.maxQuestions) * 100}
            valueText={`${answeredCount} / ${channel.maxQuestions}`}
            variant="primary"
            compact
          />
        </div>
      )}

      {/* AI 推理进度条 */}
      {aiProgress !== undefined && (
        <div className={channel.maxQuestions > 0 ? 'mt-1' : 'mt-2'}>
          <ProgressBar
            label="推理进度"
            progress={aiProgress}
            variant="gradient"
            frozen={aiProgressFrozen}
            compact
          />
        </div>
      )}
    </header>
  );
}
