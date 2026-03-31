import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginGoogleLogin,
  completeGoogleCallback,
  __authTestUtils,
  clearSession,
  getAccessToken,
  getAuthSnapshot,
  initializeAuth,
  logout,
  refreshSession,
  withAuthRetry,
} from "./auth";

type LocalStorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const localStorageMock = (): LocalStorageMock => {
  const storage = new Map<string, string>();
  return {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      storage.set(key, value);
    },
    removeItem: (key) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  };
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

describe("auth refresh behavior", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: localStorageMock(),
      },
      writable: true,
      configurable: true,
    });

    __authTestUtils.setInitialized(true);
    clearSession();
    vi.restoreAllMocks();
  });

  it("retries original request once when refresh succeeds", async () => {
    __authTestUtils.setSession({
      access_token: "expired-access",
      refresh_token: "old-refresh",
      token_type: "bearer",
      expires_at: Date.now() - 60_000,
    });

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            access_token: "new-access",
            refresh_token: "new-refresh",
            token_type: "bearer",
            expires_at: Date.now() + 15 * 60_000,
          },
          200
        )
      ) as unknown as typeof fetch;

    let requestCount = 0;
    const response = await withAuthRetry(async (token) => {
      requestCount += 1;
      if (requestCount === 1) {
        expect(token).toBe("expired-access");
        return jsonResponse({ message: "unauthorized" }, 401);
      }
      expect(token).toBe("new-access");
      return jsonResponse({ ok: true }, 200);
    });

    expect(response.status).toBe(200);
    expect(requestCount).toBe(2);
  });

  it("rotates stored refresh token on refresh success", async () => {
    __authTestUtils.setSession({
      access_token: "expired-access",
      refresh_token: "old-refresh",
      token_type: "bearer",
      expires_at: Date.now() - 1,
    });

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            access_token: "rotated-access",
            refresh_token: "rotated-refresh",
            token_type: "bearer",
            expires_at: Date.now() + 15 * 60_000,
          },
          200
        )
      ) as unknown as typeof fetch;

    const ok = await refreshSession();

    expect(ok).toBe(true);
    expect(window.localStorage.getItem(__authTestUtils.REFRESH_TOKEN_STORAGE_KEY)).toBe(
      "rotated-refresh"
    );
  });

  it("clears session when refresh fails", async () => {
    __authTestUtils.setSession({
      access_token: "expired-access",
      refresh_token: "old-refresh",
      token_type: "bearer",
      expires_at: Date.now() - 1,
    });

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "invalid refresh" }, 401)) as unknown as typeof fetch;

    let requestCount = 0;
    const response = await withAuthRetry(async () => {
      requestCount += 1;
      return jsonResponse({ message: "unauthorized" }, 401);
    });

    expect(response.status).toBe(401);
    expect(requestCount).toBe(1);
    expect(window.localStorage.getItem(__authTestUtils.REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe("google auth flow", () => {
  beforeEach(() => {
    const storage = localStorageMock();
    const assign = vi.fn();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: storage,
        location: {
          assign,
        },
      },
      writable: true,
      configurable: true,
    });

    __authTestUtils.setInitialized(false);
    clearSession();
    vi.restoreAllMocks();
  });

  it("redirects browser to google login route", () => {
    beginGoogleLogin();
    expect(window.location.assign).toHaveBeenCalledWith(
      expect.stringContaining("/v1/auth/google/login")
    );
  });

  it("stores token payload from google callback", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "google-access",
          refresh_token: "google-refresh",
          token_type: "bearer",
          expires_at: Date.now() + 60_000,
        })
      ) as unknown as typeof fetch;

    await completeGoogleCallback("?code=abc&state=123");

    expect(getAccessToken()).toBe("google-access");
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toEqual(
      expect.objectContaining({ credentials: "include" })
    );
    expect(window.localStorage.getItem(__authTestUtils.REFRESH_TOKEN_STORAGE_KEY)).toBe(
      "google-refresh"
    );
  });

  it("treats callback auth_error query as login failure", async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    await expect(completeGoogleCallback("?auth_error=access_denied")).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining("Google sign-in failed"),
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("marks session authenticated from cookie probe when no refresh token exists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ projects: [] }, 200)) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    await initializeAuth();

    const probeInit =
      (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
        | RequestInit
        | undefined;

    expect(getAuthSnapshot().isInitialized).toBe(true);
    expect(getAuthSnapshot().isAuthenticated).toBe(true);
    expect(probeInit).toEqual(expect.objectContaining({ credentials: "include" }));
    expect(new Headers(probeInit?.headers).get("Authorization")).toBeNull();
    expect(new Headers(probeInit?.headers).get("x-api-key")).toBeNull();
  });

  it("keeps session unauthenticated when cookie probe returns 401", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "unauthorized" }, 401)) as unknown as typeof fetch;

    await initializeAuth();

    expect(getAuthSnapshot().isInitialized).toBe(true);
    expect(getAuthSnapshot().isAuthenticated).toBe(false);
  });
});

describe("logout behavior", () => {
  beforeEach(() => {
    const storage = localStorageMock();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: storage,
      },
      writable: true,
      configurable: true,
    });

    __authTestUtils.setInitialized(true);
    clearSession();
    vi.restoreAllMocks();
  });

  it("uses direct backend logout with token payload when present", async () => {
    __authTestUtils.setSession({
      access_token: "access-token",
      refresh_token: "refresh-token",
      token_type: "bearer",
      expires_at: Date.now() + 60_000,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ server_session_revoked: true }, 200)) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const result = await logout();
    const [logoutUrl, logoutInit] = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const logoutHeaders = new Headers(logoutInit.headers);

    expect(result.serverSessionCleared).toBe(true);
    expect(getAuthSnapshot().isAuthenticated).toBe(false);
    expect(logoutUrl).toContain("http://localhost:8000/v1/auth/logout");
    expect(logoutInit).toEqual(expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(logoutHeaders.get("Authorization")).toBe("Bearer access-token");
    expect(JSON.parse(String(logoutInit.body))).toEqual({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
  });

  it("falls back to cookie probe when logout response has no revocation flag", async () => {
    __authTestUtils.setSession({
      access_token: "access-token",
      refresh_token: "refresh-token",
      token_type: "bearer",
      expires_at: Date.now() + 60_000,
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse({ detail: "unauthorized" }, 401)) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const result = await logout();

    expect(result.serverSessionCleared).toBe(true);
    expect(getAuthSnapshot().isAuthenticated).toBe(false);
    expect((fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0]).toEqual(
      expect.stringContaining("/v1/projects")
    );
  });
});
