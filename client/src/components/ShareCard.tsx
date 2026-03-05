import { forwardRef } from 'react';
import { Star, Sparkles, MessageCircle, Users, Target } from 'lucide-react';
import type { Channel, ChannelStats } from '../types';
import { useThemeStore } from '../stores/themeStore';

interface ShareCardProps {
  channel: Channel;
  stats: ChannelStats;
}

const difficultyLabel: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  hell: '地狱',
};

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ channel, stats }, ref) => {
    const theme = useThemeStore((s) => s.theme);
    const isDark = theme === 'dark';

    // Apple-style system colors — no purple/violet gradients
    const colors = isDark
      ? {
          bg: '#1c1c1e',
          cardBg: '#2c2c2e',
          text: '#f5f5f7',
          subText: '#98989d',
          divider: '#38383a',
          accent: '#0A84FF',
        }
      : {
          bg: '#ffffff',
          cardBg: '#f2f2f7',
          text: '#1c1c1e',
          subText: '#8e8e93',
          divider: '#d1d1d6',
          accent: '#007AFF',
        };

    const total = stats.totalQuestions;
    const dist = stats.distribution;
    const rating = stats.averageRating;
    const lastYes = stats.awards.lastYes;

    const yesP = total > 0 ? (dist.yes / total) * 100 : 0;
    const noP = total > 0 ? (dist.no / total) * 100 : 0;
    const partialP = total > 0 ? (dist.partial / total) * 100 : 0;
    const irrelevantP = total > 0 ? (dist.irrelevant / total) * 100 : 0;

    const endDate = channel.endedAt
      ? new Date(channel.endedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      : '';

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          minHeight: 460,
          maxHeight: 540,
          backgroundColor: colors.bg,
          color: colors.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 20,
          border: isDark ? '1px solid #38383a' : '1px solid #d1d1d6',
        }}
      >
        {/* Solid accent bar — no gradient */}
        <div
          style={{
            height: 3,
            background: colors.accent,
            flexShrink: 0,
          }}
        />

        <div
          style={{
            flex: 1,
            padding: '24px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={18} color="#fff" />
              </div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: colors.text,
                  letterSpacing: '-0.01em',
                }}
              >
                海龟汤
              </span>
            </div>
            {typeof rating === 'number' && rating > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  background: colors.cardBg,
                  borderRadius: 20,
                }}
              >
                <Star size={14} fill={colors.accent} color={colors.accent} />
                <span
                  style={{ fontSize: 14, fontWeight: 700, color: colors.accent }}
                >
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Surface */}
          <div
            style={{
              marginBottom: 20,
              flexShrink: 0,
              minHeight: 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              汤面
            </span>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: colors.text,
                marginTop: 10,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {channel.surface}
            </div>
          </div>

          {/* Stats cards row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 16,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                background: colors.cardBg,
                borderRadius: 14,
                padding: '14px 10px',
                textAlign: 'center',
              }}
            >
              <MessageCircle size={18} color={colors.accent} style={{ marginBottom: 6 }} />
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.text,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {total}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.subText,
                  marginTop: 3,
                  fontWeight: 500,
                }}
              >
                提问
              </div>
            </div>
            <div
              style={{
                background: colors.cardBg,
                borderRadius: 14,
                padding: '14px 10px',
                textAlign: 'center',
              }}
            >
              <Users size={18} color={colors.accent} style={{ marginBottom: 6 }} />
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.text,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stats.playerCount}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.subText,
                  marginTop: 3,
                  fontWeight: 500,
                }}
              >
                玩家
              </div>
            </div>
            <div
              style={{
                background: colors.cardBg,
                borderRadius: 14,
                padding: '14px 10px',
                textAlign: 'center',
              }}
            >
              <Target size={18} color={colors.accent} style={{ marginBottom: 6 }} />
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.text,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {difficultyLabel[channel.difficulty] ?? '中等'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.subText,
                  marginTop: 3,
                  fontWeight: 500,
                }}
              >
                难度
              </div>
            </div>
          </div>

          {/* Distribution bar */}
          <div
            style={{
              background: colors.cardBg,
              borderRadius: 14,
              padding: '14px',
              marginBottom: 14,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                height: 5,
                borderRadius: 2.5,
                overflow: 'hidden',
                marginBottom: 10,
                background: isDark ? '#38383a' : '#e5e5ea',
              }}
            >
              {yesP > 0 && (
                <div
                  style={{
                    width: `${yesP}%`,
                    background: '#34c759',
                  }}
                />
              )}
              {noP > 0 && (
                <div
                  style={{
                    width: `${noP}%`,
                    background: '#ff3b30',
                  }}
                />
              )}
              {partialP > 0 && (
                <div
                  style={{
                    width: `${partialP}%`,
                    background: '#ff9500',
                  }}
                />
              )}
              {irrelevantP > 0 && (
                <div
                  style={{
                    width: `${irrelevantP}%`,
                    background: '#8e8e93',
                  }}
                />
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                fontSize: 11,
                color: colors.subText,
                justifyContent: 'center',
                fontWeight: 500,
              }}
            >
              {[
                { color: '#34c759', label: '是', count: dist.yes },
                { color: '#ff3b30', label: '否', count: dist.no },
                { color: '#ff9500', label: '部分', count: dist.partial },
                { color: '#8e8e93', label: '无关', count: dist.irrelevant },
              ].map((d) => (
                <span key={d.label} style={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: d.color,
                      marginRight: 4,
                    }}
                  />
                  {d.label} {d.count}
                </span>
              ))}
            </div>
          </div>

          {/* Key question highlight */}
          {lastYes && (
            <div
              style={{
                marginBottom: 14,
                flexShrink: 0,
                padding: '12px 14px',
                background: colors.cardBg,
                borderRadius: 14,
                borderLeft: `3px solid ${colors.accent}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: colors.accent,
                  marginBottom: 6,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span>🎯</span> 关键一问
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: colors.text,
                  lineHeight: 1.55,
                  fontStyle: 'italic',
                  margin: 0,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                &ldquo;{lastYes.content}&rdquo;
              </p>
              {lastYes.asker?.nickname && (
                <p
                  style={{
                    fontSize: 11,
                    color: colors.subText,
                    textAlign: 'right',
                    margin: 0,
                    paddingTop: 6,
                  }}
                >
                  —— @{lastYes.asker.nickname}
                </p>
              )}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* CTA */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.accent,
              marginBottom: 16,
              textAlign: 'center',
              letterSpacing: '-0.01em',
            }}
          >
            你能猜到汤底吗？
          </div>

          {/* Footer */}
          <div
            style={{
              height: 1,
              background: colors.divider,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
              color: colors.subText,
              fontWeight: 500,
            }}
          >
            <span>海龟汤 · turtle-soup</span>
            <span>{endDate}</span>
          </div>

          {/* Author watermark */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 24,
              right: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: colors.subText,
              letterSpacing: '0.05em',
              fontWeight: 500,
              opacity: 0.4,
            }}
          >
            @carol-product
          </div>
        </div>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';

export default ShareCard;
