import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, ApiError } from '../lib/api';
import { PublicOnlyRoute, useAuth } from '../lib/auth';
import logoBlue from '../assets/logos/samurai-logo-blue.png';

function RegisterInner() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        company_name: companyName.trim(),
        admin_name: adminName.trim(),
        email: email.trim(),
        password,
      });
      setToken(res.access_token ?? (res as unknown as { token: string }).token, true);
      setUser(res.user);
      toast.success(`Welcome, ${res.user.name || 'Admin'}! Let's set up your company.`);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="sd-login-page" id="register-page">
      <div className="sd-login-shell">
        <section className="sd-hero-panel" aria-labelledby="sd-hero-title">
          <div className="sd-hero-overlay" aria-hidden />
          <div className="sd-hero-content">
            <img
              className="sd-hero-logo"
              src={logoBlue}
              alt="SamurAI"
              width={230}
              height={48}
            />
            <div className="sd-hero-copy">
              <p className="sd-hero-kicker font-bold">Shogun OS</p>
              <h1 id="sd-hero-title">
                One company
                <span className="block">Multiple AI-operated departments</span>
              </h1>
              <p className="sd-hero-lede">
                Shogun OS deploys your organization as isolated agent profiles —
                each with its own persona, knowledge source, and Slack bot —
                coordinated through a single command portal.
              </p>
            </div>
            <ul className="sd-hero-stats" aria-label="Key features">
              <li>Hermes Agent profiles</li>
              <li>GBrain federated memory</li>
              <li>Per-department dashboards</li>
              <li>Slack-native operations</li>
            </ul>
          </div>
        </section>

        <div className="sd-form-panel">
          <div className="sd-form-card">
            <div className="sd-form-header">
              <h2>Register your company</h2>
              <p className="sd-form-subtext">Create your Shogun OS account</p>
            </div>

            <form onSubmit={onSubmit} noValidate>
              {error && (
                <p role="alert" aria-live="polite" className="sd-error-alert">
                  {error}
                </p>
              )}

              <div className="sd-field-group">
                <label className="sd-label" htmlFor="reg-company">
                  Company name
                </label>
                <div className="sd-input-wrap">
                  <span className="sd-input-icon">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <input
                    id="reg-company"
                    className="sd-input"
                    type="text"
                    autoComplete="organization"
                    required
                    minLength={2}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Gozen Estate Sdn Bhd"
                  />
                </div>
              </div>

              <div className="sd-field-group">
                <label className="sd-label" htmlFor="reg-name">
                  Your name
                </label>
                <div className="sd-input-wrap">
                  <span className="sd-input-icon">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <input
                    id="reg-name"
                    className="sd-input"
                    type="text"
                    autoComplete="name"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Chee How"
                  />
                </div>
              </div>

              <div className="sd-field-group">
                <label className="sd-label" htmlFor="reg-email">
                  Email
                </label>
                <div className="sd-input-wrap">
                  <span className="sd-input-icon">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    id="reg-email"
                    className="sd-input"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              <div className="sd-field-group">
                <label className="sd-label" htmlFor="reg-password">
                  Password <span className="text-xs text-slate-400">(min 8 characters)</span>
                </label>
                <div className="sd-input-wrap">
                  <span className="sd-input-icon">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="reg-password"
                    className="sd-input has-toggle"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="sd-input-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="sd-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                  </span>
                ) : (
                  'Register'
                )}
              </button>
            </form>

            <div className="sd-form-footer" style={{ flexDirection: 'row', justifyContent: 'center', gap: '0.5rem' }}>
              <span>Already have an account?</span>
              <Link to="/login" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Register() {
  return (
    <PublicOnlyRoute>
      <RegisterInner />
    </PublicOnlyRoute>
  );
}
