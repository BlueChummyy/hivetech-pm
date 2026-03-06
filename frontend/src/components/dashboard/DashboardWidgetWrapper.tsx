import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, X } from 'lucide-react';

interface Props {
  id: string;
  colSpan: 1 | 2 | 3;
  title: string;
  editing: boolean;
  visible: boolean;
  onToggle: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}

export function DashboardWidgetWrapper({
  id,
  colSpan,
  title,
  editing,
  visible,
  onToggle,
  onRemove,
  children,
}: Props) {
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
  };

  if (!visible && !editing) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative rounded-lg border bg-surface-800 overflow-hidden
        ${editing ? 'ring-1 ring-dashed ring-surface-500/40 border-surface-600/60' : 'border-surface-700/60'}
        ${isDragging ? 'z-50 opacity-80 shadow-xl' : ''}
        ${!visible && editing ? 'opacity-40' : ''}
      `}
    >
      {/* Edit-mode header bar */}
      {editing && (
        <div className="flex items-center gap-2 border-b border-surface-700/60 bg-surface-700/30 px-3 py-1.5">
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
        <div className="px-4 pt-3 pb-0">
          <h3 className="text-xs font-medium text-surface-400 uppercase tracking-wide">
            {title}
          </h3>
        </div>
      )}

      {/* Widget content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
