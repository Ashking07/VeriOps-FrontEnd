import { useSyncExternalStore } from "react";

export type TokenOut = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_at: string | number;
};

export type JwtUserClaims = {
  sub?: string;
  email?: string;
  name?: string;
  username?: string;
};

type AuthSnapshot = {
  accessToken: string | null;
  accessTokenExpiresAtMs: number | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: JwtUserClaims | null;
};

type JsonBody = Record<string, unknown> | string | null;

export class AuthApiError extends Error {
  status: number;
  body: JsonBody;

  constructor(message: string, status: number, body: JsonBody) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.body = body;
  }
}

type RequestExecutor = (accessToken: string | null) => Promise<Response>;

const decodeJwtPayload = (token: string): JwtUserClaims | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return {
      sub: payload.sub as string | undefined,
      email: (payload.email ?? payload.e) as string | undefined,
      name: (payload.name ?? payload.full_name ?? payload.display_name) as string | undefined,
      username: (payload.username ?? payload.preferred_username) as string | undefined,
    };
  } catch {
    return null;
  }
};

const REFRESH_TOKEN_STORAGE_KEY = "veriops-refresh-token";
const REFRESH_SKEW_MS = 60_000;

let accessToken: string | null = null;
let accessTokenExpiresAtMs: number | null = null;
let cookieSessionAuthenticated = false;
let initialized = false;
let refreshInFlight: Promise<boolean> | null = null;
let userClaims: JwtUserClaims | null = null;

let cachedAuthSnapshot: AuthSnapshot = {
  accessToken: null,
  accessTokenExpiresAtMs: null,
  isInitialized: false,
  isAuthenticated: false,
  user: null,
};

const listeners = new Set<() => void>();

const env = (import.meta as unknown as { env: Record<string, string | boolean | undefined> }).env;
const RAW_API_BASE_URL =
  (env.VITE_API_BASE_URL as string | undefined) ??
  (env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ??
  "";

const API_BASE_URL =
  env.DEV &&
  RAW_API_BASE_URL &&
  (RAW_API_BASE_URL.includes("localhost") || RAW_API_BASE_URL.includes("127.0.0.1"))
    ? "/api"
    : RAW_API_BASE_URL;

const DEFAULT_AUTH_SERVER_BASE_URL =
  RAW_API_BASE_URL.startsWith("http://") || RAW_API_BASE_URL.startsWith("https://")
    ? RAW_API_BASE_URL
    : "http://localhost:8000";

const AUTH_SERVER_BASE_URL =
  (
    (env.VITE_AUTH_SERVER_BASE_URL as string | undefined) ??
    (env.NEXT_PUBLIC_AUTH_SERVER_BASE_URL as string | undefined) ??
    DEFAULT_AUTH_SERVER_BASE_URL
  ).replace(/\/$/, "");

const GOOGLE_CALLBACK_MODE =
  (
    (env.VITE_GOOGLE_CALLBACK_MODE as string | undefined) ??
    (env.NEXT_PUBLIC_GOOGLE_CALLBACK_MODE as string | undefined) ??
    ""
  )
    .trim()
    .toLowerCase();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const parseExpiresAtMs = (value: string | number): number => {
  if (typeof value === "number") {
    if (value > 1_000_000_000_000) {
      return value;
    }
    return value * 1000;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return Date.now() + 15 * 60 * 1000;
  }
  return parsed;
};

const buildUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (!API_BASE_URL) {
    return path;
  }
  if (API_BASE_URL.startsWith("/")) {
    return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
  }
  return new URL(path, API_BASE_URL).toString();
};

const buildAuthServerUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return new URL(path, `${AUTH_SERVER_BASE_URL}/`).toString();
};

const parseResponseBody = async (response: Response): Promise<JsonBody> => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return text;
    }
  }
  return text;
};

