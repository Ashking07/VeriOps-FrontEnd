import { describe, expect, it } from "vitest";
import { resolveSelectedProjectOrgContext } from "./settingsProjectContext";

describe("settings project/org resolution", () => {
  it("resolves org_id from projects[] objects for selected project", () => {
    const result = resolveSelectedProjectOrgContext(
      [
        { id: "p-1", org_id: "org-1", name: "Project 1" },
        { id: "p-2", org_id: "org-2", name: "Project 2" },
      ],
      "p-2"
    );

    expect(result).toEqual({ projectId: "p-2", orgId: "org-2" });
  });

  it("returns null when selected project has no org_id", () => {
    const result = resolveSelectedProjectOrgContext(
      [{ id: "p-1", name: "Project 1" }],
      "p-1"
    );

    expect(result).toBeNull();
  });
});
