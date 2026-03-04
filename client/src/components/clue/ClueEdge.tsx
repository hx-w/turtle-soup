import type { ClueEdge as ClueEdgeType } from '../../types';

interface ClueEdgeProps {
  edge: ClueEdgeType;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
}

const relationStyles = {
  temporal: {
    dashArray: '5,5',
    color: 'rgb(var(--color-primary))',
    label: '时间',
  },
  causal: {
    dashArray: '',
    color: 'rgb(var(--color-primary))',
    label: '因果',
  },
  contradictory: {
    dashArray: '2,4',
    color: 'rgb(var(--color-no))',
    label: '矛盾',
  },
  related: {
    dashArray: '1,3',
    color: 'rgb(var(--color-text-muted))',
    label: '相关',
  },
};

export default function ClueEdge({ edge, sourcePos, targetPos }: ClueEdgeProps) {
  const style = relationStyles[edge.relation];
  
  // Calculate path
  // Node center offset (approximate node size due to varying text length)
  const nodeOffsetX = 100; // Half of approximate node max-width (200px / 2)
  const nodeOffsetY = 50; // Half of approximate node min-height
  
  const startX = sourcePos.x + nodeOffsetX;
  const startY = sourcePos.y + nodeOffsetY;
  const endX = targetPos.x + nodeOffsetX;
  const endY = targetPos.y + nodeOffsetY;
  
  // Calculate control points for a curved line
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  
  // Adjust curve based on direction
  const dx = endX - startX;
  const dy = endY - startY;
  const curve = Math.min(Math.abs(dx), Math.abs(dy)) * 0.2;
  
  const path = `M ${startX} ${startY} Q ${midX + curve} ${midY - curve} ${endX} ${endY}`;
  
  // Calculate label position
  const labelX = midX;
  const labelY = midY - 8;
  
  return (
    <g>
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={style.color}
        strokeWidth={1.5}
        strokeDasharray={style.dashArray}
        markerEnd="url(#arrowhead)"
        className="transition-all duration-300"
        opacity={0.7}
      />
      
      {/* Label (if has description) */}
      {edge.description && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-20}
            y={-8}
            width={40}
            height={16}
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
          >
            {style.label}
          </text>
        </g>
      )}
    </g>
  );
}
