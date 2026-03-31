import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { getOrgMemberships, getProjectMemberships } from "../../lib/api";
import {
  deriveMembershipPageState,
  hasMembershipManagePermission,
} from "../../lib/membershipAccess";
import { resolveAdminGuardDecision } from "../../lib/routeGuards";
import { useAuthSession } from "../../lib/auth";
import { MembershipState } from "../memberships/MembershipState";

type GuardScope = "project" | "org";

type AdminRouteGuardProps = {
  scope: GuardScope;
  scopeId: string | null | undefined;
  theme: "dark" | "light";
  children: React.ReactNode;
};

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  scope,
  scopeId,
  theme,
  children,
}) => {
  const { isInitialized, isAuthenticated } = useAuthSession();
  const hasScopeId = Boolean(scopeId);

  const permissionQuery = useQuery({
    queryKey: ["admin-route-guard", scope, scopeId],
    queryFn: () => {
      if (!scopeId) {
        return Promise.resolve(null);
      }
      return scope === "project"
        ? getProjectMemberships(scopeId)
        : getOrgMemberships(scopeId);
    },
    enabled: isInitialized && isAuthenticated && hasScopeId,
    retry: false,
  });

  const pageState = permissionQuery.error
    ? deriveMembershipPageState(permissionQuery.error)
    : "ok";

  const hasPermissionHints = useMemo(() => {
    const data = permissionQuery.data;
    if (!data) {
      return false;
    }

    return (
      typeof data.can_manage_memberships === "boolean" ||
      Array.isArray(data.permissions) ||
      typeof data.capabilities?.manage_memberships === "boolean"
    );
  }, [permissionQuery.data]);

  const canManage = hasMembershipManagePermission(permissionQuery.data ?? {});

  const decision = resolveAdminGuardDecision({
    isInitialized,
    isAuthenticated,
    hasScopeId,
    pageState,
    hasPermissionHints,
    canManage,
  });

  if (decision === "loading") {
    return <div className="text-sm text-zinc-500 p-6">Checking access...</div>;
  }

  if (decision === "redirect-login") {
    return <Navigate to="/login" replace />;
  }

  if (decision === "forbidden") {
    return <MembershipState state="forbidden" theme={theme} />;
  }

  if (decision === "not-found") {
    return <MembershipState state="not-found" theme={theme} />;
  }

  if (decision === "error") {
    return <MembershipState state="error" theme={theme} />;
  }

  return <>{children}</>;
};
