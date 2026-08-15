import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe2,
  Loader2,
  Rocket,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  companyApi,
  departmentsApi,
  onboardingApi,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  DEPARTMENT_CATALOG,
  INDUSTRY_CATALOG,
  SHARED_DEPARTMENT_KEYS,
  TIMEZONES,
  type DepartmentKey,
  type IndustryKey,
  type OnboardingState,
  type ProviderConfig,
} from '../lib/types';

const STEPS = ['Industry', 'Departments', 'Company', 'Providers', 'Review'] as const;

const emptyConfig = (): ProviderConfig => ({
  provider: '',
  api_key: '',
  subdomain: '',
  base_url: '',
});

export default function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState<IndustryKey | null>(null);
  const [selected, setSelected] = useState<DepartmentKey[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kuala_Lumpur');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Partial<Record<DepartmentKey, ProviderConfig>>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const stateQuery = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => onboardingApi.get(),
  });

  useEffect(() => {
    const s = stateQuery.data;
    if (!s) return;
    if (typeof s.step === 'number') setStep(Math.min(Math.max(s.step, 0), STEPS.length - 1));
    if (s.industry) setIndustry(s.industry as IndustryKey);
    if (s.selected_departments?.length) setSelected(s.selected_departments);
    if (s.company?.name) setCompanyName(s.company.name);
    if (s.company?.timezone) setTimezone(s.company.timezone);
    if (s.company?.logo_url) setLogoPreview(s.company.logo_url);
    if (s.department_configs) setConfigs(s.department_configs);
    if (s.public_url) setPublicUrl(s.public_url);
    else if (s.go_live?.public_url) setPublicUrl(s.go_live.public_url);
    if (s.completed) navigate('/dashboard', { replace: true });
  }, [stateQuery.data, navigate]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<OnboardingState>) => onboardingApi.save(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['onboarding'], data);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save progress'),
  });

  const persist = async (next: Partial<OnboardingState> & { step: number }) => {
    await saveMutation.mutateAsync({
      industry,
      selected_departments: selected,
      company: { name: companyName, timezone, logo_url: logoPreview || undefined },
      department_configs: configs,
      completed: false,
      ...next,
    });
  };

  const toggleDept = (key: DepartmentKey) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const selectAll = () => {
    const allKeys = industry
      ? [...SHARED_DEPARTMENT_KEYS, ...INDUSTRY_CATALOG[industry].departments]
      : [...SHARED_DEPARTMENT_KEYS];
    setSelected(allKeys);
  };
  const clearAll = () => setSelected([]);

  const onLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (!file) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const goNext = async () => {
    if (step === 0) {
      // Industry step
      if (!industry) {
        toast.error('Please select an industry');
        return;
      }
      await persist({ step: 1, industry });
      setStep(1);
      return;
    }
    if (step === 1) {
      // Departments step
      await persist({ step: 2, selected_departments: selected });
      setStep(2);
      return;
    }
    if (step === 2) {
      // Company step
      if (!companyName.trim()) {
        toast.error('Company name is required');
        return;
      }
      try {
        if (logoFile) {
          const fd = new FormData();
          fd.append('name', companyName.trim());
          fd.append('timezone', timezone);
          fd.append('logo', logoFile);
          await companyApi.update(fd);
        } else {
          await companyApi.update({ name: companyName.trim(), timezone });
        }
      } catch (err) {
        console.warn(err);
      }
      await persist({
        step: 3,
        company: { name: companyName.trim(), timezone },
      });
      setStep(3);
      return;
    }
    if (step === 3) {
      // Providers step — activate selected departments
      await persist({ step: 4, department_configs: configs });
      for (const key of selected) {
        try {
          await departmentsApi.activate(key, configs[key] || {});
        } catch {
          // best-effort activate
        }
      }
      setStep(4);
    }
  };

  const goBack = async () => {
    const next = Math.max(0, step - 1);
    await persist({ step: next });
    setStep(next);
  };

  const skipDepartments = async () => {
    setSelected([]);
    await persist({ step: 2, selected_departments: [] });
    setStep(2);
  };

  const testConnection = async (key: DepartmentKey) => {
    setTesting(key);
    try {
      const res = await departmentsApi.testConnection(key, configs[key] || {});
      setTestResults((prev) => ({
        ...prev,
        [key]: res.ok ? `OK: ${res.message}` : `Failed: ${res.message}`,
      }));
      if (res.ok) toast.success(`${key}: connected`);
      else toast.error(`${key}: ${res.message}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setTestResults((prev) => ({ ...prev, [key]: msg }));
      toast.error(msg);
    } finally {
      setTesting(null);
    }
  };

  const launch = async () => {
    try {
      await onboardingApi.complete();
      await persist({ step: 4, completed: true });
      await refreshUser();
      toast.success(publicUrl ? `Welcome - ${publicUrl}` : 'Welcome to Shogun OS');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not complete onboarding');
    }
  };

  const copyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('URL copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const saving = saveMutation.isPending;

  const stepBody = useMemo(() => {
    if (step === 0) {
      // ── Step 0: Industry selection ──
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              What industry is your company in?
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              This determines which departments are available.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(Object.keys(INDUSTRY_CATALOG) as IndustryKey[]).map((key) => {
              const ind = INDUSTRY_CATALOG[key];
              const isSelected = industry === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIndustry(key)}
                  className={`rounded-lg border p-6 text-center transition ${
                    isSelected
                      ? 'border-brand bg-brand/5 ring-2 ring-brand'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-4xl">{ind.icon}</div>
                  <div className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{ind.label}</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ind.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === 1) {
      // ── Step 1: Department selection (Core + Industry-specific) ──
      const industryKeys: DepartmentKey[] = industry
        ? INDUSTRY_CATALOG[industry].departments
        : [];

      const renderDeptCard = (key: DepartmentKey) => {
        const d = DEPARTMENT_CATALOG[key];
        if (!d) return null;
        const checked = selected.includes(key);
        return (
          <label
            key={key}
            className={`card cursor-pointer p-4 transition ${
              checked ? 'ring-2 ring-brand border-brand/30' : 'hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand dark:border-slate-600"
                checked={checked}
                onChange={() => toggleDept(key)}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{d.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{d.persona}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d.description}</p>
              </div>
            </div>
          </label>
        );
      };

      return (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={selectAll}>
              Select All
            </button>
            <button type="button" className="btn-ghost" onClick={clearAll}>
              Clear
            </button>
            <button type="button" className="btn-ghost ml-auto" onClick={() => void skipDepartments()}>
              Skip
            </button>
          </div>

          {/* Core departments — always shown */}
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Core Departments
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SHARED_DEPARTMENT_KEYS.map(renderDeptCard)}
            </div>
          </div>

          {/* Industry-specific departments — only if industry selected */}
          {industry && industryKeys.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {INDUSTRY_CATALOG[industry].label} Departments
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {industryKeys.map(renderDeptCard)}
              </div>
            </div>
          )}

          {/* No industry selected — show prompt */}
          {!industry && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Select an industry first to see industry-specific departments.
            </p>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="mx-auto max-w-lg space-y-5">
          <div>
            <label className="label" htmlFor="company-name">
              Company name
            </label>
            <input
              id="company-name"
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Sdn Bhd"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              className="input"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="label">Company logo</span>
            <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-surface-border bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
              <label className="btn-secondary cursor-pointer">
                Upload logo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoChange(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    if (step === 3) {
      if (selected.length === 0) {
        return (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            No departments selected. You can activate them later from the dashboard.
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {selected.map((key) => {
            const d = DEPARTMENT_CATALOG[key];
            const cfg = configs[key] || emptyConfig();
            return (
              <div key={key} className="card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    {d.name} &middot; {d.persona}
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Provider</label>
                    <input
                      className="input"
                      placeholder="e.g. openai, openrouter, anthropic"
                      value={cfg.provider || ''}
                      onChange={(e) =>
                        setConfigs((prev) => ({
                          ...prev,
                          [key]: { ...cfg, provider: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Subdomain</label>
                    <input
                      className="input"
                      placeholder="your-workspace"
                      value={cfg.subdomain || ''}
                      onChange={(e) =>
                        setConfigs((prev) => ({
                          ...prev,
                          [key]: { ...cfg, subdomain: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">API key</label>
                    <input
                      className="input"
                      type="password"
                      placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                      value={cfg.api_key || ''}
                      onChange={(e) =>
                        setConfigs((prev) => ({
                          ...prev,
                          [key]: { ...cfg, api_key: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Base URL</label>
                    <input
                      className="input"
                      placeholder="https://api.example.com"
                      value={cfg.base_url || ''}
                      onChange={(e) =>
                        setConfigs((prev) => ({
                          ...prev,
                          [key]: { ...cfg, base_url: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={testing === key}
                    onClick={() => void testConnection(key)}
                  >
                    {testing === key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Test Connection
                  </button>
                  {testResults[key] && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">{testResults[key]}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Step 4 — Review. Shows the public URL that was claimed during installation.
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
          {publicUrl ? <Globe2 className="h-7 w-7" /> : <Rocket className="h-7 w-7" />}
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {publicUrl ? 'Your company is live' : 'Ready to go'}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {publicUrl
            ? 'Your public URL was assigned during installation. Here\'s the summary.'
            : 'Everything looks good. Click below to open the dashboard.'}
        </p>

        <div className="mt-6 rounded-xl border border-surface-border bg-white p-5 text-left shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Company</div>
            <div className="mt-1 font-medium text-slate-900 dark:text-slate-100">{companyName || '&mdash;'}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{timezone}</div>
          </div>
          <div className="mb-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Departments ({selected.length})
            </div>
            <ul className="mt-2 space-y-1">
              {selected.length === 0 && (
                <li className="text-sm text-slate-500 dark:text-slate-400">None selected &mdash; add later anytime</li>
              )}
              {selected.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {DEPARTMENT_CATALOG[key].name}
                </li>
              ))}
            </ul>
          </div>

          {publicUrl && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                Public URL
              </div>
              <div className="mt-2">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-lg font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  {publicUrl}
                </a>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => void copyUrl()}>
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="btn-secondary">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="btn-primary mt-8 w-full sm:w-auto"
          onClick={() => void launch()}
        >
          <Rocket className="h-4 w-4" />
          Open company dashboard
        </button>
      </div>
    );
  }, [
    step,
    selected,
    companyName,
    timezone,
    logoPreview,
    configs,
    testing,
    testResults,
    publicUrl,
  ]);

  if (stateQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted px-4 py-8 md:py-12 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="text-sm font-semibold text-brand">Shogun OS setup</div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">Set up your company</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            A few clicks &mdash; your public URL was already assigned during installation.
          </p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  i < step
                    ? 'bg-emerald-500 text-white'
                    : i === step
                      ? 'bg-brand text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i}
              </div>
              <span
                className={`hidden text-sm sm:inline ${
                  i === step ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-1 h-px w-6 bg-slate-300 sm:w-10 dark:bg-slate-700" />}
            </div>
          ))}
        </div>

        <div className="card p-6 md:p-8">{stepBody}</div>

        {step < 4 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              className="btn-secondary"
              disabled={step === 0 || saving}
              onClick={() => void goBack()}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => void goNext()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}