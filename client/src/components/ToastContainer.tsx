import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useToastStore } from '../stores/toastStore';
import type { Toast } from '../stores/toastStore';

const iconMap = {
  error: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const colorMap = {
  error: 'bg-no/15 border-no/30 text-no',
  success: 'bg-yes/15 border-yes/30 text-yes',
  info: 'bg-primary/15 border-primary/30 text-primary-light',
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const Icon = iconMap[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg ${colorMap[toast.type]}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="p-0.5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
