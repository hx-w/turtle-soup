import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, FileText, Lock } from 'lucide-react';

interface EditSoupModalProps {
  surface: string;
  truth: string;
  onSave: (surface: string, truth: string) => Promise<void>;
  onClose: () => void;
}

export default function EditSoupModal({ surface, truth, onSave, onClose }: EditSoupModalProps) {
  const [editSurface, setEditSurface] = useState(surface);
  const [editTruth, setEditTruth] = useState(truth);
  const [saving, setSaving] = useState(false);

  const surfaceChanged = editSurface !== surface;
  const truthChanged = editTruth !== truth;
  const hasChanges = surfaceChanged || truthChanged;
  const isValid = editSurface.trim().length > 0 && editTruth.trim().length > 0;

  const handleSave = async () => {
    if (!hasChanges || !isValid || saving) return;
    setSaving(true);
    try {
      await onSave(editSurface.trim(), editTruth.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative bg-card border border-border rounded-2xl w-full max-w-lg
                   shadow-xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Pencil size={16} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold text-text">编辑内容</h3>
            <p className="text-xs text-text-muted">修改后所有玩家将实时看到汤面更新</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
          {/* Surface */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-muted mb-1.5">
              <FileText size={14} />
              汤面
            </label>
            <textarea
              value={editSurface}
              onChange={(e) => setEditSurface(e.target.value)}
              className="input-field min-h-[120px] resize-y"
              maxLength={2000}
              placeholder="谜面内容..."
            />
            <span className="text-xs text-text-muted mt-1 block text-right">
              {editSurface.length}/2000
            </span>
          </div>

          {/* Truth */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-muted mb-1.5">
              <Lock size={14} />
              汤底
            </label>
            <textarea
              value={editTruth}
              onChange={(e) => setEditTruth(e.target.value)}
              className="input-field min-h-[120px] resize-y"
              maxLength={5000}
              placeholder="谜底内容..."
            />
            <span className="text-xs text-text-muted mt-1 block text-right">
              {editTruth.length}/5000
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                       bg-surface border border-border text-text-muted
                       hover:bg-card transition-colors duration-200 cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || !isValid || saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white
                       bg-primary hover:bg-primary-light
                       transition-colors duration-200 cursor-pointer
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                保存中...
              </span>
            ) : (
              '保存修改'
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
