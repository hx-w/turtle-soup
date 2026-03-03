import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface AiCorrectDropdownProps {
  questionId: string;
  currentAnswer: 'yes' | 'no' | 'irrelevant' | 'partial' | null;
  currentIsKey: boolean;
  onCorrect: (qid: string, answer: string, isKey: boolean) => Promise<void>;
}

const answerOptions = [
  { value: 'yes', label: '是', color: 'text-yes' },
  { value: 'no', label: '否', color: 'text-no' },
  { value: 'irrelevant', label: '无关', color: 'text-irrelevant' },
  { value: 'partial', label: '部分正确', color: 'text-partial' },
] as const;

export default function AiCorrectDropdown({
  questionId,
  currentAnswer,
  currentIsKey,
  onCorrect,
}: AiCorrectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<'yes' | 'no' | 'irrelevant' | 'partial'>(currentAnswer ?? 'yes');
  const [isKey, setIsKey] = useState(currentIsKey);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [dropUp, setDropUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const canMarkKey = selected === 'yes' || selected === 'no';

  // Sync selected state when currentAnswer changes
  useEffect(() => {
    if (currentAnswer) {
      setSelected(currentAnswer);
    }
  }, [currentAnswer]);

  // Sync isKey state when currentIsKey changes
  useEffect(() => {
    setIsKey(currentIsKey);
  }, [currentIsKey]);

  // Calculate position when opening
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuWidth = 192;
      const menuHeight = 200;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      const shouldDropUp = rect.bottom + menuHeight > viewportHeight - 20;
      setDropUp(shouldDropUp);
      
      let leftPos = rect.left;
      if (leftPos + menuWidth > viewportWidth - 10) {
        leftPos = Math.max(10, viewportWidth - menuWidth - 10);
      }
      
      if (shouldDropUp) {
        setPosition({ top: rect.top - 8, left: leftPos });
      } else {
        setPosition({ top: rect.bottom + 8, left: leftPos });
      }
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideContainer = containerRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);
      
      if (!clickedInsideContainer && !clickedInsideMenu) {
        setOpen(false);
      }
    };
    
    // Delay to avoid immediate close from the same click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick);
    }, 10);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClick);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onCorrect(questionId, selected, canMarkKey && isKey);
      setOpen(false);
    } catch {
      // Error handled by caller
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(prev => !prev);
  };

  const menuContent = (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: dropUp ? 8 : -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: dropUp ? 8 : -8 }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: dropUp ? 'translateY(-100%)' : 'none',
      }}
      className="z-[100] w-48 p-2 rounded-xl
                 bg-card/95 backdrop-blur-xl border border-border
                 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-1 mb-2">
        {answerOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(opt.value);
            }}
            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between cursor-pointer
              ${selected === opt.value
                ? 'bg-violet-50 dark:bg-violet-900/30 font-medium'
                : 'hover:bg-surface/50'
              } ${opt.color} transition-colors`}
          >
            {opt.label}
            {selected === opt.value && <Check size={12} />}
          </button>
        ))}
      </div>

      {canMarkKey && (
        <label 
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted cursor-pointer hover:bg-surface/50 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isKey}
            onChange={(e) => setIsKey(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-primary"
          />
          关键问题
        </label>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleConfirm();
        }}
        disabled={loading}
        className="w-full mt-2 px-2 py-1.5 rounded-lg text-xs font-medium text-white cursor-pointer
                   bg-primary hover:bg-primary-light disabled:opacity-50 transition-colors"
      >
        {loading ? '提交中...' : '确认修改'}
      </button>
    </motion.div>
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleButtonClick}
        className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300
                   flex items-center gap-0.5 transition-colors cursor-pointer"
      >
        修改回答
        <ChevronDown size={12} />
      </button>

      {/* Render portal directly without AnimatePresence - it doesn't work well with portals */}
      {open && createPortal(menuContent, document.body)}
    </div>
  );
}
