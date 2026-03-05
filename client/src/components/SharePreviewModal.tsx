import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Download, Share2, Check, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from '../stores/toastStore';
import ShareCard from './ShareCard';
import type { Channel, ChannelStats } from '../types';

interface SharePreviewModalProps {
  channel: Channel;
  stats: ChannelStats | null;
  onClose: () => void;
}

export default function SharePreviewModal({
  channel,
  stats,
  onClose,
}: SharePreviewModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(true);
  const [copied, setCopied] = useState(false);

  const canNativeShare =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  const generateImage = useCallback(async () => {
    if (!cardRef.current || !stats) return;
    setGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 100));
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
      });
      setImageUrl(dataUrl);
      const res = await fetch(dataUrl);
      setImageBlob(await res.blob());
    } catch (err) {
      // First attempt failed, retrying...
      try {
        await new Promise((r) => setTimeout(r, 300));
        const dataUrl = await toPng(cardRef.current!, {
          pixelRatio: 2,
          cacheBust: true,
          skipFonts: true,
        });
        setImageUrl(dataUrl);
        const res = await fetch(dataUrl);
        setImageBlob(await res.blob());
      } catch (retryErr) {
        // Image generation failed after retry
      }
    } finally {
      setGenerating(false);
    }
  }, [stats]);

  useEffect(() => {
    generateImage();
  }, [generateImage]);

  const handleCopy = async () => {
    if (!imageBlob) return;
    try {
      // Check if ClipboardItem API is available
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback: not supported
        toast.error('当前浏览器不支持复制图片，请使用分享或保存按钮');
      }
    } catch (err) {
      console.error('Copy failed');
      toast.error('复制失败，请使用分享或保存按钮');
    }
  };

  const handleDownload = async () => {
    if (!imageBlob || !channel) return;
    try {
      // On mobile, try native share first for saving to album
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile && typeof navigator.share === 'function' && navigator.canShare?.()) {
        const file = new File([imageBlob], 'turtle-soup.png', { type: 'image/png' });
        try {
          await navigator.share({ files: [file] });
          return;
        } catch {
          // User cancelled or share failed, fall through to download
        }
      }
      
      // Desktop or mobile without share - regular download
      const blobUrl = URL.createObjectURL(imageBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `turtle-soup-${channel.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('图片已保存');
    } catch (err) {
      console.error('Download failed');
      toast.error('保存失败，请尝试分享按钮');
    }
  };

  const handleNativeShare = async () => {
    if (!imageBlob) return;
    try {
      const file = new File([imageBlob], 'turtle-soup.png', { type: 'image/png' });
      const shareData = { files: [file] };
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      }
    } catch (err) {
      // User cancelled or not supported
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Offscreen card for capture */}
      {stats && (
        <div
          style={{
            position: 'fixed',
            left: -9999,
            top: 0,
            pointerEvents: 'none',
          }}
        >
          <ShareCard ref={cardRef} channel={channel} stats={stats} />
        </div>
      )}

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full max-w-sm mx-4 flex flex-col items-center"
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 rounded-xl text-white/60
                     hover:text-white transition-colors cursor-pointer"
          aria-label="关闭"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Card preview */}
        <div
          className="w-full rounded-lg overflow-hidden shadow-2xl shadow-black/50"
          style={{ aspectRatio: '360 / 500' }}
        >
          {generating ? (
            <div className="w-full h-full bg-[#1c1917] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="分享卡片"
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-[#1c1917] flex items-center justify-center">
              <p className="text-stone-500 text-sm">生成失败，请重试</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!generating && imageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-3 mt-5"
          >
            <button
              onClick={handleCopy}
              disabled={!imageBlob}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                         bg-white/10 text-white hover:bg-white/20
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? '已复制' : '复制'}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                         bg-white/10 text-white hover:bg-white/20
                         transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              保存
            </button>

            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                disabled={!imageBlob}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                           bg-amber-600 text-white hover:bg-amber-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                分享
              </button>
            )}
          </motion.div>
        )}

        {!generating && !imageUrl && (
          <button
            onClick={generateImage}
            className="mt-5 px-4 py-2.5 rounded-xl text-sm font-medium
                       bg-white/10 text-white hover:bg-white/20
                       transition-colors cursor-pointer"
          >
            重新生成
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
