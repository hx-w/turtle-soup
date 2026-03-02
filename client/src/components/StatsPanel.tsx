import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  MessageSquare,
  RotateCcw,
  Clock,
  HelpCircle,
  Star,
  Users,
} from 'lucide-react';
import type { ChannelStats } from '../types';

interface StatsPanelProps {
  stats: ChannelStats;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}秒`;
  return `${mins}分${secs}秒`;
}

function DistributionBar({
  distribution,
  total,
}: {
  distribution: { yes: number; no: number; irrelevant: number; partial: number };
  total: number;
}) {
  if (total === 0) return null;
  const yesPercent = (distribution.yes / total) * 100;
  const noPercent = (distribution.no / total) * 100;
  const partialPercent = (distribution.partial / total) * 100;
  const irrelevantPercent = (distribution.irrelevant / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-4 rounded-full overflow-hidden bg-surface">
        {yesPercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${yesPercent}%` }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-yes"
          />
        )}
        {noPercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${noPercent}%` }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-no"
          />
        )}
        {partialPercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${partialPercent}%` }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-amber-500"
          />
        )}
        {irrelevantPercent > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${irrelevantPercent}%` }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-irrelevant"
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-yes" />
          <span className="text-text-muted">是 {distribution.yes}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-no" />
          <span className="text-text-muted">否 {distribution.no}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-text-muted">部分 {distribution.partial}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-irrelevant" />
          <span className="text-text-muted">无关 {distribution.irrelevant}</span>
        </span>
      </div>
    </div>
  );
}

function AwardCard({
  icon: Icon,
  title,
  nickname,
  detail,
  color,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  nickname: string;
  detail: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-surface/50 border border-border rounded-xl p-4 flex items-start gap-3"
    >
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted mb-0.5">{title}</p>
        <p className="text-sm font-semibold text-text truncate">@{nickname}</p>
        <p className="text-xs text-text-muted mt-0.5">{detail}</p>
      </div>
    </motion.div>
  );
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const total = stats.totalQuestions;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4 text-center">
          <HelpCircle className="w-5 h-5 text-primary-light mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-text">{total}</p>
          <p className="text-xs text-text-muted">总问题数</p>
        </div>
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4 text-center">
          <Clock className="w-5 h-5 text-primary-light mx-auto mb-1" />
          <p className="text-2xl font-heading font-bold text-text">
            {stats.duration ? formatDuration(stats.duration) : '--'}
          </p>
          <p className="text-xs text-text-muted">游戏时长</p>
        </div>
      </div>

      {stats.keyQuestionCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
          <Target className="w-6 h-6 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-text">🎯 关键问题</p>
            <p className="text-xs text-text-muted">共 {stats.keyQuestionCount} 个关键问题被标记</p>
          </div>
        </div>
      )}

      {typeof stats.averageRating === 'number' && stats.averageRating > 0 && (
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text">玩家评分</p>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i <= Math.round(stats.averageRating!)
                        ? 'text-accent fill-accent'
                        : 'text-border'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-accent">
                {stats.averageRating.toFixed(1)}
              </span>
              <span className="text-xs text-text-muted">
                ({stats.ratingCount} 人评价)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4">
        <p className="text-sm font-medium text-text mb-3">回答分布</p>
        <DistributionBar distribution={stats.distribution} total={total} />
      </div>

      {stats.hostContributions && stats.hostContributions.length > 0 && (
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4">
          <p className="text-sm font-medium text-text mb-3">🎭 主持人贡献</p>
          <div className="space-y-2">
            {stats.hostContributions.map((host) => (
              <div key={host.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${host.avatarSeed}`}
                    className="w-6 h-6 rounded-full bg-surface"
                    alt={host.nickname}
                  />
                  <span className="text-sm text-text">@{host.nickname}</span>
                  {host.role === 'creator' && <span className="text-xs">👑</span>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-yes">{host.yesCount} 是</span>
                  <span className="text-no">{host.noCount} 否</span>
                  {host.keyQuestions > 0 && (
                    <span className="text-amber-400">🎯{host.keyQuestions}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-text mb-3">趣味奖项</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stats.awards.bestDetective && (
            <AwardCard
              icon={Trophy}
              title="最佳侦探"
              nickname={stats.awards.bestDetective.nickname}
              detail={`${stats.awards.bestDetective.yes} 次命中`}
              color="bg-accent/15 text-accent"
              delay={0.1}
            />
          )}
          {stats.awards.lastYes && (
            <AwardCard
              icon={Target}
              title="关键一问"
              nickname={stats.awards.lastYes.asker?.nickname ?? ''}
              detail={
                stats.awards.lastYes.content.length > 30
                  ? stats.awards.lastYes.content.slice(0, 30) + '...'
                  : stats.awards.lastYes.content
              }
              color="bg-yes/15 text-yes"
              delay={0.2}
            />
          )}
          {stats.awards.mostActive && (
            <AwardCard
              icon={MessageSquare}
              title="话痨王"
              nickname={stats.awards.mostActive.nickname}
              detail={`${stats.awards.mostActive.total} 个问题`}
              color="bg-primary/15 text-primary-light"
              delay={0.3}
            />
          )}
          {stats.awards.mostWrong && (
            <AwardCard
              icon={RotateCcw}
              title="南辕北辙"
              nickname={stats.awards.mostWrong.nickname}
              detail={`${stats.awards.mostWrong.no} 次否定`}
              color="bg-no/15 text-no"
              delay={0.4}
            />
          )}
        </div>
      </div>
    </div>
  );
}
