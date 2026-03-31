import { hasApiKeyManagePermission, MembershipPageState } from "../../lib/membershipAccess";

export type OneTimeKeyReveal = {
  label: string;
  apiKey: string;
};

export const createOneTimeKeyReveal = (
  label: string,
  apiKey: string
): OneTimeKeyReveal => ({
  label,
  apiKey,
});

export const consumeOneTimeKeyReveal = (): null => null;

export const resolveCanManageApiKeys = (params: {
  pageState: MembershipPageState;
  actionForbidden: boolean;
  permissionData?: {
    can_manage_api_keys?: boolean;
    permissions?: string[];
    capabilities?: { manage_api_keys?: boolean };
  };
}) => {
  if (params.pageState === "forbidden" || params.actionForbidden) {
    return false;
  }

  if (params.pageState !== "ok") {
    return false;
  }

  const hasPermissionHints =
    typeof params.permissionData?.can_manage_api_keys === "boolean" ||
    Array.isArray(params.permissionData?.permissions) ||
    typeof params.permissionData?.capabilities?.manage_api_keys === "boolean";

  if (!hasPermissionHints) {
    return true;
  }

  if (typeof params.permissionData?.can_manage_api_keys === "boolean") {
    return params.permissionData.can_manage_api_keys;
  }

  if (typeof params.permissionData?.capabilities?.manage_api_keys === "boolean") {
    return params.permissionData.capabilities.manage_api_keys;
  }

  if (Array.isArray(params.permissionData?.permissions)) {
    const hasRecognizedApiKeyPermission = hasApiKeyManagePermission(params.permissionData ?? {});
    if (hasRecognizedApiKeyPermission) {
      return true;
    }

    return true;
  }

  return true;
};
