import React from "react";
import { Membership } from "../../lib/api";

type MembershipTableProps = {
  memberships: Membership[];
  canManage: boolean;
  theme: "dark" | "light";
  onUpdateRole: (userId: string, role: string) => void;
  onRemove: (userId: string) => void;
};

const roleOptions = ["viewer", "editor", "admin"];

export const MembershipTable: React.FC<MembershipTableProps> = ({
  memberships,
  canManage,
  theme,
  onUpdateRole,
  onRemove,
}) => {
  const isDark = theme === "dark";

  return (
    <div
      className={`border rounded-2xl overflow-hidden ${
        isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
      }`}
    >
      <table className="w-full text-left">
        <thead className={`border-b ${isDark ? "border-zinc-800 bg-zinc-950/50" : "border-zinc-200 bg-zinc-50"}`}>
          <tr>
            <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">User</th>
            <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Role</th>
            {canManage && (
              <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? "divide-zinc-800" : "divide-zinc-200"}`}>
          {memberships.map((membership) => (
            <tr key={membership.user_id}>
              <td className="px-4 py-3 text-xs text-zinc-500">
                {membership.email ?? membership.username ?? membership.user_id}
              </td>
              <td className="px-4 py-3">
                {canManage ? (
                  <select
                    value={membership.role ?? "viewer"}
                    onChange={(event) => onUpdateRole(membership.user_id, event.target.value)}
                    className={`text-xs border rounded-md px-2 py-1 ${
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                        : "bg-white border-zinc-200 text-zinc-700"
                    }`}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-zinc-500 capitalize">{membership.role ?? "viewer"}</span>
                )}
              </td>
              {canManage && (
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onRemove(membership.user_id)}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
