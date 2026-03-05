import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import type { TimelineBucket } from '../types';

interface QuestionRhythmChartProps {
  data: TimelineBucket[];
  total: number;
}

// Color palette - using a gradient from muted to accent
const RHYTHM_COLORS = [
  '#7AAACE', // primary
  '#91B5D8', // lighter primary
  '#7AAACE', // primary
  '#5B9BD5', // accent
  '#7AAACE', // primary
];

// Custom tooltip for rhythm chart
function RhythmTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { time: string; questions: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card/95 backdrop-blur-xl border border-border rounded-lg px-3 py-2 shadow-lg text-xs"
    >
      <p className="text-text-muted">{data.time}</p>
      <p className="text-text font-semibold">{data.questions} 个问题</p>
    </motion.div>
  );
}

export default function QuestionRhythmChart({ data, total }: QuestionRhythmChartProps) {
  // Transform data for rhythm chart - show questions per time bucket
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((bucket) => ({
      time: bucket.timeLabel,
      questions: bucket.yes + bucket.no + bucket.partial + bucket.irrelevant,
    }));
  }, [data]);

  // Calculate max for y-axis
  const maxQuestions = useMemo(() => {
    if (chartData.length === 0) return 5;
    const max = Math.max(...chartData.map(d => d.questions));
    return Math.max(max, 3);
  }, [chartData]);

  // Don't show chart if not enough data
  if (!chartData || chartData.length === 0 || total < 3) {
    return null;
  }

  // For very short games, use simpler visualization
  if (chartData.length < 2) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full"
    >
      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border/30"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: 'currentColor' }}
              className="text-text-muted"
              interval="preserveStartEnd"
              tickFormatter={(value) => value || ''}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: 'currentColor' }}
              className="text-text-muted"
              domain={[0, maxQuestions]}
              allowDecimals={false}
              ticks={[0, Math.ceil(maxQuestions / 2), maxQuestions]}
            />
            <Tooltip content={<RhythmTooltip />} cursor={{ fill: 'rgba(122, 170, 206, 0.1)' }} />
            <Bar
              dataKey="questions"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={RHYTHM_COLORS[index % RHYTHM_COLORS.length]}
                  fillOpacity={0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
