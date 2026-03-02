import { motion } from 'framer-motion';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
      >
        <h3 className="text-lg font-heading font-bold text-text mb-2">
          {title}
        </h3>
        <p className="text-sm text-text-muted mb-6">{message}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                       bg-surface border border-border text-text-muted
                       hover:bg-card transition-colors duration-200 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white
                        transition-colors duration-200 cursor-pointer ${
                          variant === 'danger'
                            ? 'bg-no hover:bg-no/80'
                            : 'bg-primary hover:bg-primary-light'
                        }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
