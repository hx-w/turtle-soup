import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Type,
  FileText,
  Lock,
  Hash,
  BarChart3,
  Tag,
  Soup,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import type { Channel } from '../types';
import AiSettingsPanel from '../components/ai/AiSettingsPanel';

const difficultyOptions = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'hell', label: '地狱' },
] as const;

const tagOptions = ['经典', '恐怖', '温情', '脑洞', '日常'] as const;

export default function CreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [surface, setSurface] = useState('');
  const [truth, setTruth] = useState('');
  const [maxQuestions, setMaxQuestions] = useState(0);
  const [difficulty, setDifficulty] = useState('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiHostEnabled, setAiHostEnabled] = useState(false);
  const [aiHostDelayMinutes, setAiHostDelayMinutes] = useState(1);
  const [aiHintEnabled, setAiHintEnabled] = useState(false);
  const [aiHintPerPlayer, setAiHintPerPlayer] = useState(3);

  useEffect(() => {
    api.get<{ available: boolean }>('/ai/status')
      .then((data) => setAiAvailable(data.available))
      .catch(() => setAiAvailable(false));
  }, []);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const channel = await api.post<Channel>('/channels', {
        title,
        surface,
        truth,
        maxQuestions: maxQuestions || 0,
        difficulty,
        tags,
        aiHostEnabled,
        aiHostDelayMinutes,
        aiHintEnabled,
        aiHintPerPlayer,
      });
      navigate(`/channel/${channel.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="glass-card p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Soup size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">创建海龟汤</h1>
              <p className="text-text-muted text-sm">编写你的水平思考谜题</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-no/10 border border-no/30 text-no text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="flex items-center gap-2 text-sm font-medium text-text-muted mb-1.5"
              >
                <Type size={14} />
                标题
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给你的谜题起个名字 (1-50字符)"
                className="input-field"
                required
                minLength={1}
                maxLength={50}
              />
            </div>

            {/* Surface */}
            <div>
              <label
                htmlFor="surface"
                className="flex items-center gap-2 text-sm font-medium text-text-muted mb-1.5"
              >
                <FileText size={14} />
                谜面 -- 玩家能看到的故事
              </label>
              <textarea
                id="surface"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                placeholder="描述一个神秘的故事场景... (1-2000字符)"
                className="input-field min-h-[120px] resize-y"
                required
                minLength={1}
                maxLength={2000}
              />
              <span className="text-xs text-text-muted mt-1 block text-right">
                {surface.length}/2000
              </span>
            </div>

            {/* Truth */}
            <div>
              <label
                htmlFor="truth"
                className="flex items-center gap-2 text-sm font-medium text-text-muted mb-1.5"
              >
                <Lock size={14} />
                谜底 -- 只有主持人能看到
              </label>
              <textarea
                id="truth"
                value={truth}
                onChange={(e) => setTruth(e.target.value)}
                placeholder="揭开谜题的真相... (1-5000字符)"
                className="input-field min-h-[120px] resize-y"
                required
                minLength={1}
                maxLength={5000}
              />
              <span className="text-xs text-text-muted mt-1 block text-right">
                {truth.length}/5000
              </span>
            </div>

            {/* Max Questions */}
            <div>
              <label
                htmlFor="maxQuestions"
                className="flex items-center gap-2 text-sm font-medium text-text-muted mb-1.5"
              >
                <Hash size={14} />
                最大问题数
              </label>
              <input
                id="maxQuestions"
                type="number"
                value={maxQuestions}
                onChange={(e) => setMaxQuestions(Number(e.target.value))}
                placeholder="0 表示无限"
                className="input-field"
                min={0}
              />
              <span className="text-xs text-text-muted mt-1 block">
                0 表示无限制，设置上限时最少为 10
              </span>
            </div>

            {/* Difficulty */}
            <div>
              <label
                htmlFor="difficulty"
                className="flex items-center gap-2 text-sm font-medium text-text-muted mb-1.5"
              >
                <BarChart3 size={14} />
                难度
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="input-field cursor-pointer"
              >
                {difficultyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-text-muted mb-2">
                <Tag size={14} />
                分类标签
              </label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`badge cursor-pointer transition-all duration-200 ease-out text-sm px-3 py-1 ${
                      tags.includes(tag)
                        ? 'bg-primary text-white'
                        : 'bg-card text-text-muted hover:text-text border border-border'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Settings */}
            <AiSettingsPanel
              aiAvailable={aiAvailable}
              aiHostEnabled={aiHostEnabled}
              aiHostDelayMinutes={aiHostDelayMinutes}
              aiHintEnabled={aiHintEnabled}
              aiHintPerPlayer={aiHintPerPlayer}
              onChange={(field, value) => {
                switch (field) {
                  case 'aiHostEnabled': setAiHostEnabled(value as boolean); break;
                  case 'aiHostDelayMinutes': setAiHostDelayMinutes(value as number); break;
                  case 'aiHintEnabled': setAiHintEnabled(value as boolean); break;
                  case 'aiHintPerPlayer': setAiHintPerPlayer(value as number); break;
                }
              }}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-4 text-base"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  创建中...
                </span>
              ) : (
                '开始煮汤'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
