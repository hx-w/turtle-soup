import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SurfacePanelProps {
  surface: string;
  collapsed: boolean;
  onToggle: () => void;
}

export default function SurfacePanel({
  surface,
  collapsed,
  onToggle,
}: SurfacePanelProps) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3
                   text-sm font-medium text-primary-light cursor-pointer
                   hover:bg-surface/50 transition-colors duration-200"
      >
        <span>汤面</span>
        {collapsed ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4">
                <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                  {surface}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
