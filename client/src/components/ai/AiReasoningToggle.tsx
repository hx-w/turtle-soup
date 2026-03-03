import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface AiReasoningToggleProps {
  reasoning: string;
}

export default function AiReasoningToggle({ reasoning }: AiReasoningToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs text-text-muted hover:text-text
                   flex items-center gap-1 transition-colors cursor-pointer"
      >
        AI 判断依据
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown size={12} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-1 px-2 py-1.5 rounded bg-surface/50
                           text-xs text-text-muted italic leading-relaxed">
              {reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
