import { Eye, StopCircle, BarChart3 } from 'lucide-react';

interface ActionButtonsProps {
  isActive: boolean;
  myRole: 'creator' | 'host' | 'player';
  truthText: string;
  channelEnded: boolean;
  onReveal: () => void;
  onEnd: () => void;
  onViewTruth: () => void;
  onViewStats: () => void;
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
}: ActionButtonsProps) {
  const isHostOrCreator = myRole === 'host' || myRole === 'creator';

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border overflow-x-auto">
      {isActive && myRole === 'player' && (
        <button
          onClick={onReveal}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5
                     text-xs font-medium rounded-lg border border-accent/30
                     text-accent hover:bg-accent/10
                     transition-colors duration-200 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          查看汤底
        </button>
      )}

      {isActive && myRole === 'creator' && (
        <button
          onClick={onEnd}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5
                     text-xs font-medium rounded-lg border border-no/30
                     text-no hover:bg-no/10
                     transition-colors duration-200 cursor-pointer"
        >
          <StopCircle className="w-3.5 h-3.5" />
          结束游戏
        </button>
      )}

      {(isHostOrCreator || channelEnded) && truthText && (
        <button
          onClick={onViewTruth}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5
                     text-xs font-medium rounded-lg border border-primary/30
                     text-primary-light hover:bg-primary/10
                     transition-colors duration-200 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          查看汤底
        </button>
      )}

      {channelEnded && (
        <button
          onClick={onViewStats}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5
                     text-xs font-medium rounded-lg border border-primary/30
                     text-primary-light hover:bg-primary/10
                     transition-colors duration-200 cursor-pointer"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          查看统计
        </button>
      )}
    </div>
  );
}
