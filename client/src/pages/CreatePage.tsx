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
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import type { Channel } from '../types';
import AiSettingsPanel from '../components/ai/AiSettingsPanel';
import { useToastStore } from '../stores/toastStore';

const difficultyOptions = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
  { value: 'hell', label: '地狱' },
] as const;

const tagOptions = ['本格', '变格', '恐怖', '欢乐', '猎奇', '温情', '脑洞', '日常'] as const;

const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 10;

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
  const [aiHostEnabled, setAiHostEnabled] = useState(true);
  const [aiHostDelaySeconds, setAiHostDelaySeconds] = useState(60);
  const [aiHintEnabled, setAiHintEnabled] = useState(true);
  const [aiHintPerPlayer, setAiHintPerPlayer] = useState(3);
  const [customTagInput, setCustomTagInput] = useState('');

  useEffect(() => {
    api.get<{ available: boolean }>('/ai/status')
      .then((data) => setAiAvailable(data.available))
      .catch(() => setAiAvailable(false));
  }, []);

  // Load draft from AI assistant
  useEffect(() => {
    const draft = localStorage.getItem('creationDraft');
    if (draft) {
      try {
        const story = JSON.parse(draft);
        if (story.surface) setSurface(story.surface);
        if (story.truth) setTruth(story.truth);
        if (story.tags) setTags(story.tags);
        if (story.difficulty) setDifficulty(story.difficulty);

        localStorage.removeItem('creationDraft');

        // Show toast
        useToastStore.getState().addToast('已应用AI生成的海龟汤，可继续编辑', 'success');
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
  }, []);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length >= MAX_TAGS
          ? prev
          : [...prev, tag],
    );
  };

  const addCustomTag = () => {
    const trimmed = customTagInput.trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed || tags.includes(trimmed) || tags.length >= MAX_TAGS) return;
    setTags((prev) => [...prev, trimmed]);
    setCustomTagInput('');
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
        aiHostDelaySeconds,
        aiHintEnabled,
        aiHintPerPlayer,
      });

      navigate(`/channel/${channel.id}`, { replace: true });
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Soup size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl">创建海龟汤</h1>
                <p className="text-text-muted text-sm">编写你的文字思考谜题</p>
              </div>
            </div>

            {/* AI Assistant Entry — compact button */}
            {aiAvailable && (
              <button
                onClick={() => navigate('/create/assistant')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm
                         bg-accent/10 border border-accent/20 text-accent
                         hover:bg-accent/20 hover:border-accent/30 transition-all duration-200 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>AI助手</span>
              </button>
            )}
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
                谜面 — 玩家能看到的故事
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
                谜底 — 只有主持人能看到
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
                <span className="text-xs font-normal ml-1">({tags.length}/{MAX_TAGS})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={!tags.includes(tag) && tags.length >= MAX_TAGS}
                    className={`badge cursor-pointer transition-all duration-200 ease-out text-sm px-3 py-1 ${
                      tags.includes(tag)
                        ? 'bg-primary text-white'
                        : tags.length >= MAX_TAGS
                          ? 'bg-card text-text-muted/40 border border-border cursor-not-allowed'
                          : 'bg-card text-text-muted hover:text-text border border-border'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {/* Custom tag input */}
              <div className="flex items-center gap-2 mt-2.5">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value.slice(0, MAX_TAG_LENGTH))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }}
                  placeholder="自定义标签"
                  className="input-field !py-2 text-sm flex-1"
                  disabled={tags.length >= MAX_TAGS}
                  maxLength={MAX_TAG_LENGTH}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  disabled={!customTagInput.trim() || tags.length >= MAX_TAGS}
                  className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-2
                             text-sm font-medium rounded-xl border border-primary/30
                             text-primary-light hover:bg-primary/10
                             transition-colors duration-200 cursor-pointer
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={14} />
                  添加
                </button>
              </div>
              {/* Selected custom tags (non-preset) */}
              {tags.filter((t) => !(tagOptions as readonly string[]).includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags
                    .filter((t) => !(tagOptions as readonly string[]).includes(t))
                    .map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 badge bg-accent/15 text-accent text-sm px-2.5 py-0.5"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                          className="hover:text-no transition-colors cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* AI Settings */}
            <AiSettingsPanel
              aiAvailable={aiAvailable}
              aiHostEnabled={aiHostEnabled}
              aiHostDelaySeconds={aiHostDelaySeconds}
              aiHintEnabled={aiHintEnabled}
              aiHintPerPlayer={aiHintPerPlayer}
              onChange={(field, value) => {
                switch (field) {
                  case 'aiHostEnabled': setAiHostEnabled(value as boolean); break;
                  case 'aiHostDelaySeconds': setAiHostDelaySeconds(value as number); break;
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
