import React, { useMemo } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { CirclePlay, Target, Zap, DollarSign, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatusPill } from "../ui/StatusPill";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/skeleton";
import { getProjectRuns, getProjectSummary, Run } from "../../lib/api";
import { useAppStore } from "../../store/appStore";

type KPICardProps = {
  label: string;
  value: string;
  trend: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  unit?: string;
  isDark: boolean;
};

const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  trend,
  icon: Icon,
  unit = "",
  isDark,
}) => (
  <div className={`border rounded-xl p-5 transition-all ${
    isDark ? 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm'
  }`}>
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
        <Icon size={18} className="text-zinc-500" />
      </div>
      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
        <ArrowUpRight size={10} />
        {trend}
      </div>
    </div>
    <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
    <div className="flex items-baseline gap-1">
      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{value}</h3>
      <span className="text-[10px] font-medium text-zinc-400 uppercase">{unit}</span>
    </div>
  </div>
);

type OverviewPageProps = {
  theme: "dark" | "light";
};

const rangeToLimit = {
  "24h": 24,
  "7d": 7,
  "30d": 30,
} as const;

const formatNumber = (value?: number | string) => {
  if (value === undefined || value === null) return "—";
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value);
  return numeric.toLocaleString();
};

export const OverviewPage: React.FC<OverviewPageProps> = ({ theme }) => {
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { selectedProjectId, dateRange } = useAppStore();

  const summaryQuery = useQuery({
    queryKey: ["summary", selectedProjectId],
    queryFn: () => getProjectSummary(selectedProjectId ?? "", rangeToLimit[dateRange]),
    enabled: !!selectedProjectId,
  });

  const metricsRunsQuery = useQuery({
    queryKey: ["project-runs-metrics", selectedProjectId, dateRange],
    queryFn: () => getProjectRuns(selectedProjectId ?? "", 200, 0),
    enabled: !!selectedProjectId,
  });

  const recentRunsQuery = useQuery({
    queryKey: ["project-runs", selectedProjectId, 10, 0],
    queryFn: () => getProjectRuns(selectedProjectId ?? "", 10, 0),
    enabled: !!selectedProjectId,
  });

  const runsForMetrics = metricsRunsQuery.data?.runs ?? [];
  const recentRuns = recentRunsQuery.data?.runs ?? [];

  const metrics = useMemo(() => {
    const now = new Date();
    const cutoff =
      dateRange === "24h"
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : dateRange === "7d"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const scopedRuns = runsForMetrics.filter((run) => {
      if (!run.started_at) return true;
      return new Date(run.started_at) >= cutoff;
    });

    const totalRuns = scopedRuns.length;
    const passedRuns = scopedRuns.filter((run) => run.status === "passed").length;
    const totalTokens = scopedRuns.reduce((sum, run) => sum + (run.tokens ?? 0), 0);
    const totalCost = scopedRuns.reduce((sum, run) => sum + (run.cost ?? 0), 0);
    const avgTokens = totalRuns > 0 ? totalTokens / totalRuns : 0;
    const passRate = totalRuns > 0 ? (passedRuns / totalRuns) * 100 : 0;

    const chartTotals = scopedRuns.reduce<Record<string, { name: string; total: number }>>(
      (acc, run) => {
        const dateKey = run.started_at ? new Date(run.started_at).toLocaleDateString() : "Unknown";
        if (!acc[dateKey]) {
          acc[dateKey] = { name: dateKey, total: 0 };
        }
        acc[dateKey].total += 1;
        return acc;
      },
      {}
    );

    return {
      passRate,
      avgTokens,
      totalCost,
      chartData: Object.values(chartTotals),
    };
  }, [runsForMetrics, dateRange]);

  const summaryStatusCounts = summaryQuery.data?.status_counts ?? {};
  const totalFromSummary = Object.values(summaryStatusCounts).reduce((sum, value) => sum + value, 0);
  const validationData = useMemo(() => {
    if (totalFromSummary === 0) {
      return [
        { name: "Passed", value: 0, color: "#10b981" },
        { name: "Failed", value: 0, color: "#f43f5e" },
        { name: "Other", value: 0, color: isDark ? "#3f3f46" : "#d4d4d8" },
      ];
    }
    return Object.entries(summaryStatusCounts).map(([name, value]) => ({
      name,
      value: Math.round((value / totalFromSummary) * 100),
      color:
        name.toLowerCase() === "passed"
          ? "#10b981"
          : name.toLowerCase() === "failed"
          ? "#f43f5e"
          : isDark
          ? "#3f3f46"
          : "#d4d4d8",
    }));
  }, [summaryStatusCounts, totalFromSummary, isDark]);

  const chartData = metrics.chartData;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {(summaryQuery.isError || metricsRunsQuery.isError) && (
        <div className="text-xs text-rose-500">Failed to load summary metrics.</div>
      )}
      {summaryQuery.data?.last_run_at && (
        <div className="text-xs text-zinc-500">
          Last run at {summaryQuery.data.last_run_at}
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(metricsRunsQuery.isLoading || summaryQuery.isLoading) ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[96px] w-full" />
          ))
        ) : (
          <>
            <KPICard
              label="Total Runs"
              value={formatNumber(summaryQuery.data?.total_runs)}
              trend="—"
              icon={CirclePlay}
              isDark={isDark}
            />
            <KPICard
              label="Pass Rate"
              value={
                Number(metrics.passRate).toFixed(1)
              }
              trend="—"
              unit="%"
              icon={Target}
              isDark={isDark}
            />
            <KPICard
              label="Avg Tokens"
              value={metrics.avgTokens ? formatNumber(metrics.avgTokens) : "—"}
              trend="—"
              icon={Zap}
              isDark={isDark}
            />
            <KPICard
              label="Total Cost"
              value={
                metrics.totalCost !== undefined
                  ? Number(metrics.totalCost).toFixed(2)
                  : "—"
              }
              trend="—"
              unit="USD"
              icon={DollarSign}
              isDark={isDark}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 border rounded-2xl p-6 transition-all ${
          isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Runs over time</h3>
            <div className={`flex gap-1 border rounded-lg p-1 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
              <button className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all ${isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900 shadow-sm'}`}>All</button>
              <button className="text-[10px] font-bold px-2 py-0.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Failed</button>
            </div>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#27272a' : '#f4f4f5'} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#09090b' : '#ffffff', 
                    border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`, 
                    fontSize: '12px', 
                    borderRadius: '8px',
                    color: isDark ? '#ffffff' : '#09090b'
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`border rounded-2xl p-6 transition-all ${
          isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <h3 className={`text-sm font-bold mb-8 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Status counts</h3>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={validationData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: isDark ? '#09090b' : '#ffffff', border: `1px solid ${isDark ? '#27272a' : '#e4e4e7'}`, fontSize: '12px', borderRadius: '8px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {validationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {validationData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-zinc-500">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
                <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{item.value}%</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Latest validation</span>
            <div className="flex items-center gap-2">
              <StatusPill status={(summaryQuery.data?.latest_validation_status ?? "none") as "passed" | "failed" | "none"} />
              <span>{summaryQuery.data?.latest_validation_at ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`border rounded-2xl overflow-hidden transition-all ${
        isDark ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-zinc-800/50' : 'border-zinc-200'}`}>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Recent Runs</h3>
          <button 
            onClick={() => navigate("/runs")}
            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            View All
          </button>
        </div>
        {recentRunsQuery.isError ? (
          <div className="p-6 text-sm text-rose-500">Failed to load recent runs.</div>
        ) : recentRunsQuery.isLoading ? (
          <div className="p-6">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No runs yet"
              description="Send your first trace to see run activity on the Overview page."
              actionLabel="Go to Ingest"
              onAction={() => navigate("/ingest")}
              isDark={isDark}
            >
              <div className="text-left text-xs text-zinc-500 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                  Confirm API key + base URL are set
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                  Send a test run via Ingest
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                  Review run details + validations
                </div>
              </div>
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={`border-b ${isDark ? 'bg-zinc-950/50 border-zinc-800/50' : 'bg-zinc-50 border-zinc-200'}`}>
                <tr>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Run ID</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tokens</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Cost</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Validation</th>
                  <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Started</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-zinc-800/50' : 'divide-zinc-200'}`}>
                {recentRuns.map((run: Run) => (
                  <tr
                    key={run.id}
                    className={`transition-colors cursor-pointer ${isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'}`}
                    onClick={() => navigate(`/runs/${run.id}`)}
                  >
                    <td className={`px-6 py-4 text-xs font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>{run.id}</td>
                    <td className="px-6 py-4">
                      <StatusPill status={run.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{run.tokens ?? "—"}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{run.cost ?? "—"}</td>
                    <td className="px-6 py-4">
                      <StatusPill status={run.validation_status ?? run.latest_validation_status ?? "none"} />
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{run.started_at ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
