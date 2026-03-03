import { Minus, Plus } from 'lucide-react';

interface StepperInputProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (v: number) => void;
}

export default function StepperInput({ value, min, max, step = 1, suffix, onChange }: StepperInputProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={decrement}
        disabled={value <= min}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-border
                   text-text-muted hover:bg-surface cursor-pointer
                   disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[3rem] text-center text-sm font-medium text-text">
        {value} {suffix}
      </span>
      <button
        type="button"
        onClick={increment}
        disabled={value >= max}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-border
                   text-text-muted hover:bg-surface cursor-pointer
                   disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
