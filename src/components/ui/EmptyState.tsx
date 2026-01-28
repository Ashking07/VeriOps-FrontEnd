import React from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isDark: boolean;
  children?: React.ReactNode;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  isDark,
  children,
}) => (
  <div
    className={`border border-dashed rounded-xl p-12 flex flex-col items-center text-center transition-all ${
      isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
    }`}
  >
    <h3 className={`text-sm font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
      {title}
    </h3>
    <p className="text-xs text-zinc-500 mt-2 max-w-sm">{description}</p>
    {children && <div className="mt-4 w-full max-w-sm">{children}</div>}
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className={`mt-5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          isDark
            ? "bg-white text-zinc-950 hover:bg-zinc-200"
            : "bg-zinc-900 text-white hover:bg-zinc-800"
        }`}
      >
        {actionLabel}
      </button>
    )}
  </div>
);
