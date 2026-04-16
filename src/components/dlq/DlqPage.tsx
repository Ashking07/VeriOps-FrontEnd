import React, { useState } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, CheckSquare, Square } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDlqMessages, replayDlqMessages, DlqMessage } from "../../lib/api";
import { useAppStore } from "../../store/appStore";
import { CopyButton } from "../ui/CopyButton";
import { StatusPill } from "../ui/StatusPill";

type DlqPageProps = {
  theme: "dark" | "light";
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
};

export const DlqPage: React.FC<DlqPageProps> = ({ theme }) => {
  const isDark = theme === "dark";
  const { selectedProjectId } = useAppStore();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [latestN, setLatestN] = useState<string>("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["dlq", selectedProjectId],
    queryFn: () => getDlqMessages(selectedProjectId ?? ""),
    enabled: !!selectedProjectId,
  });

  const messages: DlqMessage[] = data?.messages ?? [];

  const replayMutation = useMutation({
    mutationFn: replayDlqMessages,
    onSuccess: (result) => {
      const n = result.replayed ?? 0;
      const f = result.failed ?? 0;
      if (f > 0) {
        toast.warning(`Replayed ${n} message${n !== 1 ? "s" : ""}, ${f} failed.`);
      } else {
        toast.success(`Replayed ${n} message${n !== 1 ? "s" : ""} successfully.`);
      }
      setSelected(new Set());
      setLatestN("");
      queryClient.invalidateQueries({ queryKey: ["dlq", selectedProjectId] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Replay failed.";
      toast.error(msg);
    },
  });

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selected.size === messages.length && messages.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(messages.map((m) => m.id)));
    }
  };

  const handleReplaySelected = () => {
    if (selected.size === 0) return;
    replayMutation.mutate({
      project_id: selectedProjectId ?? "",
      message_ids: Array.from(selected),
    });
  };

  const handleReplayLatestN = () => {
    const n = parseInt(latestN, 10);
    if (!n || n < 1) {
      toast.error("Enter a valid number of messages to replay.");
      return;
    }
    replayMutation.mutate({
      project_id: selectedProjectId ?? "",
      latest_n: n,
    });
  };

  const allSelected = messages.length > 0 && selected.size === messages.length;
  const someSelected = selected.size > 0 && selected.size < messages.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? "bg-rose-500/10" : "bg-rose-50"}`}>
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
              Dead Letter Queue
            </h1>
            <p className={`text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
              Failed messages awaiting review and replay
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            isDark
              ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
              : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          }`}
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Replay controls */}
      <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border ${
        isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-200"
      }`}>
        {selected.size > 0 ? (
          <button
            onClick={handleReplaySelected}
            disabled={replayMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
          >
            <RotateCcw size={13} className={replayMutation.isPending ? "animate-spin" : ""} />
            Replay Selected ({selected.size})
          </button>
        ) : (
          <button
            disabled
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-not-allowed ${
              isDark ? "bg-zinc-800 text-zinc-600" : "bg-zinc-200 text-zinc-400"
            }`}
          >
            <RotateCcw size={13} />
            Replay Selected
          </button>
        )}

        <div className={`h-5 w-px ${isDark ? "bg-zinc-700" : "bg-zinc-300"}`} />

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={latestN}
            onChange={(e) => setLatestN(e.target.value)}
            placeholder="e.g. 10"
            className={`w-24 px-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-rose-500/50 transition-all ${
              isDark
                ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600"
                : "bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400"
            }`}
          />
          {latestN && !replayMutation.isPending ? (
            <button
              onClick={handleReplayLatestN}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-amber-500 text-white hover:bg-amber-600"
            >
              <RotateCcw size={13} />
              Replay Latest N
            </button>
          ) : (
            <button
              disabled
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-not-allowed ${
                isDark ? "bg-zinc-800 text-zinc-600" : "bg-zinc-200 text-zinc-400"
              }`}
            >
              <RotateCcw size={13} className={replayMutation.isPending ? "animate-spin" : ""} />
              Replay Latest N
            </button>
          )}
        </div>

        {messages.length > 0 && (
          <>
            <div className={`h-5 w-px ${isDark ? "bg-zinc-700" : "bg-zinc-300"}`} />
            <span className={`text-xs ${isDark ? "text-zinc-500" : "text-zinc-500"}`}>
              {messages.length} message{messages.length !== 1 ? "s" : ""} in queue
            </span>
          </>
        )}
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
        {isLoading ? (
          <div className={`p-8 text-center text-sm ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
            Loading messages...
          </div>
        ) : isError ? (
          <div className={`p-8 text-center text-sm text-rose-500`}>
            Failed to load DLQ messages. Check your permissions or try again.
          </div>
        ) : messages.length === 0 ? (
          <div className={`p-12 flex flex-col items-center gap-3 ${isDark ? "bg-zinc-900/30" : "bg-zinc-50"}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? "bg-zinc-800" : "bg-zinc-100"}`}>
              <AlertTriangle size={22} className={isDark ? "text-zinc-600" : "text-zinc-400"} />
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>No failed messages</p>
            <p className={`text-xs ${isDark ? "text-zinc-600" : "text-zinc-400"}`}>
              The dead letter queue is empty for this project.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <colgroup>
                <col className="w-10" />
                <col className="w-32" />
                <col className="w-36" />
                <col />
                <col className="w-24" />
                <col className="w-16" />
                <col className="w-40" />
              </colgroup>
              <thead>
                <tr className={`border-b ${isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200"}`}>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={handleToggleAll}
                      className={`transition-colors ${isDark ? "text-zinc-500 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}`}
                      aria-label="Select all"
                    >
                      {allSelected ? (
                        <CheckSquare size={15} className="text-rose-500" />
                      ) : someSelected ? (
                        <CheckSquare size={15} className={isDark ? "text-zinc-500" : "text-zinc-400"} />
                      ) : (
                        <Square size={15} />
                      )}
                    </button>
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold uppercase tracking-widest text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    Message ID
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold uppercase tracking-widest text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    Event Type
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold uppercase tracking-widest text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    Error
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold uppercase tracking-widest text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    Status
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold uppercase tracking-widest text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    Retries
                  </th>
                  <th className={`px-4 py-3 text-left font-semibold uppercase tracking-widest text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}>
                    Failed At
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-zinc-800/60" : "divide-zinc-100"}`}>
                {messages.map((msg) => {
                  const isChecked = selected.has(msg.id);
                  return (
                    <tr
                      key={msg.id}
                      onClick={() => handleToggle(msg.id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked
                          ? isDark ? "bg-rose-500/5" : "bg-rose-50"
                          : isDark ? "hover:bg-zinc-900/40" : "hover:bg-zinc-50"
                      }`}
                    >
                      <td className="px-4 py-3">
                        {isChecked ? (
                          <CheckSquare size={15} className="text-rose-500" />
                        ) : (
                          <Square size={15} className={isDark ? "text-zinc-600" : "text-zinc-400"} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`font-mono truncate ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                            {msg.id.slice(0, 10)}…
                          </span>
                          <CopyButton
                            value={msg.id}
                            copiedMessage="Copied"
                            iconSize={11}
                            className={`shrink-0 ${isDark ? "text-zinc-600 hover:text-zinc-400" : "text-zinc-400 hover:text-zinc-600"}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap ${
                          isDark ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-700"
                        }`}>
                          {msg.event_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="block truncate text-rose-400 font-mono text-[11px]"
                          title={msg.error}
                        >
                          {msg.error}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          status={msg.status === "failed" ? "failed" : msg.status === "error" ? "error" : "warning"}
                          label={msg.status ?? "failed"}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>
                          {msg.retry_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={isDark ? "text-zinc-500" : "text-zinc-400"}>
                          {formatDate(msg.created_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
