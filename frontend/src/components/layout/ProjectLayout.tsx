import { useState, useMemo, useRef, useEffect } from 'react';
import { NavLink, Outlet, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Columns3, List, GanttChart, Settings, Loader2, Clock, CalendarDays, Plus, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useProject } from '@/hooks/useProjects';
import { useProjectSocketEvents } from '@/hooks/useProjectSocketEvents';
import { useProjectPermissions } from '@/hooks/useProjectRole';

interface ViewDef {
  label: string;
  path: string;
  icon: typeof Columns3;
  description: string;
  requiresPM?: boolean;
}

const VIEW_DEFS: ViewDef[] = [
  { label: 'Board', path: 'board', icon: Columns3, description: 'Kanban board view' },
  { label: 'List', path: 'list', icon: List, description: 'Table list view' },
  { label: 'Gantt', path: 'gantt', icon: GanttChart, description: 'Plan dependencies & time' },
  { label: 'Timeline', path: 'timeline', icon: Clock, requiresPM: true, description: 'Team workload overview' },
  { label: 'Calendar', path: 'calendar', icon: CalendarDays, description: 'Schedule by date' },
];

// Default views that are always shown initially
const DEFAULT_VIEWS = ['board', 'list'];

function getStorageKey(projectId: string) {
  return `hivetech:views:${projectId}`;
}

function loadEnabledViews(projectId: string): string[] {
  try {
    const stored = localStorage.getItem(getStorageKey(projectId));
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_VIEWS;
}

function saveEnabledViews(projectId: string, views: string[]) {
  try {
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(views));
  } catch {}
}

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(projectId ?? '');
  const permissions = useProjectPermissions(projectId);

  useProjectSocketEvents(projectId);

  const [enabledViews, setEnabledViews] = useState<string[]>(() =>
    loadEnabledViews(projectId ?? ''),
  );
  const [showViewPicker, setShowViewPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close picker on click outside
  useEffect(() => {
    if (!showViewPicker) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (pickerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setShowViewPicker(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowViewPicker(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [showViewPicker]);

  // All available views based on permissions
  const availableViews = useMemo(
    () => VIEW_DEFS.filter((v) => {
      if (v.requiresPM && !permissions.canAssignDates) return false;
      return true;
    }),
    [permissions.canAssignDates],
  );

  // Active tabs = enabled views that the user has permission for
  const activeTabs = useMemo(
    () => availableViews.filter((v) => enabledViews.includes(v.path)),
    [availableViews, enabledViews],
  );

  // If the current route's view is not enabled, auto-enable it
  useEffect(() => {
    const currentPath = location.pathname.split('/').pop();
    if (currentPath && VIEW_DEFS.some((v) => v.path === currentPath) && !enabledViews.includes(currentPath)) {
      const next = [...enabledViews, currentPath];
      setEnabledViews(next);
      saveEnabledViews(projectId ?? '', next);
    }
  }, [location.pathname]);

  function toggleView(path: string) {
    let next: string[];
    if (enabledViews.includes(path)) {
      // Don't allow removing the last view
      if (enabledViews.length <= 1) return;
      next = enabledViews.filter((v) => v !== path);
      // If removing the currently active view, navigate to the first remaining view
      const currentPath = location.pathname.split('/').pop();
      if (currentPath === path) {
        navigate(next[0]);
      }
    } else {
      next = [...enabledViews, path];
    }
    setEnabledViews(next);
    saveEnabledViews(projectId ?? '', next);
  }

  const showSettings = permissions.canManageProject;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-400">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-white/[0.08] bg-[#18181E]">
        <div className="px-6 pt-4 pb-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">{project.name}</h1>
            <span className="rounded bg-white/[0.08] px-2 py-0.5 text-xs font-medium text-gray-400">
              {project.key}
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-1 px-6 pt-3 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Project views">
          {activeTabs.map((tab) => {
            const isActive = location.pathname.endsWith(`/${tab.path}`);
            const canRemove = enabledViews.length > 1;
            return (
              <div key={tab.path} className="group/tab relative flex shrink-0 items-center">
                <NavLink
                  to={tab.path}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 border-b-2 pl-3 pr-7 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-200',
                  )}
                >
                  <tab.icon className="h-4 w-4" aria-hidden="true" />
                  {tab.label}
                </NavLink>
                {canRemove && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleView(tab.path);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/tab:opacity-100 rounded p-0.5 text-gray-500 hover:text-gray-200 hover:bg-surface-700 transition-all"
                    title={`Remove ${tab.label} view`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Settings tab (always visible if admin) */}
          {showSettings && (
            <NavLink
              to="settings"
              role="tab"
              aria-selected={location.pathname.endsWith('/settings')}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                location.pathname.endsWith('/settings')
                  ? 'border-primary-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200',
              )}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Settings
            </NavLink>
          )}

          {/* + View button */}
          <div ref={pickerRef} className="shrink-0">
            <button
              onClick={() => setShowViewPicker((v) => !v)}
              className={cn(
                'flex items-center gap-1 border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
                showViewPicker
                  ? 'text-primary-400'
                  : 'text-gray-500 hover:text-gray-300',
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              View
            </button>
          </div>
        </nav>

        {/* View picker dropdown - rendered outside nav to avoid overflow clipping */}
        {showViewPicker && (
          <div
            ref={(el) => {
              dropdownRef.current = el;
              if (!el || !pickerRef.current) return;
              const btn = pickerRef.current.getBoundingClientRect();
              el.style.position = 'fixed';
              el.style.left = `${btn.left}px`;
              el.style.top = `${btn.bottom + 4}px`;
            }}
            className="fixed z-50 w-64 rounded-xl border border-surface-700 bg-surface-800 shadow-xl overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-surface-700">
              <p className="text-xs font-medium text-surface-400">Toggle Views</p>
            </div>
            <div className="py-1">
              {availableViews.map((view) => {
                const isEnabled = enabledViews.includes(view.path);
                const Icon = view.icon;
                return (
                  <button
                    key={view.path}
                    onClick={() => toggleView(view.path)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-700/50"
                  >
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg',
                      isEnabled ? 'bg-primary-600/20 text-primary-400' : 'bg-surface-700 text-surface-400',
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium',
                        isEnabled ? 'text-surface-100' : 'text-surface-300',
                      )}>
                        {view.label}
                      </p>
                      <p className="text-[11px] text-surface-500">{view.description}</p>
                    </div>
                    <div className={cn(
                      'h-4 w-4 rounded border-2 flex items-center justify-center shrink-0',
                      isEnabled
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-surface-600',
                    )}>
                      {isEnabled && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
