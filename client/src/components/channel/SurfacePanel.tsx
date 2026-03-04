import { useState, useRef, useEffect } from 'react';
import { BookOpen, Pencil, ChevronUp } from 'lucide-react';

interface SurfacePanelProps {
  surface: string;
  isCreator?: boolean;
  isActive?: boolean;
  onEdit?: () => void;
}

export default function SurfacePanel({ surface, isCreator, isActive, onEdit }: SurfacePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Check if the text actually overflows 4 lines
    if (textRef.current) {
      const el = textRef.current;
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    }
  }, [surface]);

  return (
    <div className="mx-4 mt-4 bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-text tracking-wide">汤面</span>
          </div>
          {isCreator && isActive && onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium
                         rounded bg-surface text-text-muted hover:text-primary hover:bg-primary/5
                         transition-colors duration-150 cursor-pointer border border-border"
            >
              <Pencil className="w-3 h-3" />
              编辑
            </button>
          )}
        </div>
        
        <div className="relative pt-1">
          <p
            ref={textRef}
            className={`text-[15px] text-text/90 leading-loose whitespace-pre-wrap transition-all duration-300 ${
              isExpanded ? '' : 'line-clamp-4'
            }`}
          >
            {surface}
          </p>

          {/* Fade mask with expand hint when collapsed */}
          {!isExpanded && isOverflowing && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card from-40% via-card/90 via-70% to-transparent cursor-pointer flex items-end justify-center pb-3"
              onClick={() => setIsExpanded(true)}
            >
              <span className="px-3 py-1.5 rounded-full bg-surface/90 text-xs font-medium text-text-muted backdrop-blur-sm hover:bg-surface hover:text-text transition-colors duration-150">
                点击展开
              </span>
            </div>
          )}

          {/* Collapse button - only show when expanded */}
          {isExpanded && isOverflowing && (
            <div className="flex mt-3">
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:text-primary-light transition-colors duration-200 cursor-pointer"
              >
                收起 <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
