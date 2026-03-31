import React from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProjectRuns, getProjectSummary } from "../../lib/api";
import { MembershipState } from "../memberships/MembershipState";
import { deriveMembershipPageState } from "../../lib/membershipAccess";

type ProjectDetailPageProps = {
  theme: "dark" | "light";
};

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ theme }) => {
  const isDark = theme === "dark";
  const { projectId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "runs" ? "runs" : "summary";

  const summaryQuery = useQuery({
    queryKey: ["project-summary", projectId],
    queryFn: () => getProjectSummary(projectId, 24),
    enabled: !!projectId,
  });

  const runsQuery = useQuery({
    queryKey: ["project-runs-shell", projectId],
    queryFn: () => getProjectRuns(projectId, 20, 0),
    enabled: !!projectId,
  });

  const activeError = (tab === "summary" ? summaryQuery.error : runsQuery.error) as unknown;
  const state = activeError ? deriveMembershipPageState(activeError) : "ok";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>Project</h1>
          <p className="text-xs text-zinc-500 mt-1">{projectId}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link to={`/projects/${projectId}/api-keys`} className="text-sm text-blue-500 hover:underline">
            Manage API keys
          </Link>
          <Link to={`/projects/${projectId}/memberships`} className="text-sm text-blue-500 hover:underline">
            View project memberships
          </Link>
        </div>
      </div>

      <div className={`inline-flex border rounded-lg p-1 ${isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-100"}`}>
        <button
          onClick={() => setSearchParams({ tab: "summary" })}
          className={`px-3 py-1 text-xs rounded-md ${
            tab === "summary"
              ? isDark
                ? "bg-zinc-800 text-white"
                : "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setSearchParams({ tab: "runs" })}
          className={`px-3 py-1 text-xs rounded-md ${
            tab === "runs"
              ? isDark
                ? "bg-zinc-800 text-white"
                : "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500"
          }`}
        >
          Runs
        </button>
      </div>

      {state !== "ok" ? (
        <MembershipState state={state} theme={theme} />
      ) : tab === "summary" ? (
        <div className={`border rounded-xl p-4 ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
          {summaryQuery.isLoading ? (
            <div className="text-sm text-zinc-500">Loading summary...</div>
          ) : (
            <div className="space-y-2 text-sm">
              <div>Total runs: {summaryQuery.data?.total_runs ?? "—"}</div>
              <div>Last run: {summaryQuery.data?.last_run_at ?? "—"}</div>
            </div>
          )}
        </div>
      ) : (
        <div className={`border rounded-xl p-4 ${isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
          {runsQuery.isLoading ? (
            <div className="text-sm text-zinc-500">Loading runs...</div>
          ) : (
            <ul className="space-y-2 text-sm text-zinc-500">
              {(runsQuery.data?.runs ?? []).map((run) => (
                <li key={run.id}>
                  {run.id} • {run.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
