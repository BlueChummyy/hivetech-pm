import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Hexagon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: implement registration
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <Hexagon className="mb-3 h-12 w-12 text-primary-400" />
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
              <Input
                id="name"
                label="Full name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
