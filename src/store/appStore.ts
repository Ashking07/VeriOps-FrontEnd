import React, { useEffect } from "react";
import { create } from "zustand";

export type DateRange = "24h" | "7d" | "30d";

type AppState = {
  selectedProjectId: string | null;
  dateRange: DateRange;
  setSelectedProjectId: (projectId: string | null) => void;
  setDateRange: (range: DateRange) => void;
};

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "24h": "Last 24h",
  "7d": "7d",
  "30d": "30d",
};

const STORAGE_KEY = "veriops-app-state";

export const useAppStore = create<AppState>((set) => ({
  selectedProjectId: null,
  dateRange: "24h",
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setDateRange: (dateRange) => set({ dateRange }),
}));

const persistAppState = (state: AppState) => ({
  selectedProjectId: state.selectedProjectId,
  dateRange: state.dateRange,
});

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        useAppStore.setState({
          selectedProjectId: parsed.selectedProjectId ?? null,
          dateRange: parsed.dateRange ?? "24h",
        });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const unsubscribe = useAppStore.subscribe((state) => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistAppState(state)));
    });

    return unsubscribe;
  }, []);

  return React.createElement(React.Fragment, null, children);
};
