import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Folder, Users, Loader2 } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useWorkspaceStore } from '@/store/workspace.store';
import { useUIStore } from '@/store/ui.store';
import { Avatar } from '@/components/ui/Avatar';

export function SearchDropdown() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? '';

  const { data: results, isLoading } = useSearch(debouncedQuery, workspaceId);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Open dropdown when there's a debounced query with results
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [debouncedQuery]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSelect = useCallback(() => {
    setOpen(false);
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const handleTaskClick = useCallback((taskId: string) => {
    useUIStore.getState().openTaskPanel(taskId);
    handleSelect();
  }, [handleSelect]);

  const handleProjectClick = useCallback((projectId: string) => {
    navigate(`/projects/${projectId}/board`);
    handleSelect();
  }, [navigate, handleSelect]);

  const handlePersonClick = useCallback((_personId: string) => {
    // Navigate to workspace member's tasks or just close
    handleSelect();
  }, [handleSelect]);

  const hasResults = results && (results.tasks.length > 0 || results.projects.length > 0 || results.people.length > 0);
  const noResults = results && !hasResults && debouncedQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (debouncedQuery.length >= 2) setOpen(true);
        }}
        placeholder="Search...    Ctrl+K"
        aria-label="Global search"
        className="w-full rounded-lg border border-surface-700 bg-surface-800 py-1.5 pl-9 pr-3 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto rounded-xl border border-surface-700 bg-surface-800 shadow-xl">
          {isLoading && (
            <div className="flex items-center justify-center px-4 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
              <span className="ml-2 text-sm text-surface-400">Searching...</span>
            </div>
          )}

          {noResults && !isLoading && (
            <div className="px-4 py-6 text-center text-sm text-surface-500">
              No results found for "{debouncedQuery}"
            </div>
          )}

          {hasResults && !isLoading && (
            <>
              {results.tasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <FileText className="h-3.5 w-3.5 text-surface-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Tasks</span>
                  </div>
                  {results.tasks.map((task) => (
                    <button
                      key={task.id}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-700/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleTaskClick(task.id);
                      }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: task.statusColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-200 truncate">{task.title}</p>
                        <p className="text-xs text-surface-500">{task.projectKey}-{task.taskNumber}</p>
                      </div>
                      <span className="text-xs text-surface-500 shrink-0">{task.projectName}</span>
                    </button>
                  ))}
                </div>
              )}

              {results.projects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <Folder className="h-3.5 w-3.5 text-surface-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Projects</span>
                  </div>
                  {results.projects.map((project) => (
                    <button
                      key={project.id}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-700/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleProjectClick(project.id);
                      }}
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-600/20 text-xs font-bold text-primary-400">
                        {project.key.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-200 truncate">{project.name}</p>
                        <p className="text-xs text-surface-500">{project.key}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.people.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <Users className="h-3.5 w-3.5 text-surface-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">People</span>
                  </div>
                  {results.people.map((person) => (
                    <button
                      key={person.id}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-700/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handlePersonClick(person.id);
                      }}
                    >
                      <Avatar
                        src={person.avatarUrl}
                        name={`${person.firstName} ${person.lastName}`}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-surface-200 truncate">
                          {person.firstName} {person.lastName}
                        </p>
                        <p className="text-xs text-surface-500 truncate">{person.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="h-1" />
            </>
          )}
        </div>
      )}
    </div>
  );
}
