export type HealthResponse = {
  status: "ok";
  db: "ok" | "degraded";
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
};

export type ProjectSummary = {
  total_runs?: number;
  last_run_at?: string | null;
  status_counts?: Record<string, number>;
  latest_validation_id?: string | null;
  latest_validation_status?: "passed" | "failed" | null;
  latest_validation_at?: string | null;
};

export type RunStep = {
  index: number;
  name: string;
  tool: string;
  status: "passed" | "failed" | "warning" | "running" | "error";
  latency_ms?: number;
  tokens?: number;
  cost?: number;
  input_json?: Record<string, unknown>;
  output_json?: Record<string, unknown>;
};

export type BackendRun = {
  id: string;
  project_id: string;
  runbook: string | null;
  status: "passed" | "failed" | "error" | "running" | "warning";
  started_at: string;
  ended_at: string | null;
  total_tokens: number;
  total_cost_usd: number;
  latest_validation_id: string | null;
  latest_validation_status: "passed" | "failed" | null;
  latest_validation_at: string | null;
};

export type BackendRunStep = {
  id?: string;
  step_id?: string;
  index: number;
  name: string;
  tool: string;
  status: "passed" | "failed" | "warning" | "running" | "error";
  latency_ms?: number;
  tokens?: number;
  cost_usd?: number;
  input_json?: Record<string, unknown>;
  output_json?: Record<string, unknown>;
  started_at?: string;
  ended_at?: string | null;
};

export type BackendRunDetail = BackendRun & {
  steps?: BackendRunStep[];
};

export type Run = {
  id: string;
  project_id?: string;
  project?: string;
  runbook?: string | null;
  status: "passed" | "failed" | "warning" | "running" | "error";
  started_at?: string;
  ended_at?: string;
  duration_ms?: number;
  tokens?: number;
  cost?: number;
  validation_status?: "passed" | "failed" | "warning" | "none";
  latest_validation_status?: "passed" | "failed" | "warning" | "none";
  latest_validation_at?: string;
  steps?: RunStep[];
};

export type RunsResponse = {
  runs: Run[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type ValidationFinding = {
  code?: string;
  msg?: string;
  status?: "passed" | "failed" | "warning";
};

export type RunValidation = {
  id?: string;
  status: "passed" | "failed" | "warning";
  created_at?: string;
  findings?: ValidationFinding[];
  warnings?: string[];
  errors?: string[];
};

export type RunValidationsResponse = {
  validations: RunValidation[];
};

export type ValidateRunResponse = RunValidation & {
  run_id?: string;
};

export type EventType = "run.start" | "run.end" | "step.start" | "step.end";

export type BaseEvent = {
  type: EventType;
  run_id: string;
  ts: string;
};

export type RunStartEvent = BaseEvent & {
  type: "run.start";
  project_id: string;
  runbook?: string;
};

export type RunEndEvent = BaseEvent & {
  type: "run.end";
  totals: {
    tokens?: number;
    cost_usd?: number;
  };
};

export type StepStartEvent = BaseEvent & {
  type: "step.start";
  step_id: string;
  index: number;
  name: string;
  tool: string;
  input: Record<string, unknown>;
};

export type StepEndEvent = BaseEvent & {
  type: "step.end";
  step_id: string;
  output: Record<string, unknown>;
  latency_ms?: number;
  tokens?: number;
  cost_usd?: number;
  status: "ok" | "error";
};

export type Event = RunStartEvent | RunEndEvent | StepStartEvent | StepEndEvent;

export type IngestRequest = {
  events: Event[];
};

export type IngestEventsResponse = {
  status?: number | string;
  ingested?: number | boolean;
  failed?: number;
  errors?: string[];
  warnings?: string[];
  run_id?: string;
};

type ApiErrorBody = Record<string, unknown> | string | null;

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(message: string, status: number, body: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeRun = (run: BackendRun): Run => ({
  id: run.id,
  project_id: run.project_id,
  project: run.project_id,
  runbook: run.runbook ?? null,
  status: run.status as Run["status"],
  started_at: run.started_at,
  ended_at: run.ended_at ?? undefined,
  tokens: run.total_tokens,
  cost: run.total_cost_usd,
  validation_status: (run.latest_validation_status ?? "none") as Run["validation_status"],
  latest_validation_status: (run.latest_validation_status ?? "none") as Run["latest_validation_status"],
  latest_validation_at: run.latest_validation_at ?? undefined,
});

const normalizeRunDetail = (run: BackendRunDetail): Run => ({
  ...normalizeRun(run),
  steps: (run.steps ?? []).map((step) => ({
    index: step.index,
    name: step.name,
    tool: step.tool,
    status: step.status,
    latency_ms: step.latency_ms,
    tokens: step.tokens,
    cost: step.cost_usd,
    input_json: step.input_json,
    output_json: step.output_json,
  })),
});

const coerceProject = (value: unknown): Project | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = (value.id ?? value.project_id) as string | undefined;
  const name = (value.name ?? value.project_name ?? id) as string | undefined;
  if (!id) {
    return null;
  }
  return {
    id,
    name: name ?? id,
    description: value.description as string | undefined,
    created_at: value.created_at as string | undefined,
  };
};

const normalizeProjects = (data: unknown): Project[] => {
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string") {
          return { id: item, name: item } satisfies Project;
        }
        return coerceProject(item);
      })
      .filter((item): item is Project => item !== null);
  }
  if (isRecord(data)) {
    const list = (data.projects ?? data.items ?? data.data ?? data.results) as
      | unknown[]
      | undefined;
    if (Array.isArray(list)) {
      return normalizeProjects(list);
    }
  }
  return [];
};

