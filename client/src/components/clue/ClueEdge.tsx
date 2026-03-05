import type { ClueEdge as ClueEdgeType } from '../../types';

interface ClueEdgeProps {
  edge: ClueEdgeType;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
}

// Clean styles using design tokens — no orange
const relationStyles = {
  temporal: {
    dashArray: '6,4',
    color: 'rgb(var(--color-text-muted))',
    opacity: 0.45,
  },
  causal: {
    dashArray: '',
    color: 'rgb(var(--color-primary))',
    opacity: 0.5,
  },
  contradictory: {
    dashArray: '3,5',
    color: 'rgb(var(--color-no))',
    opacity: 0.45,
  },
  related: {
    dashArray: '2,4',
    color: 'rgb(var(--color-text-muted))',
    opacity: 0.35,
  },
};

const relationLabels: Record<string, string> = {
  temporal: '时间',
  causal: '因果',
  contradictory: '矛盾',
  related: '相关',
};

export default function ClueEdge({ edge, sourcePos, targetPos }: ClueEdgeProps) {
  const style = relationStyles[edge.relation];

  // Node center offset
  const nodeOffsetX = 100;
  const nodeOffsetY = 40;

  const startX = sourcePos.x + nodeOffsetX;
  const startY = sourcePos.y + nodeOffsetY;
  const endX = targetPos.x + nodeOffsetX;
  const endY = targetPos.y + nodeOffsetY;

  // Smooth curved path
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const dx = endX - startX;
  const dy = endY - startY;
  const curve = Math.min(Math.abs(dx), Math.abs(dy)) * 0.15;

  const path = `M ${startX} ${startY} Q ${midX + curve} ${midY - curve} ${endX} ${endY}`;

  // Label position
  const labelX = midX;
  const labelY = midY - 8;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={style.color}
        strokeWidth={1.2}
        strokeDasharray={style.dashArray}
        opacity={style.opacity}
        strokeLinecap="round"
      />

      {edge.description && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-18}
            y={-7}
            width={36}
            height={14}
            fill="rgb(var(--color-card))"
            rx={4}
            opacity={0.9}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="rgb(var(--color-text-muted))"
            className="pointer-events-none select-none"
            fontWeight={500}
          >
            {relationLabels[edge.relation] || '相关'}
          </text>
        </g>
      )}
    </g>
  );
}
