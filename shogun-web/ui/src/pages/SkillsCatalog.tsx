import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Search,
  Check,
  Loader2,
  Wrench,
  Zap,
  Download,
  DollarSign,
  Handshake,
  Users,
  Code2,
  Package,
  Terminal,
  ArrowRight,
  ShieldCheck,
  X,
  Brain,
  ShoppingBag,
  Factory,
  Server,
  Mail,
  Network,
  StickyNote,
  FileText,
  Workflow,
  GitBranch,
  Calendar,
  MessageSquare,
  Lightbulb,
  Layers,
  Globe,
  type LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { skillsApi, type SkillRecommendation } from "../lib/api";
import type { Skill, SkillDetail } from "../lib/types";

// Category → icon mapping (dynamic: any category not found falls back to Wrench)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Finance: DollarSign,
  "CRM/Sales": Handshake,
  HR: Users,
  Coding: Code2,
  Procurement: Package,
  Operations: Wrench,
  Executive: ShieldCheck,
  Retail: ShoppingBag,
  Manufacturing: Factory,
  "Software Development": Code2,
  DevOps: Server,
  Brain: Brain,
  Communication: MessageSquare,
  Email: Mail,
  MCP: Network,
  "Note Taking": StickyNote,
  Productivity: Layers,
  Research: Lightbulb,
  Media: Zap,
  Creative: Sparkles,
  General: Wrench,
  "Google Workspace": Globe,
  "Lark Workspace": Globe,
  "Slack Formatting": MessageSquare,
  "Company Workflow": Workflow,
  "Department Scrum": Calendar,
  "Systematic Debugging": Wrench,
  "Search Router": Search,
  Shogunify: Zap,
  Planning: FileText,
  GitHub: GitBranch,
  "Writing Plans": FileText,
  "Profile Management": Users,
  "Document Processing": FileText,
  "Coding Workflow": Code2,
};

