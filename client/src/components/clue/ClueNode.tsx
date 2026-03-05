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

// Apple-flat: opaque fills, no borders, no transparency
const statusConfig = {
  confirmed: {
    bg: 'bg-[#e8f5ee] dark:bg-[#1e3a2a]',
    iconColor: 'text-yes',
    textColor: 'text-text/90',
    label: '已确认',
    Icon: CheckCircle2,
  },
  partial: {
    bg: 'bg-[#e6eff7] dark:bg-[#1e2d3d]',
    iconColor: 'text-primary',
    textColor: 'text-text/90',
    label: '部分确认',
    Icon: CircleDashed,
  },
  excluded: {
    bg: 'bg-[#f0f1f3] dark:bg-[#2a2d31]',
    iconColor: 'text-text-muted/50',
    textColor: 'text-text-muted/60',
    label: '已排除',
    Icon: XCircle,
  },
  hint: {
    bg: 'bg-[#eaf0f6] dark:bg-[#1e2b38]',
    iconColor: 'text-primary',
    textColor: 'text-text/90',
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
          rounded-[14px] px-3.5 py-3
          transition-all duration-200 ease-out
          hover:-translate-y-0.5
          ${config.bg}
          ${node.isKey ? 'ring-[1.5px] ring-yes/25 dark:ring-yes/15' : ''}
          ${node.status === 'excluded' ? 'opacity-60' : ''}
        `}
      >
        {/* Key badge */}
        {node.isKey && (
          <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-yes rounded-full flex items-center justify-center">
            <Target className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {/* Category row */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <CategoryIcon className="w-3 h-3 text-text-muted/40 flex-shrink-0" />
          <span className="text-[10px] text-text-muted/50 tracking-wide truncate">
            {node.category}
          </span>
        </div>

        {/* Content */}
        <p className={`text-[13px] leading-[1.5] line-clamp-3 font-normal ${
          node.status === 'excluded'
            ? 'text-text-muted/50 line-through decoration-text-muted/20'
            : config.textColor
        }`}>
          {node.content}
        </p>

        {/* Status pill */}
        <div className="mt-2 flex items-center gap-1">
          <StatusIcon className={`w-3 h-3 ${config.iconColor}`} />
          <span className={`text-[10px] font-medium ${config.iconColor}`}>
            {config.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
