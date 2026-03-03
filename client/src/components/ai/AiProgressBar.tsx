import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface AiProgressBarProps {
  progress: number;
  animated?: boolean;
  frozen?: boolean;
}

function getProgressColor(progress: number): string {
  if (progress >= 90) return 'from-red-400 to-rose-500';
  if (progress >= 60) return 'from-amber-400 to-orange-500';
  if (progress >= 30) return 'from-emerald-400 to-emerald-500';
  return 'from-slate-400 to-slate-500';
}

export default function AiProgressBar({ progress, animated = true, frozen = false }: AiProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const colorClass = getProgressColor(clampedProgress);

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">推理进度</span>
          {frozen && <Lock size={12} className="text-text-muted" />}
        </div>
        <span className="text-sm font-mono font-semibold text-text">
          {clampedProgress.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${colorClass} ${frozen ? 'opacity-70' : ''}`}
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${clampedProgress}%` }}
          transition={animated ? { type: 'spring', stiffness: 60, damping: 15 } : { duration: 0 }}
        />
      </div>
    </div>
  );
}
