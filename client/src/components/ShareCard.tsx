import { forwardRef } from 'react';
import { Star } from 'lucide-react';
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

    const bgParams = isDark 
      ? { bg: '#1c1c1e', text: '#f5f5f7', subText: '#98989d', divider: '#38383a', cardBg: '#2c2c2e', barBg: '#38383a' }
      : { bg: '#ffffff', text: '#1d1d1f', subText: '#86868b', divider: '#e5e5ea', cardBg: '#f2f2f7', barBg: '#e5e5ea' };

    const total = stats.totalQuestions;
    const dist = stats.distribution;
    const rating = stats.averageRating;
    const lastYes = stats.awards.lastYes;

    const yesP = total > 0 ? (dist.yes / total) * 100 : 0;
    const noP = total > 0 ? (dist.no / total) * 100 : 0;
    const partialP = total > 0 ? (dist.partial / total) * 100 : 0;
    const irrelevantP = total > 0 ? (dist.irrelevant / total) * 100 : 0;

    const endDate = channel.endedAt
      ? new Date(channel.endedAt).toLocaleDateString('zh-CN')
      : '';

    return (
      <div
        ref={ref}
        style={{
          width: 390,
          height: 520,
          backgroundColor: bgParams.bg,
          color: bgParams.text,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 24,
          boxShadow: isDark 
            ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)' 
            : 'inset 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Top amber line */}
        <div style={{ height: 5, backgroundColor: '#d97706', flexShrink: 0 }} />

        <div
          style={{
            flex: 1,
            padding: '24px 24px 60px',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            overflow: 'hidden',
          }}
        >
          {/* Header: brand + rating */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: bgParams.subText,
                letterSpacing: '0.05em',
              }}
            >
              海龟汤
            </span>
            {typeof rating === 'number' && rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={16} fill="#d97706" color="#d97706" />
                <span
                  style={{ fontSize: 16, fontWeight: 700, color: '#d97706' }}
                >
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <div style={{ height: 1, backgroundColor: bgParams.divider, marginBottom: 16 }} />

          {/* Surface */}
          <div style={{ marginBottom: 16, flexShrink: 0, minHeight: 0 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#d97706',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              汤面
            </span>
            <div
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: bgParams.text,
                marginTop: 8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {channel.surface}
            </div>
          </div>

          {/* Stats row inside a nice card background */}
          <div
            style={{
              backgroundColor: bgParams.cardBg,
              borderRadius: 16,
              padding: '16px',
              marginBottom: 12,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              {[
                { value: String(total), label: '提问' },
                { value: String(stats.playerCount), label: '玩家' },
                {
                  value: difficultyLabel[channel.difficulty] ?? '中等',
                  label: '难度',
                },
              ].map((item) => (
                <div key={item.label} style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#d97706',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {item.value}
                  </div>
                  <div style={{ fontSize: 12, color: bgParams.subText, marginTop: 4, fontWeight: 500 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Distribution bar */}
            <div>
              <div
                style={{
                  display: 'flex',
                  height: 8,
                  borderRadius: 4,
                  overflow: 'hidden',
                  backgroundColor: bgParams.barBg,
                }}
              >
                {yesP > 0 && (
                  <div style={{ width: `${yesP}%`, backgroundColor: '#34c759' }} />
                )}
                {noP > 0 && (
                  <div style={{ width: `${noP}%`, backgroundColor: '#ff3b30' }} />
                )}
                {partialP > 0 && (
                  <div style={{ width: `${partialP}%`, backgroundColor: '#ff9500' }} />
                )}
                {irrelevantP > 0 && (
                  <div style={{ width: `${irrelevantP}%`, backgroundColor: '#8e8e93' }} />
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 8,
                  fontSize: 11,
                  color: bgParams.subText,
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
                        backgroundColor: d.color,
                        marginRight: 4,
                      }}
                    />
                    {d.label} {d.count}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Key question */}
          {lastYes && (
            <div style={{ marginBottom: 12, flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: '#d97706', marginBottom: 6, fontWeight: 600 }}>
                🎯 关键一问
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: bgParams.text,
                  lineHeight: 1.5,
                  fontStyle: 'italic',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                "{lastYes.content}"
              </p>
              {lastYes.asker?.nickname && (
                <p
                  style={{
                    fontSize: 12,
                    color: bgParams.subText,
                    textAlign: 'right',
                    marginTop: 6,
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
              fontSize: 15,
              fontWeight: 600,
              color: '#d97706',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            你能猜到汤底吗？
          </div>

          {/* Footer */}
          <div
            style={{
              height: 1,
              backgroundColor: bgParams.divider,
              marginBottom: 12,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
              color: bgParams.subText,
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
              color: bgParams.subText,
              letterSpacing: '0.04em',
              fontWeight: 500,
              opacity: 0.7,
            }}
          >
            @carol
          </div>
        </div>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';

export default ShareCard;
