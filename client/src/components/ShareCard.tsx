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

/* ─── colour palettes ─── */
const palettes = {
  dark: {
    bg: 'linear-gradient(155deg, #0c1018 0%, #121a26 40%, #162033 100%)',
    cardBg: '#0c1018',
    accent: '#7AAACE',
    accentGrad: 'linear-gradient(135deg, #8FB8D6, #5B9BD5)',
    text: '#e8ecf0',
    surfaceText: 'rgba(232,236,240,0.85)',
    subText: 'rgba(255,255,255,0.48)',
    divider: 'rgba(255,255,255,0.08)',
    glassBg: 'rgba(255,255,255,0.06)',
    glassBorder: 'rgba(255,255,255,0.10)',
    barTrack: 'rgba(255,255,255,0.06)',
    noiseOpacity: 0.30,
    glossOpacity: 1,
    borderGrad:
      'linear-gradient(135deg, rgba(122,170,206,0.45) 0%, rgba(122,170,206,0.10) 40%, rgba(255,255,255,0.04) 60%, rgba(91,155,213,0.22) 100%)',
    iconShadow: '0 2px 8px rgba(91,155,213,0.3)',
  },
  light: {
    bg: 'linear-gradient(155deg, #f8fafb 0%, #eef3f7 40%, #e4ecf2 100%)',
    cardBg: '#f8fafb',
    accent: '#5B9BD5',
    accentGrad: 'linear-gradient(135deg, #7AAACE, #5B9BD5)',
    text: '#2c3e50',
    surfaceText: 'rgba(44,62,80,0.82)',
    subText: 'rgba(44,62,80,0.45)',
    divider: 'rgba(44,62,80,0.08)',
    glassBg: 'rgba(0,0,0,0.03)',
    glassBorder: 'rgba(0,0,0,0.07)',
    barTrack: 'rgba(0,0,0,0.06)',
    noiseOpacity: 0.10,
    glossOpacity: 0.5,
    borderGrad:
      'linear-gradient(135deg, rgba(91,155,213,0.35) 0%, rgba(91,155,213,0.08) 40%, rgba(0,0,0,0.03) 60%, rgba(122,170,206,0.18) 100%)',
    iconShadow: '0 2px 8px rgba(91,155,213,0.2)',
  },
} as const;

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ channel, stats }, ref) => {
    const theme = useThemeStore((s) => s.theme);
    const C = theme === 'dark' ? palettes.dark : palettes.light;

    const total = stats.totalQuestions;
    const dist = stats.distribution;
    const rating = stats.averageRating;
    const lastYes = stats.awards.lastYes;

    const yesP = total > 0 ? (dist.yes / total) * 100 : 0;
    const noP = total > 0 ? (dist.no / total) * 100 : 0;
    const partialP = total > 0 ? (dist.partial / total) * 100 : 0;
    const irrelevantP = total > 0 ? (dist.irrelevant / total) * 100 : 0;

    const endDate = channel.endedAt
      ? new Date(channel.endedAt).toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric',
        })
      : '';

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          minHeight: 460,
          maxHeight: 560,
          borderRadius: 22,
          overflow: 'hidden',
          position: 'relative',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
          color: C.text,
          display: 'flex',
          flexDirection: 'column',
          background: C.bg,
          isolation: 'isolate',
        }}
      >
        {/* ── SVG noise texture overlay ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: C.noiseOpacity,
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
            zIndex: 1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* ── Diagonal gloss highlight ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 35%, transparent 50%, rgba(255,255,255,0.03) 65%, rgba(255,255,255,0.08) 100%)',
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
            opacity: C.glossOpacity,
            zIndex: 2,
          }}
        />

        {/* ── Gradient glow border ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 22,
            padding: 1,
            background: C.borderGrad,
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />

        {/* ── Content ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 4,
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
                  borderRadius: 10,
                  background: C.accentGrad,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: C.iconShadow,
                }}
              >
                <Sparkles size={16} color="#fff" />
              </div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: C.text,
                  letterSpacing: '0.02em',
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
                  padding: '5px 12px',
                  background: C.glassBg,
                  borderRadius: 20,
                  border: `1px solid ${C.glassBorder}`,
                }}
              >
                <Star size={13} fill={C.accent} color={C.accent} />
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: C.accent }}
                >
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Surface (汤面) */}
          <div style={{ marginBottom: 18, flexShrink: 0 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
              }}
            >
              汤面
            </span>
            <div
              style={{
                fontSize: 14,
                lineHeight: 1.7,
                color: C.surfaceText,
                marginTop: 8,
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

          {/* Stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 14,
              flexShrink: 0,
            }}
          >
            {[
              { icon: <MessageCircle size={16} color={C.accent} />, value: total, label: '提问' },
              { icon: <Users size={16} color={C.accent} />, value: stats.playerCount, label: '玩家' },
              { icon: <Target size={16} color={C.accent} />, value: difficultyLabel[channel.difficulty] ?? '中等', label: '难度' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: C.glassBg,
                  border: `1px solid ${C.glassBorder}`,
                  borderRadius: 14,
                  padding: '12px 8px',
                  textAlign: 'center',
                }}
              >
                <div style={{ marginBottom: 5 }}>{item.icon}</div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: C.text,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {item.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: C.subText,
                    marginTop: 2,
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Distribution bar */}
          <div
            style={{
              background: C.glassBg,
              border: `1px solid ${C.glassBorder}`,
              borderRadius: 14,
              padding: '12px 14px',
              marginBottom: 12,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                height: 4,
                borderRadius: 2,
                overflow: 'hidden',
                marginBottom: 10,
                background: C.barTrack,
              }}
            >
              {yesP > 0 && (
                <div style={{ width: `${yesP}%`, background: '#52c48c' }} />
              )}
              {noP > 0 && (
                <div style={{ width: `${noP}%`, background: '#e87272' }} />
              )}
              {partialP > 0 && (
                <div style={{ width: `${partialP}%`, background: '#e8a84c' }} />
              )}
              {irrelevantP > 0 && (
                <div style={{ width: `${irrelevantP}%`, background: '#6b7280' }} />
              )}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 12,
                fontSize: 10,
                color: C.subText,
                justifyContent: 'center',
                fontWeight: 500,
              }}
            >
              {[
                { color: '#52c48c', label: '是', count: dist.yes },
                { color: '#e87272', label: '否', count: dist.no },
                { color: '#e8a84c', label: '部分', count: dist.partial },
                { color: '#6b7280', label: '无关', count: dist.irrelevant },
              ].map((d) => (
                <span
                  key={d.label}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 5,
                      height: 5,
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
                marginBottom: 12,
                flexShrink: 0,
                padding: '11px 14px',
                background: C.glassBg,
                borderRadius: 14,
                border: `1px solid ${C.glassBorder}`,
                borderLeft: `3px solid ${C.accent}`,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: C.accent,
                  marginBottom: 5,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  letterSpacing: '0.08em',
                }}
              >
                <span>🎯</span> 关键一问
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: C.surfaceText,
                  lineHeight: 1.6,
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
                    fontSize: 10,
                    color: C.subText,
                    textAlign: 'right',
                    margin: 0,
                    paddingTop: 4,
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
              color: C.accent,
              marginBottom: 14,
              textAlign: 'center',
              letterSpacing: '0.04em',
            }}
          >
            你能猜到汤底吗？
          </div>

          {/* Footer */}
          <div
            style={{
              height: 1,
              background: C.divider,
              marginBottom: 10,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 10,
              color: C.subText,
              fontWeight: 500,
              letterSpacing: '0.02em',
            }}
          >
            <span>海龟汤 · turtle-soup</span>
            <span>{endDate}</span>
          </div>
        </div>
      </div>
    );
  },
);

ShareCard.displayName = 'ShareCard';

export default ShareCard;
