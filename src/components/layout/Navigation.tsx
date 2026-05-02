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

// ─── VeriOps Logo ─────────────────────────────────────────────────────────────
const VeriOpsIcon = () => (
  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="14" fill="#09090b" stroke="#27272a" strokeWidth="1" />
    <circle cx="15" cy="15" r="9" stroke="#1a3a2a" strokeWidth="1.5" />
    <circle cx="15" cy="15" r="5" stroke="#22c55e" strokeWidth="1.5" opacity="0.7" />
    <circle cx="15" cy="15" r="2.5" fill="#4ade80" />
  </svg>
);

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────
const SHORTCUTS = [
  { keys: "⌘K", label: "Search" },
  { keys: "⌘P", label: "Projects" },
  { keys: "⌘R", label: "Runs" },
  { keys: "⌘,", label: "Settings" },
];

const ShortcutsModal: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void }> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
      <DialogHeader>
        <DialogTitle className="text-white">Keyboard Shortcuts</DialogTitle>
        <DialogDescription className="text-zinc-500">Quick navigation shortcuts</DialogDescription>
      </DialogHeader>
      <div className="space-y-1 mt-2">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-900">
            <span className="text-sm text-zinc-300">{s.label}</span>
            <kbd className="px-2 py-1 rounded text-xs font-mono font-semibold bg-zinc-900 border border-zinc-700 text-zinc-400">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

// ─── Nav sections ─────────────────────────────────────────────────────────────
type ThemePreference = "light" | "dark" | "system";

