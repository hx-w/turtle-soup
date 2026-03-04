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
    bg-gradient-to-br from-yes/15 to-yes/5
    border-2 border-yes/40
    shadow-lg shadow-yes/10
  `,
  partial: `
    bg-gradient-to-br from-orange-500/15 to-orange-500/5
    border-2 border-orange-500/40 border-dashed
    shadow-lg shadow-orange-500/10
  `,
  excluded: `
    bg-card/40
    border border-border/30
    opacity-60
  `,
  hint: `
    bg-gradient-to-br from-primary/15 to-accent/10
    border-2 border-primary/30
    shadow-lg shadow-primary/20
    ring-1 ring-primary/20
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
      }}
      onClick={onClick}
    >
      <div
        className={`
          relative min-w-[140px] max-w-[180px]
          backdrop-blur-xl rounded-xl px-3 py-2.5
          transition-all duration-200 hover:scale-105
          ${statusStyles[node.status]}
          ${node.isKey ? 'ring-2 ring-accent/50 ring-offset-2 ring-offset-bg scale-110' : ''}
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
