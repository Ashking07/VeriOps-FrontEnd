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
  Inbox,
} from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CopyButton } from "../ui/CopyButton";
import { getHealth, getProjects, Project } from "../../lib/api";
import { useAppStore } from "../../store/appStore";
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

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const tokens = (theme: "dark" | "light") => {
  const isDark = theme === "dark";
  return {
    surface:        isDark ? "bg-zinc-950"        : "bg-white",
    surfaceAlt:     isDark ? "bg-zinc-900"        : "bg-zinc-50",
    surfaceRaise:   isDark ? "bg-zinc-800"        : "bg-zinc-100",
    border:         isDark ? "border-zinc-800"    : "border-zinc-200",
    borderHover:    isDark ? "hover:border-zinc-700" : "hover:border-zinc-400",
    textPrimary:    isDark ? "text-white"         : "text-zinc-900",
    textSecondary:  isDark ? "text-zinc-300"      : "text-zinc-700",
    textMuted:      isDark ? "text-zinc-500"      : "text-zinc-500",
    textDim:        isDark ? "text-zinc-600"      : "text-zinc-400",
    hoverBg:        isDark ? "hover:bg-zinc-900"  : "hover:bg-zinc-100",
    hoverBgAlt:     isDark ? "hover:bg-zinc-800"  : "hover:bg-zinc-200",
    hoverText:      isDark ? "hover:text-zinc-300": "hover:text-zinc-900",
    activeBg:       isDark ? "bg-zinc-800"        : "bg-zinc-100",
    statusOk:       isDark ? "text-emerald-500"   : "text-emerald-600",
    iconButton:     isDark ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                           : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100",
  };
};

// ─── VeriOps Logo ─────────────────────────────────────────────────────────────
const VeriOpsIcon: React.FC<{ theme: "dark" | "light" }> = ({ theme }) => {
  const fill = theme === "dark" ? "#0a0a0b" : "#fafafa";
  const stroke = theme === "dark" ? "#3f3f46" : "#a1a1aa";
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <circle cx="24" cy="8" r="3" fill="#22c55e" />
    </svg>
  );
};

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────
const SHORTCUTS = [
  { keys: "⌘K", label: "Search" },
  { keys: "⌘P", label: "Projects" },
  { keys: "⌘R", label: "Runs" },
  { keys: "⌘,", label: "Settings" },
];

