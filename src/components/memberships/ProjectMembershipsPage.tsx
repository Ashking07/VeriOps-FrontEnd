import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  deleteProjectMembership,
  getProjectMemberships,
  updateProjectMembership,
} from "../../lib/api";
import { deriveMembershipPageState, hasMembershipManagePermission } from "../../lib/membershipAccess";
import { MembershipState } from "./MembershipState";
import { MembershipTable } from "./MembershipTable";

type ProjectMembershipsPageProps = {
  theme: "dark" | "light";
};

export const ProjectMembershipsPage: React.FC<ProjectMembershipsPageProps> = ({ theme }) => {
  const { projectId = "" } = useParams();
  const queryClient = useQueryClient();

  const membershipsQuery = useQuery({
    queryKey: ["project-memberships", projectId],
    queryFn: () => getProjectMemberships(projectId),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateProjectMembership(projectId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-memberships", projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteProjectMembership(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-memberships", projectId] });
    },
  });

  const state = membershipsQuery.error ? deriveMembershipPageState(membershipsQuery.error) : "ok";
  const canManage = hasMembershipManagePermission(membershipsQuery.data ?? {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project memberships</h1>
        <p className="text-xs text-zinc-500 mt-1">Project ID: {projectId}</p>
      </div>

      {state !== "ok" ? (
        <MembershipState state={state} theme={theme} />
      ) : membershipsQuery.isLoading ? (
        <div className="text-sm text-zinc-500">Loading memberships...</div>
      ) : (
        <MembershipTable
          memberships={membershipsQuery.data?.memberships ?? []}
          canManage={canManage}
          theme={theme}
          onUpdateRole={(userId, role) => updateMutation.mutate({ userId, role })}
          onRemove={(userId) => deleteMutation.mutate(userId)}
        />
      )}
    </div>
  );
};
