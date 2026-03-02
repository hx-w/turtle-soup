import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface TruthRevealProps {
  truth: string;
  onClose: () => void;
}

export default function TruthReveal({ truth, onClose }: TruthRevealProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Card */}
        <motion.div
          initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
          animate={{ scale: 1, rotateY: 0, opacity: 1 }}
          exit={{ scale: 0.5, rotateY: -180, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 20,
            duration: 0.8,
          }}
          style={{ perspective: 1200 }}
          className="relative w-full max-w-lg bg-card/80 backdrop-blur-xl border border-border
                     rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 text-center">
            <div className="inline-flex items-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-heading font-bold text-accent">
                汤底揭晓
              </h2>
              <Sparkles className="w-6 h-6 text-accent" />
            </div>
            <div className="w-16 h-0.5 bg-accent/40 mx-auto rounded-full" />
          </div>

          {/* Truth content */}
          <div className="relative px-6 pb-4">
            <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              <p className="text-text leading-relaxed whitespace-pre-wrap">
                {truth}
              </p>
            </div>
          </div>

          {/* Close button */}
          <div className="relative px-6 pb-6 pt-2">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-6 py-3
                         bg-primary/20 hover:bg-primary/30 border border-primary/40
                         text-primary-light rounded-xl font-medium
                         transition-all duration-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>关闭</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
