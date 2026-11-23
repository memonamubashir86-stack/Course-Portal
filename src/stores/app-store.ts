"use client";

import { create } from "zustand";
import { parseHash, buildHash, type PublicUser } from "@/types";
import { useI18n } from "@/lib/i18n/store";
import {
  authFetch,
  clearSessionToken,
} from "@/lib/auth/client-token";

export interface PlatformBranding {
  appName: string;
  logoUrl: string | null;
}

interface AppState {
  // current parsed route
  hash: string;
  segments: string[];
  query: Record<string, string>;
  // auth
  user: PublicUser | null;
  authLoading: boolean;
  // platform branding
  branding: PlatformBranding;
  // helpers
  setHashFromWindow: () => void;
  navigate: (segments: string[], query?: Record<string, string | undefined>) => void;
  setUser: (u: PublicUser | null) => void;
  setAuthLoading: (b: boolean) => void;
  setBranding: (b: PlatformBranding) => void;
  refreshUser: () => Promise<void>;
  refreshBranding: () => Promise<void>;
}

function readHash(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#/, "");
}

export const useAppStore = create<AppState>((set, get) => ({
  hash: "",
  segments: [],
  query: {},
  user: null,
  authLoading: true,
  branding: {
    appName: "CourseLearn",
    logoUrl: null,
  },
  setHashFromWindow: () => {
    const h = readHash();
    const parsed = parseHash(h);
    if (get().hash === parsed.hash) return;
    set({ hash: parsed.hash, segments: parsed.segments, query: parsed.query });
  },
  navigate: (segments, query) => {
    const newHash = buildHash(segments, query);
    const parsed = parseHash(newHash);
    if (get().hash === parsed.hash) return;
    if (typeof window !== "undefined") {
      window.location.hash = newHash;
    }
    set({ hash: parsed.hash, segments: parsed.segments, query: parsed.query });
  },
  setUser: (u) => set({ user: u }),
  setAuthLoading: (b) => set({ authLoading: b }),
  setBranding: (b) => {
    const clean: PlatformBranding = {
      appName: (b.appName || "").trim() || "CourseLearn",
      logoUrl: b.logoUrl || null,
    };
    set({ branding: clean });
    useI18n.getState().setAppName(clean.appName);
  },
  refreshUser: async () => {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    try {
      const res = await authFetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (!res.ok) {
        set({ user: null });
        return;
      }
      const data = await res.json();
      if (!data.user) {
        clearSessionToken();
      }
      set({ user: data.user ?? null });
    } catch {
      set({ user: null });
    } finally {
      if (timer) clearTimeout(timer);
      set({ authLoading: false });
    }
  },
  refreshBranding: async () => {
    try {
      const res = await fetch("/api/public/settings", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      get().setBranding({
        appName: data?.appName || "CourseLearn",
        logoUrl: data?.logoUrl || null,
      });
    } catch {
      /* keep current branding */
    }
  },
}));

// Helper hook for components to read the current route key
export function useRouteKey(): string {
  const segments = useAppStore((s) => s.segments);
  return segments.join("/");
}
