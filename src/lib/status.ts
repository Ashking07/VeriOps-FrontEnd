import {
  CircleCheck,
  CircleX,
  CircleAlert,
  Loader,
  TriangleAlert,
} from "lucide-react";

export type StatusType =
  | "passed"
  | "failed"
  | "error"
  | "running"
  | "healthy"
  | "degraded"
  | "none"
  | "warning";

export const STATUS_CONFIG: Record<
  StatusType,
  { bg: string; text: string; icon: typeof CircleCheck; label?: string }
> = {
  passed: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-500",
    icon: CircleCheck,
  },
  healthy: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-500",
    icon: CircleCheck,
  },
  failed: {
    bg: "bg-rose-500/10 dark:bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-500",
    icon: CircleX,
  },
  error: {
    bg: "bg-rose-500/10 dark:bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-500",
    icon: CircleX,
  },
  degraded: {
    bg: "bg-amber-500/10 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-500",
    icon: TriangleAlert,
  },
  running: {
    bg: "bg-blue-500/10 dark:bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-500",
    icon: Loader,
  },
  warning: {
    bg: "bg-amber-500/10 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-500",
    icon: TriangleAlert,
  },
  none: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-600 dark:text-zinc-400",
    icon: CircleAlert,
  },
};
