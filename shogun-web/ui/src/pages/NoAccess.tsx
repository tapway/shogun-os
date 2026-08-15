import { Shield } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function NoAccess() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 dark:bg-slate-950">
      <div className="card max-w-md p-8 text-center">
        <Shield className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Access Restricted</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Your Shogun OS account hasn't been assigned to any department yet.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Please contact your company admin to get access.
        </p>
        <button type="button" className="btn-secondary mt-6" onClick={() => logout()}>
          Sign Out
        </button>
      </div>
    </div>
  );
}