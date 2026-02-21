import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/workspace/:workspaceId"
          element={<DashboardPage />}
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
