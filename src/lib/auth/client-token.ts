"use client";

const TOKEN_STORAGE_KEY = "courselearn_session_token";
let memoryToken: string | null = null;

export function getSessionToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      memoryToken = stored;
      return stored;
    }
  } catch {
    /* ignore storage errors */
  }
  return null;
}

export function setSessionToken(token: string | null | undefined) {
  if (!token) {
    clearSessionToken();
    return;
  }
  memoryToken = token;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    /* ignore storage errors */
  }
}

export function clearSessionToken() {
  memoryToken = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* ignore storage errors */
  }
}

export function withAuthHeaders(headersInit?: HeadersInit): Headers {
  const headers = new Headers(headersInit);
  const token = getSessionToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = withAuthHeaders(init?.headers);
  return fetch(input, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  });
}
