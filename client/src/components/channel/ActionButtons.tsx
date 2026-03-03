import { Eye, StopCircle, BarChart3, Trash2 } from 'lucide-react';

interface ActionButtonsProps {
  isActive: boolean;
  myRole: 'creator' | 'host' | 'player';
  truthText: string;
  channelEnded: boolean;
  onReveal: () => void;
  onEnd: () => void;
  onViewTruth: () => void;
  onViewStats: () => void;
  onDelete?: () => void;
}

export default function ActionButtons({
  isActive,
  myRole,
  truthText,
  channelEnded,
  onReveal,
  onEnd,
  onViewTruth,
  onViewStats,
  onDelete,
}: ActionButtonsProps) {
  const isHostOrCreator = myRole === 'host' || myRole === 'creator';

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface overflow-x-auto">
      {isActive && myRole === 'player' && (
        <button
          onClick={onReveal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     rounded-lg border border-accent/30 text-accent
                     hover:bg-accent/10 transition-colors duration-150 cursor-pointer"
          aria-label="查看汤底"
        >
          <Eye className="w-3.5 h-3.5" />
          查看汤底
        </button>
      )}

      {isActive && myRole === 'creator' && (
        <button
          onClick={onEnd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     rounded-lg border border-no/30 text-no
                     hover:bg-no/10 transition-colors duration-150 cursor-pointer"
          aria-label="结束游戏"
        >
          <StopCircle className="w-3.5 h-3.5" />
          结束游戏
        </button>
      )}

      {(isHostOrCreator || channelEnded) && truthText && (
        <button
          onClick={onViewTruth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     rounded-lg border border-primary/30 text-primary
                     hover:bg-primary/10 transition-colors duration-150 cursor-pointer"
          aria-label="查看汤底"
        >
          <Eye className="w-3.5 h-3.5" />
          查看汤底
        </button>
      )}

      {channelEnded && (
        <button
          onClick={onViewStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     rounded-lg border border-border text-text-muted
                     hover:bg-card hover:text-text transition-colors duration-150 cursor-pointer"
          aria-label="查看统计"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          统计
        </button>
      )}

      {channelEnded && myRole === 'creator' && onDelete && (
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     rounded-lg border border-no/30 text-no hover:bg-no/10
                     transition-colors duration-150 cursor-pointer ml-auto"
          aria-label="删除频道"
        >
          <Trash2 className="w-3.5 h-3.5" />
          删除
        </button>
      )}
    </div>
  );
}
