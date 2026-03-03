import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export interface ProgressBarProps {
  /** 进度值 0-100 */
  progress: number;
  /** 标签文字 */
  label: string;
  /** 右侧显示的文字（默认显示百分比） */
  valueText?: string;
  /** 进度条颜色主题 */
  variant?: 'primary' | 'gradient';
  /** 是否冻结（显示锁定图标） */
  frozen?: boolean;
  /** 是否启用动画 */
  animated?: boolean;
  /** 更紧凑的样式 */
  compact?: boolean;
}

function getGradientColor(progress: number): string {
  if (progress >= 90) return 'from-red-400 to-rose-500';
  if (progress >= 60) return 'from-amber-400 to-orange-500';
  if (progress >= 30) return 'from-emerald-400 to-emerald-500';
  return 'from-slate-400 to-slate-500';
}

export default function ProgressBar({
  progress,
  label,
  valueText,
  variant = 'primary',
  frozen = false,
  animated = true,
  compact = false,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const displayText = valueText ?? `${clampedProgress.toFixed(1)}%`;
  const gradientColor = getGradientColor(clampedProgress);

  return (
    <div className={compact ? 'py-1.5' : 'py-2'}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-text-muted ${compact ? 'text-xs' : 'text-xs'}`}>
            {label}
          </span>
          {frozen && <Lock size={12} className="text-text-muted" />}
        </div>
        <span className={`font-mono font-semibold text-text ${compact ? 'text-xs' : 'text-sm'}`}>
          {displayText}
        </span>
      </div>
      <div className={`bg-surface rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
        <motion.div
          className={`h-full rounded-full ${
            variant === 'gradient'
              ? `bg-gradient-to-r ${gradientColor} ${frozen ? 'opacity-70' : ''}`
              : 'bg-primary'
          }`}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${clampedProgress}%` }}
          transition={animated ? { type: 'spring', stiffness: 60, damping: 15 } : { duration: 0 }}
        />
      </div>
    </div>
  );
}
