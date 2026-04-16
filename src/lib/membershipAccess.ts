import { ApiError } from "./api";

export type MembershipPageState =
  | "ok"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "error";

export const deriveMembershipPageState = (error: unknown): MembershipPageState => {
  if (!(error instanceof ApiError)) {
    return "error";
  }
  if (error.status === 401) {
    return "unauthorized";
  }
  if (error.status === 403) {
    return "forbidden";
  }
  if (error.status === 404) {
    return "not-found";
  }
  return "error";
};

export const hasMembershipManagePermission = (data: {
  can_manage_memberships?: boolean;
  permissions?: string[];
  capabilities?: { manage_memberships?: boolean };
}) => {
  if (typeof data.can_manage_memberships === "boolean") {
    return data.can_manage_memberships;
  }
  if (typeof data.capabilities?.manage_memberships === "boolean") {
    return data.capabilities.manage_memberships;
  }
  if (Array.isArray(data.permissions)) {
    return data.permissions.some((permission) =>
      ["membership:manage", "memberships:write", "org:memberships:write", "project:memberships:write"].includes(permission)
    );
  }
  return false;
};

export const hasApiKeyManagePermission = (data: {
  can_manage_api_keys?: boolean;
  permissions?: string[];
  capabilities?: { manage_api_keys?: boolean };
}) => {
  if (typeof data.can_manage_api_keys === "boolean") {
    return data.can_manage_api_keys;
  }
  if (typeof data.capabilities?.manage_api_keys === "boolean") {
    return data.capabilities.manage_api_keys;
  }
  if (Array.isArray(data.permissions)) {
    return data.permissions.some((permission) =>
      ["api_keys:manage", "api_keys:write", "project:api-keys:write"].includes(permission)
    );
  }
  return false;
};

export const hasDlqManagePermission = (data: {
  can_manage_dlq?: boolean;
  permissions?: string[];
  capabilities?: { manage_dlq?: boolean };
}) => {
  if (typeof data.can_manage_dlq === "boolean") {
    return data.can_manage_dlq;
  }
  if (typeof data.capabilities?.manage_dlq === "boolean") {
    return data.capabilities.manage_dlq;
  }
  if (Array.isArray(data.permissions)) {
    return data.permissions.some((permission) =>
      ["dlq:manage", "dlq:write", "dlq:replay", "project:dlq:write"].includes(permission)
    );
  }
  return false;
};
