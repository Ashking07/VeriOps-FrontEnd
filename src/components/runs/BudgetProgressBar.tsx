import React from "react";
import { Zap } from "lucide-react";
import { BudgetThreshold, RunBudget } from "../../lib/api";

interface BudgetProgressBarProps {
  budget: RunBudget;
  isDark: boolean;
}

const thresholdBarColor: Record<BudgetThreshold, string> = {
  OK: "bg-emerald-500",
  WARNING: "bg-amber-500",
  CRITICAL: "bg-orange-500",
  HARD_STOP: "bg-rose-500",
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

const BarRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  used: number;
  total: number;
  pct: number;
  barColor: string;
  usedLabel: string;
  totalLabel: string;
  isDark: boolean;
}> = ({ icon, label, used, total, pct, barColor, usedLabel, totalLabel, isDark }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
        {icon}
        {label}
      </span>
      <span className={`text-[11px] font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
        {usedLabel}
        <span className="text-zinc-500"> / {totalLabel}</span>
      </span>
    </div>
    <div className={`relative h-2 rounded-full overflow-hidden ${isDark ? "bg-zinc-800" : "bg-zinc-200"}`}>
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
    <div className="flex justify-end">
      <span className="text-[10px] text-zinc-500">{pct.toFixed(1)}%</span>
    </div>
  </div>
);

export const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({ budget, isDark }) => {
  const threshold = budget.threshold ?? "OK";
  const barColor = thresholdBarColor[threshold];

  const tokensUsed = budget.tokens_used ?? 0;
  const tokenBudget = budget.token_budget ?? 0;
  const tokenPct = tokenBudget > 0 ? (tokensUsed / tokenBudget) * 100 : 0;

  const costUsed = budget.cost_used_usd ?? 0;
  const costBudget = budget.cost_budget_usd ?? 0;
  const costPct = costBudget > 0 ? (costUsed / costBudget) * 100 : 0;

  const hasTokenBudget = (budget.token_budget ?? null) !== null;
  const hasCostBudget = (budget.cost_budget_usd ?? null) !== null;

  if (!hasTokenBudget && !hasCostBudget) return null;

  return (
    <div className="space-y-4">
      {hasTokenBudget && (
        <BarRow
          icon={<Zap size={11} />}
          label="Token Budget"
          used={tokensUsed}
          total={tokenBudget}
          pct={tokenPct}
          barColor={barColor}
          usedLabel={tokensUsed.toLocaleString()}
          totalLabel={tokenBudget.toLocaleString()}
          isDark={isDark}
        />
      )}
      {hasCostBudget && (
        <BarRow
          icon={<DollarSign size={11} />}
          label="Cost Budget"
          used={costUsed}
          total={costBudget}
          pct={costPct}
          barColor={barColor}
          usedLabel={`$${costUsed.toFixed(4)}`}
          totalLabel={`$${costBudget.toFixed(4)}`}
          isDark={isDark}
        />
      )}
    </div>
  );
};
