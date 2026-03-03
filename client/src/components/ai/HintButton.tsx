import { Lightbulb, Loader2 } from 'lucide-react';

interface HintButtonProps {
  enabled: boolean;
  remaining: number;
  loading: boolean;
  onRequest: () => void;
}

export default function HintButton({ enabled, remaining, loading, onRequest }: HintButtonProps) {
  if (!enabled) return null;

  const exhausted = remaining <= 0;

  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={loading || exhausted}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all
        ${exhausted
          ? 'opacity-50 cursor-not-allowed bg-surface text-text-muted'
          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 cursor-pointer'
        }`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Lightbulb size={14} />
      )}
      {exhausted ? '线索已用完' : `线索 (${remaining})`}
    </button>
  );
}
