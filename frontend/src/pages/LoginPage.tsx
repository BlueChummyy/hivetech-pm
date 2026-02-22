import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Hexagon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { isAxiosError } from 'axios';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Redirect to dashboard if already logged in
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await authApi.login({ email, password });
      login(
        { id: data.user.id, email: data.user.email, name: data.user.name || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(), avatarUrl: data.user.avatarUrl, createdAt: '', updatedAt: '' },
        data.accessToken,
        data.refreshToken,
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Hexagon className="mb-3 h-12 w-12 text-primary-400" />
          <h1 className="text-2xl font-bold text-surface-100">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            Sign in to your HiveTech account
          </p>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="submit"
                className="w-full"
                loading={loading}
              >
                Sign in
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="mt-4 text-center text-sm text-surface-400">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-primary-400 hover:text-primary-300"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