const pickErrorMessage = (status: number, body: JsonBody) => {
  if (body && typeof body === "object") {
    const message =
      (body.message as string | undefined) ??
      (body.detail as string | undefined) ??
      (body.error as string | undefined);
    if (message) {
      return message;
    }
  }
  if (typeof body === "string" && body.trim()) {
    return body;
  }
  return `Auth request failed (${status})`;
};

const decodeAuthError = (value: string) => {
  try {
    return decodeURIComponent(value).replace(/_/g, " ");
  } catch {
    return value.replace(/_/g, " ");
  }
};

const isTokenOutBody = (body: JsonBody): body is TokenOut =>
  !!body &&
  typeof body === "object" &&
  typeof (body as Record<string, unknown>).access_token === "string" &&
  typeof (body as Record<string, unknown>).refresh_token === "string" &&
  typeof (body as Record<string, unknown>).expires_at !== "undefined";

const parseServerSessionRevoked = (body: JsonBody): boolean | null => {
  if (!body || typeof body !== "object") {
    return null;
  }
  const value = (body as Record<string, unknown>).server_session_revoked;
  if (typeof value === "boolean") {
    return value;
  }
  return null;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const getStoredRefreshToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
};

const setStoredRefreshToken = (token: string) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
};

const clearStoredRefreshToken = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

const setSession = (tokenOut: TokenOut) => {
  accessToken = tokenOut.access_token;
  accessTokenExpiresAtMs = parseExpiresAtMs(tokenOut.expires_at);
  cookieSessionAuthenticated = true;
  userClaims = decodeJwtPayload(tokenOut.access_token);
  setStoredRefreshToken(tokenOut.refresh_token);
  emit();
};

export const clearSession = () => {
  accessToken = null;
  accessTokenExpiresAtMs = null;
  cookieSessionAuthenticated = false;
  userClaims = null;
  clearStoredRefreshToken();
  emit();
};

const probeCookieSession = async (): Promise<boolean> => {
  const response = await fetch(buildUrl("/v1/projects"), {
    method: "GET",
    credentials: "include",
  });

  const isAuthenticatedViaCookie = response.status === 200;
  if (!isAuthenticatedViaCookie) {
    cookieSessionAuthenticated = false;
    return false;
  }

  cookieSessionAuthenticated = true;
  return true;
};

const authRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  const body = await parseResponseBody(response);
  if (!response.ok) {
    throw new AuthApiError(pickErrorMessage(response.status, body), response.status, body);
  }
  return body as T;
};

export const getAccessToken = () => accessToken;

export const getAuthSnapshot = (): AuthSnapshot => {
  const nextIsAuthenticated =
    (typeof accessToken === "string" &&
      typeof accessTokenExpiresAtMs === "number" &&
      accessTokenExpiresAtMs > Date.now()) ||
    cookieSessionAuthenticated;

  if (
    cachedAuthSnapshot.accessToken === accessToken &&
    cachedAuthSnapshot.accessTokenExpiresAtMs === accessTokenExpiresAtMs &&
    cachedAuthSnapshot.isInitialized === initialized &&
    cachedAuthSnapshot.isAuthenticated === nextIsAuthenticated
  ) {
    return cachedAuthSnapshot;
  }

  cachedAuthSnapshot = {
    accessToken,
    accessTokenExpiresAtMs,
    isInitialized: initialized,
    user: userClaims,
    isAuthenticated: nextIsAuthenticated,
  };

  return cachedAuthSnapshot;
};

export const subscribeAuth = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAuthSession = () =>
  useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthSnapshot);

export const login = async (body: { email: string; password: string }) => {
  const tokenOut = await authRequest<TokenOut>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeEmail(body.email),
      password: body.password,
    }),
  });
  setSession(tokenOut);
  return tokenOut;
};

export const beginGoogleLogin = () => {
  if (typeof window === "undefined" || !window.location) {
    return;
  }

  const loginUrl = new URL(buildAuthServerUrl("/v1/auth/google/login"));
  if (GOOGLE_CALLBACK_MODE === "json") {
    loginUrl.searchParams.set("mode", "json");
  }

  window.location.assign(loginUrl.toString());
};

