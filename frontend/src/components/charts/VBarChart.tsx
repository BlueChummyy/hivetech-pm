import { useEffect, useState } from 'react';

export interface VBarItem {
  label: string;
  value: number;
  color: string;
}

export interface VBarChartProps {
  data: VBarItem[];
  height?: number;
  maxItems?: number;
  showValues?: boolean;
  className?: string;
}

export function VBarChart({
  data,
  height = 160,
  maxItems = 8,
  showValues = true,
  className = '',
}: VBarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <span className="text-sm text-surface-500">No data</span>
      </div>
    );
  }

  const items = data.slice(0, maxItems);
  const maxValue = Math.max(...items.map((d) => d.value), 1);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Bars area */}
      <div className="flex items-end gap-2" style={{ height }}>
        {items.map((item) => {
          const pct = (item.value / maxValue) * 100;

          return (
            <div
              key={item.label}
              className="flex flex-1 flex-col items-center justify-end"
              style={{ maxWidth: 60, height: '100%' }}
            >
              {showValues && (
                <span className="mb-1 text-[10px] font-medium tabular-nums text-surface-300">
                  {item.value}
                </span>
              )}
              <div
                className="w-full rounded-t-sm"
                style={{
                  backgroundColor: item.color,
                  height: mounted ? `${pct}%` : '0%',
                  transition: 'height 0.6s ease-out',
                  minHeight: item.value > 0 ? 2 : 0,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Baseline */}
      <div className="mt-0.5 border-t border-surface-600" />

      {/* Labels */}
      <div className="flex gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex-1 overflow-hidden pt-1 text-center"
            style={{ maxWidth: 60 }}
          >
            <span
              className="block truncate text-xs text-surface-400"
              title={item.label}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
