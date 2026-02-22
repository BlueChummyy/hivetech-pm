import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Check,
  Shield,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Circle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useSpaces, useCreateSpace, useUpdateSpace, useDeleteSpace } from '@/hooks/useSpaces';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { DropdownMenu, DropdownItem, DropdownSeparator } from '@/components/ui/DropdownMenu';
import type { Space, Project } from '@/types/models.types';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, collapseSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const { activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();
  const { data: workspaces } = useWorkspaces();

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
      setActiveWorkspace(workspaces[0].id);
    }
  }, [activeWorkspaceId, workspaces, setActiveWorkspace]);

  // Close mobile sidebar overlay on route change
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      // On mobile (<lg), close the overlay sidebar when navigating
      if (window.innerWidth < 1024 && useUIStore.getState().sidebarOpen) {
        useUIStore.getState().toggleSidebar();
      }
    }
  }, [location.pathname]);

  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);

  // Global admin check: user is OWNER or ADMIN in ANY workspace
  const isGlobalAdmin = workspaces?.some((ws) =>
    (ws as any).members?.some(
      (m: any) => m.userId === user?.id && (m.role === 'OWNER' || m.role === 'ADMIN'),
    ),
  );

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'My Tasks', icon: CheckSquare, path: '/my-tasks' },
    { label: 'Notifications', icon: Bell, path: '/notifications' },
  ];

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        'flex h-screen flex-col border-r border-surface-700 bg-surface-900 transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header with branding + workspace switcher */}
      <div className="border-b border-surface-700 px-4 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="HiveTech" className="h-8 w-8 shrink-0" />
          {!sidebarCollapsed && (
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-surface-100">
              HiveTech Project Management
            </span>
          )}
          <button
            onClick={() => collapseSidebar(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="ml-auto rounded-md p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                sidebarCollapsed && 'rotate-180',
              )}
            />
          </button>
        </div>
        {!sidebarCollapsed && (
          <div className="mt-2">
            <DropdownMenu
              align="left"
              trigger={
                <button className="flex w-full items-center gap-1 rounded-md px-1 py-1 text-left transition-colors hover:bg-surface-800">
                  <span className="truncate text-xs text-surface-400">
                    Workspace:
                  </span>
                  <span className="min-w-0 truncate text-xs font-medium text-surface-200">
                    {activeWorkspace?.name || 'Select workspace'}
                  </span>
                  <ChevronDown className="ml-auto h-3 w-3 shrink-0 text-surface-400" />
                </button>
              }
            >
              {workspaces?.map((ws) => (
                <DropdownItem
                  key={ws.id}
                  icon={ws.id === activeWorkspaceId
                    ? <Check className="h-4 w-4 text-primary-400" />
                    : <span className="h-4 w-4" />}
                  onClick={() => {
                    setActiveWorkspace(ws.id);
                    navigate(`/workspaces/${ws.id}/projects`);
                  }}
                >
                  {ws.name}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Navigation + Spaces */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.label}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 sm:py-2 text-sm font-medium transition-colors min-h-[44px] sm:min-h-0',
                  isActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200',
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Spaces section */}
        {!sidebarCollapsed && activeWorkspaceId && (
          <SpacesSection workspaceId={activeWorkspaceId} />
        )}
      </nav>

      {/* Admin link at bottom */}
      {isGlobalAdmin && (
        <div className="border-t border-surface-700 px-2 py-3">
          <Link
            to="/admin"
            aria-current={location.pathname.startsWith('/admin') ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 sm:py-2 text-sm font-medium transition-colors min-h-[44px] sm:min-h-0',
              location.pathname.startsWith('/admin')
                ? 'bg-primary-600/20 text-primary-400'
                : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200',
            )}
          >
            <Shield className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Admin</span>}
          </Link>
        </div>
      )}
    </aside>
  );
}

// ---- Spaces Section ----

