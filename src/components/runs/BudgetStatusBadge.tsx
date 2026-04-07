import React from "react";
import { OctagonX, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { BudgetThreshold } from "../../lib/api";

interface BudgetStatusBadgeProps {
  threshold: BudgetThreshold;
  className?: string;
}

const THRESHOLD_CONFIG: Record<
  BudgetThreshold,
  { bg: string; text: string; border: string; icon: React.ElementType; label: string }
> = {
  OK: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
    label: "OK",
  },
  WARNING: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    border: "border-amber-500/20",
    icon: AlertCircle,
    label: "Warning",
  },
  CRITICAL: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    border: "border-orange-500/20",
    icon: AlertTriangle,
    label: "Critical",
  },
  HARD_STOP: {
    bg: "bg-rose-500/10",
    text: "text-rose-600",
    border: "border-rose-500/20",
    icon: OctagonX,
    label: "Hard Stop",
  },
};

export const BudgetStatusBadge: React.FC<BudgetStatusBadgeProps> = ({
  threshold,
  className = "",
}) => {
  const config = THRESHOLD_CONFIG[threshold] ?? THRESHOLD_CONFIG.OK;
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <Icon size={12} />
      <span>{config.label}</span>
    </div>
  );
};
