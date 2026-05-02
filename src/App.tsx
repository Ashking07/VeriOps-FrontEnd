import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Sidebar, TopBar } from "./components/layout/Navigation";
import { OverviewPage } from "./components/overview/OverviewPage";
import { RunsPage } from "./components/runs/RunsPage";
import { RunDetail } from "./components/runs/RunDetail";
import { IngestPage } from "./components/ingest/IngestPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { PoliciesPage } from "./components/policies/PoliciesPage";
import { ProjectsPage } from "./components/projects/ProjectsPage";
import { ProjectDetailPage } from "./components/projects/ProjectDetailPage";
import { OrgMembershipsPage } from "./components/memberships/OrgMembershipsPage";
import { ProjectMembershipsPage } from "./components/memberships/ProjectMembershipsPage";
import { ProjectApiKeysPage } from "./components/apiKeys/ProjectApiKeysPage";
import { DlqPage } from "./components/dlq/DlqPage";
import { AnimatePresence, motion } from "motion/react";
import { Toaster } from "sonner";
import { AuthSessionManager } from "./components/auth/AuthSessionManager";
import { LoginPage } from "./components/auth/LoginPage";
import { BootstrapAdminPage } from "./components/auth/BootstrapAdminPage";
import { GoogleCallbackPage } from "./components/auth/GoogleCallbackPage";
import { useAuthSession } from "./lib/auth";
import { AdminRouteGuard } from "./components/auth/AdminRouteGuard";
import { useAppStore } from "./store/appStore";

const RequireAuth = () => {
  const { isInitialized, isAuthenticated } = useAuthSession();
  if (!isInitialized) {
    return <div className="text-sm text-zinc-500 p-6">Initializing session...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

const GuardedPoliciesPage = ({ theme }: { theme: "dark" | "light" }) => {
  const { selectedProjectId } = useAppStore();
  return (
    <AdminRouteGuard scope="project" scopeId={selectedProjectId} theme={theme}>
      <PoliciesPage theme={theme} />
    </AdminRouteGuard>
  );
};

const GuardedProjectMembershipsPage = ({ theme }: { theme: "dark" | "light" }) => {
  const { projectId } = useParams();
  return (
    <AdminRouteGuard scope="project" scopeId={projectId} theme={theme}>
      <ProjectMembershipsPage theme={theme} />
    </AdminRouteGuard>
  );
};

const GuardedProjectApiKeysPage = ({ theme }: { theme: "dark" | "light" }) => {
  const { projectId } = useParams();
  return (
    <AdminRouteGuard scope="project" scopeId={projectId} theme={theme}>
      <ProjectApiKeysPage theme={theme} />
    </AdminRouteGuard>
  );
};

const GuardedDlqPage = ({ theme }: { theme: "dark" | "light" }) => {
  const { selectedProjectId } = useAppStore();
  return (
    <AdminRouteGuard scope="project" scopeId={selectedProjectId} theme={theme}>
      <DlqPage theme={theme} />
    </AdminRouteGuard>
  );
};

const GuardedOrgMembershipsPage = ({ theme }: { theme: "dark" | "light" }) => {
  const { orgId } = useParams();
  return (
    <AdminRouteGuard scope="org" scopeId={orgId} theme={theme}>
      <OrgMembershipsPage theme={theme} />
    </AdminRouteGuard>
  );
};

const ProtectedRoutes = ({ theme }: { theme: "dark" | "light" }) => {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route
          path="/overview"
          element={
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <OverviewPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/runs"
          element={
            <motion.div
              key="runs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <RunsPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/runs/:runId"
          element={
            <motion.div
              key="run-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <RunDetail theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/policies"
          element={
            <motion.div
              key="policies"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <GuardedPoliciesPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/projects"
          element={
            <motion.div
              key="projects"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProjectsPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <motion.div
              key="project-detail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProjectDetailPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/projects/:projectId/memberships"
          element={
            <motion.div
              key="project-memberships"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <GuardedProjectMembershipsPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/projects/:projectId/api-keys"
          element={
            <motion.div
              key="project-api-keys"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <GuardedProjectApiKeysPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/orgs/:orgId/memberships"
          element={
            <motion.div
              key="org-memberships"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <GuardedOrgMembershipsPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/dlq"
          element={
            <motion.div
              key="dlq"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <GuardedDlqPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/ingest"
          element={
            <motion.div
              key="ingest"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <IngestPage theme={theme} />
            </motion.div>
          }
        />
        <Route
          path="/settings"
          element={
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <SettingsPage theme={theme} />
            </motion.div>
          }
        />
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

type ThemePreference = "light" | "dark" | "system";

const resolveTheme = (pref: ThemePreference): "dark" | "light" => {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
};

const getStoredThemePref = (): ThemePreference => {
  const stored = localStorage.getItem("veriops-theme");
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "dark";
};

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>(getStoredThemePref);
  const theme = resolveTheme(themePref);
  const location = useLocation();
  const isAuthRoute =
    location.pathname === "/login" ||
    location.pathname === "/bootstrap-first-admin" ||
    location.pathname === "/v1/auth/google/callback";

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  useEffect(() => {
    if (themePref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setThemePref("system"); // re-trigger resolve
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themePref]);

  const handleThemeChange = (pref: ThemePreference) => {
    localStorage.setItem("veriops-theme", pref);
    setThemePref(pref);
  };

  const toggleTheme = () => {
    handleThemeChange(theme === "dark" ? "light" : "dark");
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" ? "bg-zinc-950 text-zinc-200" : "bg-zinc-50 text-zinc-900"
      } font-sans selection:bg-blue-500/30`}
    >
      <Toaster theme={theme} position="bottom-right" closeButton />
      <AuthSessionManager />

      {!isAuthRoute && (
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} theme={theme} themePref={themePref} onThemeChange={handleThemeChange} />
      )}

      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ${
          isAuthRoute ? "" : "lg:pl-64"
        }`}
      >
        {!isAuthRoute && (
          <TopBar
            toggleSidebar={() => setIsSidebarOpen(true)}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        )}

        <main
          className={`flex-1 overflow-x-hidden relative ${
            isAuthRoute ? "p-4 md:p-8 flex items-center justify-center" : "p-4 md:p-8"
          }`}
        >
          <Routes>
            <Route path="/login" element={<LoginPage theme={theme} />} />
            <Route
              path="/bootstrap-first-admin"
              element={<BootstrapAdminPage theme={theme} />}
            />
            <Route
              path="/v1/auth/google/callback"
              element={<GoogleCallbackPage theme={theme} />}
            />
            <Route element={<RequireAuth />}>
              <Route path="/*" element={<ProtectedRoutes theme={theme} />} />
            </Route>
          </Routes>
        </main>

      </div>
    </div>
  );
}
