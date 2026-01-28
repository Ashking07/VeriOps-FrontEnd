import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  Filter,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusPill } from "../ui/StatusPill";
import { Skeleton } from "../ui/skeleton";
import { EmptyState } from "../ui/EmptyState";
import { deleteRun, getProjectRuns, Run } from "../../lib/api";
import { DATE_RANGE_LABELS, useAppStore } from "../../store/appStore";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { useOutsideClick } from "../../hooks/useOutsideClick";

type RunsPageProps = {
  theme: "dark" | "light";
};

type SortOption = "newest" | "oldest" | "tokens" | "cost";

export const RunsPage: React.FC<RunsPageProps> = ({ theme }) => {
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const { selectedProjectId, dateRange, setDateRange } = useAppStore();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const limit = 10;
  const offset = (page - 1) * limit;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [hasValidation, setHasValidation] = useState(false);
  const [runbookFilter, setRunbookFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedRunForDelete, setSelectedRunForDelete] = useState<Run | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.classList.toggle("modal-open", deleteModalOpen);
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [deleteModalOpen]);
  const hasFilters =
    statusFilter !== "all" ||
    hasValidation ||
    runbookFilter !== "all" ||
    searchQuery.length > 0 ||
    dateRange !== "24h";

  const resetFilters = () => {
    setStatusFilter("all");
    setHasValidation(false);
    setRunbookFilter("all");
    setDateRange("24h");
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params);
      nextParams.delete("q");
      return nextParams;
    });
  };

  useEffect(() => {
    setPage(1);
  }, [selectedProjectId, searchQuery, statusFilter, hasValidation, runbookFilter, sortBy, dateRange]);

  const runsQueryKey = ["project-runs", selectedProjectId, limit, offset] as const;

  const runsQuery = useQuery({
    queryKey: runsQueryKey,
    queryFn: () => getProjectRuns(selectedProjectId ?? "", limit, offset),
    enabled: !!selectedProjectId,
  });

  const deleteMutation = useMutation({
    mutationFn: (runId: string) => deleteRun(runId),
    onMutate: async (runId) => {
      await queryClient.cancelQueries({ queryKey: runsQueryKey });
      const previous = queryClient.getQueryData<typeof runsQuery.data>(runsQueryKey);
      if (previous?.runs) {
        queryClient.setQueryData(runsQueryKey, {
          ...previous,
          runs: previous.runs.filter((run) => run.id !== runId),
          total: typeof previous.total === "number" ? Math.max(0, previous.total - 1) : previous.total,
        });
      }
      return { previous };
    },
    onError: (_error, _runId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(runsQueryKey, context.previous);
      }
      toast.error("Failed to delete run");
    },
    onSuccess: () => {
      toast.success("Run deleted");
      queryClient.invalidateQueries({ queryKey: ["project-runs", selectedProjectId] });
      if (filteredRuns.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      }
    },
  });

  const runs = runsQuery.data?.runs ?? [];

  const runbookOptions = useMemo(() => {
    const runbooks = new Set<string>();
    runs.forEach((run) => {
      if (run.runbook) {
        runbooks.add(run.runbook);
      }
    });
    return Array.from(runbooks);
  }, [runs]);

  const filteredRuns = useMemo(() => {
    let filtered = [...runs];

    if (searchQuery) {
      const needle = searchQuery.toLowerCase();
      filtered = filtered.filter((run) => {
        return run.id.toLowerCase().includes(needle);
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((run) => run.status === statusFilter);
    }

    if (hasValidation) {
      filtered = filtered.filter(
        (run) => (run.validation_status ?? run.latest_validation_status ?? "none") !== "none"
      );
    }

    if (runbookFilter !== "all") {
      filtered = filtered.filter((run) => (run.runbook ?? "none") === runbookFilter);
    }

    const now = new Date();
    const cutoff =
      dateRange === "24h"
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : dateRange === "7d"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    filtered = filtered.filter((run) => {
      if (!run.started_at) return true;
      return new Date(run.started_at) >= cutoff;
    });

    const byNumber = (value?: number) => (typeof value === "number" ? value : 0);
    const byDate = (value?: string) => (value ? new Date(value).getTime() : 0);

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "tokens":
          return byNumber(b.tokens) - byNumber(a.tokens);
        case "cost":
          return byNumber(b.cost) - byNumber(a.cost);
        case "oldest":
          return byDate(a.started_at) - byDate(b.started_at);
        case "newest":
        default:
          return byDate(b.started_at) - byDate(a.started_at);
      }
    });

    return filtered;
  }, [runs, searchQuery, statusFilter, hasValidation, runbookFilter, sortBy, dateRange]);

  const totalFromApi = runsQuery.data?.total;
  const pageStart = offset + 1;
  const pageEnd = offset + (filteredRuns.length || runs.length);
  const hasNextPage =
    typeof totalFromApi === "number"
      ? pageEnd < totalFromApi
      : runs.length === limit;
  const totalPages =
    typeof totalFromApi === "number"
      ? Math.max(1, Math.ceil(totalFromApi / limit))
      : page + (hasNextPage ? 1 : 0);
  const pageButtons =
    typeof totalFromApi === "number"
      ? [page, page + 1, page + 2].filter((value) => value <= totalPages)
      : hasNextPage
      ? [page, page + 1]
      : [page];

  return (
    <div className="max-w-full space-y-6">
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedRunForDelete(null);
        }}
        onConfirm={() => {
          if (!selectedRunForDelete) return;
          deleteMutation.mutate(selectedRunForDelete.id);
          setDeleteModalOpen(false);
          setSelectedRunForDelete(null);
        }}
        runId={selectedRunForDelete?.id ?? "this run"}
        isDark={isDark}
        isLoading={deleteMutation.isPending}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Runs</h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="text"
              placeholder="Filter by run ID..."
              value={searchQuery}
              onChange={(event) => {
                const next = event.target.value;
                setSearchParams((params) => {
                  const nextParams = new URLSearchParams(params);
                  if (next) {
                    nextParams.set("q", next);
                  } else {
                    nextParams.delete("q");
                  }
                  return nextParams;
                });
              }}
              className={`border rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-full md:w-64 transition-all ${
                isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-sm"
              }`}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-sm"
                }`}
              >
                <Filter size={14} />
                Filters
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className={`w-72 border rounded-xl p-4 shadow-xl ${
                isDark ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
              }`}
            >
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs ${
                      isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
                    }`}
                  >
                    <option value="all">All Statuses</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="warning">Warning</option>
                    <option value="running">Running</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Runbook</span>
                  <select
                    value={runbookFilter}
                    onChange={(event) => setRunbookFilter(event.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs ${
                      isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
                    }`}
                  >
                    <option value="all">All runbooks</option>
                    <option value="none">None</option>
                    {runbookOptions.map((runbook) => (
                      <option key={runbook} value={runbook}>
                        {runbook}
                      </option>
                    ))}
                  </select>
                </div>
                <label className={`flex items-center gap-2 text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                  <input
                    type="checkbox"
                    checked={hasValidation}
                    onChange={(event) => setHasValidation(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-400"
                  />
                  Has validation
                </label>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sort</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs ${
                      isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
                    }`}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="tokens">Most tokens</option>
                    <option value="cost">Highest cost</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date range</span>
                  <select
                    value={dateRange}
                    onChange={(event) => setDateRange(event.target.value as typeof dateRange)}
                    className={`w-full border rounded-lg px-3 py-2 text-xs ${
                      isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
                    }`}
                  >
                    {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div
        className={`border rounded-2xl overflow-hidden transition-all ${
        isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
      }`}
      >
        {runsQuery.isLoading ? (
          <div className="p-6">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : runsQuery.isError ? (
          <div className="p-6 text-sm text-rose-500">Failed to load runs.</div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-6">
            {page > 1 && runs.length === 0 ? (
              <EmptyState
                title="No runs on this page"
                description="Try going back or adjust filters."
                actionLabel="Previous page"
                onAction={() => setPage((prev) => Math.max(1, prev - 1))}
                isDark={isDark}
              />
            ) : runs.length > 0 && hasFilters ? (
              <EmptyState
                title="No runs match filters"
                description="Try clearing filters or widening the date range."
                actionLabel="Clear filters"
                onAction={resetFilters}
                isDark={isDark}
              />
            ) : (
              <EmptyState
                title="No runs yet"
                description="Send your first trace to see run activity."
                actionLabel="Send test run"
                onAction={() => navigate("/ingest")}
                isDark={isDark}
              >
                <div className="text-left text-xs text-zinc-500 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                    Configure API key + base URL
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                    Send a test run via Ingest
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                    Validate a runbook
                  </div>
                </div>
              </EmptyState>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className={`border-b ${isDark ? "bg-zinc-950/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                  <tr>
                    <th className="px-5 py-4 w-10"></th>
                    <th className="px-5 py-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Run ID <ArrowUpDown size={10} />
                      </div>
                    </th>
                    <th className="px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Project</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Validation</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Tokens</th>
                    <th className="px-5 py-4 pr-12 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">Cost</th>
                    <th className="px-5 py-4 pl-10 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Started</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-zinc-800" : "divide-zinc-200"}`}>
                  {filteredRuns.map((run: Run) => (
                    <tr
                      key={run.id}
                      className={`transition-colors cursor-pointer group ${isDark ? "hover:bg-zinc-800/30" : "hover:bg-zinc-50"}`}
                      onClick={(event) => {
                        const target = event.target as HTMLElement | null;
                        if (event.defaultPrevented || target?.closest("[data-row-action='true']")) {
                          return;
                        }
                        navigate(`/runs/${run.id}`);
                      }}
                    >
                      <td className="px-2 py-4 text-center">
                        <ActionMenu
                          run={run}
                          isDark={isDark}
                          onDelete={() => {
                            setSelectedRunForDelete(run);
                            setDeleteModalOpen(true);
                          }}
                          onValidate={() => {
                            toast.info(`Validation started for ${run.id}...`, {
                              description: "Tracing run against Core Guardrails v1.4.2",
                            });
                          }}
                        />
                      </td>
                      <td
                        className={`px-5 py-4 font-mono text-xs transition-colors ${
                          isDark ? "text-zinc-300 group-hover:text-blue-400" : "text-zinc-600 group-hover:text-blue-600"
                        }`}
                      >
                        {run.id}
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-500">{run.project ?? "—"}</td>
                      <td className="px-5 py-4">
                        <StatusPill status={run.status} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={run.validation_status ?? run.latest_validation_status ?? "none"} />
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-zinc-500 text-right">{run.tokens ?? "—"}</td>
                      <td className="px-5 py-4 pr-12 text-xs font-mono text-zinc-500 text-right">{run.cost ?? "—"}</td>
                      <td className="px-5 py-4 pl-10 text-xs text-zinc-500">{run.started_at ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
              <p className="text-xs text-zinc-500">
                {typeof totalFromApi === "number"
                  ? `Showing ${pageStart}-${pageEnd} of ${totalFromApi} runs`
                  : `Showing ${filteredRuns.length} runs`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className={`p-1.5 border rounded-lg ${
                    isDark ? "bg-zinc-800 border-zinc-700" : "bg-zinc-50 border-zinc-200"
                  } ${page === 1 ? "text-zinc-500 cursor-not-allowed" : "text-zinc-300 hover:text-white"}`}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {pageButtons.map((value) => (
                    <button
                      key={value}
                      onClick={() => setPage(value)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        value === page
                          ? isDark
                            ? "bg-white text-zinc-950"
                            : "bg-zinc-900 text-white shadow-sm"
                          : isDark
                          ? "hover:bg-zinc-800 text-zinc-500"
                          : "hover:bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage((prev) => (hasNextPage ? prev + 1 : prev))}
                  disabled={!hasNextPage}
                  className={`p-1.5 border rounded-lg transition-colors ${
                    isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white" : "bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 shadow-sm"
                  } ${!hasNextPage ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
type DeleteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  runId: string;
  isDark: boolean;
  isLoading: boolean;
};

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  runId,
  isDark,
  isLoading,
}) => {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.72)" }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(event) => event.stopPropagation()}
          className={`relative w-full max-w-md border rounded-2xl shadow-2xl px-8 py-6 transition-all ${
            isDark
              ? "bg-zinc-950 border-zinc-800 text-zinc-200"
              : "bg-white border-zinc-200 text-zinc-900"
          }`}
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-lg font-bold">Delete Run</h2>
          </div>

          <p className={`text-sm mb-7 leading-relaxed ${isDark ? "text-zinc-400" : "text-zinc-700"}`}>
            Are you sure you want to delete run{" "}
            <span className="font-mono font-bold text-blue-500">{runId}</span>? This action
            cannot be undone and all associated trace data will be permanently removed.
          </p>

          <div className="flex justify-end items-center gap-4">
            <button
              onClick={onClose}
              className={`text-xs font-bold transition-colors ${
                isDark ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg text-xs font-bold transition-all shadow-sm border border-rose-500/20 ${
                isDark
                  ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/10"
                  : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/10"
              } disabled:opacity-60`}
            >
              {isLoading ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

type ActionMenuProps = {
  run: Run;
  onValidate: () => void;
  onDelete: () => void;
  isDark: boolean;
};

const ActionMenu: React.FC<ActionMenuProps> = ({ run, onValidate, onDelete, isDark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        data-row-action="true"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-lg transition-colors ${
          isDark ? "text-zinc-500 hover:text-white hover:bg-zinc-800" : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
        }`}
      >
        <MoreHorizontal size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={`absolute left-0 top-full mt-2 w-48 rounded-xl border shadow-2xl z-20 py-1.5 overflow-hidden transition-all ${
              isDark
                ? "bg-zinc-900 border-zinc-800 text-zinc-200"
                : "bg-white border-zinc-200 text-zinc-900"
            }`}
          >
            <button
              type="button"
              data-row-action="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsOpen(false);
                onValidate();
              }}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                isDark ? "text-zinc-200 hover:bg-zinc-800" : "text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              <ShieldCheck size={14} className="text-blue-500" />
              Validate run
            </button>
            <div className={`my-1 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`} />
            <button
              type="button"
              data-row-action="true"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={14} />
              Delete run
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
