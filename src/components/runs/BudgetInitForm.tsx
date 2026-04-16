import React, { useState } from "react";
import { Wallet, Loader } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { setRunBudget } from "../../lib/api";

interface BudgetInitFormProps {
  runId: string;
  isDark: boolean;
}

const isValidHttpsWebhook = (value: string): boolean => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

export const BudgetInitForm: React.FC<BudgetInitFormProps> = ({ runId, isDark }) => {
  const queryClient = useQueryClient();
  const [tokenBudget, setTokenBudget] = useState("");
  const [costBudget, setCostBudget] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const trimmedWebhook = webhookUrl.trim();
  const webhookError =
    trimmedWebhook !== "" && !isValidHttpsWebhook(trimmedWebhook)
      ? "Webhook URL must start with https://"
      : null;

  const mutation = useMutation({
    mutationFn: () => {
      const parsedToken = parseInt(tokenBudget, 10);
      const parsedCost = parseFloat(costBudget);
      return setRunBudget(runId, {
        ...(tokenBudget !== "" && !isNaN(parsedToken) ? { token_budget: parsedToken } : {}),
        ...(costBudget !== "" && !isNaN(parsedCost) ? { cost_budget_usd: parsedCost } : {}),
        ...(trimmedWebhook ? { webhook_url: trimmedWebhook } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["run-budget", runId] });
      toast.success("Budget configured");
    },
    onError: () => {
      toast.error("Failed to set budget");
    },
  });

  const inputClass = `w-full border rounded-lg px-3 py-2 text-xs font-mono transition-all outline-none focus:ring-1 ${
    isDark
      ? "bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:ring-zinc-600"
      : "bg-white border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:ring-zinc-300 shadow-sm"
  }`;

  const labelClass = "text-[10px] font-bold text-zinc-500 uppercase tracking-widest";

  const canSubmit =
    (tokenBudget !== "" || costBudget !== "") &&
    !webhookError &&
    !mutation.isPending;

  return (
    <div
      className={`border rounded-2xl p-6 space-y-5 transition-all ${
        isDark ? "bg-zinc-900/50 border-zinc-800/50" : "bg-white border-zinc-200 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
          <Wallet size={16} />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Set Budget
          </h3>
          <p className="text-[11px] text-zinc-500">No budget configured for this run</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className={labelClass}>Token Budget</label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 10000"
            value={tokenBudget}
            onChange={(e) => setTokenBudget(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Cost Budget (USD)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 0.50"
            value={costBudget}
            onChange={(e) => setCostBudget(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Webhook URL <span className="normal-case font-normal text-zinc-400">(optional)</span></label>
          <input
            type="url"
            placeholder="https://..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className={inputClass}
            aria-invalid={webhookError ? true : undefined}
          />
          {webhookError ? (
            <p className="text-[11px] text-red-500">{webhookError}</p>
          ) : null}
        </div>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
          isDark
            ? "bg-white text-zinc-950 hover:bg-zinc-200"
            : "bg-zinc-900 text-white hover:bg-zinc-800"
        }`}
      >
        {mutation.isPending ? (
          <>
            <Loader size={13} className="animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Wallet size={13} />
            Set Budget
          </>
        )}
      </button>
    </div>
  );
};
