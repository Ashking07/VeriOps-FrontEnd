import React, { useEffect } from "react";
import {
  Sun,
  Moon,
  Layers,
  Search,
  ChevronDown,
  Menu,
  LayoutDashboard,
  CirclePlay,
  ShieldCheck,
  Terminal,
  Settings,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { StatusPill } from "../ui/StatusPill";
import { CopyButton } from "../ui/CopyButton";
import { getHealth, getProjects, Project } from "../../lib/api";
import { DATE_RANGE_LABELS, useAppStore } from "../../store/appStore";

// --- Sidebar ---
type SidebarProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  theme: "dark" | "light";
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, theme }) => {
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/overview" },
    { id: "runs", label: "Runs", icon: CirclePlay, path: "/runs" },
    { id: "policies", label: "Policies", icon: ShieldCheck, path: "/policies" },
    { id: "ingest", label: "Ingest", icon: Terminal, path: "/ingest" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  const isDark = theme === "dark";
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <aside
        data-ui="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r transition-all duration-300 lg:translate-x-0 ${
          isDark 
            ? 'bg-zinc-950 border-zinc-800' 
            : 'bg-white border-zinc-200 shadow-sm'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center gap-2.5 px-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'bg-white' : 'bg-zinc-900'}`}>
                <div className={`w-4 h-4 rounded-sm rotate-45 ${isDark ? 'bg-zinc-950' : 'bg-white'}`} />
              </div>
              <span className={`font-bold text-lg tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>VeriOps</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === "/runs" && location.pathname.startsWith("/runs/"));
              return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 1024) {
                    setIsOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                  isActive
                    ? (isDark ? 'bg-zinc-900 text-white shadow-sm ring-1 ring-white/10' : 'bg-zinc-100 text-zinc-900 shadow-sm ring-1 ring-zinc-200')
                    : (isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-900/50' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50')
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            )})}
          </nav>

          <div className={`p-4 border-t ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
            <div className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-zinc-900/30' : 'bg-zinc-100/50'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>Josh Doe</p>
                <p className="text-[10px] text-zinc-500 truncate">Pro Plan</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

// --- Topbar ---
type TopBarProps = {
  toggleSidebar: () => void;
  toggleTheme: () => void;
  theme: "dark" | "light";
};

const maskKey = (key: string) => {
  if (key.length <= 8) {
    return `${key.slice(0, 2)}...`;
  }
  return `${key.slice(0, 6)}...${key.slice(-3)}`;
};

export const TopBar: React.FC<TopBarProps> = ({ toggleSidebar, theme, toggleTheme }) => {
  const isDark = theme === "dark";
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const { selectedProjectId, setSelectedProjectId, dateRange, setDateRange } =
    useAppStore();

  const { data: projects = [], isError: projectsError } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
  });

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, setSelectedProjectId]);

  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const apiKey =
    (env.VITE_VERIOPS_API_KEY as string | undefined) ??
    (env.NEXT_PUBLIC_VERIOPS_API_KEY as string | undefined) ??
    (env.DEV ? "dev-key" : "");
  const maskedKey = apiKey ? maskKey(apiKey) : "Not set";
  const environment =
    (env.VITE_ENV as string | undefined) ??
    (env.NEXT_PUBLIC_ENV as string | undefined) ??
    "Local Dev";

  return (
    <header
      data-ui="topbar"
      className={`h-14 border-b transition-all duration-300 sticky top-0 z-30 px-4 flex items-center justify-between ${
        isDark
          ? 'border-zinc-800 bg-zinc-950/80 backdrop-blur-md'
          : 'border-zinc-200 bg-white/80 backdrop-blur-md'
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={toggleSidebar}
          className={`lg:hidden p-2 transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          <Menu size={20} />
        </button>
        
        <div className="flex items-center gap-2 group">
          <div className={`w-6 h-6 rounded flex items-center justify-center ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <Layers size={14} className={isDark ? 'text-zinc-400' : 'text-zinc-500'} />
          </div>
          <select
            value={selectedProjectId ?? ""}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className={`text-sm font-medium bg-transparent focus:outline-none ${
              isDark ? "text-white" : "text-zinc-900"
            }`}
          >
            {projects.length === 0 && (
              <option value="" key="no-projects">
                {projectsError ? "Failed to load projects" : "No projects"}
              </option>
            )}
            {projects.map((project: Project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="text-zinc-500" />
        </div>

        <div className={`hidden md:flex items-center gap-1 border rounded-lg p-0.5 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
          {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
            <button 
              key={value}
              onClick={() => setDateRange(value as "24h" | "7d" | "30d")}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                dateRange === value 
                  ? (isDark ? 'bg-zinc-800 text-white' : 'bg-white text-zinc-900 shadow-sm') 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex relative flex-1 max-w-md mx-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input 
            type="text" 
            placeholder="Search runs, steps, or tools..."
            value={searchQuery}
            onChange={(event) => {
              const next = event.target.value;
              setSearchParams((params) => {
                const nextParams = new URLSearchParams(params);
                if (next) {
                  nextParams.set("q", next);
                } else {
                  nextParams.delete("q");
                }
                return nextParams;
              });
            }}
            className={`w-full border rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
              isDark 
                ? 'bg-zinc-900/50 border-zinc-800 text-white' 
                : 'bg-zinc-100/50 border-zinc-200 text-zinc-900'
            }`}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg border transition-all ${
            isDark 
              ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' 
              : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-900'
          }`}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className={`hidden xl:flex items-center gap-3 pr-4 border-r ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Env</span>
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isDark 
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                : 'bg-amber-100 text-amber-700 border-amber-200'
            }`}>
              {environment}
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">API</span>
             <div
               className={`flex items-center gap-1.5 border px-2 py-1 rounded transition-colors group ${
                 isDark
                   ? "bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                   : "bg-zinc-100 border-zinc-200 hover:bg-zinc-200"
               }`}
             >
               <span className={`text-[10px] font-mono ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>
                 {maskedKey}
               </span>
               <CopyButton
                 value={apiKey}
                 copiedMessage="Copied"
                 iconSize={10}
                 className="text-zinc-500 group-hover:text-zinc-400"
               />
             </div>
          </div>
        </div>
        
        <StatusPill
          status={health?.db === "degraded" ? "degraded" : "healthy"}
          label={health?.db === "degraded" ? "DB Degraded" : "API Ok"}
          className="bg-transparent border-none text-[10px]"
        />
      </div>
    </header>
  );
};