export default function SkillsCatalog() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [installingIds, setInstallingIds] = useState<Record<string, boolean>>({});
  const [installedIds, setInstalledIds] = useState<Record<string, boolean>>({});
  const [recommendation, setRecommendation] =
    useState<SkillRecommendation | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detailSkill, setDetailSkill] = useState<Skill | null>(null);

  const skillsQuery = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const res = await skillsApi.listAll();
      const arr = res?.skills;
      if (!Array.isArray(arr)) {
        console.error("[SkillsCatalog] listAll returned non-array skills", {
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

  const allSkills: Skill[] = Array.isArray(skillsQuery.data) ? skillsQuery.data : [];

  // Dynamic categories derived from the data
  const categories = useMemo(() => {
    const cats = [...new Set(allSkills.map((s) => s.category))].sort();
    return cats;
  }, [allSkills]);

  // Skills grouped by category for the department layout
  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, Skill[]> = {};
    for (const s of allSkills) {
      const cat = s.category || "General";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    return grouped;
  }, [allSkills]);

  // Detail modal query — lazy loads full SKILL.md on click
  const detailQuery = useQuery({
    queryKey: ["skill-detail", detailSkill?.id],
    queryFn: async () => {
      if (!detailSkill) return null;
      const res = await skillsApi.getDetail(detailSkill.id);
      return res;
    },
    enabled: !!detailSkill,
  });

  const handleClearSearch = () => {
    setPrompt("");
    setSearchQuery("");
    setRecommendation(null);
    setSelectedCategory("All");
    toast.success("Cleared search. Viewing all available skills.");
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsAnalyzing(true);
    toast.loading("Analyzing operational requirement with AI Intent Engine...", {
      id: "ai-search",
    });
    try {
      const rec = await skillsApi.recommend(prompt.trim());
      setRecommendation(rec);
      setSearchQuery(prompt.trim());
      toast.success("AI recommendation complete!", { id: "ai-search" });
    } catch {
      toast.error("Failed to analyze requirement", { id: "ai-search" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInstall = async (skill: Skill) => {
    setInstallingIds((prev) => ({ ...prev, [skill.id]: true }));
    try {
      // Install to the skill's own department (determined by backend from disk dir)
      await skillsApi.install(skill.id, skill.department_key || "");
      await queryClient.invalidateQueries({ queryKey: ["department-skills"] });
      await queryClient.invalidateQueries({ queryKey: ["skills"] });
      setInstallingIds((prev) => ({ ...prev, [skill.id]: false }));
      setInstalledIds((prev) => ({ ...prev, [skill.id]: true }));
      const deptLabel = skill.department_key || skill.category;
      toast.success(
        `Installed "${skill.name}" to ${deptLabel} department skills.`,
      );
    } catch {
      setInstallingIds((prev) => ({ ...prev, [skill.id]: false }));
      toast.error("Failed to install skill");
    }
  };

  const handleRunShogunify = () => {
    navigate("/skills/train", { state: { prompt } });
  };

  const filteredSkills = useMemo(() => {
    return allSkills.filter((s) => {
      const matchesCat =
        selectedCategory === "All" ||
        s.category.toLowerCase() === selectedCategory.toLowerCase();

      if (!searchQuery) return matchesCat;

      // If recommendation exists, prioritize top match IDs
      if (recommendation && Array.isArray(recommendation.recommendations) && recommendation.recommendations.length > 0) {
        const recommendedIds = new Set(
          recommendation.recommendations.map((r) => r.skill_id),
        );
        if (recommendedIds.has(s.id)) return matchesCat;
      }

      const q = searchQuery.toLowerCase();
      const matchesQuery =
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (Array.isArray(s.tags) ? s.tags : []).some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [allSkills, selectedCategory, searchQuery, recommendation]);

  const getCategoryIcon = (cat: string): LucideIcon => {
    return CATEGORY_ICONS[cat] || Wrench;
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Group filtered skills by category for display
  const filteredByCategory = useMemo(() => {
    const grouped: Record<string, Skill[]> = {};
    for (const s of filteredSkills) {
      const cat = s.category || "General";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }
    return grouped;
  }, [filteredSkills]);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Upper Half: Header & Intelligent AI Skill Intent Engine */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-indigo-50 via-purple-50 to-slate-100 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 p-8 text-slate-900 dark:text-white shadow-xl">
        <div className="relative z-10 max-w-4xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
            AI Skills Intent Engine & Shogunify Integration
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Skills are reusable AI tools for specific jobs.
          </h1>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Browse {allSkills.length} skills across {categories.length} departments.
            Describe your operational workflow requirement below — the AI Intent
            Engine will analyze your need, recommend matching skills, or trigger{" "}
            <strong>Shogunify</strong> (<code className="text-indigo-600 dark:text-indigo-300 font-mono">/shogunify</code>) to
            scaffold a custom skill for your team.
          </p>

          {/* AI Intent Input Bar */}
          <form
            onSubmit={handleAiSearch}
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            <div className="relative flex-1 min-w-[280px]">
              <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-500 dark:text-indigo-400" />
              <input
                type="text"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (!e.target.value.trim()) {
                    setSearchQuery("");
                    setRecommendation(null);
                  }
                }}
                placeholder="Describe your need (e.g. 'I need automated AR dunning for overdue invoices' or 'Connect Shopee inventory')..."
                className="w-full rounded-xl border border-indigo-500/30 bg-white/80 dark:bg-white/10 pl-12 pr-10 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 backdrop-blur-md transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20"
              />
              {(prompt || searchQuery || recommendation) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  title="Cancel search & view all skills"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-900/10 dark:hover:bg-white/20 hover:text-slate-700 dark:hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isAnalyzing ? "Analyzing..." : "Recommend Skills"}
            </button>

            {(prompt || searchQuery || recommendation) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-white active:scale-[0.98]"
                title="Cancel search and view all skills"
              >
                <X className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                Cancel Search
              </button>
            )}
          </form>

          {/* AI Recommendation Result & Shogunify Action Banner */}
          {recommendation && (
            <div className="mt-6 space-y-4 rounded-xl border border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/70 p-5 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                AI Operational Intent Analysis
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                {recommendation.explanation}
              </p>

              {/* Shogunify Action Card if custom skill creation is suggested */}
              {recommendation.shogunify_suggestion && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-100 via-indigo-100 to-slate-100 dark:from-purple-900/60 dark:via-indigo-900/60 dark:to-slate-900/90 p-4 shadow-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-200 uppercase tracking-wide">
                        Shogunify Generator Recommendation
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {recommendation.shogunify_suggestion.description}
                    </p>
                    <code className="inline-block mt-1 rounded bg-slate-100 dark:bg-black/40 px-2.5 py-1 font-mono text-xs text-purple-700 dark:text-purple-300 border border-purple-500/30">
                      {recommendation.shogunify_suggestion.command}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRunShogunify()}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-purple-500 hover:to-indigo-500 active:scale-95 shrink-0"
                  >
                    <Zap className="h-4 w-4 text-amber-300" />
                    ⚡ Run Skill Generator
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lower Half: Skills Categorization & Catalog */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Available Skills Library
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {allSkills.length} skills across {categories.length} departments —
              live-scanned from the skills directory.
            </p>
          </div>

          {/* Category Filter Pills (dynamic) */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === "All"
                  ? "bg-brand text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedCategory === cat
                    ? "bg-brand text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {cat} ({(skillsByCategory[cat] || []).length})
              </button>
            ))}
          </div>
        </div>

        {/* Skills Grid — grouped by department */}
        {skillsQuery.isLoading ? (
          <div className="flex justify-center py-16 text-slate-400 dark:text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="py-16 text-center text-slate-400 dark:text-slate-500">
            <Wrench className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No matching skills found.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Try describing your need in the AI input box above.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(filteredByCategory).map(([cat, skills]) => {
              const IconComponent = getCategoryIcon(cat);
              return (
                <div key={cat} className="space-y-3">
                  {/* Department header */}
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <IconComponent className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{cat}</h3>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {skills.length} skill{skills.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Skill cards in this department */}
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {skills.map((skill) => {
                      const isInstalling = installingIds[skill.id];
                      const isInstalled = skill.installed || installedIds[skill.id];
                      const recItem = recommendation?.recommendations.find(
                        (r) => r.skill_id === skill.id,
                      );

                      return (
                        <div
                          key={skill.id}
                          className={`group relative flex flex-col justify-between rounded-2xl border p-6 shadow-sm transition hover:shadow-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                            recItem
                              ? "border-emerald-400 ring-2 ring-emerald-400/20"
                              : "border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition group-hover:bg-brand group-hover:text-white">
                                <IconComponent className="h-5 w-5" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  {skill.category}
                                </span>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand transition">
                                {skill.name}
                              </h3>
                              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                                {skill.description}
                              </p>
                            </div>

                            {/* Metadata: version, author, last modified */}
                            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                              {skill.version && (
                                <span className="rounded bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 font-mono">
                                  v{skill.version}
                                </span>
                              )}
                              {skill.author && (
                                <span className="rounded bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5">
                                  {skill.author}
                                </span>
                              )}
                              {skill.last_modified && (
                                <span className="rounded bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5">
                                  {formatDate(skill.last_modified)}
                                </span>
                              )}
                            </div>

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

                            {recItem && (
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 font-medium">
                                💡 {recItem.reason}
                              </p>
                            )}
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => setDetailSkill(skill)}
                              className="text-[10px] font-mono text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            >
                              {skill.id}
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setDetailSkill(skill)}
                                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                Details
                              </button>

                              <button
                                type="button"
                                disabled={isInstalling || isInstalled}
                                onClick={() => handleInstall(skill)}
                                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition active:scale-95 ${
                                  isInstalled
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 cursor-default"
                                    : isInstalling
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                                      : "bg-brand text-white hover:bg-brand-hover"
                                }`}
                              >
                                {isInstalled ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Installed
                                  </>
                                ) : isInstalling ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Installing…
                                  </>
                                ) : (
                                  <>
                                    <Download className="h-3.5 w-3.5" />
                                    Install
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skill Detail Modal — lazy loads full SKILL.md */}
      {detailSkill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDetailSkill(null)}
        >
          <div
            className="flex flex-col max-w-4xl w-full max-h-[85vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center gap-3">
                {(() => {
                  const IconComponent = getCategoryIcon(detailSkill.category);
                  return (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <IconComponent className="h-5 w-5" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {detailSkill.name}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="font-mono">{detailSkill.id}</span>
                    {detailSkill.version && (
                      <span className="rounded bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 font-mono">
                        v{detailSkill.version}
                      </span>
                    )}
                    {detailSkill.author && (
                      <span className="rounded bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5">
                        {detailSkill.author}
                      </span>
                    )}
                    {detailSkill.last_modified && (
                      <span className="rounded bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5">
                        {formatDate(detailSkill.last_modified)}
                      </span>
                    )}
                    {detailSkill.size_bytes ? (
                      <span className="rounded bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5">
                        {formatSize(detailSkill.size_bytes)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailSkill(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tags + related skills */}
            {((Array.isArray(detailSkill.tags) && detailSkill.tags.length) || (Array.isArray(detailSkill.related_skills) && detailSkill.related_skills.length)) && (
              <div className="flex flex-wrap gap-2 p-4 border-b border-slate-200 dark:border-slate-800">
                {Array.isArray(detailSkill.tags) && detailSkill.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-300"
                  >
                    {tag}
                  </span>
                ))}
                {Array.isArray(detailSkill.related_skills) && detailSkill.related_skills.map((rs: string) => (
                  <span
                    key={rs}
                    className="rounded bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300"
                  >
                    🔗 {rs}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {detailSkill.description}
              </p>
            </div>

            {/* SKILL.md body (lazy loaded) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              {detailQuery.isLoading ? (
                <div className="flex justify-center py-8 text-slate-400 dark:text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : detailQuery.data?.skill_md ? (
                <pre className="text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {detailQuery.data.skill_md}
                </pre>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                  SKILL.md content not available.
                </p>
              )}
            </div>

            {/* Modal footer with install button */}
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 p-4">
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                {detailSkill.path}
              </span>
              <button
                type="button"
                disabled={
                  installingIds[detailSkill.id] ||
                  detailSkill.installed ||
                  installedIds[detailSkill.id]
                }
                onClick={() => handleInstall(detailSkill)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs transition active:scale-95 ${
                  detailSkill.installed || installedIds[detailSkill.id]
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 cursor-default"
                    : installingIds[detailSkill.id]
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                      : "bg-brand text-white hover:bg-brand-hover"
                }`}
              >
                {detailSkill.installed || installedIds[detailSkill.id] ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Already Installed
                  </>
                ) : installingIds[detailSkill.id] ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Installing…
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Install Skill
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
