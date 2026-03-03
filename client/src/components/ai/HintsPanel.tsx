import { Lightbulb, Loader2 } from 'lucide-react';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import HintCard from './HintCard';
import type { AiHint } from '../../types';

interface HintsPanelProps {
  hints: AiHint[];
  myRemaining: number;
  hintLoading: boolean;
  currentUserId: string;
  channelEnded: boolean;
  onRequestHint: () => void;
  onTogglePublic: (hintId: string, isPublic: boolean) => void;
}

export interface HintsPanelHandle {
  scrollRef: HTMLDivElement | null;
}

const HintsPanel = forwardRef<HintsPanelHandle, HintsPanelProps>(
  function HintsPanel(
    { hints, myRemaining, hintLoading, currentUserId, channelEnded, onRequestHint, onTogglePublic },
    ref,
  ) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const exhausted = myRemaining <= 0;
    const disabled = hintLoading || exhausted || channelEnded;

    useImperativeHandle(ref, () => ({
      get scrollRef() {
        return scrollContainerRef.current;
      },
    }));

    return (
      <div className="flex flex-col h-full">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {hints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Lightbulb size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">暂无线索</p>
              <p className="text-xs mt-1 opacity-70">
                {channelEnded ? '游戏已结束' : exhausted ? '线索次数已用完' : '点击下方按钮获取 AI 线索'}
              </p>
            </div>
          ) : (
            hints.map((hint, i) => (
              <HintCard
                key={hint.id}
                hint={hint}
                index={i}
                isMine={hint.userId === currentUserId}
                onTogglePublic={onTogglePublic}
              />
            ))
          )}
        </div>

        {/* 底部大按钮 */}
        <div className="flex-shrink-0 p-4 border-t border-border">
          <button
            type="button"
            onClick={onRequestHint}
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              font-medium text-sm transition-all duration-200
              ${disabled
                ? 'bg-surface text-text-muted cursor-not-allowed'
                : 'bg-primary hover:bg-primary-light text-white cursor-pointer active:scale-[0.98]'
              }`}
          >
            {hintLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>请求中...</span>
              </>
            ) : (
              <>
                <Lightbulb size={18} />
                <span>{channelEnded ? '游戏已结束' : exhausted ? '线索已用完' : `请求线索 (${myRemaining})`}</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  },
);

export default HintsPanel;
