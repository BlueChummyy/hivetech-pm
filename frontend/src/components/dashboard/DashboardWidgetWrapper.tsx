import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, X, Maximize2 } from 'lucide-react';
import { ALLOWED_SIZES, SIZE_MAP, type WidgetType } from '@/hooks/useDashboardLayout';

interface Props {
  id: string;
  widgetType: WidgetType;
  colSpan: number;
  rowSpan: number;
  title: string;
  editing: boolean;
  visible: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onResize: (colSpan: number, rowSpan: number) => void;
  children: React.ReactNode;
}

export function DashboardWidgetWrapper({
  id,
  widgetType,
  colSpan,
  rowSpan,
  title,
  editing,
  visible,
  onToggle,
  onRemove,
  onResize,
  children,
}: Props) {
  const [sizePickerOpen, setSizePickerOpen] = useState(false);
  const sizePickerRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${colSpan}`,
    gridRow: `span ${rowSpan}`,
  };

  // Close size picker on outside click
  useEffect(() => {
    if (!sizePickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target as Node)) {
        setSizePickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sizePickerOpen]);

  if (!visible && !editing) return null;

  const allowedSizes = ALLOWED_SIZES[widgetType] || ['1x1', '2x2'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative rounded-lg border bg-surface-800 overflow-hidden flex flex-col
        ${editing ? 'ring-1 ring-dashed ring-surface-500/40 border-surface-600/60' : 'border-surface-700/60'}
        ${isDragging ? 'z-50 opacity-80 shadow-xl' : ''}
        ${!visible && editing ? 'opacity-40' : ''}
      `}
    >
      {/* Edit-mode header bar */}
      {editing && (
        <div className="flex items-center gap-1.5 border-b border-surface-700/60 bg-surface-700/30 px-2.5 py-1.5 shrink-0">
          <button
            {...attributes}
            {...listeners}
            className="flex items-center gap-1 text-xs text-surface-400 hover:text-surface-200 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-medium text-surface-300 truncate flex-1">
            {title}
          </span>

          {/* Size picker */}
          <div className="relative" ref={sizePickerRef}>
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                setSizePickerOpen(!sizePickerOpen);
              }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-600/50 transition-colors"
              title="Resize widget"
            >
              <Maximize2 className="h-3 w-3" />
              <span>{colSpan}x{rowSpan}</span>
            </button>

            {sizePickerOpen && (
              <div className="absolute right-0 top-full mt-1 z-[60] rounded-lg border border-surface-600 bg-surface-800 shadow-xl p-2 min-w-[140px]">
                <p className="text-[10px] font-medium text-surface-500 uppercase tracking-wider mb-1.5 px-1">
                  Size (cols x rows)
                </p>
                <div className="grid grid-cols-3 gap-1">
                  {allowedSizes.map((size) => {
                    const { cols, rows } = SIZE_MAP[size];
                    const isActive = cols === colSpan && rows === rowSpan;
                    return (
                      <button
                        key={size}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onResize(cols, rows);
                          setSizePickerOpen(false);
                        }}
                        className={`
                          flex items-center justify-center rounded py-1.5 px-2 text-xs font-mono font-medium transition-colors
                          ${isActive
                            ? 'bg-primary-600/20 text-primary-400 ring-1 ring-primary-500/40'
                            : 'text-surface-300 hover:bg-surface-700 hover:text-surface-100'
                          }
                        `}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>

                {/* Visual preview */}
                <div className="mt-2 pt-2 border-t border-surface-700/60 px-1">
                  <p className="text-[10px] text-surface-500 mb-1">Preview</p>
                  <div className="grid grid-cols-4 gap-px" style={{ height: '32px' }}>
                    {Array.from({ length: 16 }).map((_, i) => {
                      const col = i % 4;
                      const row = Math.floor(i / 4);
                      const isInWidget = col < colSpan && row < rowSpan;
                      return (
                        <div
                          key={i}
                          className={`rounded-sm ${isInWidget ? 'bg-primary-500/40' : 'bg-surface-700/40'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex items-center justify-center rounded p-0.5 text-surface-400 hover:text-surface-200 hover:bg-surface-600/50"
            title={visible ? 'Hide widget' : 'Show widget'}
          >
            {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex items-center justify-center rounded p-0.5 text-surface-400 hover:text-red-400 hover:bg-surface-600/50"
            title="Remove widget"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Normal-mode title */}
      {!editing && (
        <div className="px-4 pt-3 pb-0 shrink-0">
          <h3 className="text-xs font-medium text-surface-400 uppercase tracking-wide">
            {title}
          </h3>
        </div>
      )}

      {/* Widget content */}
      <div className="p-4 flex-1 min-h-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
