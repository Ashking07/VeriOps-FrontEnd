import { MembershipPageState } from "./membershipAccess";

export type AdminGuardDecision =
  | "loading"
  | "redirect-login"
  | "forbidden"
  | "not-found"
  | "error"
  | "allow";

export const resolveAdminGuardDecision = (params: {
  isInitialized: boolean;
  isAuthenticated: boolean;
  hasScopeId: boolean;
  pageState: MembershipPageState;
  hasPermissionHints: boolean;
  canManage: boolean;
}): AdminGuardDecision => {
  if (!params.isInitialized) {
    return "loading";
  }

  if (!params.isAuthenticated) {
    return "redirect-login";
  }

  if (!params.hasScopeId) {
    return "not-found";
  }

  if (params.pageState === "unauthorized") {
    return "redirect-login";
  }

  if (params.pageState === "forbidden") {
    return "forbidden";
  }

  if (params.pageState === "not-found") {
    return "not-found";
  }

  if (params.pageState === "error") {
    return "error";
  }

  if (params.hasPermissionHints && !params.canManage) {
    return "forbidden";
  }

  return "allow";
};
