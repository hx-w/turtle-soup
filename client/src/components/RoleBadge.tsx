interface RoleBadgeProps {
  role: 'creator' | 'host' | 'player';
  size?: 'sm' | 'md';
}

const roleConfig = {
  creator: {
    label: '创建者',
    emoji: '👑',
    color: 'bg-amber-500/20 text-amber-400 border-amber-400/30',
  },
  host: {
    label: '主理人',
    emoji: '🎭',
    color: 'bg-purple-500/20 text-purple-400 border-purple-400/30',
  },
  player: {
    label: '玩家',
    emoji: '🔍',
    color: 'bg-slate-500/20 text-slate-400 border-slate-400/30',
  },
};

export default function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const config = roleConfig[role];

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
        ${config.color}
      `}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
