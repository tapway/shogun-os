import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Loader2,
  Save,
  Send,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { skillsApi, departmentsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { GeneratedSkill, SkillIntakeResponse } from '../lib/types';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  skillDraft?: GeneratedSkill;
  testOutput?: string;
  isActionCard?: boolean;
}

export default function TrainSkill() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const prefilledPrompt = (location.state as { prompt?: string } | null)?.prompt || '';

  const [department, setDepartment] = useState('finance');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(prefilledPrompt);
  const [isReady, setIsReady] = useState(false);
  const [suggestedName, setSuggestedName] = useState('');
  const [generatedSkill, setGeneratedSkill] = useState<GeneratedSkill | null>(null);
  const [testOutput, setTestOutput] = useState('');
  const [skillNameInput, setSkillNameInput] = useState('');
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [autoTested, setAutoTested] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const deptsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.list(),
  });

  const allDepts = (Array.isArray(deptsQuery.data) ? deptsQuery.data : []) as {
    name: string;
    label?: string;
  }[];

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial welcome greeting
  useEffect(() => {
    if (messages.length === 0) {
      const initialGreeting: Message = {
        id: 'msg-welcome',
        role: 'assistant',
        content: prefilledPrompt
          ? `I noticed you want to train a skill based on: "${prefilledPrompt}". Could you specify the step-by-step procedure and trigger conditions for this skill?`
          : `Hello ${user?.name || ''}! I'm your Shogun OS Skill Architect powered by GLM-5.2. What type of operational skill do you want to train for the ${department} department?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialGreeting]);

      if (prefilledPrompt) {
        // Initial intake evaluation for prefilled prompt
        intakeMutation.mutate({
          history: [{ role: 'user', content: prefilledPrompt }],
          department,
        });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Intake evaluation mutation (glm-5.2 dynamic reasoning)
  const intakeMutation = useMutation({
    mutationFn: (payload: { history: Array<{ role: string; content: string }>; department: string }) =>
      skillsApi.intake(payload.history, payload.department),
    onSuccess: (res: SkillIntakeResponse) => {
      setIsReady(res.is_ready);
      if (res.suggested_name) {
        setSuggestedName(res.suggested_name);
        if (!skillNameInput) setSkillNameInput(res.suggested_name);
      }

      const botReply: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: res.is_ready
          ? `Great! I have gathered sufficient details for "${res.suggested_name || 'this skill'}". Click **Generate Skill Now** below to construct the SKILL.md definition!`
          : res.follow_up_question || 'Could you provide a few more step-by-step details or trigger conditions?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botReply]);
    },
    onError: (err: unknown) => {
      const errMsg = err instanceof Error ? err.message : 'unknown error';
      // Don't repeat the same canned question on error — that creates a loop.
      // Be honest that the intake analysis failed and the user should re-send.
      const fallback: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ I couldn't analyze your last message (backend: ${errMsg}). Please re-send it or add more detail about the skill's trigger, steps, and input/output.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallback]);
    },
  });

  // Skill generation mutation — produces a SKILL.md draft
  const generateMutation = useMutation({
    mutationFn: ({ instruction, department }: { instruction: string; department: string }) =>
      skillsApi.generate(instruction, department, {
        skill_name: skillNameInput || suggestedName || undefined,
      }),
    onSuccess: (res) => {
      setGeneratedSkill(res.skill);
      setIsTestingMode(true);
      if (res.skill.name) setSkillNameInput(res.skill.name);

      const genMsg: Message = {
        id: `msg-gen-${Date.now()}`,
        role: 'assistant',
        content: `🎉 **SKILL.md Generated!** Here is the skill definition created by ${res.generated_by_model || 'GLM-5.2'} using Hermes /learn authoring standards. Running a live test now...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        skillDraft: res.skill,
      };
      setMessages((prev) => [...prev, genMsg]);
      toast.success('SKILL.md generated — running test');

      // Auto-run a test once after generation using a sample input derived from the instruction
      const sampleInput = res.skill.instruction || res.skill.description || 'test input';
      testMutation.mutate({ skill: res.skill, test_input: sampleInput });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Generation failed');
    },
  });

  // Test execution mutation — runs the SKILL.md against test input
  const testMutation = useMutation({
    mutationFn: ({ skill, test_input }: { skill: GeneratedSkill; test_input: string }) =>
      skillsApi.test(skill, test_input),
    onSuccess: (res) => {
      const output = res.ok ? res.output : (res.error || 'Test failed');
      setTestOutput(output);

      const testMsg: Message = {
        id: `msg-test-${Date.now()}`,
        role: 'assistant',
        content: res.ok
          ? `✅ **Test Run Succeeded!** Here is the execution output from your skill. Review the SKILL.md and test output, then click **Save Skill** to persist it to ~/.hermes/skills/.`
          : `⚠️ Test execution failed: ${res.error}. You can still save the skill and refine it later.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        testOutput: output,
        isActionCard: true,
      };
      setMessages((prev) => [...prev, testMsg]);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Test execution error');
    },
  });

  // Save skill mutation — writes SKILL.md to ~/.hermes/skills/<name>/SKILL.md
  const saveMutation = useMutation({
    mutationFn: ({ skill, department }: { skill: GeneratedSkill; department: string }) =>
      skillsApi.save(skill, department, {
        created_by: user?.name || 'Unknown',
        created_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      toast.success('Skill saved to ~/.hermes/skills/!');
      navigate('/skills');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    },
  });

  // Send message handler
  const handleSendMessage = (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    if (isTestingMode && generatedSkill && !autoTested) {
      // After auto-test, user can run additional manual tests in the chat
      testMutation.mutate({ skill: generatedSkill, test_input: messageContent });
      setAutoTested(true);
    } else if (isTestingMode && generatedSkill && autoTested) {
      // Additional manual test runs after the first auto-test
      testMutation.mutate({ skill: generatedSkill, test_input: messageContent });
    } else if (!isTestingMode && !isReady) {
      // Intake mode: send transcript to LLM intake evaluator (only while still
      // gathering details — once isReady flips true we stop calling intake so
      // the user isn't dragged back into the question loop).
      const updatedHistory = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      intakeMutation.mutate({ history: updatedHistory, department });
    } else if (!isTestingMode && isReady) {
      // Skill is ready but user sent another message — acknowledge and nudge
      // them toward generating the skill instead of re-running intake.
      const nudge: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Got it. I have enough detail to build the skill — click **Generate Skill Now** below to create the SKILL.md.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, nudge]);
    }
  };

  // Trigger skill generation from accumulated transcript
  const handleTriggerGenerate = () => {
    const transcript = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    generateMutation.mutate({ instruction: transcript, department });
  };

  return (
    <div className="mx-auto max-w-4xl h-[calc(100vh-5rem)] flex flex-col space-y-3">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => navigate('/skills')}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Skills Catalog
        </button>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 dark:text-slate-400">Department:</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs text-slate-900 dark:text-white focus:border-brand focus:outline-none"
          >
            {allDepts.map((d) => (
              <option key={d.name} value={d.name}>
                {d.label || d.name}
              </option>
            ))}
            <option value="operations">Operations</option>
          </select>
        </div>
      </div>

      {/* Main Chatbot Container Card */}
      <div className="flex-1 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-2xl overflow-hidden min-h-0">
        {/* Chat Title Header */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-100 dark:from-purple-950/80 dark:via-indigo-950/80 dark:to-slate-900 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/20 border border-brand/40 text-brand">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white">Shogun OS Skill Architect</h1>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  GLM-5.2 AI · /learn
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Interactive skill training chatbot for {department}
              </p>
            </div>
          </div>

          {/* Completeness Indicator */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className={`h-2.5 w-2.5 rounded-full ${isReady ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-amber-500 dark:bg-amber-400'}`} />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {isReady ? 'Details Complete' : 'Gathering Details'}
            </span>
          </div>
        </div>

        {/* Message Thread Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl text-xs font-bold ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-brand border border-slate-300 dark:border-slate-700'
                }`}
              >
                {msg.role === 'user' ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Bubble Content */}
              <div
                className={`max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-brand text-white rounded-tr-none shadow-lg shadow-brand/10'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Render Skill Draft Card (SKILL.md preview) if attached */}
                {msg.skillDraft && (
                  <div className="mt-3 rounded-xl border border-emerald-500/30 bg-black/40 p-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        SKILL.md Draft
                      </span>
                      <span className="font-mono text-[10px] text-emerald-500/70">{msg.skillDraft.name}</span>
                    </div>
                    <pre className="max-h-64 overflow-auto rounded bg-slate-50 dark:bg-slate-950 p-2.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-200 whitespace-pre-wrap">
                      {msg.skillDraft.skill_md || '(empty)'}
                    </pre>
                    {/* Validation warning banner */}
                    {msg.skillDraft.validation_errors && msg.skillDraft.validation_errors.length > 0 && (
                      <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-2 text-[11px] text-amber-800 dark:text-amber-200">
                        <div className="font-semibold text-amber-800 dark:text-amber-300 mb-0.5">⚠️ Validation issues (skill may not save):</div>
                        <ul className="list-disc list-inside space-y-0.5">
                          {msg.skillDraft.validation_errors.map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                        <div className="mt-1 text-amber-600/80 dark:text-amber-400/80">Try regenerating, or fix the SKILL.md above before saving.</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Render Test Output Card if attached */}
                {msg.testOutput && (
                  <div className="mt-3 rounded-xl border border-indigo-500/30 bg-black/40 p-3">
                    <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Live Execution Output:</div>
                    <pre className="max-h-48 overflow-auto rounded bg-slate-50 dark:bg-slate-950 p-2.5 font-mono text-[11px] text-slate-900 dark:text-slate-200 whitespace-pre-wrap">
                      {msg.testOutput}
                    </pre>
                  </div>
                )}

                {/* Render Final Save Action Card if attached */}
                {msg.isActionCard && generatedSkill && (
                  <div className="mt-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-3">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Finalize & Save Skill
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      The SKILL.md will be written to{' '}
                      <code className="text-emerald-700 dark:text-emerald-300 font-mono">~/.hermes/skills/{generatedSkill.name?.toLowerCase().replace(/ /g, '-')}/SKILL.md</code>
                      {' '}and registered in the {department} catalog. Edit the skill name below if needed.
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Skill Name</label>
                        <input
                          value={skillNameInput}
                          onChange={(e) => setSkillNameInput(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Back to Train Skill — left of Save */}
                      <button
                        type="button"
                        onClick={() => {
                          // Reset to intake mode but keep chat history so the
                          // user can continue providing more details, then
                          // regenerate the skill.
                          setGeneratedSkill(null);
                          setIsTestingMode(false);
                          setAutoTested(false);
                          setTestOutput('');
                          // Reset isReady so new messages go through intake
                          // (not the "nudge to generate" branch).
                          setIsReady(false);
                          const backMsg: Message = {
                            id: `msg-back-${Date.now()}`,
                            role: 'assistant',
                            content: `↩️ **Back to training mode.** The previous chat history is preserved. Provide more details or clarify requirements below, then click **Generate Skill Now** to regenerate the SKILL.md with your updated specifications.`,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          };
                          setMessages((prev) => [...prev, backMsg]);
                          toast('Back to training — add more details and regenerate', { icon: '↩️' });
                        }}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Train Skill
                      </button>

                      {/* Save — right side */}
                      <button
                        type="button"
                        disabled={saveMutation.isPending || !!(generatedSkill.validation_errors && generatedSkill.validation_errors.length > 0)}
                        onClick={() => {
                          const finalSkill: GeneratedSkill = {
                            ...generatedSkill,
                            name: skillNameInput || generatedSkill.name,
                          };
                          saveMutation.mutate({ skill: finalSkill, department });
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save Skill to ~/.hermes/skills/
                      </button>
                    </div>
                    {generatedSkill.validation_errors && generatedSkill.validation_errors.length > 0 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 text-center">
                        ⚠️ Fix validation issues above before saving.
                      </div>
                    )}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 dark:text-slate-400 text-right">{msg.timestamp}</div>
              </div>
            </div>
          ))}

          {/* Pending Indicators */}
          {(intakeMutation.isPending || generateMutation.isPending || testMutation.isPending) && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-brand border border-slate-300 dark:border-slate-700">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800/90 px-4 py-3 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                <span>
                  {generateMutation.isPending
                    ? 'Generating SKILL.md with /learn standards…'
                    : testMutation.isPending
                      ? 'Running live test execution…'
                      : 'Thinking & analyzing operational requirements…'}
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        {!generatedSkill && (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/40 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Quick Suggestions:</span>
            {[
              '📊 Automated Daily Report',
              '🔔 Overdue Alert Trigger',
              '🔄 Inventory Data Sync',
              '⚡ Approval Workflow',
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSendMessage(suggestion)}
                className="rounded-full bg-slate-100 dark:bg-slate-800/80 px-3 py-1 text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 transition-all"
              >
                {suggestion}
              </button>
            ))}

            {/* Direct Generate Skill button */}
            <button
              onClick={handleTriggerGenerate}
              disabled={generateMutation.isPending || messages.length < 2}
              className="ml-auto flex items-center gap-1.5 rounded-full bg-brand/20 px-3 py-1 text-[11px] font-semibold text-brand hover:bg-brand hover:text-white border border-brand/40 transition-all disabled:opacity-40"
            >
              <Sparkles className="h-3 w-3" />
              Generate Skill Now
            </button>
          </div>
        )}

        {/* Bottom Input Form Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isTestingMode
                ? 'Type additional test input to try your skill again...'
                : 'Describe step-by-step procedures, conditions, timers, or examples...'
            }
            className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || intakeMutation.isPending || testMutation.isPending}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-lg transition-all hover:bg-brand-hover active:scale-95 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
