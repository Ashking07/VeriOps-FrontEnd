import { describe, expect, it } from "vitest";
import { resolveSelectedProjectId } from "./projectSelection";

describe("project selection reconciliation", () => {
  const projects = [
    { id: "project-1", name: "Demo UI Project", org_id: "org-1" },
    { id: "project-2", name: "Sandbox", org_id: "org-1" },
  ];

  it("keeps a valid selected project id", () => {
    expect(resolveSelectedProjectId(projects, "project-2")).toBe("project-2");
  });

  it("resets stale selected project id to first project", () => {
    expect(resolveSelectedProjectId(projects, "Demo UI Project")).toBe("project-1");
  });

  it("picks first project when none selected", () => {
    expect(resolveSelectedProjectId(projects, null)).toBe("project-1");
  });
});
