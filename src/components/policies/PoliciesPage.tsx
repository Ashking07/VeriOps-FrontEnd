import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  FileCode, 
  MoreVertical, 
  Activity,
  History,
  TriangleAlert,
  CirclePlay
} from 'lucide-react';
import { StatusPill } from "../ui/StatusPill";
import { StatusType } from "../../lib/status";
import { useAppStore } from "../../store/appStore";
import { Modal } from "../ui/Modal";
import { RunbookEditor } from "./RunbookEditor";
import { CopyButton } from "../ui/CopyButton";
import { JsonPanel } from "../ui/JsonPanel";
import { useMutation } from "@tanstack/react-query";
import { validateRun } from "../../lib/api";
import { toast } from "sonner";
import yaml from "js-yaml";

type PoliciesPageProps = {
  theme: "dark" | "light";
};

type Policy = {
  id: string;
  name: string;
  yaml: string;
  createdAt: string;
  updatedAt: string;
};

type ValidateMutation = {
  mutate: () => void;
  isPending: boolean;
  isError: boolean;
};

type PolicyEditorModalProps = {
  theme: "dark" | "light";
  isDark: boolean;
  selectedPolicyId: string | null;
  selectedPolicy: Policy | null;
  draftName: string;
  setDraftName: (value: string) => void;
  draftYaml: string;
  setDraftYaml: (value: string) => void;
  yamlError: string | null;
  onCloseModal: () => void;
  onNew: () => void;
  onDuplicate: () => void;
  onDelete: (closeModal: () => void) => void;
  onSave: () => "created" | "updated" | "error";
  openRename: () => void;
  nameInputRef: React.RefObject<HTMLInputElement>;
  runIdInput: string;
  setRunIdInput: (value: string) => void;
  validateMutation: ValidateMutation;
  validateResult: unknown;
};

const PolicyEditorModal: React.FC<PolicyEditorModalProps> = ({
  theme,
  isDark,
  selectedPolicyId,
  selectedPolicy,
  draftName,
  setDraftName,
  draftYaml,
  setDraftYaml,
  yamlError,
  onCloseModal,
  onNew,
  onDuplicate,
  onDelete,
  onSave,
  openRename,
  nameInputRef,
  runIdInput,
  setRunIdInput,
  validateMutation,
  validateResult,
}) => {
  const hasPolicy = Boolean(selectedPolicyId);
  const isDirty =
    Boolean(selectedPolicy) &&
    (draftName.trim() !== selectedPolicy?.name || draftYaml !== selectedPolicy?.yaml);
  const validationData = validateResult as Record<string, unknown> | null;
  const validationStatus = validationData?.status as StatusType | undefined;
  const reasonsJson = validationData?.reasons_json as Record<string, unknown> | undefined;
  const summaryJson = validationData?.summary_json as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Policy Editor</h2>
        <p className={`text-xs mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          Draft, validate, and save runbook policies.
        </p>
      </div>

      <div className="space-y-3">
        <label className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
          Policy name
        </label>
        <input
          ref={nameInputRef}
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="Policy name"
          className={`w-full border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
            isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
          }`}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-zinc-600"}`}>
            Runbook YAML
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openRename}
              className={`text-[10px] font-bold uppercase tracking-widest ${
                isDark ? "text-zinc-500 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              Rename
            </button>
            <CopyButton
              value={draftYaml}
              copiedMessage="YAML copied"
              className={isDark ? "text-zinc-500 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}
              iconSize={14}
            />
          </div>
        </div>
        <RunbookEditor value={draftYaml} onChange={setDraftYaml} theme={theme} />
        {yamlError && <p className="text-xs text-rose-400">{yamlError}</p>}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNew}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
              isDark
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900"
            }`}
          >
            New
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            disabled={!hasPolicy}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
              isDark
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white"
                : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900"
            }`}
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => onDelete(onCloseModal)}
            disabled={!hasPolicy}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-500/20 hover:bg-rose-500/10 disabled:opacity-50 ${
              isDark ? "bg-rose-500/10 text-rose-400" : "bg-rose-500/10 text-rose-600"
            }`}
          >
            Delete
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest ${
              isDark ? "text-amber-500" : "text-amber-700"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </div>
          )}
          <button
            type="button"
            onClick={onCloseModal}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isDark ? "text-zinc-500 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              const result = onSave();
              if (result === "created") {
                onCloseModal();
              }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
              isDark
                ? "bg-white text-zinc-950 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            Save
          </button>
        </div>
      </div>

      <div className={`border-t pt-6 space-y-4 ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={16} className="text-blue-500" />
          Validate run
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={runIdInput}
            onChange={(event) => setRunIdInput(event.target.value)}
            placeholder="Enter run_id"
            className={`flex-1 border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
              isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900"
            }`}
          />
          <button
            type="button"
            onClick={() => {
              if (!runIdInput.trim()) {
                toast.error("Run ID is required.");
                return;
              }
              if (yamlError) {
                toast.error("Fix YAML errors before validating.");
                return;
              }
              validateMutation.mutate();
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-500/90"
          >
            {validateMutation.isPending ? "Validating..." : "Validate"}
          </button>
        </div>

        {validationStatus && (
          <div className="flex items-center gap-2">
            <StatusPill status={validationStatus} />
            <span className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              Latest validation result
            </span>
          </div>
        )}

        {validateMutation.isError && (
          <p className="text-xs text-rose-400">Validation failed. Check run ID and try again.</p>
        )}

        {(reasonsJson || summaryJson) && (
          <div className="flex flex-col gap-4">
            {summaryJson && <JsonPanel title="Summary" data={summaryJson} isDark={isDark} />}
            {reasonsJson && <JsonPanel title="Reasons" data={reasonsJson} isDark={isDark} />}
          </div>
        )}
      </div>
    </div>
  );
};

const POLICY_TEMPLATE = `version: "1.0"
name: "New Policy"
description: "Describe what this policy validates"
rules:
  - id: "rule_1"
    description: "Example rule"
    severity: "warning"
    when: {}
    assert: {}
