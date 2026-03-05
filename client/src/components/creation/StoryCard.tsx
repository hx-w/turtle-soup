import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Copy, Check, FileText, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GeneratedStory {
  surface: string;
  truth: string;
  tags?: string[];
  difficulty?: string;
}

interface StoryCardProps {
  story: GeneratedStory;
  index?: number;
  title?: string;
}

const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  hell: '地狱',
};

export default function StoryCard({ story, index = 1, title }: StoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState<'surface' | 'truth' | null>(null);
  const navigate = useNavigate();

  const handleCopy = async (text: string, type: 'surface' | 'truth') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleApply = (type: 'surface' | 'truth' | 'all') => {
    const draft = {
      surface: type === 'truth' ? '' : story.surface,
      truth: type === 'surface' ? '' : story.truth,
      tags: type === 'all' ? story.tags : [],
      difficulty: type === 'all' ? story.difficulty : undefined,
    };
    localStorage.setItem('creationDraft', JSON.stringify(draft));
    navigate('/create');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-sm font-medium text-accent">{index}</span>
          </div>
          <span className="text-sm font-medium text-text">{title || '汤面方案'}</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-xl hover:bg-surface transition-colors cursor-pointer"
        >
          {isExpanded ? (
            <ChevronUp size={18} className="text-text-muted" />
          ) : (
            <ChevronDown size={18} className="text-text-muted" />
          )}
        </button>
      </div>

      {/* Preview (collapsed state) */}
      {!isExpanded && (
        <div className="px-4 pb-4">
          <p className="text-sm text-text-muted line-clamp-3">{story.surface}</p>
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Surface */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-primary" />
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    汤面
                  </span>
                </div>
                <div className="bg-surface rounded-xl p-3 relative group">
                  <p className="text-sm text-text whitespace-pre-wrap">{story.surface}</p>
                  <button
                    onClick={() => handleCopy(story.surface, 'surface')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {copied === 'surface' ? (
                      <Check size={14} className="text-yes" />
                    ) : (
                      <Copy size={14} className="text-text-muted" />
                    )}
                  </button>
                </div>
              </div>

              {/* Truth */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={14} className="text-accent" />
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    汤底
                  </span>
                </div>
                <div className="bg-surface rounded-xl p-3 relative group">
                  <p className="text-sm text-text whitespace-pre-wrap">{story.truth}</p>
                  <button
                    onClick={() => handleCopy(story.truth, 'truth')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-card/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {copied === 'truth' ? (
                      <Check size={14} className="text-yes" />
                    ) : (
                      <Copy size={14} className="text-text-muted" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tags and Difficulty */}
              {(story.tags || story.difficulty) && (
                <div className="flex flex-wrap items-center gap-2">
                  {story.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary-light"
                    >
                      {tag}
                    </span>
                  ))}
                  {story.difficulty && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-muted border border-border">
                      {difficultyLabels[story.difficulty] || story.difficulty}
                    </span>
                  )}
                </div>
              )}


            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex justify-end gap-2 flex-wrap">
        {isExpanded && (
          <button
            onClick={() => handleApply('surface')}
            className="btn-apply-secondary"
          >
            应用汤面
          </button>
        )}
        <button
          onClick={() => handleApply('all')}
          className="btn-apply-primary"
        >
          应用全部
        </button>
      </div>
    </motion.div>
  );
}
