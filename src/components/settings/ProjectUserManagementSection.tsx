import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { ConfirmModal } from "../ui/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { MembershipState } from "../memberships/MembershipState";
import { deriveMembershipPageState } from "../../lib/membershipAccess";
import { getProjectMemberships, MembershipRole } from "../../lib/api";
import {
  addUserToProject,
  getUserManagementErrorMessage,
  removeUserFromProject,
  resolveCanManageUsers,
  saveUserRole,
  USER_MANAGEMENT_ORG_ROLES,
  USER_MANAGEMENT_PROJECT_ROLES,
} from "./userManagementViewModel";

type ProjectUserManagementSectionProps = {
  theme: "dark" | "light";
  projectId: string;
  orgId: string;
};

export const ProjectUserManagementSection: React.FC<ProjectUserManagementSectionProps> = ({
  theme,
  projectId,
  orgId,
}) => {
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const [editRoleByUser, setEditRoleByUser] = useState<Record<string, MembershipRole>>({});
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addProjectRole, setAddProjectRole] = useState<MembershipRole>("member");
  const [addOrgRole, setAddOrgRole] = useState<MembershipRole>("member");
  const [hasMinimalAccess, setHasMinimalAccess] = useState(true);
  const [actionForbidden, setActionForbidden] = useState(false);

  const membershipsQuery = useQuery({
    queryKey: ["project-memberships", projectId],
    queryFn: () => getProjectMemberships(projectId),
    enabled: Boolean(projectId),
  });

  const pageState = membershipsQuery.error
    ? deriveMembershipPageState(membershipsQuery.error)
    : "ok";

  const canManage = useMemo(
    () =>
      resolveCanManageUsers({
        pageState,
        actionForbidden,
        permissionData: membershipsQuery.data,
      }),
    [actionForbidden, membershipsQuery.data, pageState]
  );

  const refreshMemberships = () =>
    queryClient.invalidateQueries({ queryKey: ["project-memberships", projectId] });

  const saveRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MembershipRole }) =>
      saveUserRole(projectId, userId, role),
    onSuccess: () => {
      toast.success("Role updated");
      void refreshMemberships();
    },
    onError: (error) => {
      if ((error as { status?: number }).status === 403) {
        setActionForbidden(true);
      }
      toast.error(getUserManagementErrorMessage(error));
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (userId: string) => removeUserFromProject(projectId, userId),
    onSuccess: () => {
      toast.success("User removed from project");
      setRemoveUserId(null);
      void refreshMemberships();
    },
    onError: (error) => {
      if ((error as { status?: number }).status === 403) {
        setActionForbidden(true);
      }
      toast.error(getUserManagementErrorMessage(error));
    },
  });

  const addUserMutation = useMutation({
    mutationFn: () =>
      addUserToProject({
        orgId,
        projectId,
        email: addEmail,
        password: addPassword,
        username: addUsername,
        orgRole: addOrgRole,
        hasMinimalAccess,
        projectRole: addProjectRole,
      }),
    onSuccess: () => {
      toast.success("User added to project");
      setIsAddDialogOpen(false);
      setAddEmail("");
      setAddPassword("");
      setAddUsername("");
      setAddProjectRole("member");
      setAddOrgRole("member");
      setHasMinimalAccess(true);
      void refreshMemberships();
    },
    onError: (error) => {
      if ((error as { status?: number }).status === 403) {
        setActionForbidden(true);
      }
      toast.error(getUserManagementErrorMessage(error));
    },
    onSettled: () => {
      setAddPassword("");
    },
  });

  const memberships = membershipsQuery.data?.memberships ?? [];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Admin / User Settings
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Manage users for this project.</p>
        </div>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)} disabled={!canManage}>
          Add User
        </Button>
      </div>

      {(pageState === "forbidden" || actionForbidden) && (
        <MembershipState state="forbidden" theme={theme} />
      )}
      {pageState === "unauthorized" && <MembershipState state="unauthorized" theme={theme} />}
      {pageState === "not-found" && <MembershipState state="not-found" theme={theme} />}
      {pageState === "error" && <MembershipState state="error" theme={theme} />}

      {pageState === "ok" && (
        <div
          className={`border rounded-2xl overflow-hidden ${
            isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
          }`}
        >
          {membershipsQuery.isLoading ? (
            <div className="p-4 text-sm text-zinc-500">Loading project members...</div>
          ) : (
            <table className="w-full text-left">
              <thead
                className={`border-b ${
                  isDark ? "border-zinc-800 bg-zinc-950/50" : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    User
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Role
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Created
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-zinc-800" : "divide-zinc-200"}`}>
                {memberships.map((member) => {
                  const displayName = member.username ?? member.email ?? "Unknown user";
                  const selectedRole = editRoleByUser[member.user_id] ??
                    (member.role as MembershipRole | undefined) ??
                    "viewer";
                  const hasRoleChanged = selectedRole !== (member.role ?? "viewer");

                  return (
                    <tr key={member.user_id}>
                      <td className="px-4 py-3 text-xs text-zinc-500">{displayName}</td>
                      <td className="px-4 py-3">
                        <select
                          value={selectedRole}
                          disabled={!canManage}
                          onChange={(event) =>
                            setEditRoleByUser((current) => ({
                              ...current,
                              [member.user_id]: event.target.value as MembershipRole,
                            }))
                          }
                          className={`text-xs border rounded-md px-2 py-1 ${
                            isDark
                              ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                              : "bg-white border-zinc-200 text-zinc-700"
                          }`}
                        >
                          {USER_MANAGEMENT_PROJECT_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{member.created_at ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{member.updated_at ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canManage || !hasRoleChanged || saveRoleMutation.isPending}
                            onClick={() =>
                              saveRoleMutation.mutate({ userId: member.user_id, role: selectedRole })
                            }
                          >
                            Save
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={!canManage || removeUserMutation.isPending}
                            onClick={() => setRemoveUserId(member.user_id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {memberships.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">
                      No project members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Create user in org first, then add project membership.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <input
              type="email"
              value={addEmail}
              onChange={(event) => setAddEmail(event.target.value)}
              placeholder="Email"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                  : "bg-white border-zinc-200 text-zinc-900"
              }`}
            />
            <input
              type="password"
              value={addPassword}
              onChange={(event) => setAddPassword(event.target.value)}
              placeholder="Password"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                  : "bg-white border-zinc-200 text-zinc-900"
              }`}
            />
            <input
              value={addUsername}
              onChange={(event) => setAddUsername(event.target.value)}
              placeholder="Username (optional)"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                  : "bg-white border-zinc-200 text-zinc-900"
              }`}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Project role</p>
                <select
                  value={addProjectRole}
                  onChange={(event) => setAddProjectRole(event.target.value as MembershipRole)}
                  className={`w-full text-xs border rounded-md px-2 py-2 ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                      : "bg-white border-zinc-200 text-zinc-700"
                  }`}
                >
                  {USER_MANAGEMENT_PROJECT_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-1">Org role</p>
                <select
                  value={addOrgRole}
                  onChange={(event) => setAddOrgRole(event.target.value as MembershipRole)}
                  className={`w-full text-xs border rounded-md px-2 py-2 ${
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                      : "bg-white border-zinc-200 text-zinc-700"
                  }`}
                >
                  {USER_MANAGEMENT_ORG_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={hasMinimalAccess}
                onChange={(event) => setHasMinimalAccess(event.target.checked)}
              />
              has_minimal_access
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canManage || !addEmail.trim() || !addPassword || addUserMutation.isPending}
              onClick={() => addUserMutation.mutate()}
            >
              {addUserMutation.isPending ? "Adding..." : "Add user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={Boolean(removeUserId)}
        title="Remove user from project?"
        description="This removes only project access for the selected user."
        confirmLabel="Remove"
        confirmVariant="destructive"
        isLoading={removeUserMutation.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveUserId(null);
          }
        }}
        onConfirm={() => {
          if (!removeUserId) {
            return;
          }
          removeUserMutation.mutate(removeUserId);
        }}
      />
    </section>
  );
};