const NAV_SECTIONS = [
  {
    label: "WORKSPACE",
    items: [
      { id: "overview", label: "Overview",    icon: LayoutDashboard, path: "/overview" },
      { id: "projects", label: "Projects",    icon: FolderKanban,    path: "/projects" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { id: "runs",     label: "Runs",        icon: CirclePlay,      path: "/runs",     badge: "runs" as const },
      { id: "policies", label: "Policies",    icon: ShieldCheck,     path: "/policies" },
      { id: "ingest",   label: "Ingest",      icon: Terminal,        path: "/ingest" },
      { id: "dlq",      label: "Dead-letter", icon: Inbox,           path: "/dlq",      badge: "dlq" as const },
    ],
  },
  {
    label: "ADMIN",
    items: [
      { id: "settings", label: "Settings",   icon: Settings,        path: "/settings" },
    ],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────
type SidebarProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  theme: "dark" | "light";
  themePref?: ThemePreference;
  onThemeChange?: (pref: ThemePreference) => void;
};

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, theme, themePref = "dark", onThemeChange }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthSession();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: getProjects });
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: getHealth });

  const userEmail = auth.user?.email ?? "";
  const userDisplayName = auth.user?.username ?? (userEmail ? userEmail.split("@")[0] : "User");
  const userInitials = userDisplayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
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
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-zinc-950 border-r border-zinc-800 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-zinc-800">
          <VeriOpsIcon />
          <div>
            <p className="text-sm font-bold text-white tracking-tight">VeriOps</p>
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest" style={{ fontSize: "9px" }}>
              Agent Observability
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <button
            onClick={() => setShortcutsOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 transition-colors text-xs"
          >
            <Search size={12} />
            <span className="flex-1 text-left">Search or run command...</span>
            <kbd className="px-1 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-600">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-2 overflow-y-auto space-y-4 pb-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                {section.label}
              </p>
              {section.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); if (window.innerWidth < 1024) setIsOpen(false); }}
                    className={`relative w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      active
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded" />
                    )}
                    <item.icon size={15} className={active ? "text-white" : "text-zinc-600"} />
                    <span className="flex-1 text-left pl-1">{item.label}</span>
                    {"badge" in item && item.badge === "runs" && (
                      <span className="bg-zinc-700 text-zinc-400 text-xs px-2 py-1 rounded font-semibold">
                        128
                      </span>
                    )}
                    {"badge" in item && item.badge === "dlq" && (
                      <span className="bg-zinc-900 text-rose-500 text-xs px-2 py-1 rounded font-semibold border border-zinc-800">
                        5
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* System Panel */}
        <div className="mx-3 mb-3 rounded-md border border-zinc-800 bg-zinc-900 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">System</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-zinc-600"}`} />
              <span className={`text-xs font-semibold ${isLive ? "text-emerald-500" : "text-zinc-500"}`}>
                {isLive ? "LIVE" : "DOWN"}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">Ingest</span>
              <span className="text-xs font-mono text-zinc-400">24ns</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">Queue</span>
              <span className="text-xs font-mono text-zinc-400">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600">DLQ</span>
              <span className="text-xs font-mono text-rose-500">5</span>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="border-t border-zinc-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate">{userDisplayName}</p>
                  <p className="text-xs text-zinc-600 truncate">Pro · {projects.length} projects</p>
                </div>
                <ChevronUp size={13} className="text-zinc-600 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={4} className="w-56 bg-zinc-950 border-zinc-800 text-zinc-200">
              <div className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{userDisplayName}</p>
                    <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuLabel className="text-xs font-bold uppercase tracking-widest text-zinc-600">Theme</DropdownMenuLabel>
              <DropdownMenuGroup>
                <div className="mx-2 mb-1 flex rounded-lg border border-zinc-800 bg-zinc-900 p-1">
                  {([
                    { value: "light"  as ThemePreference, icon: Sun,     label: "Light"  },
                    { value: "dark"   as ThemePreference, icon: Moon,    label: "Dark"   },
                    { value: "system" as ThemePreference, icon: Monitor, label: "System" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onThemeChange?.(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${
                        themePref === opt.value ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <opt.icon size={11} />{opt.label}
                    </button>
                  ))}
                </div>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer text-zinc-300 focus:bg-zinc-900 focus:text-white" onClick={() => navigate("/settings")}>
                <User size={13} /> Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs cursor-pointer text-zinc-300 focus:bg-zinc-900 focus:text-white" onClick={() => setShortcutsOpen(true)}>
                <Keyboard size={13} /> Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="gap-2 text-xs cursor-pointer text-rose-500 focus:text-rose-400 focus:bg-zinc-900"
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
        <div className="fixed inset-0 bg-black opacity-0 z-40 lg:hidden" style={{ opacity: 0.7 }} onClick={() => setIsOpen(false)} />
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

const maskKey = (key: string) => key.length <= 8 ? `${key.slice(0, 2)}...` : `${key.slice(0, 8)}...${key.slice(-3)}`;

export const TopBar: React.FC<TopBarProps> = ({ toggleSidebar, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const { selectedProjectId, setSelectedProjectId, dateRange, setDateRange } = useAppStore();

  const { data: projects = [], isError: projectsError } = useQuery({ queryKey: ["projects"], queryFn: getProjects });
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: getHealth });

  useEffect(() => {
    const next = resolveSelectedProjectId(projects, selectedProjectId);
    if (next !== selectedProjectId) setSelectedProjectId(next);
  }, [projects, selectedProjectId, setSelectedProjectId]);

  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const apiKey = (env.VITE_VERIOPS_API_KEY as string | undefined) ?? (env.DEV ? "dev-key" : "");
  const maskedKey = apiKey ? maskKey(apiKey) : "Not set";
  const environment = (env.VITE_ENV as string | undefined) ?? "Local Dev";
  const isApiOk = !health || health.db !== "degraded";

  const DATE_LABELS: Record<string, string> = { "24h": "Last 24h", "7d": "7d", "30d": "30d" };

  return (
    <header
      data-ui="topbar"
      className="h-14 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-30 px-4 flex items-center gap-3"
    >
      {/* Mobile hamburger */}
      <button onClick={toggleSidebar} className="lg:hidden p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
        <Menu size={18} />
      </button>

      {/* Project selector */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
          <FolderKanban size={12} className="text-zinc-500" />
        </div>
        <select
          value={selectedProjectId ?? ""}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="text-sm font-medium bg-transparent text-zinc-200 focus:outline-none cursor-pointer"
        >
          {projects.length === 0 && <option value="">{projectsError ? "Failed to load" : "No projects"}</option>}
          {projects.map((p: Project) => (
            <option key={p.id} value={p.id} className="bg-zinc-950">{p.name}</option>
          ))}
        </select>
        <ChevronDown size={13} className="text-zinc-600" />
      </div>

      {/* Time tabs */}
      <div className="hidden md:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-md p-1">
        {Object.entries(DATE_LABELS).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setDateRange(value as "24h" | "7d" | "30d")}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              dateRange === value ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="hidden lg:flex flex-1 relative max-w-xs">
        <Search className="absolute left-3 top-0 bottom-0 my-auto text-zinc-600" size={13} />
        <input
          type="text"
          placeholder="Search runs, steps..."
          value={searchQuery}
          onChange={(e) => {
            const v = e.target.value;
            setSearchParams((p) => { const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n; });
          }}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-2 pl-8 pr-3 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors"
          style={{ paddingLeft: "32px" }}
        />
      </div>

      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        {/* Theme */}
        <button onClick={toggleTheme} className="p-2 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all">
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* ENV */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">ENV</span>
          <span className="px-2 py-1 rounded text-xs font-bold bg-amber-500 text-white">
            {environment}
          </span>
        </div>

        {/* API key */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">API</span>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded hover:border-zinc-700 transition-colors">
            <span className="text-xs font-mono text-zinc-400">{maskedKey}</span>
            <CopyButton value={apiKey} copiedMessage="Copied" iconSize={10} className="text-zinc-600 hover:text-zinc-400" />
          </div>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-300 px-2 py-1 rounded cursor-pointer hover:bg-zinc-800 transition-colors">
          OWNER <ChevronDown size={10} />
        </div>

        {/* API status */}
        <div className={`flex items-center gap-2 text-xs font-medium ${isApiOk ? "text-emerald-500" : "text-rose-500"}`}>
          <span className={`w-2 h-2 rounded-full ${isApiOk ? "bg-emerald-500" : "bg-rose-500"}`} />
          {isApiOk ? "API Ok" : "API Down"}
        </div>
      </div>
    </header>
  );
};
