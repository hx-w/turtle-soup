import { motion } from 'framer-motion';
import { Check, X, Minus, PieChart, Target } from 'lucide-react';

interface AnswerStampProps {
  answer: 'yes' | 'no' | 'irrelevant' | 'partial';
  isKeyQuestion?: boolean;
}

const config = {
  yes: {
    label: '是',
    icon: Check,
    classes: 'bg-yes/20 text-yes border-yes',
  },
  no: {
    label: '否',
    icon: X,
    classes: 'bg-no/20 text-no border-no',
  },
  irrelevant: {
    label: '无关',
    icon: Minus,
    classes: 'bg-irrelevant/20 text-irrelevant border-irrelevant',
  },
  partial: {
    label: '部分正确',
    icon: PieChart,
    classes: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500 dark:border-orange-400',
  },
} as const;

export default function AnswerStamp({ answer, isKeyQuestion }: AnswerStampProps) {
  const { label, icon: Icon, classes } = config[answer];

  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 font-heading font-bold text-sm ${classes}`}
    >
      <Icon className="w-4 h-4" strokeWidth={3} />
      <span>{label}</span>
      {isKeyQuestion && <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
    </motion.div>
  );
}
