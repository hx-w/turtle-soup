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
    bg-white/80 dark:bg-card/80
    border border-yes/30
    shadow-[0_8px_30px_rgb(var(--color-yes),0.15)]
  `,
  partial: `
    bg-white/80 dark:bg-card/80
    border border-orange-500/30 border-dashed
    shadow-[0_8px_30px_rgba(249,115,22,0.15)]
  `,
  excluded: `
    bg-white/40 dark:bg-card/40
    border border-border/20
    opacity-60
  `,
  hint: `
    bg-white/80 dark:bg-card/80
    border border-primary/30
    shadow-[0_8px_30px_rgb(var(--color-primary),0.15)]
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
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
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
          relative min-w-[160px] max-w-[200px]
          backdrop-blur-2xl rounded-2xl px-4 py-3
          transition-all duration-300 hover:scale-105 hover:-translate-y-1
          ${statusStyles[node.status]}
          ${node.isKey ? 'ring-2 ring-accent/50 ring-offset-2 ring-offset-bg scale-105' : ''}
        `}
      >
        {/* Key indicator */}
        {node.isKey && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
            <Target className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* Header: status icon + category */}
        <div className="flex items-center gap-2 mb-1">
          <StatusIcon className={`w-4 h-4 ${statusColors[node.status]}`} />
          <CategoryIcon className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-[10px] text-text-muted uppercase tracking-wide">
            {node.category}
          </span>
        </div>
        
        {/* Content */}
        <p className="text-sm text-text leading-relaxed line-clamp-3">
          {node.content}
        </p>
        
        {/* Status badge */}
        <div className="mt-1.5 flex items-center gap-1">
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
