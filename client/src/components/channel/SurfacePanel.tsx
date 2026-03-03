import { BookOpen, Pencil } from 'lucide-react';

interface SurfacePanelProps {
  surface: string;
  isCreator?: boolean;
  isActive?: boolean;
  onEdit?: () => void;
}

export default function SurfacePanel({ surface, isCreator, isActive, onEdit }: SurfacePanelProps) {
  return (
    <div className="border-b border-border bg-surface">
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10
                        flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-text flex-1">汤面</span>
        {isCreator && isActive && onEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
                       rounded-lg text-text-muted hover:text-primary hover:bg-primary/5
                       transition-colors duration-150 cursor-pointer border border-transparent
                       hover:border-primary/20"
          >
            <Pencil className="w-3.5 h-3.5" />
            编辑
          </button>
        )}
      </div>
      <div className="px-4 pb-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {surface}
          </p>
        </div>
      </div>
    </div>
  );
}
