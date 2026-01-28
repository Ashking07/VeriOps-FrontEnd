import React, { useState } from "react";
import {
  Key,
  RefreshCcw,
  Shield,
  Database,
  Globe,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatusPill } from "../ui/StatusPill";
import { CopyButton } from "../ui/CopyButton";
import { getHealth } from "../../lib/api";

type SettingsPageProps = {
  theme: "dark" | "light";
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ theme }) => {
  const [origins, setOrigins] = useState([
    "https://localhost:3000",
    "https://staging.veriops.dev",
  ]);
  const isDark = theme === "dark";

  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const apiBaseUrl =
    (env.VITE_API_BASE_URL as string | undefined) ??
    (env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ??
    "";
  const apiKey =
    (env.VITE_VERIOPS_API_KEY as string | undefined) ??
    (env.NEXT_PUBLIC_VERIOPS_API_KEY as string | undefined) ??
    (env.DEV ? "dev-key" : "");
  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-3)}` : "Not set";
  const environment =
    (env.VITE_ENV as string | undefined) ??
    (env.NEXT_PUBLIC_ENV as string | undefined) ??
    "Local Dev";

  const [lastHealthAt, setLastHealthAt] = useState<string | null>(null);
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    onSuccess: () => {
      setLastHealthAt(new Date().toISOString());
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage project API keys, security, and environment configurations.</p>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Key size={18} className="text-zinc-500" />
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>API Keys</h2>
        </div>
        
        <div className={`border rounded-2xl overflow-hidden transition-all ${
          isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Production Key</p>
                <p className="text-xs text-zinc-500 mt-1">Use this key for live environments. Keep it secret.</p>
              </div>
              <button className={`flex items-center gap-2 text-[11px] font-bold transition-colors ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
              }`}>
                <RefreshCcw size={12} />
                Regenerate
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`flex-1 border px-3 py-2 rounded-lg flex items-center justify-between transition-all ${
                isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              }`}>
                <span className={`text-xs font-mono ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>{maskedKey}</span>
                <CopyButton
                  value={apiKey}
                  copiedMessage="Copied"
                  className={`${isDark ? "text-zinc-600 hover:text-white" : "text-zinc-400 hover:text-zinc-900"}`}
                  iconSize={14}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Globe size={18} className="text-zinc-500" />
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Connection</h2>
        </div>

        <div className={`border rounded-2xl p-6 transition-all ${
          isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Base URL</p>
              <p className={`font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                {apiBaseUrl || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">API Key</p>
              <div className="flex items-center gap-2">
                <span className={`font-mono ${isDark ? "text-zinc-300" : "text-zinc-700"}`}>
                  {maskedKey}
                </span>
                <StatusPill status={apiKey ? "healthy" : "warning"} label={apiKey ? "Set" : "Missing"} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Last Health</p>
              <div className="flex items-center gap-2">
                <StatusPill
                  status={health?.status === "ok" ? "healthy" : "degraded"}
                  label={health?.status === "ok" ? "OK" : "Unknown"}
                />
                <span className="text-[10px] text-zinc-500">{lastHealthAt ?? "—"}</span>
              </div>
              <p className="mt-1 text-[10px] text-zinc-500">DB: {health?.db ?? "—"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Globe size={18} className="text-zinc-500" />
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>CORS Origins</h2>
        </div>
        
        <div className={`border rounded-2xl p-6 transition-all ${
          isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
        }`}>
          <p className="text-xs text-zinc-500 mb-6">Control which domains are allowed to access your ingest API from the browser.</p>
          
          <div className="space-y-2">
            {origins.map((origin, i) => (
              <div key={i} className={`flex items-center gap-3 border p-3 rounded-xl group transition-all ${
                isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <span className={`text-xs font-mono flex-1 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>{origin}</span>
                <button className="text-zinc-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            
            <button className={`w-full mt-4 flex items-center justify-center gap-2 border border-dashed p-3 rounded-xl text-xs font-bold transition-all ${
              isDark 
                ? 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300' 
                : 'border-zinc-300 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600'
            }`}>
              <Plus size={14} />
              Add Origin
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6 pb-12">
        <div className="flex items-center gap-3">
          <Shield size={18} className="text-zinc-500" />
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Infrastructure Status</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`border rounded-2xl p-5 flex items-center justify-between transition-all ${
            isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <Database size={18} className="text-blue-500" />
              </div>
              <div>
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Postgres DB</p>
                <p className="text-[10px] text-zinc-500">us-east-1-primary</p>
              </div>
            </div>
            <StatusPill status={health?.db === "degraded" ? "degraded" : "healthy"} label={health?.db === "degraded" ? "Degraded" : "Operational"} />
          </div>
          
          <div className={`border rounded-2xl p-5 flex items-center justify-between transition-all ${
            isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                <Lock size={18} className="text-purple-500" />
              </div>
              <div>
                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Environment</p>
                <p className="text-[10px] text-zinc-500">{environment}</p>
              </div>
            </div>
            <StatusPill status={health?.status === "ok" ? "healthy" : "degraded"} label={health?.status === "ok" ? "Connected" : "Degraded"} />
          </div>
        </div>
      </section>
    </div>
  );
};
