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
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border overflow-x-auto">
      {isActive && myRole === 'player' && (
        <button
          onClick={onReveal}
          className="btn-action border-accent/30 text-accent hover:bg-accent/10"
          aria-label="查看汤底"
        >
          <Eye className="w-3.5 h-3.5" />
          查看汤底
        </button>
      )}

      {isActive && myRole === 'creator' && (
        <button
          onClick={onEnd}
          className="btn-action border-no/30 text-no hover:bg-no/10"
          aria-label="结束游戏"
        >
          <StopCircle className="w-3.5 h-3.5" />
          结束游戏
        </button>
      )}

      {(isHostOrCreator || channelEnded) && truthText && (
        <button
          onClick={onViewTruth}
          className="btn-action border-primary/30 text-primary-light hover:bg-primary/10"
          aria-label="查看汤底"
        >
          <Eye className="w-3.5 h-3.5" />
          查看汤底
        </button>
      )}

      {channelEnded && (
        <button
          onClick={onViewStats}
          className="btn-action border-primary/30 text-primary-light hover:bg-primary/10"
          aria-label="查看统计"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          查看统计
        </button>
      )}

      {channelEnded && myRole === 'creator' && onDelete && (
        <button
          onClick={onDelete}
          className="btn-action border-no/30 text-no hover:bg-no/10 ml-auto"
          aria-label="删除频道"
        >
          <Trash2 className="w-3.5 h-3.5" />
          删除频道
        </button>
      )}
    </div>
  );
}
