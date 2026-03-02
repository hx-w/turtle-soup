import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send } from 'lucide-react';
import { api } from '../lib/api';

interface RatingStarsProps {
  channelId: string;
  existingRating?: { score: number; comment?: string };
  averageRating?: number;
  ratingCount?: number;
  onSubmit?: (rating: { score: number; comment?: string }) => void;
}

export default function RatingStars({
  channelId,
  existingRating,
  averageRating,
  ratingCount,
  onSubmit,
}: RatingStarsProps) {
  const [score, setScore] = useState(existingRating?.score ?? 0);
  const [hoverScore, setHoverScore] = useState(0);
  const [comment, setComment] = useState(existingRating?.comment ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingRating);

  const displayScore = hoverScore || score;

  async function handleSubmit() {
    if (score === 0 || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/channels/${channelId}/ratings`, {
        score,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
      onSubmit?.({ score, comment: comment.trim() || undefined });
    } catch (err) {
      console.error('Failed to submit rating:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-5 space-y-4">
      {/* Average rating display */}
      {typeof averageRating === 'number' && averageRating > 0 && (
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i <= Math.round(averageRating)
                    ? 'text-accent fill-accent'
                    : 'text-border'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-accent">
            {averageRating.toFixed(1)}
          </span>
          <span className="text-xs text-text-muted">
            ({ratingCount} 人评价)
          </span>
        </div>
      )}

      {/* Star input */}
      <div>
        <p className="text-sm text-text mb-2">
          {submitted ? '你的评分' : '为这道汤打分'}
        </p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onMouseEnter={() => !submitted && setHoverScore(i)}
              onMouseLeave={() => setHoverScore(0)}
              onClick={() => !submitted && setScore(i)}
              className="p-0.5 cursor-pointer"
              disabled={submitted}
            >
              <Star
                className={`w-7 h-7 transition-colors duration-200 ${
                  i <= displayScore
                    ? 'text-accent fill-accent'
                    : 'text-border hover:text-accent/40'
                }`}
              />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Comment textarea */}
      {!submitted && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="写下你的评语（可选）"
            maxLength={500}
            rows={3}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3
                       text-base text-text placeholder:text-text-muted/50
                       focus:outline-none focus:border-primary/50
                       resize-none transition-colors duration-200"
          />

          <button
            onClick={handleSubmit}
            disabled={score === 0 || submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                       bg-primary hover:bg-primary-light disabled:opacity-40
                       disabled:cursor-not-allowed text-white rounded-xl
                       font-medium text-sm transition-all duration-200 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? '提交中...' : '提交评分'}</span>
          </button>
        </>
      )}

      {submitted && (
        <p className="text-xs text-text-muted text-center">
          感谢你的评价!
        </p>
      )}
    </div>
  );
}
