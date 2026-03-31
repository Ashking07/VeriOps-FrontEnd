import React from "react";
import { MembershipPageState } from "../../lib/membershipAccess";

type MembershipStateProps = {
  state: MembershipPageState;
  theme: "dark" | "light";
};

const messageByState: Record<Exclude<MembershipPageState, "ok">, string> = {
  unauthorized: "Session expired. Please sign in again.",
  forbidden: "Insufficient permissions.",
  "not-found": "Requested resource was not found.",
  error: "Unable to load this view right now.",
};

export const MembershipState: React.FC<MembershipStateProps> = ({ state, theme }) => {
  if (state === "ok") {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <div
      className={`border rounded-xl p-4 text-sm ${
        isDark ? "bg-zinc-900 border-zinc-800 text-zinc-300" : "bg-white border-zinc-200 text-zinc-700"
      }`}
    >
      {messageByState[state]}
    </div>
  );
};
