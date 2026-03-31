import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  deleteOrgMembership,
  getOrgMemberships,
  updateOrgMembership,
} from "../../lib/api";
import { deriveMembershipPageState, hasMembershipManagePermission } from "../../lib/membershipAccess";
import { MembershipState } from "./MembershipState";
import { MembershipTable } from "./MembershipTable";

type OrgMembershipsPageProps = {
  theme: "dark" | "light";
};

export const OrgMembershipsPage: React.FC<OrgMembershipsPageProps> = ({ theme }) => {
  const { orgId = "" } = useParams();
  const queryClient = useQueryClient();

  const membershipsQuery = useQuery({
    queryKey: ["org-memberships", orgId],
    queryFn: () => getOrgMemberships(orgId),
    enabled: !!orgId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateOrgMembership(orgId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-memberships", orgId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteOrgMembership(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-memberships", orgId] });
    },
  });

  const state = membershipsQuery.error ? deriveMembershipPageState(membershipsQuery.error) : "ok";
  const canManage = hasMembershipManagePermission(membershipsQuery.data ?? {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Org memberships</h1>
        <p className="text-xs text-zinc-500 mt-1">Org ID: {orgId}</p>
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
