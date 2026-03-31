import {
  ApiError,
  createOrgUser,
  CreateOrgUserInput,
  deleteProjectMembership,
  MembershipRole,
  MembershipsResponse,
  updateProjectMembership,
} from "../../lib/api";
import { MembershipPageState } from "../../lib/membershipAccess";

const roleOrder: MembershipRole[] = ["owner", "admin", "member", "viewer"];

export const USER_MANAGEMENT_PROJECT_ROLES = roleOrder;
export const USER_MANAGEMENT_ORG_ROLES = roleOrder;

export const resolveCanManageUsers = (params: {
  pageState: MembershipPageState;
  actionForbidden: boolean;
  permissionData?: MembershipsResponse;
}) => {
  if (params.pageState === "forbidden" || params.actionForbidden) {
    return false;
  }

  if (params.pageState !== "ok") {
    return false;
  }

  const permissionData = params.permissionData;
  if (!permissionData) {
    return true;
  }

  if (typeof permissionData.can_manage_memberships === "boolean") {
    return permissionData.can_manage_memberships;
  }

  if (typeof permissionData.capabilities?.manage_memberships === "boolean") {
    return permissionData.capabilities.manage_memberships;
  }

  if (Array.isArray(permissionData.permissions)) {
    return permissionData.permissions.some((permission) =>
      ["membership:manage", "memberships:write", "org:memberships:write", "project:memberships:write"].includes(permission)
    );
  }

  return true;
};

export const getUserManagementErrorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.status === 409) {
    return "User already exists";
  }
  if (error instanceof ApiError && error.status === 403) {
    return "Insufficient permissions";
  }
  return "Unable to complete request";
};

export const addUserToProject = async (params: {
  orgId: string;
  projectId: string;
  email: string;
  password: string;
  username?: string;
  orgRole: MembershipRole;
  hasMinimalAccess: boolean;
  projectRole: MembershipRole;
  createOrgUserFn?: (orgId: string, body: CreateOrgUserInput) => Promise<{ user_id: string }>;
  updateProjectMembershipFn?: (
    projectId: string,
    userId: string,
    role: MembershipRole
  ) => Promise<void>;
}) => {
  const createOrgUserFn = params.createOrgUserFn ?? createOrgUser;
  const updateProjectMembershipFn = params.updateProjectMembershipFn ?? updateProjectMembership;

  const createdUser = await createOrgUserFn(params.orgId, {
    email: params.email.trim().toLowerCase(),
    password: params.password,
    username: params.username?.trim() || undefined,
    org_role: params.orgRole,
    has_minimal_access: params.hasMinimalAccess,
  });

  await updateProjectMembershipFn(params.projectId, createdUser.user_id, params.projectRole);
  return createdUser;
};

export const saveUserRole = (
  projectId: string,
  userId: string,
  role: MembershipRole,
  updateProjectMembershipFn: (
    projectId: string,
    userId: string,
    role: MembershipRole
  ) => Promise<void> = updateProjectMembership
) => updateProjectMembershipFn(projectId, userId, role);

export const removeUserFromProject = (
  projectId: string,
  userId: string,
  deleteProjectMembershipFn: (projectId: string, userId: string) => Promise<void> =
    deleteProjectMembership
) => deleteProjectMembershipFn(projectId, userId);
