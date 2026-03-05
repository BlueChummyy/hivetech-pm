import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { isAxiosError } from 'axios';
import { SsoButtons } from '@/components/SsoButtons';
import { useBranding } from '@/hooks/useBranding';
import { getBackgroundStyle } from '@/utils/backgroundTemplates';

export function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: branding } = useBranding();

  // Redirect to dashboard if already logged in
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await authApi.register({ email, password, firstName, lastName });
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
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4" style={getBackgroundStyle(branding?.loginBackground)}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="HiveTech" className="mb-3 h-12 w-12" />
          <h1 className="text-2xl font-bold text-surface-100">
            Create account
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            Get started with HiveTech
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
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="firstName"
                  label="First name"
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  id="lastName"
                  label="Last name"
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                id="confirmPassword"
                label="Confirm password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <Button
                type="submit"
                className="w-full"
                loading={loading}
              >
                Create account
              </Button>
            </form>

            <SsoButtons mode="signup" />
          </CardBody>
        </Card>

        <p className="mt-4 text-center text-sm text-surface-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-400 hover:text-primary-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
