import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Archive,
  Star,
  Users,
  MessageCircle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Channel, ChannelListResponse } from '../types';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  hell: '地狱',
};

const difficultyColors: Record<string, string> = {
  easy: 'text-yes bg-yes/15',
  medium: 'text-accent bg-accent/15',
  hard: 'text-no bg-no/15',
  hell: 'text-no bg-no/25',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ArchivePage() {
  const navigate = useNavigate();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [difficulty, setDifficulty] = useState('');

  // Ratings cache: channelId -> { average, count }
  const [ratings, setRatings] = useState<
    Record<string, { average: number; count: number }>
  >({});

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'ended',
        page: String(page),
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (difficulty) params.set('difficulty', difficulty);

      const data = await api.get<ChannelListResponse>(
        `/channels?${params.toString()}`
      );
      setChannels(data.channels);
      setTotalPages(data.totalPages);

      // Fetch ratings for visible channels
      const ratingPromises = data.channels.map(async (ch) => {
        try {
          const r = await api.get<{ average: number; count: number }>(
            `/channels/${ch.id}/ratings`
          );
          return { id: ch.id, average: r.average, count: r.count };
        } catch {
          return { id: ch.id, average: 0, count: 0 };
        }
      });
      const ratingResults = await Promise.all(ratingPromises);
      const ratingMap: Record<string, { average: number; count: number }> = {};
      for (const r of ratingResults) {
        ratingMap[r.id] = { average: r.average, count: r.count };
      }
      setRatings((prev) => ({ ...prev, ...ratingMap }));
    } catch (err) {
      console.error('Failed to fetch archive:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, difficulty]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchChannels();
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-primary-light" />
          <h1 className="text-lg font-heading font-bold text-text">
            归档浏览
          </h1>
        </div>
      </header>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Search & Filters */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl
                         text-sm text-text placeholder:text-text-muted/50
                         focus:outline-none focus:border-primary/50
                         transition-colors duration-200"
            />
          </div>
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            className="bg-card border border-border rounded-xl px-3 py-2.5
                       text-sm text-text focus:outline-none focus:border-primary/50
                       transition-colors duration-200 cursor-pointer"
          >
            <option value="">全部难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
            <option value="hell">地狱</option>
          </select>
        </form>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && channels.length === 0 && (
          <div className="flex flex-col items-center py-16 text-text-muted">
            <Archive className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">暂无归档记录</p>
          </div>
        )}

        {/* Channel list */}
        {!loading && (
          <div className="space-y-3">
            {channels.map((ch, i) => {
              const rating = ratings[ch.id];
              return (
                <motion.button
                  key={ch.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/channel/${ch.id}`)}
                  className="w-full text-left bg-card/60 backdrop-blur-xl border border-border
                             rounded-2xl p-4 hover:border-primary/30
                             transition-all duration-200 cursor-pointer"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-text truncate">
                      {ch.title}
                    </h3>
                    <span
                      className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
                        difficultyColors[ch.difficulty] ||
                        'bg-surface text-text-muted'
                      }`}
                    >
                      {difficultyLabels[ch.difficulty] || ch.difficulty}
                    </span>
                  </div>

                  {/* Surface preview */}
                  <p className="text-xs text-text-muted leading-relaxed mb-3 line-clamp-2">
                    {truncate(ch.surface, 100)}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                    {/* Rating */}
                    {rating && rating.count > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                        <span className="text-accent font-medium">
                          {rating.average.toFixed(1)}
                        </span>
                        <span>({rating.count})</span>
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {ch._count?.members ?? 0}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {ch._count?.questions ?? 0} 个问题
                    </span>

                    <span>{formatDate(ch.createdAt)}</span>

                    {/* Tags */}
                    {ch.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {ch.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded bg-surface text-text-muted text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Creator */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <img
                      src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${ch.creator.avatarSeed}`}
                      alt={ch.creator.nickname}
                      className="w-5 h-5 rounded-full bg-surface"
                    />
                    <span className="text-xs text-text-muted">
                      {ch.creator.nickname}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-surface border border-border text-text-muted
                         hover:bg-card hover:text-text disabled:opacity-30
                         disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-text-muted">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-surface border border-border text-text-muted
                         hover:bg-card hover:text-text disabled:opacity-30
                         disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
