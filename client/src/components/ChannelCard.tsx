import { useNavigate } from 'react-router-dom';
import { Users, MessageCircle, Clock, Star } from 'lucide-react';
import type { Channel } from '../types';
import Avatar from './Avatar';

interface ChannelCardProps {
  channel: Channel;
}

const difficultyConfig = {
  easy: { label: '简单', color: 'bg-yes/20 text-yes' },
  medium: { label: '中等', color: 'bg-accent/20 text-accent' },
  hard: { label: '困难', color: 'bg-orange-500/20 text-orange-400' },
  hell: { label: '地狱', color: 'bg-no/20 text-no' },
} as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function ChannelCard({ channel }: ChannelCardProps) {
  const navigate = useNavigate();
  const diff = difficultyConfig[channel.difficulty] ?? difficultyConfig.medium;
  const answeredCount = channel._count?.questions ?? 0;
  const memberCount = channel._count?.members ?? 0;
  const maxQ = channel.maxQuestions;

  const progressPercent =
    maxQ > 0 ? Math.min((answeredCount / maxQ) * 100, 100) : 0;

  const isEnded = channel.status === 'ended';

  return (
    <button
      onClick={() => navigate(`/channel/${channel.id}`)}
      className={`bg-card shadow-sm border border-border/40
                 p-5 text-left w-full cursor-pointer
                 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-border/80
                 md:hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:hover:-translate-y-1 md:hover:border-border/80
                 active:translate-y-0 md:active:-translate-y-1
                 transition-all duration-300 ease-out rounded-2xl
                 group ${isEnded ? 'opacity-70 grayscale-[20%]' : ''}`}
      aria-label={`进入房间: ${channel.title}`}
    >
      {/* Title + badges */}
      <div className="flex items-center gap-2">
        <h3 className="font-heading font-bold text-[17px] text-text group-hover:text-primary transition-colors duration-200 line-clamp-1 flex-1 min-w-0">
          {channel.title}
        </h3>
        <span className={`flex-shrink-0 badge ${diff.color}`}>{diff.label}</span>
        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide ${
          isEnded
            ? 'bg-surface text-text-muted'
            : 'bg-yes/15 text-yes'
        }`}>
          {isEnded ? '已结束' : '进行中'}
        </span>
      </div>

      {/* Surface preview */}
      <p className="text-text-muted text-sm mt-2 line-clamp-2 leading-relaxed">
        {channel.surface}
      </p>

      {/* Rating row (ended channels only) */}
      {isEnded && channel.averageRating != null && channel.averageRating > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <Star size={13} className="fill-accent text-accent" />
          <span className="text-accent text-sm font-medium">{channel.averageRating.toFixed(1)}</span>
          {channel.ratingCount != null && channel.ratingCount > 0 && (
            <span className="text-text-muted text-xs ml-0.5">({channel.ratingCount}人评分)</span>
          )}
        </div>
      )}

      {maxQ > 0 && (
        <div className="mt-2.5">
          <div className="w-full h-1.5 bg-border/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
      {/* Bottom row */}
      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {/* Player count */}
          <span className="flex items-center gap-1">
            <Users size={13} />
            {memberCount}
          </span>

          {/* Question progress */}
          <span className="flex items-center gap-1">
            <MessageCircle size={13} />
            {answeredCount}
            {maxQ > 0 ? `/${maxQ}` : ''}
          </span>
        </div>

        {/* Creator + time */}
        <div className="flex items-center gap-2 text-xs text-text-muted shrink-0">
          <Avatar seed={channel.creator.avatarSeed} size={18} />
          <span className="max-w-[60px] truncate">{channel.creator.nickname}</span>
          <span className="flex items-center gap-0.5">
            <Clock size={11} />
            {timeAgo(channel.createdAt)}
          </span>
        </div>
      </div>

      {/* Tags */}
      {channel.tags.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {channel.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary-light"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
