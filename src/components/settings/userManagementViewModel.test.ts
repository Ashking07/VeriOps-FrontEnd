import { describe, expect, it, vi } from "vitest";
import { ApiError, MembershipRole } from "../../lib/api";
import {
  addUserToProject,
  getUserManagementErrorMessage,
  removeUserFromProject,
  resolveCanManageUsers,
  saveUserRole,
} from "./userManagementViewModel";

describe("user management add flow", () => {
  it("adds user by creating org user then adding project membership", async () => {
    const createOrgUserFn = vi.fn().mockResolvedValue({ user_id: "user-123" });
    const updateProjectMembershipFn = vi.fn().mockResolvedValue(undefined);

    await addUserToProject({
      orgId: "org-1",
      projectId: "project-1",
      email: " NewUser@Example.com ",
      password: "secret",
      username: "new-user",
      orgRole: "member",
      hasMinimalAccess: true,
      projectRole: "admin",
      createOrgUserFn,
      updateProjectMembershipFn,
    });

    expect(createOrgUserFn).toHaveBeenCalledWith("org-1", {
      email: "newuser@example.com",
      password: "secret",
      username: "new-user",
      org_role: "member",
      has_minimal_access: true,
    });
    expect(updateProjectMembershipFn).toHaveBeenCalledWith("project-1", "user-123", "admin");
  });
});

describe("user management membership actions", () => {
  it("updates project role", async () => {
    const updateProjectMembershipFn = vi.fn().mockResolvedValue(undefined);
    await saveUserRole(
      "project-1",
      "user-1",
      "viewer" as MembershipRole,
      updateProjectMembershipFn
    );
    expect(updateProjectMembershipFn).toHaveBeenCalledWith("project-1", "user-1", "viewer");
  });

  it("removes project membership", async () => {
    const deleteProjectMembershipFn = vi.fn().mockResolvedValue(undefined);
    await removeUserFromProject("project-1", "user-2", deleteProjectMembershipFn);
    expect(deleteProjectMembershipFn).toHaveBeenCalledWith("project-1", "user-2");
  });
});

describe("user management permissions and errors", () => {
  it("keeps controls enabled when page is ok and permission hints are missing", () => {
    const canManage = resolveCanManageUsers({
      pageState: "ok",
      actionForbidden: false,
      permissionData: {
        memberships: [],
      },
    });

    expect(canManage).toBe(true);
  });

  it("disables controls when forbidden", () => {
    const canManage = resolveCanManageUsers({
      pageState: "forbidden",
      actionForbidden: false,
      permissionData: {
        memberships: [],
        can_manage_memberships: true,
      },
    });

    expect(canManage).toBe(false);
  });

  it("disables controls only when action-level 403 happened", () => {
    const canManage = resolveCanManageUsers({
      pageState: "ok",
      actionForbidden: true,
      permissionData: {
        memberships: [],
      },
    });

    expect(canManage).toBe(false);
  });

  it("maps 409 to user already exists message", () => {
    const message = getUserManagementErrorMessage(new ApiError("409", 409, null));
    expect(message).toBe("User already exists");
  });
});
