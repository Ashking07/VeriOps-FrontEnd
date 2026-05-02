import React, { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Search,
  ChevronDown,
  Menu,
  LayoutDashboard,
  FolderKanban,
  CirclePlay,
  ShieldCheck,
  Terminal,
  Settings,
  LogOut,
  Keyboard,
  User,
  ChevronUp,
  Inbox,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CopyButton } from "../ui/CopyButton";
import { getHealth, getProjects, Project } from "../../lib/api";
import { DATE_RANGE_LABELS, useAppStore } from "../../store/appStore";
import { logout, useAuthSession } from "../../lib/auth";
import { resolveSelectedProjectId } from "./projectSelection";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

// ─── VeriOps Logo Icon ────────────────────────────────────────────────────────
const VeriOpsIcon: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="15" fill="#0d0d0d" stroke="#222" strokeWidth="1" />
    <circle cx="16" cy="16" r="10" stroke="#1a3a2a" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="6" stroke="#22c55e" strokeWidth="1.5" opacity="0.7" />
    <circle cx="16" cy="16" r="2.5" fill="#4ade80" />
    <circle cx="16" cy="16" r="1" fill="white" />
  </svg>
);

// ─── Keyboard Shortcuts Modal ─────────────────────────────────────────────────
const SHORTCUTS = [
  { keys: "⌘K", label: "Search" },
  { keys: "⌘P", label: "Projects" },
  { keys: "⌘R", label: "Runs" },
  { keys: "⌘,", label: "Settings" },
];

