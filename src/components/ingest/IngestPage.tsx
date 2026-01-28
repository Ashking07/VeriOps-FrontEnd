import React, { useMemo, useState } from "react";
import {
  Terminal,
  Send,
  TriangleAlert,
  Code2,
  FileJson,
  RefreshCcw,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CopyButton } from "../ui/CopyButton";
import {
  Event,
  EventType,
  IngestEventsResponse,
  IngestRequest,
  ingestEvents,
} from "../../lib/api";

type IngestPageProps = {
  theme: "dark" | "light";
};

const createUUID = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `uuid_${Math.random().toString(16).slice(2)}`;
};

const createTimestamp = () => new Date().toISOString();

const buildPreset = (outOfOrder: boolean): IngestRequest => {
  const runId = createUUID();
  const stepId = createUUID();
  const ts1 = createTimestamp();
  const ts2 = createTimestamp();
  const ts3 = createTimestamp();
  const ts4 = createTimestamp();

  const runStart: Event = {
    type: "run.start",
    run_id: runId,
    ts: ts1,
    project_id: "shortify",
    runbook: "default-runbook",
  };

  const stepStart: Event = {
    type: "step.start",
    run_id: runId,
    ts: ts2,
    step_id: stepId,
    index: 1,
    name: "Knowledge Retrieval",
    tool: "retriever_v2",
    input: { query: "Reset MFA instructions" },
  };

  const stepEnd: Event = {
    type: "step.end",
    run_id: runId,
    ts: ts3,
    step_id: stepId,
    output: { result: "MFA reset instructions" },
    latency_ms: 420,
    tokens: 240,
    cost_usd: 0.004,
    status: "ok",
  };

  const runEnd: Event = {
    type: "run.end",
    run_id: runId,
    ts: ts4,
    totals: { tokens: 240, cost_usd: 0.004 },
  };

  return {
    events: outOfOrder
      ? [runStart, stepEnd, stepStart, runEnd]
      : [runStart, stepStart, stepEnd, runEnd],
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidIsoDate = (value: string) => !Number.isNaN(Date.parse(value));

const validateEvent = (event: Record<string, unknown>, index: number): string[] => {
  const errors: string[] = [];
  const type = event.type as EventType | undefined;
  const runId = event.run_id as string | undefined;
  const ts = event.ts as string | undefined;

  if (!type || !["run.start", "run.end", "step.start", "step.end"].includes(type)) {
    errors.push(`Event ${index + 1}: "type" must be one of run.start, run.end, step.start, step.end.`);
  }

  if (!runId) {
    errors.push(`Event ${index + 1}: "run_id" is required.`);
  }

  if (!ts || !isValidIsoDate(ts)) {
    errors.push(`Event ${index + 1}: "ts" must be a valid ISO datetime.`);
  }

  switch (type) {
    case "run.start": {
      if (!event.project_id) {
        errors.push(`Event ${index + 1} (run.start): "project_id" is required.`);
      }
      break;
    }
    case "run.end": {
      if (!isRecord(event.totals)) {
        errors.push(`Event ${index + 1} (run.end): "totals" object is required.`);
      }
      break;
    }
    case "step.start": {
      if (!event.step_id) {
        errors.push(`Event ${index + 1} (step.start): "step_id" is required.`);
      }
      if (typeof event.index !== "number") {
        errors.push(`Event ${index + 1} (step.start): "index" must be a number.`);
      }
      if (!event.name) {
        errors.push(`Event ${index + 1} (step.start): "name" is required.`);
      }
      if (!event.tool) {
        errors.push(`Event ${index + 1} (step.start): "tool" is required.`);
      }
      if (!isRecord(event.input)) {
        errors.push(`Event ${index + 1} (step.start): "input" object is required.`);
      }
      break;
    }
    case "step.end": {
      if (!event.step_id) {
        errors.push(`Event ${index + 1} (step.end): "step_id" is required.`);
      }
      if (!isRecord(event.output)) {
        errors.push(`Event ${index + 1} (step.end): "output" object is required.`);
      }
      if (event.latency_ms !== undefined && typeof event.latency_ms !== "number") {
        errors.push(`Event ${index + 1} (step.end): "latency_ms" must be a number.`);
      }
      if (event.tokens !== undefined && typeof event.tokens !== "number") {
        errors.push(`Event ${index + 1} (step.end): "tokens" must be a number.`);
      }
      if (event.cost_usd !== undefined && typeof event.cost_usd !== "number") {
        errors.push(`Event ${index + 1} (step.end): "cost_usd" must be a number.`);
      }
      if (event.status !== "ok" && event.status !== "error") {
        errors.push(`Event ${index + 1} (step.end): "status" must be "ok" or "error".`);
      }
      if (event.latency_ms !== undefined && event.latency_ms < 0) {
        errors.push(`Event ${index + 1} (step.end): "latency_ms" must be >= 0.`);
      }
      if (event.tokens !== undefined && event.tokens < 0) {
        errors.push(`Event ${index + 1} (step.end): "tokens" must be >= 0.`);
      }
      if (event.cost_usd !== undefined && event.cost_usd < 0) {
        errors.push(`Event ${index + 1} (step.end): "cost_usd" must be >= 0.`);
      }
      break;
    }
    default:
      break;
  }

  return errors;
};

export const IngestPage: React.FC<IngestPageProps> = ({ theme }) => {
  const [payload, setPayload] = useState(
    JSON.stringify(buildPreset(false), null, 2)
  );
  const [response, setResponse] = useState<IngestEventsResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const isDark = theme === "dark";

  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const apiBaseUrl =
    (env.VITE_API_BASE_URL as string | undefined) ??
    (env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ??
    "";
  const apiKey =
    (env.VITE_VERIOPS_API_KEY as string | undefined) ??
    (env.NEXT_PUBLIC_VERIOPS_API_KEY as string | undefined) ??
    (env.DEV ? "dev-key" : "");
  const trimmedBase = apiBaseUrl ? apiBaseUrl.replace(/\/$/, "") : "";
  const endpoint = `${trimmedBase}/v1/events`;

  const ingestMutation = useMutation({
    mutationFn: (body: IngestRequest) => ingestEvents(body),
    onSuccess: (data) => {
      setResponse(data);
      setValidationErrors([]);
      toast.success("Event ingested successfully");
    },
    onError: () => {
      toast.error("Failed to ingest events");
    },
  });

  const samplePayloads = useMemo(
    () => [
      {
        title: "Minimal happy path",
        description: "run.start → step.start → step.end → run.end",
        data: buildPreset(false),
      },
      {
        title: "Out-of-order",
        description: "run.start → step.end → step.start → run.end",
        data: buildPreset(true),
      },
    ],
    []
  );

  const sendEvent = () => {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      if (!isRecord(parsed) || !Array.isArray(parsed.events)) {
        setValidationErrors(["Body must be an object with an events array."]);
        return;
      }

      const events = parsed.events as unknown[];
      const errors = events.flatMap((event, index) =>
        isRecord(event) ? validateEvent(event, index) : [`Event ${index + 1}: must be an object.`]
      );
      setValidationErrors(errors);

      if (errors.length > 0) {
        return;
      }

      setValidationErrors([]);
      ingestMutation.mutate(parsed as IngestRequest);
    } catch {
      toast.error("Payload must be valid JSON");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Ingest Events</h1>
        <p className="text-zinc-500 text-sm mt-1">Send agent execution traces to VeriOps via the REST API or SDK.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              <Code2 size={16} className="text-zinc-500" />
              API Endpoint
            </h3>
            <div className={`border rounded-lg p-3 flex items-center justify-between transition-all ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">POST</span>
                <span className={`text-xs font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{endpoint}</span>
              </div>
              <CopyButton
                value={endpoint}
                copiedMessage="Copied"
                className={`${isDark ? "text-zinc-600 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}`}
                iconSize={14}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className={`border rounded-lg p-3 flex items-center justify-between transition-all ${
              isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">HEADER</span>
                <span className={`text-xs font-mono ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                  x-api-key: {apiKey || "dev-key"}
                </span>
              </div>
              <CopyButton
                value={`x-api-key: ${apiKey || "dev-key"}`}
                copiedMessage="Copied"
                className={`${isDark ? "text-zinc-600 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}`}
                iconSize={14}
              />
            </div>
            <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              <FileJson size={16} className="text-zinc-500" />
              Payload Editor
            </h3>
            {validationErrors.length > 0 && (
              <div
                className={`p-3 border rounded-lg space-y-1 ${
                  isDark ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200"
                }`}
              >
                {validationErrors.map((error, i) => (
                  <p key={i} className={`text-[11px] ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                    {error}
                  </p>
                ))}
              </div>
            )}
            <div className="relative group">
              <textarea 
                className={`w-full h-80 border rounded-xl p-4 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none transition-all ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-600 shadow-sm'
                }`}
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
              />
              <button 
                onClick={sendEvent}
                disabled={ingestMutation.isPending}
                className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                  isDark ? 'bg-white text-zinc-950 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                {ingestMutation.isPending ? <RefreshCcw size={14} className="animate-spin" /> : <Send size={14} />}
                {ingestMutation.isPending ? 'Sending...' : 'Send Event'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Preset Payloads</h3>
            <div className="space-y-3">
              {samplePayloads.map((sample, index) => (
                <div
                  key={sample.title}
                  className={`p-3 border rounded-lg transition-colors cursor-pointer group ${
                    index === 1
                      ? isDark
                        ? "bg-rose-500/5 border-rose-500/10 hover:border-rose-500/20"
                        : "bg-rose-50 border-rose-200 hover:bg-rose-100"
                      : isDark
                      ? "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                      : "bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm"
                  }`}
                  onClick={() => {
                    setPayload(JSON.stringify(sample.data, null, 2));
                    setValidationErrors([]);
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={`text-xs font-medium ${
                        index === 1
                          ? isDark
                            ? "text-rose-400"
                            : "text-rose-600"
                          : isDark
                          ? "text-white"
                          : "text-zinc-900"
                      }`}
                    >
                      {sample.title}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`text-zinc-600 group-hover:${isDark ? "text-white" : "text-zinc-900"}`}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">{sample.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Response</h3>
            {response ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border rounded-xl p-4 space-y-4 transition-all ${
                  isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                }`}
              >
                {("status" in response ||
                  "ingested" in response ||
                  "failed" in response ||
                  "errors" in response ||
                  "warnings" in response) && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-500">
                        Status {response.status ?? "200"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                      <div>Ingested: {response.ingested ?? "—"}</div>
                      <div>Failed: {response.failed ?? "—"}</div>
                    </div>

                    {response.warnings && response.warnings.length > 0 && (
                      <div className={`p-3 border rounded-lg space-y-1 ${
                        isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                          <TriangleAlert size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Warnings</span>
                        </div>
                        {response.warnings.map((w: string, i: number) => (
                          <p key={i} className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{w}</p>
                        ))}
                      </div>
                    )}

                    {response.errors && response.errors.length > 0 && (
                      <div className={`p-3 border rounded-lg space-y-1 ${
                        isDark ? "bg-rose-500/10 border-rose-500/20" : "bg-rose-50 border-rose-200"
                      }`}>
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-500">
                          <TriangleAlert size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Errors</span>
                        </div>
                        {response.errors.map((error, i) => (
                          <p key={i} className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                            {error}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {!("status" in response ||
                  "ingested" in response ||
                  "failed" in response ||
                  "errors" in response ||
                  "warnings" in response) && (
                  <pre className={`text-[11px] font-mono p-3 rounded-lg border ${
                    isDark ? 'text-zinc-500 bg-zinc-900/50 border-white/5' : 'text-zinc-600 bg-zinc-50 border-zinc-200'
                  }`}>
                    {JSON.stringify(response, null, 2)}
                  </pre>
                )}
              </motion.div>
            ) : (
              <div className={`border border-dashed rounded-xl p-12 flex flex-col items-center text-center transition-all ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
                  <Terminal size={20} className="text-zinc-500" />
                </div>
                <p className="text-xs text-zinc-500">No response to show. Send a payload to see the API output.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
