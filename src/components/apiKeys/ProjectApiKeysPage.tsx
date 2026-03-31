import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ApiError,
  ApiKey,
  createProjectApiKey,
  getProjectApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "../../lib/api";
import {
  deriveMembershipPageState,
} from "../../lib/membershipAccess";
import {
  consumeOneTimeKeyReveal,
  createOneTimeKeyReveal,
  OneTimeKeyReveal,
  resolveCanManageApiKeys,
} from "./apiKeyViewModel";
import { MembershipState } from "../memberships/MembershipState";
import { CopyButton } from "../ui/CopyButton";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type ProjectApiKeysPageProps = {
  theme: "dark" | "light";
};

type OneTimeApiKeyRevealPanelProps = {
  reveal: OneTimeKeyReveal;
  theme: "dark" | "light";
  onDismiss: () => void;
};

export const OneTimeApiKeyRevealPanel: React.FC<OneTimeApiKeyRevealPanelProps> = ({
  reveal,
  theme,
  onDismiss,
}) => {
  const isDark = theme === "dark";

  return (
    <div
      className={`border rounded-xl p-4 space-y-2 ${
        isDark
          ? "bg-amber-500/10 border-amber-500/20 text-zinc-200"
          : "bg-amber-50 border-amber-200 text-zinc-900"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-amber-600">
        Copy now — this key will only be shown once
      </p>
      <p className="text-sm">{reveal.label}</p>
      <div
        className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2 ${
          isDark ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"
        }`}
      >
        <code className="text-xs break-all">{reveal.apiKey}</code>
        <CopyButton
          value={reveal.apiKey}
          copiedMessage="API key copied"
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          ariaLabel="Copy API key"
        />
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
};

type ApiKeysTableProps = {
  keys: ApiKey[];
  theme: "dark" | "light";
  canManage: boolean;
  onRotate: (apiKey: ApiKey) => void;
  onRevoke: (apiKey: ApiKey) => void;
};

export const ApiKeysTable: React.FC<ApiKeysTableProps> = ({
  keys,
  theme,
  canManage,
  onRotate,
  onRevoke,
}) => {
  const isDark = theme === "dark";

  return (
    <table className="w-full text-left">
      <thead
        className={`border-b ${
          isDark ? "border-zinc-800 bg-zinc-950/50" : "border-zinc-200 bg-zinc-50"
        }`}
      >
        <tr>
          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Name
          </th>
          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Prefix
          </th>
          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Status
          </th>
          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Created
          </th>
          <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Last used
          </th>
          {canManage && (
            <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">
              Actions
            </th>
          )}
        </tr>
      </thead>
      <tbody className={`divide-y ${isDark ? "divide-zinc-800" : "divide-zinc-200"}`}>
        {keys.map((apiKey) => {
          const isRevoked = !!apiKey.revoked_at;
          return (
            <tr key={apiKey.id}>
              <td className="px-4 py-3 text-sm">{apiKey.name}</td>
              <td className="px-4 py-3 text-xs text-zinc-500">{apiKey.key_prefix ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-zinc-500">{isRevoked ? "Revoked" : "Active"}</td>
              <td className="px-4 py-3 text-xs text-zinc-500">{apiKey.created_at ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-zinc-500">{apiKey.last_used_at ?? "—"}</td>
              {canManage && (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRotate(apiKey)}
                      disabled={isRevoked}
                    >
                      Rotate
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onRevoke(apiKey)}
                      disabled={isRevoked}
                    >
                      Revoke
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          );
        })}
        {keys.length === 0 && (
          <tr>
            <td colSpan={canManage ? 6 : 5} className="px-4 py-6 text-center text-sm text-zinc-500">
              No API keys found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

export const ProjectApiKeysPage: React.FC<ProjectApiKeysPageProps> = ({ theme }) => {
  const isDark = theme === "dark";
  const { projectId = "" } = useParams();
  const queryClient = useQueryClient();

  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [createName, setCreateName] = useState("");
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [locallyRevokedKeyIds, setLocallyRevokedKeyIds] = useState<Set<string>>(new Set());
  const [oneTimeKey, setOneTimeKey] = useState<OneTimeKeyReveal | null>(null);
  const [actionForbidden, setActionForbidden] = useState(false);

  const keysQuery = useQuery({
    queryKey: ["project-api-keys", projectId, includeRevoked],
    queryFn: () => getProjectApiKeys(projectId, includeRevoked),
    enabled: !!projectId,
  });

  const pageState = keysQuery.error
    ? deriveMembershipPageState(keysQuery.error)
    : "ok";

  const canManage = useMemo(
    () =>
      resolveCanManageApiKeys({
        pageState,
        actionForbidden,
        permissionData: keysQuery.data,
      }),
    [actionForbidden, keysQuery.data, pageState]
  );

  const invalidateKeys = () =>
    queryClient.invalidateQueries({
      queryKey: ["project-api-keys", projectId],
    });

  const applyMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 403) {
      setActionForbidden(true);
    }
    toast.error("Unable to complete API key action");
  };

  const createMutation = useMutation({
    mutationFn: (name: string) => createProjectApiKey(projectId, name),
    onSuccess: (result) => {
      setOneTimeKey({
        ...createOneTimeKeyReveal(`Created key: ${createName}`, result.api_key),
      });
      toast.success("API key created");
      setCreateName("");
      void invalidateKeys();
    },
    onError: applyMutationError,
  });

  const rotateMutation = useMutation({
    mutationFn: ({ keyId, name }: { keyId: string; name?: string }) =>
      rotateApiKey(keyId, name),
    onSuccess: (result) => {
      setOneTimeKey({
        ...createOneTimeKeyReveal(
          `Rotated key`,
          result.api_key
        ),
      });
      toast.success("API key rotated");
      void invalidateKeys();
    },
    onError: applyMutationError,
  });

  const revokeMutation = useMutation({
    mutationFn: ({ keyId, reason }: { keyId: string; reason?: string }) =>
      revokeApiKey(keyId, reason),
    onSuccess: () => {
      if (selectedKey) {
        setLocallyRevokedKeyIds((current) => {
          const next = new Set(current);
          next.add(selectedKey.id);
          return next;
        });
      }

      toast.success("API key revoked");
      setRevokeOpen(false);
      setRevokeReason("");
      setSelectedKey(null);
      void invalidateKeys();
    },
    onError: applyMutationError,
  });

  useEffect(() => {
    if (!oneTimeKey) {
      return;
    }
    const timer = window.setTimeout(() => {
      setOneTimeKey(consumeOneTimeKeyReveal());
    }, 60_000);
    return () => window.clearTimeout(timer);
  }, [oneTimeKey]);

  useEffect(() => {
    setLocallyRevokedKeyIds(new Set());
  }, [projectId]);

  const visibleKeys = useMemo(() => {
    const keys = keysQuery.data?.api_keys ?? [];
    if (includeRevoked) {
      return keys;
    }

    return keys.filter((apiKey) => !apiKey.revoked_at && !locallyRevokedKeyIds.has(apiKey.id));
  }, [includeRevoked, keysQuery.data?.api_keys, locallyRevokedKeyIds]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-zinc-900"}`}>
            Project API Keys
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Project ID: {projectId}</p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="New key name"
              className={`border rounded-lg px-3 py-2 text-sm min-w-[220px] ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                  : "bg-white border-zinc-200 text-zinc-900"
              }`}
            />
            <Button
              onClick={() => createMutation.mutate(createName.trim())}
              size="sm"
              disabled={!createName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create key"}
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <input
          id="include-revoked"
          type="checkbox"
          checked={includeRevoked}
          onChange={(event) => setIncludeRevoked(event.target.checked)}
        />
        <label htmlFor="include-revoked">Include revoked keys</label>
      </div>

      {oneTimeKey && (
        <OneTimeApiKeyRevealPanel
          reveal={oneTimeKey}
          theme={theme}
          onDismiss={() => setOneTimeKey(null)}
        />
      )}

      {(pageState === "forbidden" || actionForbidden) && (
        <MembershipState state="forbidden" theme={theme} />
      )}

      {pageState === "unauthorized" && (
        <MembershipState state="unauthorized" theme={theme} />
      )}

      {pageState === "not-found" && (
        <MembershipState state="not-found" theme={theme} />
      )}

      {pageState === "error" && <MembershipState state="error" theme={theme} />}

      {pageState === "ok" && (
        <div
          className={`border rounded-2xl overflow-hidden ${
            isDark ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
          }`}
        >
          {keysQuery.isLoading ? (
            <div className="p-4 text-sm text-zinc-500">Loading API keys...</div>
          ) : (
            <ApiKeysTable
              keys={visibleKeys}
              theme={theme}
              canManage={canManage}
              onRotate={(apiKey) => {
                rotateMutation.mutate({
                  keyId: apiKey.id,
                });
              }}
              onRevoke={(apiKey) => {
                setSelectedKey(apiKey);
                setRevokeOpen(true);
              }}
            />
          )}
        </div>
      )}

      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200">
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={revokeReason}
            onChange={(event) => setRevokeReason(event.target.value)}
            placeholder="Optional reason"
            rows={3}
            className={`w-full border rounded-lg px-3 py-2 text-sm ${
              isDark
                ? "bg-zinc-950 border-zinc-800 text-zinc-200"
                : "bg-white border-zinc-200 text-zinc-900"
            }`}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedKey) {
                  return;
                }
                revokeMutation.mutate({
                  keyId: selectedKey.id,
                  reason: revokeReason.trim() || undefined,
                });
              }}
              disabled={!selectedKey || revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
