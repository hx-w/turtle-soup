import type { ReactNode } from 'react';
import { RefreshCw, Bot } from 'lucide-react';

interface AiReviewPanelProps {
  review: string | null;
  loading: boolean;
  onRetry?: () => void;
  currentNickname: string;
}

function renderReviewText(text: string, currentNickname: string): ReactNode[] {
  // 匹配 @用户名：字母、数字、下划线、中文字符
  const parts = text.split(/(@[\w\u4e00-\u9fff]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const isMe = part.slice(1) === currentNickname;
      return (
        <span
          key={i}
          className={`inline px-1 py-0.5 rounded font-medium
            ${isMe
              ? 'bg-primary/20 text-primary font-bold'
              : 'bg-primary/10 text-primary-light'
            }`}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function AiReviewPanel({ review, loading, onRetry, currentNickname }: AiReviewPanelProps) {
  if (!loading && !review && !onRetry) return null;

  return (
    <div className="mb-4 rounded-xl border border-violet-200 dark:border-violet-800/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800/50">
        <Bot size={14} className="text-violet-500" />
        <span className="text-xs font-medium text-violet-600 dark:text-violet-400">AI 精彩回顾</span>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 w-full skeleton" />
            <div className="h-3 w-5/6 skeleton" />
            <div className="h-3 w-4/6 skeleton" />
            <div className="h-3 w-full skeleton" />
            <div className="h-3 w-3/4 skeleton" />
            <p className="text-xs text-text-muted mt-2">AI 正在撰写精彩回顾...</p>
          </div>
        ) : review ? (
          <p className="text-sm text-text leading-relaxed whitespace-pre-line">
            {renderReviewText(review, currentNickname)}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">回顾生成失败</span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 text-xs text-primary-light hover:text-primary transition-colors cursor-pointer"
              >
                <RefreshCw size={12} />
                重新生成
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
