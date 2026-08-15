import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import { authApi, setToken } from './lib/api';
import { ProtectedRoute, useAuth } from './lib/auth';
import ChangePassword from './pages/ChangePassword';
import Dashboard from './pages/Dashboard';
import Department from './pages/Department';
import Login from './pages/Login';
import NoAccess from './pages/NoAccess';
import Onboarding from './pages/Onboarding';
import StaffManagement from './pages/StaffManagement';
import SkillsCatalog from './pages/SkillsCatalog';
import TrainSkill from './pages/TrainSkill';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeOAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const token = searchParams.get('token') || searchParams.get('access_token');
      const err = searchParams.get('error');
      if (err) {
        setError(err);
        return;
      }

      try {
        if (token) {
          setToken(token);
          const user = await authApi.me();
          completeOAuth(token, user);
          const isAdminOwner = user.role === 'admin' || user.role === 'owner';
          if (user.must_change_password) navigate('/change-password', { replace: true });
          else if (user.first_login && isAdminOwner) navigate('/onboarding', { replace: true });
          else {
            // Honor ?next= for SSO deep-linking (e.g. /department/finance).
            // Only allow same-origin relative paths to prevent open-redirect.
            const next = searchParams.get('next');
            const safe = next && next.startsWith('/') && !next.startsWith('//')
              ? next
              : '/dashboard';
            navigate(safe, { replace: true });
          }
          return;
        }

        const res = await authApi.oauthCallback(searchParams);
        completeOAuth(res.access_token, res.user);
        const isResAdminOwner = res.user.role === 'admin' || res.user.role === 'owner';
        if (res.user.must_change_password) navigate('/change-password', { replace: true });
        else if (res.user.first_login && isResAdminOwner) navigate('/onboarding', { replace: true });
        else {
          const next = searchParams.get('next');
          const safe = next && next.startsWith('/') && !next.startsWith('//')
            ? next
            : '/dashboard';
          navigate(safe, { replace: true });
        }

      } catch (e) {
        setError(e instanceof Error ? e.message : 'OAuth failed');
      }
    };
    void run();
  }, [searchParams, navigate, completeOAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="card max-w-md p-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Sign-in failed</h1>
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
          <a href="/login" className="btn-primary mt-6 inline-flex">
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/skills" element={<SkillsCatalog />} />
        <Route path="/skills/train" element={<TrainSkill />} />
        <Route path="/department/:name" element={<Department />} />
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/no-access" element={<NoAccess />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