const ShortcutsModal: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void }> = ({
  open,
  onOpenChange,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-[#111] border-[#222] text-white">
      <DialogHeader>
        <DialogTitle className="text-white">Keyboard Shortcuts</DialogTitle>
        <DialogDescription className="text-zinc-500">Quick navigation shortcuts</DialogDescription>
      </DialogHeader>
      <div className="space-y-1 mt-2">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5">
            <span className="text-sm text-zinc-300">{s.label}</span>
            <kbd className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#1a1a1a] border border-[#333] text-zinc-400">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────
type ThemePreference = "light" | "dark" | "system";

type SidebarProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  theme: "dark" | "light";
  themePref?: ThemePreference;
  onThemeChange?: (pref: ThemePreference) => void;
};

const NAV_SECTIONS = [
  {
    label: "WORKSPACE",
    items: [
      { id: "overview",  label: "Overview",     icon: LayoutDashboard, path: "/overview" },
      { id: "projects",  label: "Projects",     icon: FolderKanban,    path: "/projects" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { id: "runs",      label: "Runs",         icon: CirclePlay,      path: "/runs",     badge: "runs" as const },
      { id: "policies",  label: "Policies",     icon: ShieldCheck,     path: "/policies" },
      { id: "ingest",    label: "Ingest",       icon: Terminal,        path: "/ingest" },
      { id: "dlq",       label: "Dead-letter",  icon: Inbox,           path: "/dlq",      badge: "dlq" as const },
    ],
  },
  {
    label: "ADMIN",
    items: [
      { id: "settings",  label: "Settings",     icon: Settings,        path: "/settings" },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  theme,
  themePref = "dark",
  onThemeChange,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthSession();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: getProjects });
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: getHealth });

  const userEmail = auth.user?.email ?? "";
  const userDisplayName =
    auth.user?.username ?? (userEmail ? userEmail.split("@")[0] : "User");
  const userInitials = userDisplayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const isLive = health?.db === "ok";

  const isActive = (path: string) =>
    location.pathname === path ||
    (path === "/runs" && location.pathname.startsWith("/runs/")) ||
    (path === "/projects" && location.pathname.startsWith("/projects/"));

  return (
    <>
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <aside
        data-ui="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-60 flex flex-col bg-[#0d0d0d] border-r border-[#1a1a1a] transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-start gap-2.5 px-4 pt-5 pb-4">
          <VeriOpsIcon size={32} />
          <div className="flex flex-col -mt-0.5">
            <span className="text-[15px] font-bold text-white tracking-tight leading-tight">VeriOps</span>
            <span className="text-[9px] font-semibold text-zinc-600 tracking-[0.15em] uppercase">
              Agent Observability
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 mb-4">
          <button
            onClick={() => setShortcutsOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-[#111] border border-[#222] text-zinc-500 hover:border-[#333] hover:text-zinc-400 transition-colors text-xs"
          >
            <Search size={12} />
            <span className="flex-1 text-left">Search or run command...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[9px] font-mono text-zinc-600">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav Sections */}
        <nav className="flex-1 px-2 overflow-y-auto space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold text-zinc-600 tracking-[0.1em] uppercase">
                {section.label}
              </p>
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
                      if (window.innerWidth < 1024) setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-[7px] text-[13px] font-medium rounded-md transition-all relative ${
                      active
                        ? "text-white bg-white/[0.05]"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-blue-500" />
                    )}
                    <item.icon size={14} className={active ? "text-white" : "text-zinc-600"} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {"badge" in item && item.badge === "dlq" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-400">
                        5
                      </span>
                    )}
                    {"badge" in item && item.badge === "runs" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                        128
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* System Panel */}
        <div className="mx-3 mb-3 rounded-md border border-[#1e1e1e] bg-[#0a0a0a] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-zinc-600 tracking-[0.1em] uppercase">System</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-500" : "bg-zinc-600"}`} />
              <span className={`text-[10px] font-semibold ${isLive ? "text-emerald-500" : "text-zinc-500"}`}>
                {isLive ? "LIVE" : "DOWN"}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            {[
              { label: "Ingest", value: "24ns" },
              { label: "Queue",  value: "12" },
              { label: "DLQ",    value: "5", red: true },
            ].map(({ label, value, red }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-600">{label}</span>
                <span className={`text-[11px] font-mono font-medium ${red ? "text-red-400" : "text-zinc-400"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="border-t border-[#1a1a1a]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-medium text-white truncate leading-tight">{userDisplayName}</p>
                  <p className="text-[11px] text-zinc-600 truncate">Pro · {projects.length} projects</p>
                </div>
                <ChevronUp size={13} className="text-zinc-600 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={4}
              className="w-56 bg-[#111] border-[#222] text-zinc-200"
            >
              <div className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{userDisplayName}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{userEmail}</p>
                  </div>
                </div>
                <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Pro Plan
                </div>
              </div>

              <DropdownMenuSeparator className="bg-[#222]" />

              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                Theme
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <div className="mx-2 mb-1 flex rounded-lg border border-[#222] bg-[#0d0d0d] p-0.5">
                  {(
                    [
                      { value: "light" as ThemePreference, icon: Sun,     label: "Light"  },
                      { value: "dark"  as ThemePreference, icon: Moon,    label: "Dark"   },
                      { value: "system"as ThemePreference, icon: Monitor, label: "System" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onThemeChange?.(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                        themePref === opt.value
                          ? "bg-[#1e1e1e] text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <opt.icon size={11} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="bg-[#222]" />

              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer text-zinc-300 focus:bg-white/5 focus:text-white"
                onClick={() => navigate("/settings")}
              >
                <User size={13} /> Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer text-zinc-300 focus:bg-white/5 focus:text-white"
                onClick={() => setShortcutsOpen(true)}
              >
                <Keyboard size={13} /> Keyboard Shortcuts
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[#222]" />

              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer text-rose-500 focus:text-rose-400 focus:bg-rose-500/10"
                onClick={async () => {
                  const result = await logout();
                  if (!result.serverSessionCleared) toast.warning("Server session may still be active.");
                  navigate("/login", { replace: true });
                }}
              >
                <LogOut size={13} /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

// ─── TopBar ───────────────────────────────────────────────────────────────────
type TopBarProps = {
  toggleSidebar: () => void;
  toggleTheme: () => void;
  theme: "dark" | "light";
};

const maskKey = (key: string) => {
  if (key.length <= 8) return `${key.slice(0, 2)}...`;
  return `${key.slice(0, 8)}...${key.slice(-3)}`;
};

const DATE_LABELS: Record<string, string> = {
  "24h": "Last 24h",
  "7d":  "7d",
  "30d": "30d",
};

export const TopBar: React.FC<TopBarProps> = ({ toggleSidebar, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const { selectedProjectId, setSelectedProjectId, dateRange, setDateRange } = useAppStore();

  const { data: projects = [], isError: projectsError } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const { data: health } = useQuery({ queryKey: ["health"], queryFn: getHealth });

  useEffect(() => {
    const next = resolveSelectedProjectId(projects, selectedProjectId);
    if (next !== selectedProjectId) setSelectedProjectId(next);
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

  const selectedProject = projects.find((p: Project) => p.id === selectedProjectId);
  const isApiOk = !health || health.db !== "degraded";

  return (
    <header
      data-ui="topbar"
      className="h-[46px] border-b border-[#1a1a1a] bg-[#0d0d0d] sticky top-0 z-30 px-4 flex items-center gap-3"
    >
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Project selector */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-5 h-5 rounded bg-[#1a1a1a] flex items-center justify-center">
          <FolderKanban size={11} className="text-zinc-500" />
        </div>
        <select
          value={selectedProjectId ?? ""}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="text-[13px] font-medium bg-transparent text-zinc-200 focus:outline-none cursor-pointer hover:text-white transition-colors"
        >
          {projects.length === 0 && (
            <option value="">{projectsError ? "Failed to load" : "No projects"}</option>
          )}
          {projects.map((p: Project) => (
            <option key={p.id} value={p.id} className="bg-[#111]">
              {p.name}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="text-zinc-600" />
      </div>

      {/* Time range tabs */}
      <div className="hidden md:flex items-center gap-0.5 bg-[#111] border border-[#222] rounded-md p-0.5">
        {Object.entries(DATE_LABELS).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setDateRange(value as "24h" | "7d" | "30d")}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
              dateRange === value
                ? "bg-[#1e1e1e] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="hidden lg:flex flex-1 relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
        <input
          type="text"
          placeholder="Search runs, steps..."
          value={searchQuery}
          onChange={(e) => {
            const v = e.target.value;
            setSearchParams((p) => {
              const n = new URLSearchParams(p);
              v ? n.set("q", v) : n.delete("q");
              return n;
            });
          }}
          className="w-full bg-[#111] border border-[#222] rounded-md py-1.5 pl-8 pr-3 text-[12px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#333] transition-colors"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* ENV badge */}
        <div className="hidden xl:flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">ENV</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
            {environment}
          </span>
        </div>

        {/* API key */}
        <div className="hidden xl:flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">API</span>
          <div className="flex items-center gap-1.5 bg-[#111] border border-[#222] px-2 py-1 rounded hover:border-[#333] transition-colors">
            <span className="text-[11px] font-mono text-zinc-400">{maskedKey}</span>
            <CopyButton value={apiKey} copiedMessage="Copied" iconSize={10} className="text-zinc-600 hover:text-zinc-400" />
          </div>
        </div>

        {/* Owner / role dropdown */}
        <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600/15 border border-blue-500/20 text-blue-400 text-[11px] font-semibold hover:bg-blue-600/20 transition-colors">
          OWNER
          <ChevronDown size={10} />
        </button>

        {/* API status */}
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${isApiOk ? "text-emerald-500" : "text-red-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isApiOk ? "bg-emerald-500" : "bg-red-400"}`} />
          {isApiOk ? "API Ok" : "API Down"}
        </div>
      </div>
    </header>
  );
};
