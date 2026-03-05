import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  CircleDashed,
  Target,
  User,
  Clock,
  MapPin,
  HelpCircle,
  Settings,
  Package,
  Activity,
  GitBranch,
  Zap,
  Circle,
} from 'lucide-react';
import type { PositionedClueNode } from '../../hooks/useClueGraph';

interface ClueNodeProps {
  node: PositionedClueNode;
  onClick?: () => void;
}

const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  '人物': User,
  '时间': Clock,
  '地点': MapPin,
  '原因': HelpCircle,
  '方式': Settings,
  '物品': Package,
  '状态': Activity,
  '关系': GitBranch,
  '事件': Zap,
  '其他': Circle,
};

// Apple flat design: solid muted fills, no semi-transparency, harmonious with dark bg
const statusConfig = {
  confirmed: {
    bg: 'bg-emerald-50 dark:bg-[#1a2f23]',
    shadow: 'shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)]',
    border: 'border border-emerald-200/60 dark:border-emerald-800/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    textColor: 'text-gray-900 dark:text-gray-100',
    label: '已确认',
    Icon: CheckCircle2,
  },
  partial: {
    bg: 'bg-amber-50 dark:bg-[#2a2520]',
    shadow: 'shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)]',
    border: 'border border-amber-200/60 dark:border-amber-800/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    textColor: 'text-gray-900 dark:text-gray-100',
    label: '部分确认',
    Icon: CircleDashed,
  },
  excluded: {
    bg: 'bg-gray-100 dark:bg-[#252525]',
    shadow: 'shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.25)]',
    border: 'border border-gray-200/60 dark:border-gray-700/40',
    iconColor: 'text-gray-400 dark:text-gray-500',
    textColor: 'text-gray-500 dark:text-gray-400',
    label: '已排除',
    Icon: XCircle,
  },
  hint: {
    bg: 'bg-indigo-50 dark:bg-[#222230]',
    shadow: 'shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)]',
    border: 'border border-indigo-200/60 dark:border-indigo-800/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    textColor: 'text-gray-900 dark:text-gray-100',
    label: 'AI线索',
    Icon: CircleDashed,
  },
};

export default function ClueNode({ node, onClick }: ClueNodeProps) {
  const config = statusConfig[node.status];
  const StatusIcon = config.Icon;
  const CategoryIcon = categoryIconMap[node.category] || Circle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={`absolute cursor-pointer select-none ${node.isKey ? 'z-10' : 'z-0'}`}
      style={{
        left: node.position.x,
        top: node.position.y,
        willChange: 'transform',
      }}
      onClick={onClick}
    >
      <div
        className={`
          relative min-w-[176px] max-w-[216px]
          rounded-2xl px-4 py-3.5
          transition-all duration-200 ease-out
          hover:-translate-y-0.5
          ${config.bg}
          ${config.shadow}
          ${config.border}
          ${node.isKey ? 'ring-2 ring-emerald-500 dark:ring-emerald-400' : ''}
          ${node.status === 'excluded' ? 'opacity-70' : ''}
        `}
      >
        {/* Key badge */}
        {node.isKey && (
          <div className="absolute -top-1.5 -right-1.5 w-[20px] h-[20px] bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
            <Target className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {/* Category row */}
        <div className="flex items-center gap-1.5 mb-2">
          <CategoryIcon className="w-3.5 h-3.5 text-text-muted/50 flex-shrink-0" />
          <span className="text-[11px] text-text-muted/60 tracking-wide truncate font-medium">
            {node.category}
          </span>
        </div>

        {/* Content */}
        <p className={`text-[13px] leading-[1.55] line-clamp-3 font-normal ${
          node.status === 'excluded'
            ? 'text-text-muted/50 line-through decoration-text-muted/20'
            : config.textColor
        }`}>
          {node.content}
        </p>

        {/* Status pill */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <StatusIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
          <span className={`text-[11px] font-medium ${config.iconColor}`}>
            {config.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
