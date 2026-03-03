import { BookOpen, Pencil } from 'lucide-react';

interface SurfacePanelProps {
  surface: string;
  isCreator?: boolean;
  isActive?: boolean;
  onEdit?: () => void;
}

export default function SurfacePanel({ surface, isCreator, isActive, onEdit }: SurfacePanelProps) {
  return (
    <div className="border-b border-border bg-bg">
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10
                        flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium text-primary-light flex-1">汤面</span>
        {isCreator && isActive && onEdit && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium
                       rounded-lg text-text-muted hover:text-primary hover:bg-primary/10
                       transition-colors duration-200 cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
            编辑
          </button>
        )}
      </div>
      <div className="px-4 pb-4">
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4">
          <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {surface}
          </p>
        </div>
      </div>
    </div>
  );
}
