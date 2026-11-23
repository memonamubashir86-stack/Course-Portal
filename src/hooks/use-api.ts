"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import {
  authFetch,
  clearSessionToken,
  getSessionToken,
} from "@/lib/auth/client-token";

export { authFetch };

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface CacheEntry<T = unknown> {
  data: T;
  fetchedAt: number;
  stale: boolean;
}

const FRESH_WINDOW_MS = 15_000;
const apiCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function getCacheKey(url: string): string {
  const token = getSessionToken();
  const scope = token ? token.slice(-16) : "cookie";
  return `${scope}::${url}`;
}

function getPathname(url: string): string {
  const idx = url.indexOf("?");
  return idx === -1 ? url : url.slice(0, idx);
}

/**
 * Clears all cached API responses and in-flight requests (used on auth changes).
 */
export function clearApiCache() {
  apiCache.clear();
  inFlightRequests.clear();
}

/**
 * Marks cached GET responses stale without deleting them so pages render
 * instantly from cache and silently revalidate in the background.
 */
export function markApiCacheStale() {
  for (const entry of apiCache.values()) {
    entry.stale = true;
  }
}

/**
 * Marks cached GET entries matching a URL substring stale without wiping cache.
 */
export function markApiCacheUrlStale(urlMatch: string) {
  for (const [key, entry] of apiCache.entries()) {
    if (key.includes(urlMatch)) {
      entry.stale = true;
    }
  }
}

async function fetchAndCache<T>(
  cacheKey: string,
  url: string,
  force = false
): Promise<T> {
  if (!force) {
    const existing = inFlightRequests.get(cacheKey);
    if (existing) {
      return existing as Promise<T>;
    }
  }

  const req = authFetch(url, { cache: "no-store", credentials: "include" })
    .then(async (res) => {
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      apiCache.set(cacheKey, {
        data: json,
        fetchedAt: Date.now(),
        stale: false,
      });
      return json as T;
    })
    .finally(() => {
      if (inFlightRequests.get(cacheKey) === req) {
        inFlightRequests.delete(cacheKey);
      }
    });

  inFlightRequests.set(cacheKey, req);
  return req;
}

/**
 * useApiFetch — stale-while-revalidate cached fetch with smooth refetch.
 * Revisiting pages or changing filters never flashes full-screen skeletons
 * when cached/previous data is already available.
 */
