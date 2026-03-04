import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectLayout } from '@/components/layout/ProjectLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { SetupPage } from '@/pages/SetupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { setupApi } from '@/api/auth';

// Helper: lazy-load a named export, with a fallback placeholder
function lazyPage(
  importFn: () => Promise<Record<string, React.ComponentType>>,
  exportName: string,
  fallbackTitle: string,
) {
  return lazy(() =>
    importFn()
      .then((mod) => ({
        default: mod[exportName] as React.ComponentType,
      }))
      .catch(() => ({
        default: () => PlaceholderPage({ title: fallbackTitle }),
      })),
  );
}

const ProjectListPage = lazyPage(
  () => import('@/pages/ProjectListPage'),
  'ProjectListPage',
  'Projects',
);
const BoardPage = lazyPage(() => import('@/pages/BoardPage'), 'BoardPage', 'Board View');
const ListPage = lazyPage(() => import('@/pages/ListPage'), 'ListPage', 'List View');
const GanttPage = lazyPage(() => import('@/pages/GanttPage'), 'GanttPage', 'Gantt Chart');
const TimelinePage = lazyPage(() => import('@/pages/TimelinePage'), 'TimelinePage', 'Timeline');
const CalendarPage = lazyPage(() => import('@/pages/CalendarPage'), 'CalendarPage', 'Calendar');
const ProjectSettingsPage = lazyPage(
  () => import('@/pages/ProjectSettingsPage'),
  'ProjectSettingsPage',
  'Project Settings',
);
const WorkspaceSettingsPage = lazyPage(
  () => import('@/pages/WorkspaceSettingsPage'),
  'WorkspaceSettingsPage',
  'Workspace Settings',
);
const ProfileSettingsPage = lazyPage(
  () => import('@/pages/ProfileSettingsPage'),
  'ProfileSettingsPage',
  'Profile Settings',
);
const NotificationsPage = lazyPage(
  () => import('@/pages/NotificationsPage'),
  'NotificationsPage',
  'Notifications',
);
const AdminDashboardPage = lazyPage(
  () => import('@/pages/AdminDashboardPage'),
  'AdminDashboardPage',
  'Admin Dashboard',
);
const MyTasksPage = lazyPage(
  () => import('@/pages/MyTasksPage'),
  'MyTasksPage',
  'My Tasks',
);

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-700 border-t-primary-500" />
    </div>
  );
}

function withErrorBoundary(Component: React.ComponentType) {
  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  );
}

function SetupGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setupApi.getStatus().then(({ needsSetup }) => {
      if (needsSetup && location.pathname !== '/setup') {
        navigate('/setup', { replace: true });
      } else if (!needsSetup && location.pathname === '/setup') {
        navigate('/login', { replace: true });
      }
      setChecking(false);
    }).catch(() => {
      setChecking(false);
    });
  }, [location.pathname, navigate]);

  if (checking) return <PageLoader />;
  return <>{children}</>;
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SetupGuard>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={withErrorBoundary(DashboardPage)} />
            <Route
              path="/workspaces/:workspaceId/projects"
              element={withErrorBoundary(ProjectListPage)}
            />
            <Route path="/projects/:projectId" element={<ProjectLayout />}>
              <Route index element={<Navigate to="board" replace />} />
              <Route path="board" element={withErrorBoundary(BoardPage)} />
              <Route path="list" element={withErrorBoundary(ListPage)} />
              <Route path="gantt" element={withErrorBoundary(GanttPage)} />
              <Route path="timeline" element={withErrorBoundary(TimelinePage)} />
              <Route path="calendar" element={withErrorBoundary(CalendarPage)} />
              <Route path="settings" element={withErrorBoundary(ProjectSettingsPage)} />
            </Route>
            <Route
              path="/workspaces/:workspaceId/settings"
              element={withErrorBoundary(WorkspaceSettingsPage)}
            />
            <Route path="/settings/profile" element={withErrorBoundary(ProfileSettingsPage)} />
            <Route path="/notifications" element={withErrorBoundary(NotificationsPage)} />
            <Route path="/my-tasks" element={withErrorBoundary(MyTasksPage)} />
            <Route path="/admin" element={withErrorBoundary(AdminDashboardPage)} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </SetupGuard>
    </Suspense>
  );
}
