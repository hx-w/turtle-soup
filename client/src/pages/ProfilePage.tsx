import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Mic,
  Users,
  MessageCircle,
  Target,
  Calendar,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import type { User, UserStats } from '../types';

/* -------------------------------------------------------------------------- */
/*  Local types                                                                */
/* -------------------------------------------------------------------------- */

interface ChannelRecord {
  channel: {
    id: string;
    title: string;
    status: string;
    difficulty: string;
    createdAt: string;
    endedAt: string | null;
    _count: { members: number; questions: number };
  };
  role: string;
  joinedAt: string;
}

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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeTab, setActiveTab] = useState<'creator' | 'host' | 'player'>('player');
  const [creatorChannels, setCreatorChannels] = useState<ChannelRecord[]>([]);
  const [hostChannels, setHostChannels] = useState<ChannelRecord[]>([]);
  const [playerChannels, setPlayerChannels] = useState<ChannelRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [profileData, statsData, creatorData, hostData, playerData] =
          await Promise.all([
            api.get<User>('/users/me'),
            api.get<UserStats>('/users/me/stats'),
            api.get<ChannelRecord[]>('/users/me/channels?role=creator'),
            api.get<ChannelRecord[]>('/users/me/channels?role=host'),
            api.get<ChannelRecord[]>('/users/me/channels?role=player'),
          ]);
        setProfile(profileData);
        setStats(statsData);
        setCreatorChannels(creatorData);
        setHostChannels(hostData);
        setPlayerChannels(playerData);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-muted">加载失败</p>
      </div>
    );
  }

  const avatarUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${profile.avatarSeed}`;
  const total =
    stats.distribution.yes +
    stats.distribution.no +
    stats.distribution.irrelevant;
  const channels =
    activeTab === 'creator' ? creatorChannels :
    activeTab === 'host' ? hostChannels :
    playerChannels;

  return (
    <div className="-mt-2 min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-14 z-20 glass-nav px-4 py-3">
        <div className="flex items-center gap-3 max-w-5xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-card text-text-muted
                       hover:text-text transition-colors duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-heading font-bold text-text">
            个人中心
          </h1>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* ------------------------------------------------------------------ */}
        {/*  Profile Card                                                       */}
        {/* ------------------------------------------------------------------ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3"
        >
          <img
            src={avatarUrl}
            alt={profile.nickname}
            className="w-20 h-20 rounded-full bg-surface border-2 border-primary/30"
          />
          <div className="text-center">
            <h2 className="text-xl font-heading font-bold text-text">
              {profile.nickname}
            </h2>
            {profile.createdAt && (
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-text-muted">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(profile.createdAt)} 加入</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ------------------------------------------------------------------ */}
        {/*  Stats Grid                                                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Crown}
            label="创建"
            value={stats.created}
            delay={0.1}
          />
          <StatCard
            icon={Mic}
            label="主持"
            value={stats.hosted}
            delay={0.13}
          />
          <StatCard
            icon={Users}
            label="参与"
            value={stats.participated}
            delay={0.16}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={MessageCircle}
            label="提问总数"
            value={stats.totalQuestions}
            delay={0.2}
          />
          <StatCard
            icon={Target}
            label="命中率"
            value={`${stats.hitRate}%`}
            delay={0.25}
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        {/*  Answer Distribution                                                */}
        {/* ------------------------------------------------------------------ */}
        {total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4"
          >
            <p className="text-sm font-medium text-text mb-3">回答分布</p>

            <div className="flex h-3 rounded-full overflow-hidden bg-surface mb-3">
              {stats.distribution.yes > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(stats.distribution.yes / total) * 100}%`,
                  }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="bg-yes"
                />
              )}
              {stats.distribution.no > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(stats.distribution.no / total) * 100}%`,
                  }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="bg-no"
                />
              )}
              {stats.distribution.irrelevant > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      (stats.distribution.irrelevant / total) * 100
                    }%`,
                  }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="bg-irrelevant"
                />
              )}
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yes" />
                <span className="text-text-muted">
                  是 {stats.distribution.yes}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-no" />
                <span className="text-text-muted">
                  否 {stats.distribution.no}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-irrelevant" />
                <span className="text-text-muted">
                  无关 {stats.distribution.irrelevant}
                </span>
              </span>
            </div>
          </motion.div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/*  Tabs                                                               */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('creator')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors duration-200 cursor-pointer
                ${
                  activeTab === 'creator'
                    ? 'text-primary-light border-b-2 border-primary'
                    : 'text-text-muted hover:text-text'
                }`}
            >
              创建 ({creatorChannels.length})
            </button>
            <button
              onClick={() => setActiveTab('host')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors duration-200 cursor-pointer
                ${
                  activeTab === 'host'
                    ? 'text-primary-light border-b-2 border-primary'
                    : 'text-text-muted hover:text-text'
                }`}
            >
              主持 ({hostChannels.length})
            </button>
            <button
              onClick={() => setActiveTab('player')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors duration-200 cursor-pointer
                ${
                  activeTab === 'player'
                    ? 'text-primary-light border-b-2 border-primary'
                    : 'text-text-muted hover:text-text'
                }`}
            >
              参与 ({playerChannels.length})
            </button>
          </div>

          {/* Channel list */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === 'creator' ? -20 : activeTab === 'host' ? 0 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'creator' ? 20 : activeTab === 'host' ? 0 : -20 }}
              transition={{ duration: 0.2 }}
              className="py-3 space-y-3"
            >
              {channels.length === 0 && (
                <p className="text-center text-sm text-text-muted py-8">
                  暂无记录
                </p>
              )}

              {channels.map((record) => (
                <button
                  key={record.channel.id}
                  onClick={() => navigate(`/channel/${record.channel.id}`)}
                  className="w-full text-left bg-card/60 backdrop-blur-xl border border-border
                             rounded-2xl p-4 hover:border-primary/30
                             transition-colors duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-semibold text-text truncate">
                        {record.channel.title}
                      </h3>
                      {activeTab === 'host' && record.role === 'host' && (
                        <span
                          className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-yes/15 text-yes"
                        >
                          主持人
                        </span>
                      )}
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
                        record.channel.status === 'active'
                          ? 'bg-yes/15 text-yes'
                          : 'bg-text-muted/15 text-text-muted'
                      }`}
                    >
                      {record.channel.status === 'active'
                        ? '进行中'
                        : '已结束'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        difficultyColors[record.channel.difficulty] ||
                        'bg-surface text-text-muted'
                      }`}
                    >
                      {difficultyLabels[record.channel.difficulty] ||
                        record.channel.difficulty}
                    </span>
                    <span>{record.channel._count.questions} 个问题</span>
                    <span>{formatShortDate(record.channel.createdAt)}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                             */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  delay: number;
}

function StatCard({ icon: Icon, label, value, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-4 text-center"
    >
      <Icon className="w-5 h-5 text-primary-light mx-auto mb-2" />
      <p className="text-2xl font-heading font-bold text-text">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </motion.div>
  );
}
