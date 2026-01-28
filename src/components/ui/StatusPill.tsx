import React from "react";
import { STATUS_CONFIG, StatusType } from "../../lib/status";

interface StatusPillProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  className = "",
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-black/5 dark:border-white/5 ${config.bg} ${config.text} ${className}`}>
      <Icon size={12} className={status === 'running' ? 'animate-spin' : ''} />
      <span className="capitalize">{label || status}</span>
    </div>
  );
};
