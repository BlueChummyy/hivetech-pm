import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, FolderKanban } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { useProjects } from '@/hooks/useProjects';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import type { Project } from '@/types/models.types';

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}/board`}
      className={cn(
        'group block overflow-hidden rounded-lg border border-white/[0.08] bg-[#18181E] transition-colors hover:bg-[#1E1E26]',
      )}
    >
      <div className="h-1.5 bg-indigo-600" />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
              {project.name}
            </h3>
            <span className="mt-0.5 inline-block rounded bg-white/[0.06] px-1.5 py-0.5 text-xs font-medium text-gray-500">
              {project.key}
            </span>
          </div>
        </div>
        {project.description && (
          <p className="mt-3 line-clamp-2 text-sm text-gray-400">
            {project.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="rounded-xl bg-white/[0.04] p-4">
        <FolderKanban className="h-10 w-10 text-gray-500" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-white">No projects yet</h3>
      <p className="mt-1 text-sm text-gray-400">
        Create your first project to start tracking work.
      </p>
      <Button className="mt-6" onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#18181E]">
      <div className="h-1.5 bg-white/[0.06]" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-3 w-1/4 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function ProjectListPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [modalOpen, setModalOpen] = useState(false);
  const { data: projects, isLoading } = useProjects(workspaceId ?? '');

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Projects</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage and organize your team&apos;s work
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : !projects || projects.length === 0 ? (
        <EmptyState onCreateClick={() => setModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectModal
        workspaceId={workspaceId ?? ''}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
