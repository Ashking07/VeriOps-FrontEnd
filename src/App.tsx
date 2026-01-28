import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar, TopBar } from "./components/layout/Navigation";
import { OverviewPage } from "./components/overview/OverviewPage";
import { RunsPage } from "./components/runs/RunsPage";
import { RunDetail } from "./components/runs/RunDetail";
import { IngestPage } from "./components/ingest/IngestPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { PoliciesPage } from "./components/policies/PoliciesPage";
import { AnimatePresence, motion } from "motion/react";
import { Toaster } from "sonner";

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        theme === "dark" ? "bg-zinc-950 text-zinc-200" : "bg-zinc-50 text-zinc-900"
      } font-sans selection:bg-blue-500/30`}
    >
      <Toaster theme={theme} position="bottom-right" closeButton />

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} theme={theme} />

      <div className="lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <TopBar
          toggleSidebar={() => setIsSidebarOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden relative">
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
                    <PoliciesPage theme={theme} />
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
        </main>

        <footer
          className={`px-8 py-6 border-t flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300 ${
            theme === "dark" ? "border-zinc-800" : "border-zinc-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              © 2026 VeriOps Inc.
            </span>
            <a
              href="#"
              className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              Documentation
            </a>
            <a
              href="#"
              className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
            >
              Support
            </a>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              All systems operational
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
