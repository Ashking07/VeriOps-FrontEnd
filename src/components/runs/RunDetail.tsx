import React, { useMemo, useState, useEffect } from "react";
import {
  ChevronRight,
  CirclePlay,
  Code,
  Clock,
  Layers,
  ShieldCheck,
  TriangleAlert,
  ArrowLeft,
  Share2,
  X,
  Zap,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StatusPill } from "../ui/StatusPill";
import { JsonPanel } from "../ui/JsonPanel";
import { CopyButton } from "../ui/CopyButton";
import {
  getRun,
  getRunValidations,
  validateRun,
  RunStep,
  RunValidation,
} from "../../lib/api";
import { useAppStore } from "../../store/appStore";

type PolicyOption = {
  id: string;
  name: string;
  yaml: string;
};

type ValidateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onValidate: (yaml: string) => void;
  isValidating: boolean;
  policies: PolicyOption[];
};

const defaultYaml = `version: 1.2
policies:
  - id: allowed_tools
    allowed: [retriever_v2, internal_tracker, gpt-4o]
  - id: token_budget
    max_tokens: 5000
    cost_limit: 0.10
  - id: required_steps
    steps: [Knowledge Retrieval, Generate Response]`;

const templateDefinitions: Record<string, string> = {
  Default: defaultYaml,
  "Allowed tools": `version: 1.0
policies:
  - id: allowed_tools
    allowed: [retriever_v2, internal_tracker, gpt-4o]`,
  "Required steps": `version: 1.0
policies:
  - id: required_steps
    steps: [Knowledge Retrieval, Generate Response]`,
  Budgets: `version: 1.0
policies:
  - id: token_budget
    max_tokens: 5000
    cost_limit: 0.10`,
};

