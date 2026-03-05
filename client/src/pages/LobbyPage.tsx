import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import ChannelCard from '../components/ChannelCard';
import ChannelCardSkeleton from '../components/ChannelCardSkeleton';
import { useChannelStore } from '../stores/channelStore';
import { joinLobby, leaveLobby, onChannelCreated, offChannelCreated } from '../lib/socket';
import type { Channel } from '../types';
const statusFilters = [
  { value: '', label: '全部' },
  { value: 'active', label: '进行中' },
  { value: 'ended', label: '已结束' },
] as const;

const difficultyFilters = [
  { value: '', label: '全部难度' },
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'hell', label: '地狱' },
] as const;

const tagFilters = ['本格', '变格', '恐怖', '欢乐', '猎奇', '温情', '脑洞', '日常'] as const;

export default function LobbyPage() {
  const navigate = useNavigate();
  const { channels, fetchChannels, totalPages, prependChannel } = useChannelStore();
  const [status, setStatus] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Use ref to track if we've already loaded data (persists across remounts within session)
  const hasLoadedOnce = useRef(false);
  const loadChannels = useCallback(async (forceShowLoading = false) => {
    // Only show loading on first load ever (when channels list is empty and hasn't loaded before)
    const shouldShowLoading = forceShowLoading || (channels.length === 0 && !hasLoadedOnce.current);
    if (shouldShowLoading) setIsLoading(true);
    
    try {
      await fetchChannels({
        status: status || undefined,
        search: search || undefined,
        difficulty: difficulty || undefined,
        tag: tag || undefined,
        page,
      });
      hasLoadedOnce.current = true;
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchChannels, status, search, difficulty, tag, page]);

  // Load on mount and when filters change
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Note: Removed visibilitychange listener to prevent flickering.
  // Socket events (joinLobby/onChannelCreated) already keep channel list updated in real-time.
  // No need to refresh on visibility change - this was causing the flicker issue.

  // Debounced search - reset to page 1 (triggers reload via page dependency)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Show skeleton only when loading and no data exists yet
  const showSkeleton = isLoading && channels.length === 0;

  // Listen for new channels in lobby (only when viewing active channels on page 1)
  useEffect(() => {
    // Only join lobby when viewing active channels without filters
    const shouldListen = (status === '' || status === 'active') && !search && !difficulty && !tag && page === 1;

    if (shouldListen) {
      joinLobby();

      const handleNewChannel = (channel: unknown) => {
        prependChannel(channel as Channel);
      };
      onChannelCreated(handleNewChannel);

      return () => {
        leaveLobby();
        offChannelCreated(handleNewChannel);
      };
    }
  }, [status, search, difficulty, tag, page, prependChannel]);
  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted/60"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索谜题标题或内容..."
            className="input-field pl-11"
            aria-label="搜索"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-3 rounded-xl border transition-all duration-200 ease-out cursor-pointer ${
            showFilters
              ? 'bg-primary/20 border-primary text-primary'
              : 'bg-bg/60 border-border text-text-muted hover:text-text'
          }`}
          aria-label="筛选"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-surface/60 rounded-xl p-1">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-out cursor-pointer ${
              status === f.value
                ? 'bg-card text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Difficulty filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 overflow-hidden"
        >
          <div className="glass-card p-4 space-y-3">
            <div>
              <span className="text-xs text-text-muted font-medium block mb-2">
                难度
              </span>
              <div className="flex gap-2 flex-wrap">
                {difficultyFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setDifficulty(f.value);
                      setPage(1);
                    }}
                    className={`badge cursor-pointer transition-all duration-200 ease-out ${
                      difficulty === f.value
                        ? 'bg-primary text-white'
                        : 'bg-card text-text-muted hover:text-text'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-text-muted font-medium block mb-2">
                标签
              </span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setTag(''); setPage(1); }}
                  className={`badge cursor-pointer transition-all duration-200 ease-out ${
                    tag === ''
                      ? 'bg-primary text-white'
                      : 'bg-card text-text-muted hover:text-text'
                  }`}
                >
                  全部标签
                </button>
                {tagFilters.map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTag(t); setPage(1); }}
                    className={`badge cursor-pointer transition-all duration-200 ease-out ${
                      tag === t
                        ? 'bg-primary text-white'
                        : 'bg-card text-text-muted hover:text-text'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Channel grid */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChannelCardSkeleton key={i} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-muted">
          <Search size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-heading font-medium">暂无谜题</p>
          <p className="text-sm mt-1">快去创建第一个海龟汤吧</p>
          <button
            onClick={() => navigate('/create')}
            className="btn-primary mt-6"
          >
            开始煮汤
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel, i) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: 'easeOut' }}
              >
                <ChannelCard channel={channel} />
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200 ease-out cursor-pointer ${
                    page === p
                      ? 'bg-primary text-white'
                      : 'bg-card text-text-muted hover:text-text hover:bg-card/80'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating create button (mobile) */}
      <button
        onClick={() => navigate('/create')}
        className="fixed bottom-8 right-4 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary-light
                   text-white shadow-lg shadow-primary/30 flex items-center justify-center
                   transition-all duration-200 ease-out cursor-pointer md:hidden
                   hover:shadow-xl hover:shadow-primary/40 active:scale-95"
        aria-label="创建谜题"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
