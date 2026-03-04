import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  PieChart, 
  Lightbulb, 
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

const statusStyles = {
  confirmed: `
    bg-white dark:bg-gray-800/80
    border border-gray-200/80 dark:border-gray-700/50
    shadow-sm hover:shadow-md
  `,
  partial: `
    bg-white dark:bg-gray-800/80
    border-2 border-dashed border-orange-300 dark:border-orange-600/50
    shadow-sm hover:shadow-md
  `,
  excluded: `
    bg-gray-50 dark:bg-gray-900/60
    border border-gray-200/50 dark:border-gray-800/50
    opacity-60
    shadow-sm
  `,
  hint: `
    bg-white dark:bg-gray-800/80
    border border-blue-200 dark:border-blue-700/50
    shadow-sm hover:shadow-md
  `,
};

const statusIcons = {
  confirmed: CheckCircle,
  partial: PieChart,
  excluded: XCircle,
  hint: Lightbulb,
};

const statusColors = {
  confirmed: 'text-yes',
  partial: 'text-orange-500',
  excluded: 'text-no',
  hint: 'text-primary',
};

export default function ClueNode({ node, onClick }: ClueNodeProps) {
  const StatusIcon = statusIcons[node.status];
  const CategoryIcon = categoryIconMap[node.category] || Circle;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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
          relative min-w-[180px] max-w-[220px]
          rounded-xl px-4 py-3
          transition-all duration-200 ease-out
          hover:scale-[1.02] hover:-translate-y-0.5
          ${statusStyles[node.status]}
          ${node.isKey ? 'ring-2 ring-amber-400 dark:ring-amber-500' : ''}
        `}
      >
        {node.isKey && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
            <Target className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        <div className="flex items-center gap-2 mb-1.5">
          <StatusIcon className={`w-4 h-4 ${statusColors[node.status]}`} />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <CategoryIcon className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
              {node.category}
            </span>
          </div>
        </div>

        <p className="text-[13px] text-gray-900 dark:text-gray-100 leading-relaxed line-clamp-3">
          {node.content}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          <span className={`text-[10px] font-medium ${statusColors[node.status]}`}>
            {node.status === 'confirmed' ? '已确认' :
             node.status === 'partial' ? '部分确认' :
             node.status === 'excluded' ? '已排除' : 'AI线索'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
