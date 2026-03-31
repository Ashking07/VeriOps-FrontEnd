import { describe, expect, it } from "vitest";
import { resolveAdminGuardDecision } from "./routeGuards";

describe("admin route guard decisions", () => {
  it("redirects to login when unauthenticated", () => {
    const decision = resolveAdminGuardDecision({
      isInitialized: true,
      isAuthenticated: false,
      hasScopeId: true,
      pageState: "ok",
      hasPermissionHints: false,
      canManage: true,
    });

    expect(decision).toBe("redirect-login");
  });

  it("returns forbidden when authenticated but unauthorized", () => {
    const decision = resolveAdminGuardDecision({
      isInitialized: true,
      isAuthenticated: true,
      hasScopeId: true,
      pageState: "forbidden",
      hasPermissionHints: true,
      canManage: false,
    });

    expect(decision).toBe("forbidden");
  });

  it("allows access when authorized", () => {
    const decision = resolveAdminGuardDecision({
      isInitialized: true,
      isAuthenticated: true,
      hasScopeId: true,
      pageState: "ok",
      hasPermissionHints: true,
      canManage: true,
    });

    expect(decision).toBe("allow");
  });
});
