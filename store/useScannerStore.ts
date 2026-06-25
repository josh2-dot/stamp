import { create } from "zustand";
import type { VerifyResponse } from "@/types";

export type ScanEntry = {
  id: string;
  qr: string;
  at: number;
  result: VerifyResponse;
};

interface ScannerState {
  scans: ScanEntry[];
  current: VerifyResponse | null;
  showingResult: boolean;
  /** IDs of paid tickets fetched at session start, used for offline fallback */
  offlineCache: Set<string>;
  pushScan: (entry: ScanEntry) => void;
  setCurrent: (r: VerifyResponse | null) => void;
  setShowingResult: (v: boolean) => void;
  setOfflineCache: (ids: string[]) => void;
  clear: () => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  scans: [],
  current: null,
  showingResult: false,
  offlineCache: new Set(),
  pushScan: (entry) =>
    set((s) => ({ scans: [entry, ...s.scans].slice(0, 100) })),
  setCurrent: (current) => set({ current }),
  setShowingResult: (showingResult) => set({ showingResult }),
  setOfflineCache: (ids) => set({ offlineCache: new Set(ids) }),
  clear: () => set({ scans: [], current: null, showingResult: false }),
}));
