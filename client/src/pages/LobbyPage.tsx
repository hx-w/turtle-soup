import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import ChannelCard from '../components/ChannelCard';
import ChannelCardSkeleton from '../components/ChannelCardSkeleton';
import { useChannelStore } from '../stores/channelStore';

const statusFilters = [
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

export default function LobbyPage() {
  const navigate = useNavigate();
  const { channels, isLoadingList, fetchChannels, totalPages } = useChannelStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const loadChannels = useCallback(() => {
    fetchChannels({
      status,
      search: search || undefined,
      difficulty: difficulty || undefined,
      page,
    });
  }, [fetchChannels, status, search, difficulty, page]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadChannels();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 overflow-hidden"
        >
          <div className="glass-card p-4 space-y-3">
            {/* Status filters */}
            <div>
              <span className="text-xs text-text-muted font-medium block mb-2">
                状态
              </span>
              <div className="flex gap-2 flex-wrap">
                {statusFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => {
                      setStatus(f.value);
                      setPage(1);
                    }}
                    className={`badge cursor-pointer transition-all duration-200 ease-out ${
                      status === f.value
                        ? 'bg-primary text-white'
                        : 'bg-card text-text-muted hover:text-text'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty filters */}
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
          </div>
        </motion.div>
      )}

      {/* Channel grid */}
      {isLoadingList ? (
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
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary-light
                   text-white shadow-lg shadow-primary/30 flex items-center justify-center
                   transition-all duration-200 ease-out cursor-pointer md:hidden
                   hover:scale-105 active:scale-95"
        aria-label="创建谜题"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
