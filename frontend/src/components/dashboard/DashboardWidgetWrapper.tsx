import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff } from 'lucide-react';
import type { WidgetId } from '@/hooks/useDashboardLayout';

interface Props {
  id: WidgetId;
  label: string;
  visible: boolean;
  editing: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function DashboardWidgetWrapper({
  id,
  label,
  visible,
  editing,
  onToggle,
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!visible && !editing) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50 opacity-80' : ''} ${!visible && editing ? 'opacity-40' : ''}`}
    >
      {editing && (
        <div className="absolute -top-3 left-0 right-0 z-10 flex items-center gap-2 px-2">
          <button
            {...attributes}
            {...listeners}
            className="flex items-center gap-1 rounded bg-surface-700 px-2 py-0.5 text-xs text-surface-300 hover:bg-surface-600 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-3 w-3" />
            {label}
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex items-center gap-1 rounded bg-surface-700 px-2 py-0.5 text-xs text-surface-300 hover:bg-surface-600"
          >
            {visible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
      )}
      <div
        className={
          editing
            ? 'mt-4 rounded-lg ring-1 ring-surface-600 ring-dashed p-1'
            : ''
        }
      >
        {children}
      </div>
    </div>
  );
}
