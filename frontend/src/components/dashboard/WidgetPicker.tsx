import { useState } from 'react';
import {
  X,
  PieChart,
  BarChart3,
  BarChart2,
  Hash,
  List,
  Plus,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WIDGET_CATALOG, type WidgetInstance } from '@/hooks/useDashboardLayout';

interface WidgetPickerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (widget: WidgetInstance) => void;
  existingIds: string[];
}

type Category = 'metrics' | 'donut' | 'hbar' | 'vbar' | 'lists';

const CATEGORIES: { key: Category; label: string; icon: React.ReactNode }[] = [
  { key: 'metrics', label: 'Metrics', icon: <Hash className="h-4 w-4" /> },
  { key: 'donut', label: 'Donut Charts', icon: <PieChart className="h-4 w-4" /> },
  { key: 'hbar', label: 'Bar Charts', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'vbar', label: 'Column Charts', icon: <BarChart2 className="h-4 w-4" /> },
  { key: 'lists', label: 'Lists & Feeds', icon: <List className="h-4 w-4" /> },
];

function getCategoryForWidget(w: WidgetInstance): Category {
  if (w.type === 'number') return 'metrics';
  if (w.type === 'donut') return 'donut';
  if (w.type === 'hbar') return 'hbar';
  if (w.type === 'vbar') return 'vbar';
  return 'lists';
}

function getIconForType(type: string) {
  switch (type) {
    case 'number': return <Hash className="h-5 w-5" />;
    case 'donut': return <PieChart className="h-5 w-5" />;
    case 'hbar': return <BarChart3 className="h-5 w-5" />;
    case 'vbar': return <BarChart2 className="h-5 w-5" />;
    default: return <List className="h-5 w-5" />;
  }
}

type ChartType = 'donut' | 'hbar' | 'vbar';
type DataSource = 'byStatus' | 'byPriority' | 'byAssignee' | 'projectProgress';

const CHART_TYPE_OPTIONS: { value: ChartType; label: string }[] = [
  { value: 'donut', label: 'Donut' },
  { value: 'hbar', label: 'Horizontal Bar' },
  { value: 'vbar', label: 'Column' },
];

const DATA_SOURCE_OPTIONS: { value: DataSource; label: string }[] = [
  { value: 'byStatus', label: 'Status' },
  { value: 'byPriority', label: 'Priority' },
  { value: 'byAssignee', label: 'Assignee' },
  { value: 'projectProgress', label: 'Project' },
];

export function WidgetPicker({ open, onClose, onAdd, existingIds }: WidgetPickerProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('metrics');
  const [showCustom, setShowCustom] = useState(false);
  const [customChartType, setCustomChartType] = useState<ChartType>('donut');
  const [customDataSource, setCustomDataSource] = useState<DataSource>('byStatus');
  const [customTitle, setCustomTitle] = useState('');

  if (!open) return null;

  const existingSet = new Set(existingIds);

  const filteredWidgets = WIDGET_CATALOG.filter(
    (w) => getCategoryForWidget(w) === activeCategory,
  );

  const handleAddCustom = () => {
    if (!customTitle.trim()) return;
    const typeMap: Record<ChartType, 'donut' | 'hbar' | 'vbar'> = {
      donut: 'donut',
      hbar: 'hbar',
      vbar: 'vbar',
    };
    const widget: WidgetInstance = {
      id: `custom-${Date.now()}`,
      type: typeMap[customChartType],
      title: customTitle.trim(),
      colSpan: 2,
      rowSpan: 2,
      visible: true,
      config: {
        chartType: customChartType,
        dataSource: customDataSource,
      },
    };
    onAdd(widget);
    setCustomTitle('');
    setShowCustom(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border border-surface-700/60 bg-surface-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-700/60 px-6 py-4">
          <h2 className="text-lg font-semibold text-surface-100">Add Widget</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-surface-400 hover:bg-surface-700 hover:text-surface-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 border-b border-surface-700/60 px-6 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setShowCustom(false); }}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeCategory === cat.key && !showCustom
                  ? 'border-primary-400 text-primary-400'
                  : 'border-transparent text-surface-400 hover:text-surface-200'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
          <button
            onClick={() => setShowCustom(true)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              showCustom
                ? 'border-primary-400 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-200'
            }`}
          >
            <Plus className="h-4 w-4" />
            Custom
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showCustom ? (
            <div className="space-y-4">
              <p className="text-sm text-surface-300">
                Create a custom chart widget by choosing a chart type and data source.
              </p>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-surface-400">
                  Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="My Custom Chart"
                  className="w-full rounded-lg border border-surface-600 bg-surface-700 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-surface-400">
                  Chart Type
                </label>
                <div className="flex gap-2">
                  {CHART_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCustomChartType(opt.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        customChartType === opt.value
                          ? 'border-primary-500 bg-primary-600/15 text-primary-400'
                          : 'border-surface-600 bg-surface-700 text-surface-300 hover:border-surface-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-surface-400">
                  Data Source
                </label>
                <div className="flex gap-2">
                  {DATA_SOURCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCustomDataSource(opt.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        customDataSource === opt.value
                          ? 'border-primary-500 bg-primary-600/15 text-primary-400'
                          : 'border-surface-600 bg-surface-700 text-surface-300 hover:border-surface-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleAddCustom}
                disabled={!customTitle.trim()}
              >
                <Plus className="h-4 w-4" />
                Add Custom Widget
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredWidgets.map((widget) => {
                const exists = existingSet.has(widget.id);
                return (
                  <div
                    key={widget.id}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors ${
                      exists
                        ? 'border-surface-700/40 bg-surface-800/50'
                        : 'border-surface-700/60 bg-surface-700/20 hover:border-surface-600'
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      exists ? 'bg-surface-700/40 text-surface-500' : 'bg-surface-700 text-surface-300'
                    }`}>
                      {getIconForType(widget.type)}
                    </div>
                    <span className={`text-sm font-medium ${exists ? 'text-surface-500' : 'text-surface-200'}`}>
                      {widget.title}
                    </span>
                    {exists ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-700/40 px-2.5 py-0.5 text-xs text-surface-500">
                        <Check className="h-3 w-3" />
                        Added
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onAdd(widget)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