const normalizeRunsResponse = (data: unknown): RunsResponse => {
  const coerceList = (list: unknown[]): Run[] =>
    list
      .map((item) => item as BackendRun)
      .filter((run) => run && typeof run.id === "string" && typeof run.project_id === "string")
      .map(normalizeRun);

  if (Array.isArray(data)) {
    return { runs: coerceList(data) };
  }
  if (isRecord(data)) {
    const raw = (data.runs ?? data.items ?? data.data ?? data.results) as unknown[] | undefined;
    if (Array.isArray(raw)) {
      return {
        runs: coerceList(raw),
        total: typeof data.total === "number" ? data.total : undefined,
        limit: typeof data.limit === "number" ? data.limit : undefined,
        offset: typeof data.offset === "number" ? data.offset : undefined,
      };
    }
  }
  return { runs: [] };
};

const env = (import.meta as unknown as { env: Record<string, string | boolean | undefined> }).env;
const RAW_API_BASE_URL =
  (env.VITE_API_BASE_URL as string | undefined) ??
  (env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ??
  "";

const API_BASE_URL =
  env.DEV &&
  RAW_API_BASE_URL &&
  (RAW_API_BASE_URL.includes("localhost") || RAW_API_BASE_URL.includes("127.0.0.1"))
    ? "/api"
    : RAW_API_BASE_URL;

const API_KEY =
  (env.VITE_VERIOPS_API_KEY as string | undefined) ??
  (env.NEXT_PUBLIC_VERIOPS_API_KEY as string | undefined) ??
  (env.DEV ? "dev-key" : "");

const INCLUDE_API_KEY_FOR_HEALTH =
  (env.VITE_HEALTH_INCLUDE_API_KEY as string | undefined) ??
  (env.NEXT_PUBLIC_HEALTH_INCLUDE_API_KEY as string | undefined) ??
  "false";

let hasWarnedMissingBaseUrl = false;
if (!RAW_API_BASE_URL && !hasWarnedMissingBaseUrl) {
  console.warn(
    "[VeriOps] API base URL is not set. Define VITE_API_BASE_URL to enable backend calls."
  );
  hasWarnedMissingBaseUrl = true;
}

const buildUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!API_BASE_URL) {
    return path;
  }
  if (API_BASE_URL.startsWith("/")) {
    const normalizedBase = API_BASE_URL.replace(/\/$/, "");
    return `${normalizedBase}${path}`;
  }
  return new URL(path, API_BASE_URL).toString();
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return text;
};

const apiFetch = async <T>(
  path: string,
  init?: RequestInit,
  options?: { includeApiKey?: boolean }
): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const includeApiKey = options?.includeApiKey ?? true;
  if (includeApiKey && API_KEY) {
    headers.set("x-api-key", API_KEY);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  const body = (await parseResponseBody(response)) as ApiErrorBody;
  if (!response.ok) {
    const message = `API request failed (${response.status})`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
};

export const getHealth = () =>
  apiFetch<HealthResponse>("/health", undefined, {
    includeApiKey: INCLUDE_API_KEY_FOR_HEALTH === "true",
  });

export const getProjects = async (): Promise<Project[]> => {
  const data = await apiFetch<unknown>("/v1/projects");
  return normalizeProjects(data);
};

export const getProjectSummary = (projectId: string, limit: number) =>
  apiFetch<ProjectSummary>(`/v1/projects/${projectId}/summary?limit=${limit}`);

export const getProjectRuns = async (projectId: string, limit: number, offset: number) => {
  const data = await apiFetch<unknown>(`/v1/projects/${projectId}/runs?limit=${limit}&offset=${offset}`);
  return normalizeRunsResponse(data);
};

export const getRuns = async (params: { projectId?: string; limit: number; offset: number }) => {
  const searchParams = new URLSearchParams();
  if (params.projectId) {
    searchParams.set("project_id", params.projectId);
  }
  searchParams.set("limit", String(params.limit));
  searchParams.set("offset", String(params.offset));
  const data = await apiFetch<unknown>(`/v1/runs?${searchParams.toString()}`);
  return normalizeRunsResponse(data);
};

export const getRun = async (runId: string) => {
  const data = await apiFetch<BackendRunDetail>(`/v1/runs/${runId}`);
  return normalizeRunDetail(data);
};

export const getRunValidations = (runId: string, limit: number) =>
  apiFetch<RunValidationsResponse>(`/v1/runs/${runId}/validations?limit=${limit}`);

export const validateRun = (runId: string, runbookYaml: string) =>
  apiFetch<ValidateRunResponse>(`/v1/runs/${runId}/validate`, {
    method: "POST",
    body: JSON.stringify({ runbook_yaml: runbookYaml }),
  });

export const deleteRun = (runId: string) =>
  apiFetch<void>(`/v1/runs/${runId}`, {
    method: "DELETE",
  });

export const ingestEvents = (body: IngestRequest) =>
  apiFetch<IngestEventsResponse>("/v1/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
