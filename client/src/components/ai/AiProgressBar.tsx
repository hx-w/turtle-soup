import ProgressBar from '../ProgressBar';

interface AiProgressBarProps {
  progress: number;
  animated?: boolean;
  frozen?: boolean;
}

export default function AiProgressBar({ progress, animated = true, frozen = false }: AiProgressBarProps) {
  return (
    <ProgressBar
      label="推理进度"
      progress={progress}
      variant="gradient"
      frozen={frozen}
      animated={animated}
    />
  );
}