export const completeGoogleCallback = async (search: string) => {
  const query = search?.startsWith("?") ? search : search ? `?${search}` : "";
  const queryParams = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const authError = queryParams.get("auth_error");
  if (authError) {
    throw new AuthApiError(
      `Google sign-in failed: ${decodeAuthError(authError)}`,
      401,
      { auth_error: authError }
    );
  }

  const response = await fetch(buildAuthServerUrl(`/v1/auth/google/callback${query}`), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  const body = await parseResponseBody(response);
  if (!response.ok) {
    throw new AuthApiError(
      pickErrorMessage(response.status, body),
      response.status,
      body
    );
  }

  if (isTokenOutBody(body)) {
    setSession(body);
  } else {
    const hasCookieSession = await probeCookieSession();
    if (!hasCookieSession) {
      throw new AuthApiError("Google login callback did not establish a session", 401, body);
    }
  }

  initialized = true;
  emit();
  return body as TokenOut;
};

export const bootstrapFirstAdmin = async (body: {
  email: string;
  password: string;
  username?: string;
}) => {
  const tokenOut = await authRequest<TokenOut>("/v1/auth/bootstrap", {
    method: "POST",
    body: JSON.stringify({
      email: normalizeEmail(body.email),
      password: body.password,
      username: body.username,
    }),
  });
  setSession(tokenOut);
  return tokenOut;
};

export const refreshSession = async (): Promise<boolean> => {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    clearSession();
    return false;
  }

  refreshInFlight = (async () => {
    try {
      const tokenOut = await authRequest<TokenOut>("/v1/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      setSession(tokenOut);
      return true;
    } catch {
      clearSession();
      return false;
    } finally {
      refreshInFlight = null;
      initialized = true;
      emit();
    }
  })();

  return refreshInFlight;
};

export const initializeAuth = async () => {
  if (initialized) {
    return;
  }
  const refreshToken = getStoredRefreshToken();
  if (refreshToken) {
    const refreshed = await refreshSession();
    if (!refreshed) {
      await probeCookieSession();
    }
  } else {
    await probeCookieSession();
  }

  initialized = true;
  emit();
};

export const refreshIfExpiringSoon = async () => {
  if (!accessToken || !accessTokenExpiresAtMs) {
    return false;
  }
  const shouldRefresh = accessTokenExpiresAtMs - Date.now() <= REFRESH_SKEW_MS;
  if (!shouldRefresh) {
    return false;
  }
  return refreshSession();
};

export const logout = async (): Promise<{ serverSessionCleared: boolean }> => {
  const token = getAccessToken();
  const refreshToken = getStoredRefreshToken();
  const payload: Record<string, string> = {};
  if (token) {
    payload.access_token = token;
  }
  if (refreshToken) {
    payload.refresh_token = refreshToken;
  }

  let serverSessionCleared = false;

  try {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(buildAuthServerUrl("/v1/auth/logout"), {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const body = await parseResponseBody(response);
    if (!response.ok) {
      throw new AuthApiError(pickErrorMessage(response.status, body), response.status, body);
    }

    const reportedServerState = parseServerSessionRevoked(body);
    if (reportedServerState === null) {
      serverSessionCleared = !(await probeCookieSession());
    } else {
      serverSessionCleared = reportedServerState;
    }
  } catch {
    serverSessionCleared = false;
  } finally {
    initialized = true;
    clearSession();
  }

  return { serverSessionCleared };
};

export const withAuthRetry = async (
  execute: RequestExecutor,
  refreshFn: () => Promise<boolean> = refreshSession
) => {
  let response = await execute(getAccessToken());
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshFn();
  if (!refreshed) {
    return response;
  }

  response = await execute(getAccessToken());
  return response;
};

export const __authTestUtils = {
  REFRESH_TOKEN_STORAGE_KEY,
  parseExpiresAtMs,
  setSession,
  setInitialized: (value: boolean) => {
    initialized = value;
    emit();
  },
};
