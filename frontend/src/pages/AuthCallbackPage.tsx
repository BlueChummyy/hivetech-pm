import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const errorMsg = searchParams.get('error');

    if (errorMsg) {
      setError(errorMsg);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    if (!token || !refreshToken) {
      setError('Missing authentication tokens');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    // Store tokens temporarily so the API client can use them for the /me request
    useAuthStore.getState().setTokens(token, refreshToken);

    // Fetch user profile to complete login
    authApi.me().then(({ data: user }) => {
      login(
        {
          id: user.id,
          email: user.email,
          name: (user as any).name || `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim(),
          avatarUrl: user.avatarUrl,
          createdAt: '',
          updatedAt: '',
        },
        token,
        refreshToken,
      );
      navigate('/dashboard', { replace: true });
    }).catch(() => {
      setError('Failed to complete sign-in. Please try again.');
      useAuthStore.getState().logout();
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    });
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
        <div className="text-center">
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-400">
            {error}
          </div>
          <p className="text-sm text-surface-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-2 border-surface-700 border-t-primary-500" />
        <p className="text-sm text-surface-400">Completing sign-in...</p>
      </div>
    </div>
  );
}