const ShortcutsModal: React.FC<{ open: boolean; onOpenChange: (v: boolean) => void; theme: "dark" | "light" }> = ({ open, onOpenChange, theme }) => {
  const t = tokens(theme);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${t.surface} ${t.border} ${t.textPrimary}`}>
        <DialogHeader>
          <DialogTitle className={t.textPrimary}>Keyboard Shortcuts</DialogTitle>
          <DialogDescription className={t.textMuted}>Quick navigation shortcuts</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className={`flex items-center justify-between px-3 py-2 rounded-lg ${t.hoverBg}`}>
              <span className={`text-sm ${t.textSecondary}`}>{s.label}</span>
              <kbd className={`px-2 py-1 rounded text-xs font-mono font-semibold ${t.surfaceAlt} border ${t.border} ${t.textMuted}`}>
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
  const t = tokens(theme);

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

  const runsBadgeCls = theme === "dark"
    ? "bg-zinc-800 text-zinc-400"
    : "bg-zinc-100 text-zinc-700";
  const dlqBadgeCls = theme === "dark"
    ? "bg-zinc-900 text-rose-500 border border-zinc-800"
    : "bg-rose-50 text-rose-600 border border-rose-200";

  return (
    <>
      <ShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} theme={theme} />

      <aside
        data-ui="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col ${t.surface} border-r ${t.border} transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-4 border-b ${t.border}`}>
          <VeriOpsIcon theme={theme} />
          <div>
            <p className={`text-sm font-bold ${t.textPrimary} tracking-tight`}>VeriOps</p>
            <p className={`font-semibold ${t.textDim} uppercase tracking-widest`} style={{ fontSize: "9px" }}>
              Agent Observability
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <button
            onClick={() => setShortcutsOpen(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md ${t.surfaceAlt} border ${t.border} ${t.textMuted} ${t.borderHover} transition-colors text-xs`}
          >
            <Search size={12} />
            <span className="flex-1 text-left">Search or run command...</span>
            <kbd className={`px-1 py-1 rounded ${t.surfaceRaise} border ${t.border} text-xs font-mono ${t.textDim}`}>
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-2 overflow-y-auto space-y-4 pb-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className={`px-3 mb-1 text-xs font-semibold ${t.textDim} uppercase tracking-wider`}>
                {section.label}
              </p>
              {section.items.map((item) => {
                const active = isActive(item.path);
                const inactiveCls = `${t.textMuted} ${t.hoverText} ${t.hoverBg}`;
                const activeCls = `${t.activeBg} ${t.textPrimary}`;
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); if (window.innerWidth < 1024) setIsOpen(false); }}
                    className={`relative w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${active ? activeCls : inactiveCls}`}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded" />
                    )}
                    <item.icon size={15} className={active ? t.textPrimary : t.textDim} />
                    <span className="flex-1 text-left pl-1">{item.label}</span>
                    {"badge" in item && item.badge === "runs" && (
                      <span className={`${runsBadgeCls} text-xs px-2 py-1 rounded font-semibold`}>
                        128
                      </span>
                    )}
                    {"badge" in item && item.badge === "dlq" && (
                      <span className={`${dlqBadgeCls} text-xs px-2 py-1 rounded font-semibold`}>
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
        <div className={`mx-3 mb-3 rounded-md border ${t.border} ${t.surfaceAlt} p-3`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${t.textDim} uppercase tracking-wider`}>System</span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-zinc-500"}`} />
              <span className={`text-xs font-semibold ${isLive ? t.statusOk : t.textMuted}`}>
                {isLive ? "LIVE" : "DOWN"}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs ${t.textDim}`}>Ingest</span>
              <span className={`text-xs font-mono ${t.textSecondary}`}>24ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${t.textDim}`}>Queue</span>
              <span className={`text-xs font-mono ${t.textSecondary}`}>12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${t.textDim}`}>DLQ</span>
              <span className="text-xs font-mono text-rose-500">5</span>
            </div>
          </div>
        </div>

        {/* User */}
        <div className={`border-t ${t.border}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center gap-3 px-4 py-3 ${t.hoverBg} transition-colors`}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ backgroundImage: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                >
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-medium ${t.textPrimary} truncate`}>{userDisplayName}</p>
                  <p className={`text-xs ${t.textDim} truncate`}>Pro · {projects.length} projects</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={4} className={`w-56 ${t.surface} ${t.border} ${t.textSecondary}`}>
              <div className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundImage: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                  >
                    {userInitials}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${t.textPrimary} truncate`}>{userDisplayName}</p>
                    <p className={`text-xs ${t.textMuted} truncate`}>{userEmail}</p>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator className={theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"} />
              <DropdownMenuLabel className={`text-xs font-bold uppercase tracking-widest ${t.textDim}`}>Theme</DropdownMenuLabel>
              <DropdownMenuGroup>
                <div className={`mx-2 mb-1 flex rounded-lg border ${t.border} ${t.surfaceAlt} p-1`}>
                  {([
                    { value: "light"  as ThemePreference, icon: Sun,     label: "Light"  },
                    { value: "dark"   as ThemePreference, icon: Moon,    label: "Dark"   },
                    { value: "system" as ThemePreference, icon: Monitor, label: "System" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onThemeChange?.(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all ${
                        themePref === opt.value
                          ? `${t.activeBg} ${t.textPrimary}`
                          : `${t.textMuted} ${t.hoverText}`
                      }`}
                    >
                      <opt.icon size={11} />{opt.label}
                    </button>
                  ))}
                </div>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className={theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"} />
              <DropdownMenuItem
                className={`gap-2 text-xs cursor-pointer ${t.textSecondary} ${theme === "dark" ? "focus:bg-zinc-900 focus:text-white" : "focus:bg-zinc-100 focus:text-zinc-900"}`}
                onClick={() => navigate("/settings")}
              >
                <User size={13} /> Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`gap-2 text-xs cursor-pointer ${t.textSecondary} ${theme === "dark" ? "focus:bg-zinc-900 focus:text-white" : "focus:bg-zinc-100 focus:text-zinc-900"}`}
                onClick={() => setShortcutsOpen(true)}
              >
                <Keyboard size={13} /> Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuSeparator className={theme === "dark" ? "bg-zinc-800" : "bg-zinc-200"} />
              <DropdownMenuItem
                className={`gap-2 text-xs cursor-pointer text-rose-500 focus:text-rose-400 ${theme === "dark" ? "focus:bg-zinc-900" : "focus:bg-rose-50"}`}
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
        <div className="fixed inset-0 bg-black z-40 lg:hidden" style={{ opacity: 0.5 }} onClick={() => setIsOpen(false)} />
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
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const { selectedProjectId, setSelectedProjectId, dateRange, setDateRange } = useAppStore();
  const t = tokens(theme);

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
      className={`h-14 border-b ${t.border} ${t.surface} sticky top-0 z-30 px-4 flex items-center gap-3`}
    >
      {/* Mobile hamburger */}
      <button onClick={toggleSidebar} className={`lg:hidden p-2 ${t.textMuted} ${t.hoverText} transition-colors`}>
        <Menu size={18} />
      </button>

      {/* Project selector */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`w-6 h-6 rounded ${t.surfaceRaise} flex items-center justify-center`}>
          <FolderKanban size={12} className={t.textMuted} />
        </div>
        <select
          value={selectedProjectId ?? ""}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className={`text-sm font-medium bg-transparent ${t.textPrimary} focus:outline-none cursor-pointer`}
        >
          {projects.length === 0 && <option value="">{projectsError ? "Failed to load" : "No projects"}</option>}
          {projects.map((p: Project) => (
            <option key={p.id} value={p.id} className={t.surface}>{p.name}</option>
          ))}
        </select>
        <ChevronDown size={13} className={t.textDim} />
      </div>

      {/* Time tabs */}
      <div className={`hidden md:flex items-center gap-1 ${t.surfaceAlt} border ${t.border} rounded-md p-1`}>
        {Object.entries(DATE_LABELS).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setDateRange(value as "24h" | "7d" | "30d")}
            className={`px-3 py-1 text-xs font-medium rounded transition-all ${
              dateRange === value
                ? `${t.activeBg} ${t.textPrimary}`
                : `${t.textMuted} ${t.hoverText}`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="hidden lg:flex flex-1 relative max-w-xs">
        <Search className={`absolute left-3 top-0 bottom-0 my-auto ${t.textDim}`} size={13} />
        <input
          type="text"
          placeholder="Search runs, steps..."
          value={searchQuery}
          onChange={(e) => {
            const v = e.target.value;
            setSearchParams((p) => { const n = new URLSearchParams(p); v ? n.set("q", v) : n.delete("q"); return n; });
          }}
          className={`w-full ${t.surfaceAlt} border ${t.border} rounded-md py-2 pl-8 pr-3 text-xs ${t.textSecondary} focus:outline-none ${t.borderHover} transition-colors`}
          style={{ paddingLeft: "32px" }}
        />
      </div>

      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        {/* Theme */}
        <button onClick={toggleTheme} className={`p-2 rounded-md ${t.iconButton} transition-all`}>
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* ENV */}
        <div className="hidden xl:flex items-center gap-2">
          <span className={`text-xs font-semibold ${t.textDim} uppercase tracking-wider`}>ENV</span>
          <span className="px-2 py-1 rounded text-xs font-bold bg-amber-500 text-white">
            {environment}
          </span>
        </div>

        {/* API key */}
        <div className="hidden xl:flex items-center gap-2">
          <span className={`text-xs font-semibold ${t.textDim} uppercase tracking-wider`}>API</span>
          <div className={`flex items-center gap-2 ${t.surfaceAlt} border ${t.border} px-2 py-1 rounded ${t.borderHover} transition-colors`}>
            <span className={`text-xs font-mono ${t.textSecondary}`}>{maskedKey}</span>
            <CopyButton value={apiKey} copiedMessage="Copied" iconSize={10} className={`${t.textDim} ${t.hoverText}`} />
          </div>
        </div>

        {/* Role badge */}
        <div
          className="flex items-center gap-1 border text-xs font-bold text-blue-500 px-2 py-1 rounded cursor-pointer transition-colors"
          style={{ borderColor: "#3b82f6" }}
        >
          OWNER <ChevronDown size={10} />
        </div>

        {/* API status */}
        <div className={`flex items-center gap-2 text-xs font-medium ${isApiOk ? t.statusOk : "text-rose-500"}`}>
          <span className={`w-2 h-2 rounded-full ${isApiOk ? "bg-emerald-500" : "bg-rose-500"}`} />
          {isApiOk ? "API Ok" : "API Down"}
        </div>
      </div>
    </header>
  );
};
