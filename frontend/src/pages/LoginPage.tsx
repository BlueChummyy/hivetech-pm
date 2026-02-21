import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Hexagon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: implement login
    setTimeout(() => setLoading(false), 1000);
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