`;

const createPolicyId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pol_${crypto.randomUUID()}`;
  }
  return `pol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const { selectedProjectId } = useAppStore();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftYaml, setDraftYaml] = useState(POLICY_TEMPLATE);
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [runIdInput, setRunIdInput] = useState("");
  const [validateResult, setValidateResult] = useState<unknown>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const storageKey = useMemo(
    () => `veriops-policies:${selectedProjectId ?? "default"}`,
    [selectedProjectId]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setPolicies([]);
      setSelectedPolicyId(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Policy[];
      setPolicies(parsed);
      setSelectedPolicyId((current) => {
        if (current && parsed.some((policy) => policy.id === current)) {
          return current;
        }
        return parsed[0]?.id ?? null;
      });
    } catch {
      setPolicies([]);
      setSelectedPolicyId(null);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(policies));
  }, [policies, storageKey]);

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === selectedPolicyId) ?? null,
    [policies, selectedPolicyId]
  );

  useEffect(() => {
    if (!selectedPolicy) {
      setDraftName("");
      setDraftYaml(POLICY_TEMPLATE);
      setYamlError(null);
      return;
    }
    setDraftName(selectedPolicy.name);
    setDraftYaml(selectedPolicy.yaml);
    setYamlError(null);
  }, [selectedPolicy]);

  useEffect(() => {
    if (!draftYaml.trim()) {
      setYamlError("YAML is required.");
      return;
    }
    try {
      yaml.load(draftYaml);
      setYamlError(null);
    } catch (error) {
      setYamlError(error instanceof Error ? error.message : "Invalid YAML");
    }
  }, [draftYaml]);

  const filteredPolicies = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return policies;
    }
    return policies.filter((policy) => policy.name.toLowerCase().includes(query));
  }, [policies, searchText]);

  const validateMutation = useMutation({
    mutationFn: async () => validateRun(runIdInput.trim(), draftYaml),
    onSuccess: (data) => {
      setValidateResult(data);
    },
    onError: (error) => {
      setValidateResult(error);
    },
  });

  const handleNewPolicy = () => {
    setSelectedPolicyId(null);
    setDraftName("New Policy");
    setDraftYaml(POLICY_TEMPLATE);
    setValidateResult(null);
  };

  const handleSavePolicy = (): "created" | "updated" | "error" => {
    const name = draftName.trim();
    if (!name) {
      toast.error("Policy name is required.");
      return "error";
    }
    if (yamlError) {
      toast.error("Fix YAML errors before saving.");
      return "error";
    }
    if (!selectedPolicyId) {
      const now = new Date().toISOString();
      const id = createPolicyId();
      const policy: Policy = {
        id,
        name,
        yaml: draftYaml,
        createdAt: now,
        updatedAt: now,
      };
      setPolicies((prev) => [policy, ...prev]);
      setSelectedPolicyId(id);
      toast.success("Policy created");
      return "created";
    }
    setPolicies((prev) =>
      prev.map((policy) =>
        policy.id === selectedPolicyId
          ? {
              ...policy,
              name,
              yaml: draftYaml,
              updatedAt: new Date().toISOString(),
            }
          : policy
      )
    );
    toast.success("Policy saved");
    return "updated";
  };

  const handleDuplicatePolicy = () => {
    if (!selectedPolicy) {
      return;
    }
    const now = new Date().toISOString();
    const id = createPolicyId();
    const duplicate: Policy = {
      id,
      name: `${draftName || selectedPolicy.name} (copy)`,
      yaml: draftYaml,
      createdAt: now,
      updatedAt: now,
    };
    setPolicies((prev) => [duplicate, ...prev]);
    setSelectedPolicyId(id);
    toast.success("Policy duplicated");
  };

  const handleDeletePolicy = (onCloseModal: () => void) => {
    if (!selectedPolicy) {
      return;
    }
    setPolicies((prev) => {
      const next = prev.filter((policy) => policy.id !== selectedPolicy.id);
      if (next.length === 0) {
        setSelectedPolicyId(null);
      } else {
        setSelectedPolicyId(next[0].id);
      }
      return next;
    });
    setValidateResult(null);
    toast.success("Policy deleted");
    onCloseModal();
  };

  const openRename = () => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  };

  return (
    <Modal>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Policies</h1>
            <p className="text-zinc-500 text-sm mt-1">Manage and validate runbooks against agent execution traces.</p>
          </div>
          <Modal.Trigger modalIdToOpen="policy-editor">
            <button
              onClick={() => {
                setSelectedPolicyId(null);
                setDraftName("New Policy");
                setDraftYaml(POLICY_TEMPLATE);
                setValidateResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isDark ? 'bg-white text-zinc-950 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800'
              }`}
            >
              <Plus size={16} />
              Create Policy
            </button>
          </Modal.Trigger>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search policies..."
                className={`w-full border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900 shadow-sm'
                }`}
              />
            </div>

            <div className={`border rounded-2xl overflow-hidden transition-all ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              <div className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-zinc-200'}`}>
                {filteredPolicies.length === 0 ? (
                  <div className="p-6 text-sm text-zinc-500">No policies yet. Create one to get started.</div>
                ) : (
                  filteredPolicies.map((policy) => (
                    <Modal.Trigger key={policy.id} modalIdToOpen="policy-editor">
                      <div
                        onClick={() => {
                          setSelectedPolicyId(policy.id);
                          setDraftName(policy.name);
                          setDraftYaml(policy.yaml);
                          setValidateResult(null);
                        }}
                        className={`p-4 flex items-center justify-between transition-colors group cursor-pointer ${
                          isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 border rounded-xl ${
                            isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'
                          }`}>
                            <FileCode size={20} className="text-zinc-400" />
                          </div>
                          <div>
                            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{policy.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                {policy.id.slice(0, 8)}
                              </span>
                              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                                <Activity size={10} /> 0 validations
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <StatusPill status={"none" as StatusType} />
                            <p className="text-[10px] text-zinc-500 mt-1">Updated {new Date(policy.updatedAt).toLocaleDateString()}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPolicyId(policy.id);
                              setDraftName(policy.name);
                              setDraftYaml(policy.yaml);
                              setValidateResult(null);
                            }}
                            className={`p-2 transition-colors ${isDark ? 'text-zinc-600 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>
                    </Modal.Trigger>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`border rounded-2xl p-6 transition-all ${
              isDark ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
            }`}>
              <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                <History size={16} className="text-zinc-500" />
                Quick Validation
              </h3>
              <p className="text-xs text-zinc-500 mb-6">Select a recent run to test against your active policies.</p>
              
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    isDark ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono text-zinc-500">run_4k2j_8x{i}</span>
                      <CirclePlay size={10} className="text-zinc-400" />
                    </div>
                    <p className="text-[10px] text-zinc-500">Jan 26, 14:2{i} • 1.2k tokens</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`border rounded-2xl p-6 transition-all ${
              isDark ? 'bg-amber-500/5 border-amber-500/10' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
                <TriangleAlert size={16} />
                <h3 className="text-sm font-bold">Policy Alert</h3>
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-amber-500/70' : 'text-amber-700/80'}`}>
                3 policies are currently in "Warning" state due to failed validations in the last 24 hours. Review agent safety logs.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal.Content
        modalId="policy-editor"
        panelStyle={{ width: "60vw", maxWidth: "760px", minWidth: "320px" }}
        panelClassName={isDark
          ? "border bg-zinc-950 border-zinc-800 text-zinc-200"
          : "border bg-white border-zinc-200 text-zinc-900"}
        closeButtonClassName={isDark ? "hover:text-zinc-200" : "text-zinc-400 hover:text-zinc-900"}
      >
        <PolicyEditorModal
          theme={theme}
          isDark={isDark}
          selectedPolicyId={selectedPolicyId}
          selectedPolicy={selectedPolicy}
          draftName={draftName}
          setDraftName={setDraftName}
          draftYaml={draftYaml}
          setDraftYaml={setDraftYaml}
          yamlError={yamlError}
          onCloseModal={() => {}}
          onNew={handleNewPolicy}
          onDuplicate={handleDuplicatePolicy}
          onDelete={handleDeletePolicy}
          onSave={handleSavePolicy}
          openRename={openRename}
          nameInputRef={nameInputRef}
          runIdInput={runIdInput}
          setRunIdInput={setRunIdInput}
          validateMutation={validateMutation}
          validateResult={validateResult}
        />
      </Modal.Content>
    </Modal>
  );
};
