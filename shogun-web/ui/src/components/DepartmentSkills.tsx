import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Wrench, Trash2, Loader2, ShieldCheck, ArrowRight, Package, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { skillsApi } from '../lib/api';
import type { Skill } from '../lib/types';

interface DepartmentSkillsProps {
  department: string;
}

export default function DepartmentSkills({ department }: DepartmentSkillsProps) {
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const skillsQuery = useQuery({
    queryKey: ['department-skills', department],
    queryFn: async () => {
      const res = await skillsApi.listDepartment(department);
      const arr = res?.skills;
      if (!Array.isArray(arr)) {
        console.error('[DepartmentSkills] listDepartment returned non-array skills', {
          department,
          resType: typeof res,
          resKeys: res ? Object.keys(res) : null,
          skillsType: typeof arr,
          isArray: Array.isArray(arr),
          raw: JSON.stringify(res)?.slice(0, 300),
        });
        return [];
      }
      return arr;
    },
  });

  const skills: Skill[] = Array.isArray(skillsQuery.data) ? skillsQuery.data : [];

  const handleDelete = async (skill: Skill) => {
    setDeletingIds((prev) => ({ ...prev, [skill.id]: true }));
    try {
      await skillsApi.deleteDepartmentSkill(department, skill.id);
      toast.success(`Removed "${skill.name}" from ${department}`);
      // Invalidate both queries so the catalog updates (shows not installed)
      queryClient.invalidateQueries({ queryKey: ['department-skills', department] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch {
      toast.error('Failed to remove skill');
    } finally {
      setDeletingIds((prev) => ({ ...prev, [skill.id]: false }));
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700/50 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white capitalize">
            {department} Installed Skills
          </h2>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
            Skills installed for the {department} department. Changes here sync
            with the Skill Library.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
            <Wrench className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {skills.length} Installed
          </div>
          <button
            type="button"
            onClick={() => navigate('/skills')}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover active:scale-95"
          >
            <Package className="h-4 w-4" />
            Browse Skills Library
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {skillsQuery.isLoading ? (
        <div className="flex justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : skills.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Wrench className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-400 mb-2" />
          <p className="text-sm font-medium">
            No skills installed for {department} yet.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Browse the Skills Library to install skills for this department.
          </p>
          <button
            type="button"
            onClick={() => navigate('/skills')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-hover active:scale-95"
          >
            <Package className="h-4 w-4" />
            Open Skills Library
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => {
            const isDeleting = deletingIds[skill.id];

            return (
              <div
                key={skill.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{skill.name}</h3>
                          {skill.source === 'learned' && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                              <Sparkles className="h-2.5 w-2.5" />
                              Learned
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {skill.author || 'Installed Skill'}
                        </span>
                      </div>
                    </div>
                    {skill.version && (
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300">
                        v{skill.version}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {skill.description}
                  </p>

                  {/* Tags */}
                  {Array.isArray(skill.tags) && skill.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skill.tags.slice(0, 4).map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded bg-indigo-50 dark:bg-indigo-950/30 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:text-indigo-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Active on {department}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(skill)}
                    disabled={isDeleting}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Uninstall
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