export function useApiFetch<T>(
  url: string | null,
  options?: { skip?: boolean; freshOnMount?: boolean; revalidateOnFocus?: boolean }
): ApiState<T> & { refetch: () => void; setData: (d: T | null) => void } {
  const activeUrl = !url || options?.skip ? null : url;
  const cacheKey = activeUrl ? getCacheKey(activeUrl) : null;
  const cached = cacheKey
    ? (apiCache.get(cacheKey) as CacheEntry<T> | undefined)
    : undefined;

  const [state, setState] = useState<{
    url: string | null;
    data: T | null;
    error: string | null;
  }>(() => ({
    url: activeUrl,
    data: cached ? cached.data : null,
    error: null,
  }));

  const [nonce, setNonce] = useState(0);
  const lastFetchedNonceRef = useRef(0);
  const didFreshMountRef = useRef<string | null>(null);

  const refetch = useCallback(() => {
    if (activeUrl) {
      const key = getCacheKey(activeUrl);
      const entry = apiCache.get(key);
      if (entry) entry.stale = true;
    }
    setNonce((n) => n + 1);
  }, [activeUrl]);

  const setData = useCallback(
    (next: T | null) => {
      if (cacheKey) {
        if (next === null) {
          apiCache.delete(cacheKey);
        } else {
          apiCache.set(cacheKey, {
            data: next,
            fetchedAt: Date.now(),
            stale: false,
          });
        }
      }
      setState({ url: activeUrl, data: next, error: null });
    },
    [cacheKey, activeUrl]
  );

  useEffect(() => {
    if (!options?.revalidateOnFocus || !activeUrl) return;
    const onFocus = () => refetch();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [options?.revalidateOnFocus, activeUrl, refetch]);

  useEffect(() => {
    if (!activeUrl || !cacheKey) {
      return;
    }

    const isForced = nonce !== lastFetchedNonceRef.current;
    lastFetchedNonceRef.current = nonce;

    const needsFreshMount =
      Boolean(options?.freshOnMount) && didFreshMountRef.current !== cacheKey;
    if (needsFreshMount) {
      didFreshMountRef.current = cacheKey;
    }

    const existing = apiCache.get(cacheKey) as CacheEntry<T> | undefined;
    const isFresh = Boolean(
      !needsFreshMount &&
        existing &&
        !existing.stale &&
        Date.now() - existing.fetchedAt < FRESH_WINDOW_MS
    );

    let cancelled = false;

    if (!isForced && isFresh && existing) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setState((prev) => {
          if (
            prev.url === activeUrl &&
            prev.error === null &&
            prev.data === existing.data
          ) {
            return prev;
          }
          return { url: activeUrl, data: existing.data, error: null };
        });
      });
      return () => {
        cancelled = true;
      };
    }

    fetchAndCache<T>(cacheKey, activeUrl, isForced || needsFreshMount)
      .then((json) => {
        if (cancelled) return;
        setState((prev) => {
          if (
            prev.url === activeUrl &&
            prev.error === null &&
            prev.data === json
          ) {
            return prev;
          }
          return { url: activeUrl, data: json, error: null };
        });
      })
      .catch((e: any) => {
        if (cancelled) return;
        if (apiCache.has(cacheKey)) {
          return;
        }
        setState({
          url: activeUrl,
          data: null,
          error: e?.message || "Network error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeUrl, cacheKey, nonce, options?.freshOnMount]);

  let resolvedData: T | null = null;
  let resolvedLoading = false;
  let resolvedError: string | null = null;

  if (!activeUrl) {
    resolvedData = null;
    resolvedLoading = false;
    resolvedError = null;
  } else if (cached) {
    resolvedData =
      state.url === activeUrl && state.data !== null ? state.data : cached.data;
    resolvedLoading = false;
    resolvedError = null;
  } else if (state.url === activeUrl) {
    resolvedData = state.data;
    resolvedError = state.error;
    resolvedLoading = state.data === null && state.error === null;
  } else if (
    state.data !== null &&
    state.url !== null &&
    getPathname(state.url) === getPathname(activeUrl)
  ) {
    resolvedData = state.data;
    resolvedLoading = false;
    resolvedError = null;
  } else {
    resolvedData = null;
    resolvedLoading = true;
    resolvedError = null;
  }

  return {
    data: resolvedData,
    loading: resolvedLoading,
    error: resolvedError,
    refetch,
    setData,
  };
}

let beforeLogoutFlush: (() => Promise<void> | void) | null = null;

/**
 * Registers a cleanup/flush callback (e.g. saving active video timestamp)
 * that runs BEFORE logout invalidates the session cookie & Bearer token.
 */
export function registerBeforeLogoutFlush(
  fn: (() => Promise<void> | void) | null
) {
  beforeLogoutFlush = fn;
}

/**
 * apiPost — POST/PUT/DELETE helper with JSON body.
 */
export async function apiPost<T = any>(
  url: string,
  body?: any,
  opts?: { method?: string; rawBody?: boolean; skipCacheInvalidation?: boolean }
): Promise<T> {
  const method = opts?.method || (body ? "POST" : "GET");
  const isAuthSessionChange =
    url.includes("/api/auth/logout") ||
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register");

  if (url.includes("/api/auth/logout")) {
    if (beforeLogoutFlush) {
      try {
        await Promise.race([
          Promise.resolve(beforeLogoutFlush()),
          new Promise<void>((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch {
        /* do not block logout if flush fails */
      }
    }
    clearSessionToken();
    clearApiCache();
  }
  let res: Response;
  try {
    res = await authFetch(url, {
      method,
      headers: opts?.rawBody ? undefined : { "Content-Type": "application/json" },
      body: opts?.rawBody ? (body as BodyInit) : body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch (err: any) {
    const msg = err?.message || "Network error";
    toast({ title: "Error", description: msg, variant: "destructive" });
    throw err;
  }
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: `Unexpected server response (${res.status})` };
  }
  if (!res.ok) {
    const msg = json.error || `Request failed (${res.status})`;
    toast({ title: "Error", description: msg, variant: "destructive" });
    throw new Error(msg);
  }
  if (isAuthSessionChange) {
    clearApiCache();
  } else if (method !== "GET" && !opts?.skipCacheInvalidation) {
    markApiCacheStale();
  }
  return json as T;
}

/**
 * apiUpload — FormData upload helper.
 */
export async function apiUpload<T = any>(url: string, formData: FormData): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(url, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch (err: any) {
    const msg = err?.message || "Network error during upload";
    toast({ title: "Error", description: msg, variant: "destructive" });
    throw err;
  }
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: `Unexpected server response (${res.status})` };
  }
  if (!res.ok) {
    const msg = json.error || `Upload failed (${res.status})`;
    toast({ title: "Error", description: msg, variant: "destructive" });
    throw new Error(msg);
  }
  markApiCacheStale();
  return json as T;
}

/**
 * apiUploadWithProgress — FormData upload with real-time progress tracking.
 * Uses XMLHttpRequest (fetch doesn't support upload progress). The onProgress
 * callback receives a 0-100 percentage as bytes are sent.
 */
export function apiUploadWithProgress<T = any>(
  url: string,
  formData: FormData,
  method: "POST" | "PUT" = "POST",
  onProgress?: (percent: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.withCredentials = true;
    const token = getSessionToken();
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          markApiCacheStale();
          resolve(json as T);
        } else {
          const msg = json.error || `Upload failed (${xhr.status})`;
          toast({ title: "Error", description: msg, variant: "destructive" });
          reject(new Error(msg));
        }
      } catch {
        reject(new Error("Invalid server response"));
      }
    };

    xhr.onerror = () => {
      toast({ title: "Error", description: "Network error during upload", variant: "destructive" });
      reject(new Error("Network error during upload"));
    };

    xhr.send(formData);
  });
}
