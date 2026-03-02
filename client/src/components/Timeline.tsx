import { motion } from 'framer-motion';
import {
  Crown, UserPlus, HelpCircle, MessageCircle,
  Check, Target, Eye, Flag, Clock
} from 'lucide-react';
import type { TimelineEvent } from '../types';

const eventConfig = {
  channel_created: { icon: Crown, color: 'text-amber-400' },
  player_joined: { icon: UserPlus, color: 'text-blue-400' },
  first_question: { icon: HelpCircle, color: 'text-purple-400' },
  question_asked: { icon: MessageCircle, color: 'text-slate-400' },
  question_answered: { icon: Check, color: 'text-green-400' },
  key_question: { icon: Target, color: 'text-amber-400' },
  role_changed: { icon: Eye, color: 'text-indigo-400' },
  truth_revealed: { icon: Eye, color: 'text-pink-400' },
  channel_ended: { icon: Flag, color: 'text-red-400' },
};

interface TimelineProps {
  events: TimelineEvent[];
  compact?: boolean;
}

export default function Timeline({ events, compact = false }: TimelineProps) {
  const groupedEvents = groupEventsByTime(events);

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-3 pl-8">
        {groupedEvents.map((group, groupIndex) => (
          <div key={groupIndex}>
            {!compact && (
              <div className="flex items-center gap-2 mb-2 text-xs text-text-muted">
                <Clock className="w-3 h-3" />
                <span>{group.label}</span>
              </div>
            )}

            {group.events.map((event, index) => (
              <TimelineEventItem
                key={event.id}
                event={event}
                compact={compact}
                index={index}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineEventItem({ event, compact, index }: { event: TimelineEvent; compact: boolean; index: number }) {
  const config = eventConfig[event.type as keyof typeof eventConfig];
  if (!config) return null;

  const Icon = config.icon;
  const meta = event.metadata as Record<string, any> | null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="relative mb-2"
    >
      <div className="absolute -left-5 top-1.5 w-4 h-4 rounded-full bg-surface border-2 border-primary flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
      </div>

      <div className={`bg-card/60 backdrop-blur-xl border border-border rounded-xl p-2.5 ${compact ? 'text-xs' : 'text-sm'}`}>
        <div className="flex items-start gap-2">
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.color}`} />
          <div className="flex-1 min-w-0">
            <p className="text-text leading-relaxed">
              {formatEventText(event, meta, compact)}
            </p>
            {!compact && (
              <p className="text-xs text-text-muted mt-1">
                {new Date(event.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatEventText(event: TimelineEvent, meta: Record<string, any> | null | undefined, compact: boolean): string {
  const nickname = event.user?.nickname || '系统';

  if (compact) {
    switch (event.type) {
      case 'channel_created': return `@${nickname} 创建`;
      case 'player_joined': return `@${nickname} 加入`;
      case 'first_question': return `首个问题`;
      case 'question_asked': return `@${nickname} 提问`;
      case 'question_answered': return `已回答「${formatAnswer(meta?.answer)}」`;
      case 'key_question': return `🎯 关键问题`;
      case 'role_changed': return `@${nickname} → 主理人`;
      case 'truth_revealed': return `@${nickname} 看真相`;
      case 'channel_ended': return `结束`;
      default: return '';
    }
  }

  switch (event.type) {
    case 'channel_created': return `创建者 @${nickname} 创建了此汤`;
    case 'player_joined': return `@${nickname} 加入了游戏`;
    case 'first_question': return `@${nickname} 提出了第一个问题`;
    case 'question_asked': return `@${nickname} 提出了问题`;
    case 'question_answered': return `问题被 @${meta?.answerer || '主持人'} 回答「${formatAnswer(meta?.answer)}」`;
    case 'key_question': return `🎯 @${nickname} 的问题被标记为关键问题`;
    case 'role_changed': return `@${nickname} 从玩家变为主理人`;
    case 'truth_revealed': return `@${nickname} 查看了汤底`;
    case 'channel_ended': return `游戏结束，共 ${meta?.totalQuestions || 0} 个问题`;
    default: return '';
  }
}

function formatAnswer(answer: string | undefined): string {
  const labels: Record<string, string> = {
    yes: '是',
    no: '否',
    irrelevant: '无关',
    partial: '部分正确',
  };
  return labels[answer || ''] || answer || '';
}

function groupEventsByTime(events: TimelineEvent[]) {
  const groups: { label: string; events: TimelineEvent[] }[] = [];
  const now = new Date();

  for (const event of events) {
    const eventTime = new Date(event.createdAt);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    let label: string;
    if (diffMins < 5) label = '刚刚';
    else if (diffMins < 60) label = `${diffMins} 分钟前`;
    else if (diffMins < 120) label = '1 小时前';
    else label = eventTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    let group = groups.find(g => g.label === label);
    if (!group) {
      group = { label, events: [] };
      groups.push(group);
    }
    group.events.push(event);
  }

  return groups;
}
