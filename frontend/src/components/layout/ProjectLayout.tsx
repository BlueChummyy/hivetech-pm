import { NavLink, Outlet, useParams } from 'react-router-dom';
import { Columns3, List, GanttChart, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useProject } from '@/hooks/useProjects';
import { useProjectSocketEvents } from '@/hooks/useProjectSocketEvents';

const tabs = [
  { label: 'Board', path: 'board', icon: Columns3 },
  { label: 'List', path: 'list', icon: List },
  { label: 'Gantt', path: 'gantt', icon: GanttChart },
  { label: 'Settings', path: 'settings', icon: Settings },
];

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading } = useProject(projectId ?? '');

  useProjectSocketEvents(projectId);

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
        <nav className="flex gap-1 px-6 pt-3">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200',
                )
              }
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
