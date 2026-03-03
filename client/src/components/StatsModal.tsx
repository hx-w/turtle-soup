import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, BarChart3, Clock } from 'lucide-react';
import { api } from '../lib/api';
import StatsPanel from './StatsPanel';
import Timeline from './Timeline';
import RatingStars from './RatingStars';
import type { ChannelStats, TimelineEvent } from '../types';

interface StatsModalProps {
  channelId: string;
  stats: ChannelStats | null;
  myRole: 'creator' | 'host' | 'player';
  onClose: () => void;
  onStatsReload: () => void;
}

export default function StatsModal({
  channelId,
  stats,
  myRole,
  onClose,
  onStatsReload,
}: StatsModalProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'timeline'>('stats');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoaded, setTimelineLoaded] = useState(false);

  const loadTimeline = useCallback(async () => {
    if (timelineLoaded) return;
    try {
      const data = await api.get<TimelineEvent[]>(`/channels/${channelId}/timeline`);
      setTimeline(data);
      setTimelineLoaded(true);
    } catch {
      // Timeline not critical
    }
  }, [channelId, timelineLoaded]);

  useEffect(() => {
    if (activeTab === 'timeline' && !timelineLoaded) {
      loadTimeline();
    }
  }, [activeTab, timelineLoaded, loadTimeline]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal Panel */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full sm:max-w-lg bg-card border border-border
                   rounded-t-2xl sm:rounded-2xl shadow-2xl
                   max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-heading font-bold text-text">
            游戏数据
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface text-text-muted
                       hover:text-text transition-colors duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5 flex-shrink-0">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                       transition-colors duration-200 cursor-pointer border-b-2 -mb-px
                       ${activeTab === 'stats'
                         ? 'text-primary-light border-primary'
                         : 'text-text-muted border-transparent hover:text-text'
                       }`}
          >
            <BarChart3 className="w-4 h-4" />
            统计
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                       transition-colors duration-200 cursor-pointer border-b-2 -mb-px
                       ${activeTab === 'timeline'
                         ? 'text-primary-light border-primary'
                         : 'text-text-muted border-transparent hover:text-text'
                       }`}
          >
            <Clock className="w-4 h-4" />
            时间线
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5">
          {activeTab === 'stats' && stats && (
            <div className="space-y-5">
              <StatsPanel stats={stats} />
              {myRole === 'player' && (
                <RatingStars
                  channelId={channelId}
                  existingRating={stats.myRating ?? undefined}
                  averageRating={stats.averageRating}
                  ratingCount={stats.ratingCount}
                  onSubmit={() => onStatsReload()}
                />
              )}
            </div>
          )}
          {activeTab === 'stats' && !stats && (
            <div className="flex items-center justify-center py-12 text-text-muted">
              <p className="text-sm">统计数据加载中...</p>
            </div>
          )}
          {activeTab === 'timeline' && (
            <Timeline events={timeline} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
