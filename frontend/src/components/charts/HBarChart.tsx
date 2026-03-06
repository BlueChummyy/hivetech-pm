import { useEffect, useState } from 'react';

export interface HBarItem {
  label: string;
  value: number;
  color: string;
  subLabel?: string;
}

export interface HBarChartProps {
  data: HBarItem[];
  maxItems?: number;
  showValues?: boolean;
  className?: string;
}

export function HBarChart({
  data,
  maxItems = 8,
  showValues = true,
  className = '',
}: HBarChartProps) {
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
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {items.map((item) => {
        const pct = (item.value / maxValue) * 100;

        return (
          <div key={item.label} className="flex items-center gap-2" style={{ height: 20 }}>
            <span
              className="shrink-0 truncate text-xs text-surface-300"
              style={{ maxWidth: 100 }}
              title={item.label}
            >
              {item.label}
            </span>

            <div className="relative h-4 flex-1 overflow-hidden rounded-r-sm bg-surface-700">
              <div
                className="h-full rounded-r-sm"
                style={{
                  backgroundColor: item.color,
                  width: mounted ? `${pct}%` : '0%',
                  transition: 'width 0.6s ease-out',
                }}
              />
            </div>

            {showValues && (
              <span className="shrink-0 text-xs tabular-nums text-surface-400">
                {item.value}
                {item.subLabel ? (
                  <span className="ml-1 text-surface-500">{item.subLabel}</span>
                ) : null}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
