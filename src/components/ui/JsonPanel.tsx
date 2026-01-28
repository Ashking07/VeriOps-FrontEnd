import React, { useMemo, useState } from "react";
import { CopyButton } from "./CopyButton";

type JsonPanelProps = {
  title: string;
  data: Record<string, unknown> | undefined;
  isDark: boolean;
  collapsible?: boolean;
};

export const JsonPanel: React.FC<JsonPanelProps> = ({
  title,
  data,
  isDark,
  collapsible = true,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const payload = useMemo(() => JSON.stringify(data ?? {}, null, 2), [data]);
  const isLong = payload.length > 900;
  const showToggle = collapsible && isLong;

  return (
    <div
      className={`flex-1 min-w-[300px] border rounded-lg overflow-hidden transition-all ${
        isDark ? "bg-zinc-950 border-zinc-800/50" : "bg-zinc-50 border-zinc-200"
      }`}
    >
      <div
        className={`px-4 py-2 border-b flex items-center justify-between ${
          isDark ? "border-zinc-800/50 bg-zinc-900/50" : "border-zinc-200 bg-zinc-100"
        }`}
      >
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {showToggle && (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300"
            >
              {collapsed ? "Show more" : "Show less"}
            </button>
          )}
          <CopyButton
            value={payload}
            className={`${isDark ? "text-zinc-600 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}`}
            iconSize={12}
          />
        </div>
      </div>
      <div className="p-4">
        <pre
          className={`text-[11px] font-mono overflow-x-auto whitespace-pre-wrap ${
            isDark ? "text-zinc-400" : "text-zinc-600"
          } ${collapsed && showToggle ? "max-h-40 overflow-y-hidden" : ""}`}
        >
          {payload}
        </pre>
      </div>
    </div>
  );
};
