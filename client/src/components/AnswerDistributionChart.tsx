import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import type { TimelineBucket } from '../types';

interface AnswerDistributionChartProps {
  data: TimelineBucket[];
  total: number;
}

// Color palette matching the app's design system
const COLORS = {
  yes: '#52C48C',       // Green - matching --color-yes
  no: '#EB6565',        // Red - matching --color-no
  partial: '#F97316',   // Orange-500
  irrelevant: '#6C7A89', // Gray - matching --color-irrelevant
};

const GRADIENTS = {
  yes: 'url(#gradientYes)',
  no: 'url(#gradientNo)',
  partial: 'url(#gradientPartial)',
  irrelevant: 'url(#gradientIrrelevant)',
};

// Custom tooltip component
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((sum, p) => sum + p.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card/95 backdrop-blur-xl border border-border rounded-xl p-3 shadow-lg text-xs"
    >
      <p className="text-text-muted mb-2 font-medium">{label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-text-muted">
                {p.name === 'yes' ? '是' : p.name === 'no' ? '否' : p.name === 'partial' ? '部分' : '无关'}
              </span>
            </span>
            <span className="font-semibold text-text">{p.value}</span>
          </div>
        ))}
        <div className="pt-1.5 border-t border-border mt-1.5">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">总计</span>
            <span className="font-semibold text-text">{total}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AnswerDistributionChart({ data, total }: AnswerDistributionChartProps) {
  // Transform data for stacked area chart (cumulative)
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((bucket) => ({
      time: bucket.timeLabel,
      是: bucket.cumulativeYes,
      否: bucket.cumulativeNo,
      部分: bucket.cumulativePartial,
      无关: bucket.cumulativeIrrelevant,
    }));
  }, [data]);

  // Don't show chart if not enough data
  if (!chartData || chartData.length === 0 || total < 3) {
    return null;
  }

  // For very short games, use simpler visualization
  if (chartData.length < 2) {
    return (
      <div className="bg-surface/50 rounded-xl p-4 text-center text-sm text-text-muted">
        问题数量较少，暂无时间分布数据
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="h-48 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradientYes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.yes} stopOpacity={0.4} />
                <stop offset="95%" stopColor={COLORS.yes} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradientNo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.no} stopOpacity={0.4} />
                <stop offset="95%" stopColor={COLORS.no} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradientPartial" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.partial} stopOpacity={0.4} />
                <stop offset="95%" stopColor={COLORS.partial} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradientIrrelevant" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.irrelevant} stopOpacity={0.4} />
                <stop offset="95%" stopColor={COLORS.irrelevant} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border/50"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-text-muted"
              interval="preserveStartEnd"
              tickFormatter={(value) => value || ''}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-text-muted"
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="无关"
              stackId="1"
              stroke={COLORS.irrelevant}
              strokeWidth={1.5}
              fill={GRADIENTS.irrelevant}
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="部分"
              stackId="1"
              stroke={COLORS.partial}
              strokeWidth={1.5}
              fill={GRADIENTS.partial}
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="否"
              stackId="1"
              stroke={COLORS.no}
              strokeWidth={1.5}
              fill={GRADIENTS.no}
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="是"
              stackId="1"
              stroke={COLORS.yes}
              strokeWidth={1.5}
              fill={GRADIENTS.yes}
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
