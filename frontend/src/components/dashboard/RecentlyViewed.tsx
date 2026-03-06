import { useNavigate } from 'react-router-dom';
import { Clock, FileText, Folder } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { useUIStore } from '@/store/ui.store';

export interface RecentItem {
  type: 'task' | 'project';
  id: string;
  title: string;
  projectKey?: string;
  taskNumber?: number;
  projectId?: string;
  timestamp: number;
}

const STORAGE_KEY = 'hivetech_recently_viewed';
const MAX_ITEMS = 8;

export function getRecentlyViewed(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items: RecentItem[] = JSON.parse(raw);
    return items.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addRecentlyViewed(item: Omit<RecentItem, 'timestamp'>) {
  try {
    const items = getRecentlyViewed();
    // Remove duplicate
    const filtered = items.filter(
      (i) => !(i.type === item.type && i.id === item.id),
    );
    // Add at front
    filtered.unshift({ ...item, timestamp: Date.now() });
    // Keep max
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {
    // localStorage unavailable
  }
}

interface RecentlyViewedProps {
  items: RecentItem[];
}

export function RecentlyViewed({ items }: RecentlyViewedProps) {
  const navigate = useNavigate();

  if (items.length === 0) return null;

  const handleClick = (item: RecentItem) => {
    if (item.type === 'task') {
      useUIStore.getState().openTaskPanel(item.id);
    } else if (item.type === 'project' && item.id) {
      navigate(`/projects/${item.id}/board`);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-surface-500" />
        <h2 className="text-sm font-semibold text-surface-200">Recently Viewed</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {items.map((item) => (
          <Card
            key={`${item.type}-${item.id}`}
            className="shrink-0 cursor-pointer transition-colors hover:border-surface-600 hover:bg-surface-800/80"
            onClick={() => handleClick(item)}
          >
            <CardBody className="flex items-center gap-3 py-3 px-4 min-w-[180px] max-w-[240px]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-700">
                {item.type === 'task' ? (
                  <FileText className="h-4 w-4 text-primary-400" />
                ) : (
                  <Folder className="h-4 w-4 text-amber-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-200 truncate">
                  {item.title}
                </p>
                <p className="text-xs text-surface-500 truncate">
                  {item.type === 'task' && item.projectKey && item.taskNumber
                    ? `${item.projectKey}-${item.taskNumber}`
                    : item.type === 'project'
                      ? 'Project'
                      : 'Task'}
                </p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