const ValidateModal: React.FC<ValidateModalProps> = ({
  isOpen,
  onClose,
  isDark,
  onValidate,
  isValidating,
  policies,
}) => {
  const [yaml, setYaml] = useState(defaultYaml);
  const [sourceKey, setSourceKey] = useState("template:Default");

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (sourceKey.startsWith("policy:")) {
      const policyId = sourceKey.replace("policy:", "");
      const policy = policies.find((item) => item.id === policyId);
      if (policy) {
        setYaml(policy.yaml);
      }
      return;
    }
    const templateName = sourceKey.replace("template:", "");
    const templateYaml = templateDefinitions[templateName];
    if (templateYaml) {
      setYaml(templateYaml);
    }
  }, [isOpen, sourceKey, policies]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full max-w-2xl border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] transition-all ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
            }`}
          >
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Validate Run</h2>
                  <p className="text-xs text-zinc-500">Test this trace against a policy definition</p>
                </div>
              </div>
              <button onClick={onClose} className={`p-2 transition-colors ${isDark ? 'text-zinc-600 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-3">
                <div className={`p-3 border rounded-xl flex flex-col gap-2 ${
                  isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Runbook Source</span>
                    <span className="text-[10px] text-zinc-500">Choose template or saved policy</span>
                  </div>
                  <select
                    value={sourceKey}
                    onChange={(event) => {
                      setSourceKey(event.target.value);
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-xs transition-all ${
                      isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
                    }`}
                  >
                    <optgroup label="Templates">
                      {Object.keys(templateDefinitions).map((key) => (
                        <option key={`template-${key}`} value={`template:${key}`}>
                          {key}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Policies">
                      {policies.length === 0 ? (
                        <option value="policy:none" disabled>
                          No policies saved
                        </option>
                      ) : (
                        policies.map((policy) => (
                          <option key={policy.id} value={`policy:${policy.id}`}>
                            {policy.name}
                          </option>
                        ))
                      )}
                    </optgroup>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Policy Definition (YAML)</span>
                </div>
                <textarea
                  value={yaml}
                  onChange={(event) => setYaml(event.target.value)}
                  className={`w-full h-56 rounded-xl p-4 border font-mono text-[11px] leading-relaxed resize-none ${
                    isDark ? "bg-zinc-900 border-zinc-800 text-blue-400/90" : "bg-zinc-50 border-zinc-200 text-blue-600/90"
                  }`}
                />
              </div>
            </div>

            <div className={`p-6 border-t flex justify-end gap-3 ${isDark ? 'border-zinc-800 bg-zinc-900/20' : 'border-zinc-200 bg-zinc-50'}`}>
              <button 
                onClick={onClose}
                className={`px-4 py-2 text-xs font-bold transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                Cancel
              </button>
              <button 
                onClick={() => onValidate(yaml)}
                disabled={isValidating || !yaml.trim()}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                  isDark ? 'bg-white text-zinc-950 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm'
                }`}
              >
                {isValidating ? <Layers size={14} className="animate-spin" /> : <CirclePlay size={14} />}
                {isValidating ? 'Validating...' : 'Run Validation'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

type StepRowProps = {
  step: RunStep;
  isDark: boolean;
  maxLatency: number;
};

const StepRow: React.FC<StepRowProps> = ({ step, isDark, maxLatency }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPlaceholder = step.index === -1;
  const latencyPercent =
    step.latency_ms && maxLatency > 0 ? Math.min(100, (step.latency_ms / maxLatency) * 100) : 0;

  return (
    <div className={`border-b transition-colors ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-6 py-3 flex items-center gap-4 cursor-pointer transition-colors ${
          isPlaceholder 
            ? (isDark ? 'bg-rose-500/5 hover:bg-rose-500/10' : 'bg-rose-50 hover:bg-rose-100') 
            : (isDark ? 'hover:bg-zinc-800/20' : 'hover:bg-zinc-50')
        }`}
      >
        <div className="w-4 flex-shrink-0">
          <ChevronRight size={14} className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
        <div className="w-8 text-[11px] font-mono text-zinc-500">{step.index === -1 ? '?' : step.index}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>{step.name}</span>
            {isPlaceholder && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                <TriangleAlert size={10} />
                Out-of-order
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Code size={10} /> {step.tool}
            </span>
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Clock size={10} /> {step.latency_ms}ms
            </span>
          </div>
        </div>
        <div className="hidden md:flex gap-4 items-center mr-8 text-right">
          <div className="w-20">
            <div className={`h-1 rounded-full ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
              <div
                className="h-1 rounded-full bg-blue-500"
                style={{ width: `${latencyPercent}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500">{step.tokens} tkns</div>
          <div className="text-[10px] font-mono text-zinc-500">${step.cost}</div>
        </div>
        <StatusPill status={step.status} />
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden transition-colors ${isDark ? 'bg-zinc-900/20' : 'bg-zinc-50'}`}
          >
            <div className="p-6 pt-0 space-y-4">
              <div className="flex flex-col lg:flex-row gap-4 mt-2">
                <JsonPanel title="Input Payload" data={step.input_json} isDark={isDark} />
                <JsonPanel title="Output Result" data={step.output_json} isDark={isDark} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type RunDetailProps = {
  theme: "dark" | "light";
};

const formatDuration = (durationMs?: number) => {
  if (!durationMs) return "—";
  const seconds = durationMs / 1000;
  return `${seconds.toFixed(2)}s`;
};

export const RunDetail: React.FC<RunDetailProps> = ({ theme }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [policyOptions, setPolicyOptions] = useState<PolicyOption[]>([]);
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { runId } = useParams();
  const queryClient = useQueryClient();
  const { selectedProjectId } = useAppStore();

  const runQuery = useQuery({
    queryKey: ["run", runId],
    queryFn: () => getRun(runId ?? ""),
    enabled: !!runId,
  });

  const validationsQuery = useQuery({
    queryKey: ["run-validations", runId],
    queryFn: () => getRunValidations(runId ?? "", 20),
    enabled: !!runId,
  });

  const validateMutation = useMutation({
    mutationFn: (yaml: string) => validateRun(runId ?? "", yaml),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run", runId] });
      queryClient.invalidateQueries({ queryKey: ["run-validations", runId] });
      toast.success("Validation complete");
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error("Validation failed");
    },
  });

  const sortedSteps = useMemo(() => {
    const steps = runQuery.data?.steps ?? [];
    const filtered = showErrorsOnly
      ? steps.filter((step) => step.status === "failed" || step.status === "error")
      : steps;
    return [...filtered].sort((a, b) => {
      if (a.index === -1 && b.index !== -1) return 1;
      if (b.index === -1 && a.index !== -1) return -1;
      return (a.index ?? 0) - (b.index ?? 0);
    });
  }, [runQuery.data?.steps, showErrorsOnly]);

  const maxLatency = useMemo(() => {
    const steps = runQuery.data?.steps ?? [];
    return steps.reduce((max, step) => Math.max(max, step.latency_ms ?? 0), 0);
  }, [runQuery.data?.steps]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storageKey = `veriops-policies:${selectedProjectId ?? "default"}`;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setPolicyOptions([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PolicyOption[];
      setPolicyOptions(parsed);
    } catch {
      setPolicyOptions([]);
    }
  }, [selectedProjectId]);

  const latestValidation = useMemo<RunValidation | undefined>(() => {
    const list = validationsQuery.data?.validations ?? [];
    if (list.length === 0) return undefined;
    return [...list].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })[0];
  }, [validationsQuery.data]);

  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const apiKey =
    (env.VITE_VERIOPS_API_KEY as string | undefined) ??
    (env.NEXT_PUBLIC_VERIOPS_API_KEY as string | undefined) ??
    (env.DEV ? "dev-key" : "");

  if (!runId) {
    return <div className="text-sm text-rose-500">Missing run id.</div>;
  }

  if (runQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className={`h-10 w-1/3 rounded-lg ${isDark ? "bg-zinc-900" : "bg-zinc-200"} animate-pulse`} />
        <div className={`h-32 w-full rounded-xl ${isDark ? "bg-zinc-900" : "bg-zinc-200"} animate-pulse`} />
      </div>
    );
  }

  if (runQuery.isError) {
    return <div className="text-sm text-rose-500">Failed to load run detail.</div>;
  }

  return (
    <div className="max-w-full space-y-6">
      <ValidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isDark={isDark}
        onValidate={(yaml) => validateMutation.mutate(yaml)}
        isValidating={validateMutation.isPending}
        policies={policyOptions}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/runs")}
            className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-zinc-100 text-zinc-500"}`}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className={`text-xl font-bold font-mono ${isDark ? "text-white" : "text-zinc-900"}`}>
                {runQuery.data?.id ?? runId ?? "—"}
              </h1>
              <CopyButton
                value={runQuery.data?.id ?? runId ?? ""}
                copiedMessage="Copied"
                className={`${isDark ? "text-zinc-600 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}`}
                iconSize={14}
              />
              <StatusPill status={runQuery.data?.status ?? "running"} />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Started {runQuery.data?.started_at ?? "—"} • Duration {formatDuration(runQuery.data?.duration_ms)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className={`flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              isDark ? "bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800" : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm"
            }`}
          >
            <Share2 size={14} />
            Share
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              isDark ? "bg-white text-zinc-950 hover:bg-zinc-200" : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            <ShieldCheck size={14} />
            Validate Run
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Tokens", value: runQuery.data?.tokens ?? "—", icon: Zap },
          { label: "Total Cost", value: runQuery.data?.cost ?? "—", icon: DollarSign },
          { label: "Step Count", value: sortedSteps.length, icon: Layers },
          {
            label: "Policy Status",
            value: latestValidation?.status ?? runQuery.data?.latest_validation_status ?? "—",
            icon: ShieldCheck,
            status: latestValidation?.status ?? runQuery.data?.latest_validation_status ?? "none",
          },
        ].map((stat, i) => (
          <div key={i} className={`border p-4 rounded-xl transition-all ${
            isDark ? "bg-zinc-900/50 border-zinc-800/50" : "bg-white border-zinc-200 shadow-sm"
          }`}>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
                {stat.value}
              </span>
              {stat.status ? <StatusPill status={stat.status as "passed" | "failed" | "warning" | "none"} /> : <stat.icon size={16} className="text-zinc-500" />}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Steps Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`border rounded-2xl overflow-hidden transition-all ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Execution Trace</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  <input
                    type="checkbox"
                    checked={showErrorsOnly}
                    onChange={(event) => setShowErrorsOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-400"
                  />
                  Errors only
                </label>
              </div>
            </div>
            <div className={`divide-y ${isDark ? 'divide-zinc-800/50' : 'divide-zinc-200'}`}>
              {sortedSteps.map((step, i) => (
                <StepRow key={`${step.name}-${i}`} step={step} isDark={isDark} maxLatency={maxLatency} />
              ))}
            </div>
          </div>
        </div>

        {/* Validation Sidebar */}
        <div className="space-y-4">
          <div className={`border rounded-2xl p-6 sticky top-20 transition-all ${
            isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Validation Insights</h3>
              <span className="text-[10px] text-zinc-500 font-mono">Latest</span>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">Latest Status</span>
                  <StatusPill status={latestValidation?.status ?? runQuery.data?.latest_validation_status ?? "none"} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Validated at</span>
                  <span className={`text-xs ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                    {latestValidation?.created_at ?? runQuery.data?.latest_validation_at ?? "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Findings</span>
                <div className="space-y-2">
                  {(latestValidation?.findings ?? []).length === 0 ? (
                    <div className="text-[11px] text-zinc-500">No findings reported yet.</div>
                  ) : (
                    latestValidation?.findings?.map((finding, i) => (
                      <div key={i} className={`p-3 border rounded-lg flex items-start gap-3 transition-all ${
                        isDark ? 'bg-zinc-950 border-zinc-800/50' : 'bg-zinc-50 border-zinc-200 shadow-sm'
                      }`}>
                        <div className={`mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full ${
                          finding.status === 'passed' ? 'bg-emerald-500' : finding.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'
                        }`} />
                        <div>
                          <p className={`text-[11px] font-mono mb-0.5 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{finding.code ?? "FINDING"}</p>
                          <p className="text-[11px] text-zinc-500">{finding.msg ?? "No details provided."}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">History</span>
                <div className="space-y-2">
                  {validationsQuery.isError && (
                    <div className="text-[11px] text-rose-500">Failed to load validation history.</div>
                  )}
                  {(validationsQuery.data?.validations ?? []).slice(0, 5).map((validation, index) => (
                    <div key={`${validation.id ?? index}`} className={`p-3 border rounded-lg flex items-center justify-between ${
                      isDark ? "bg-zinc-950 border-zinc-800/50" : "bg-zinc-50 border-zinc-200 shadow-sm"
                    }`}>
                      <div className="flex items-center gap-2">
                        <StatusPill status={validation.status} />
                        <span className="text-[11px] text-zinc-500">{validation.created_at ?? "—"}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">#{index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className={`w-full py-2 border rounded-lg text-xs font-bold transition-all ${
                isDark 
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' 
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
              }`}>
                View Policy YAML
              </button>
            </div>
          </div>

          <div className={`border rounded-2xl p-4 transition-all ${
            isDark ? "bg-zinc-900/50 border-zinc-800/50" : "bg-white border-zinc-200 shadow-sm"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">API Key</span>
              <CopyButton value={apiKey} copiedMessage="Copied" iconSize={12} className={isDark ? "text-zinc-600 hover:text-white" : "text-zinc-400 hover:text-zinc-900"} />
            </div>
            <p className="mt-2 text-xs font-mono text-zinc-500">{apiKey ? `${apiKey.slice(0, 6)}...` : "Not configured"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DollarSign = ({ size, className }: { size: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
