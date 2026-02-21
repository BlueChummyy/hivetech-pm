import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 px-4">
      <h1 className="text-6xl font-bold text-surface-600">404</h1>
      <p className="mt-4 text-lg text-surface-300">Page not found</p>
      <p className="mt-2 text-sm text-surface-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button variant="primary">Go to Dashboard</Button>
      </Link>
    </div>
  );
}
