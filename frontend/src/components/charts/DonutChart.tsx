import { useMemo } from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerValue?: number;
  className?: string;
}

export function DonutChart({
  data,
  size = 140,
  thickness = 24,
  showLegend = true,
  centerLabel,
  centerValue,
  className = '',
}: DonutChartProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const segments = useMemo(() => {
    const active = data.filter((d) => d.value > 0);
    if (active.length === 0) return [];

    let accumulated = 0;
    return active.map((segment) => {
      const fraction = segment.value / total;
      const dashLength = fraction * circumference;
      const gap = circumference - dashLength;
      const offset = -accumulated * circumference + circumference * 0.25; // start from top
      accumulated += fraction;

      return {
        ...segment,
        dashArray: `${dashLength} ${gap}`,
        dashOffset: offset,
      };
    });
  }, [data, total, circumference]);

  const singleSegment = segments.length === 1;

  return (
    <div
      className={`flex flex-col items-center gap-4 sm:flex-row sm:items-start ${className}`}
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
      >
        {total === 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-surface-600"
            strokeWidth={thickness}
          />
        ) : (
          segments.map((seg) => (
            <circle
              key={seg.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap={singleSegment ? 'round' : 'butt'}
              style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
            />
          ))
        )}

        {centerValue !== undefined && (
          <text
            x={center}
            y={centerLabel ? center - 4 : center}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-surface-100 font-mono text-2xl font-bold"
            style={{ fontSize: size * 0.18 }}
          >
            {centerValue}
          </text>
        )}

        {centerLabel && (
          <text
            x={center}
            y={center + (centerValue !== undefined ? 14 : 0)}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-surface-400"
            style={{ fontSize: size * 0.085 }}
          >
            {centerLabel}
          </text>
        )}
      </svg>

      {showLegend && (
        <div className="flex flex-col gap-1.5 py-1">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-surface-300">{item.label}</span>
              <span className="ml-auto pl-2 text-xs tabular-nums text-surface-400">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