function SpacesSection({ workspaceId }: { workspaceId: string }) {
  const { data: spaces } = useSpaces(workspaceId);
  const { data: projects } = useProjects(workspaceId);
  const createSpace = useCreateSpace();
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  // Projects not assigned to any space
  const unsortedProjects = projects?.filter((p) => !p.spaceId) ?? [];

  const handleCreateSpace = async () => {
    const name = newSpaceName.trim();
    if (!name) return;
    try {
      await createSpace.mutateAsync({ workspaceId, data: { name } });
      setNewSpaceName('');
      setCreatingSpace(false);
    } catch { /* handled by caller */ }
  };

  return (
    <div className="mt-6">
      {/* Spaces header */}
      <div className="mb-1 flex items-center justify-between px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">
          Spaces
        </span>
        <button
          onClick={() => setCreatingSpace(true)}
          className="rounded p-0.5 text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-300"
          aria-label="Create space"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Inline create space input */}
      {creatingSpace && (
        <div className="px-3 py-1">
          <input
            autoFocus
            type="text"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateSpace();
              if (e.key === 'Escape') { setCreatingSpace(false); setNewSpaceName(''); }
            }}
            onBlur={() => {
              if (newSpaceName.trim()) handleCreateSpace();
              else { setCreatingSpace(false); setNewSpaceName(''); }
            }}
            placeholder="Space name..."
            className="w-full rounded-md border border-surface-600 bg-surface-800 px-2 py-1 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Space tree items */}
      <div className="space-y-0.5">
        {spaces?.map((space) => (
          <SpaceTreeItem key={space.id} space={space} workspaceId={workspaceId} />
        ))}
      </div>

      {/* Unsorted projects (no space) */}
      {unsortedProjects.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center gap-2 px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">
              Projects
            </span>
          </div>
          <div className="space-y-0.5">
            {unsortedProjects.map((project) => (
              <ProjectTreeItem key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Space Tree Item ----

const SPACE_COLORS = [
  '#4ade80', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

function generateProjectKey(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3) || 'PRJ';
}

function SpaceTreeItem({ space, workspaceId }: { space: Space; workspaceId: string }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(space.name);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();
  const createProject = useCreateProject();

  const spaceColor = space.color || SPACE_COLORS[space.position % SPACE_COLORS.length];
  const projectsList = space.projects ?? [];

  const handleRename = async () => {
    const name = editName.trim();
    if (!name || name === space.name) {
      setEditing(false);
      setEditName(space.name);
      return;
    }
    try {
      await updateSpace.mutateAsync({ workspaceId, id: space.id, data: { name } });
      setEditing(false);
    } catch {
      setEditName(space.name);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSpace.mutateAsync({ workspaceId, id: space.id });
    } catch { /* ignore */ }
  };

  const handleCreateProject = async () => {
    const name = newProjectName.trim();
    if (!name) {
      setCreatingProject(false);
      setNewProjectName('');
      return;
    }
    try {
      await createProject.mutateAsync({
        workspaceId,
        spaceId: space.id,
        name,
        key: generateProjectKey(name),
      });
      setNewProjectName('');
      setCreatingProject(false);
      setExpanded(true);
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="group flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-surface-800">
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded p-0.5 text-surface-500 hover:text-surface-300"
          aria-label={expanded ? 'Collapse space' : 'Expand space'}
        >
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <Circle
          className="h-3 w-3 shrink-0"
          fill={spaceColor}
          stroke={spaceColor}
        />

        {editing ? (
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setEditing(false); setEditName(space.name); }
            }}
            onBlur={handleRename}
            className="min-w-0 flex-1 rounded border border-surface-600 bg-surface-800 px-1.5 py-0.5 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        ) : (
          <span
            className="min-w-0 flex-1 truncate text-xs font-medium text-surface-300 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            {space.name}
          </span>
        )}

        {!editing && (
          <span className="mr-1 text-[10px] text-surface-500">
            {projectsList.length}
          </span>
        )}

        {!editing && (
          <DropdownMenu
            align="left"
            trigger={
              <button
                className="shrink-0 rounded p-0.5 text-surface-500 opacity-0 transition-opacity hover:text-surface-300 group-hover:opacity-100"
                aria-label="Space options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            }
          >
            <DropdownItem
              icon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => { setEditing(true); setEditName(space.name); }}
            >
              Rename
            </DropdownItem>
            <DropdownItem
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => { setCreatingProject(true); setExpanded(true); }}
            >
              Add project
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={handleDelete}
              destructive
            >
              Delete space
            </DropdownItem>
          </DropdownMenu>
        )}
      </div>

      {/* Nested projects */}
      {expanded && (
        <div className="ml-4 space-y-0.5">
          {projectsList.length === 0 && !creatingProject && (
            <span className="block px-3 py-1 text-[10px] italic text-surface-600">
              No projects
            </span>
          )}
          {projectsList.map((project) => (
            <ProjectTreeItem key={project.id} project={project} />
          ))}
          {creatingProject && (
            <div className="px-2 py-1">
              <input
                autoFocus
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateProject();
                  if (e.key === 'Escape') { setCreatingProject(false); setNewProjectName(''); }
                }}
                onBlur={() => {
                  if (newProjectName.trim()) handleCreateProject();
                  else { setCreatingProject(false); setNewProjectName(''); }
                }}
                placeholder="Project name..."
                className="w-full rounded-md border border-surface-600 bg-surface-800 px-2 py-1 text-xs text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {newProjectName.trim() && (
                <span className="mt-0.5 block text-[10px] text-surface-500">
                  Key: {generateProjectKey(newProjectName)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Project Tree Item ----

function ProjectTreeItem({ project }: { project: Project }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(`/projects/${project.id}`);
  const taskCount = project._count?.tasks ?? 0;

  return (
    <Link
      to={`/projects/${project.id}/board`}
      className={cn(
        'group flex items-center gap-2 rounded-lg px-3 py-1 text-xs transition-colors',
        isActive
          ? 'bg-primary-600/15 text-primary-400'
          : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200',
      )}
    >
      <FolderKanban className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{project.name}</span>
      {taskCount > 0 && (
        <span className="shrink-0 rounded bg-surface-700/60 px-1.5 py-0.5 text-[10px] text-surface-500">
          {taskCount}
        </span>
      )}
    </Link>
  );
}
