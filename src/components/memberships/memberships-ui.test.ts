import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ApiError } from "../../lib/api";
import {
  deriveMembershipPageState,
  hasMembershipManagePermission,
} from "../../lib/membershipAccess";
import { MembershipState } from "./MembershipState";
import { MembershipTable } from "./MembershipTable";

const sampleMemberships = [
  { user_id: "u-1", email: "user@example.com", role: "viewer" },
];

describe("membership permission-gated UI", () => {
  it("hides edit controls when user cannot manage memberships", () => {
    const html = renderToStaticMarkup(
      React.createElement(MembershipTable, {
        memberships: sampleMemberships,
        canManage: false,
        theme: "dark",
        onUpdateRole: () => undefined,
        onRemove: () => undefined,
      })
    );

    expect(html).not.toContain("Remove");
    expect(html).not.toContain("<select");
  });

  it("shows edit controls when user has manage permissions", () => {
    const html = renderToStaticMarkup(
      React.createElement(MembershipTable, {
        memberships: sampleMemberships,
        canManage: true,
        theme: "dark",
        onUpdateRole: () => undefined,
        onRemove: () => undefined,
      })
    );

    expect(html).toContain("Remove");
    expect(html).toContain("<select");
  });

  it("derives manage capability from response fields", () => {
    expect(
      hasMembershipManagePermission({ permissions: ["project:memberships:write"] })
    ).toBe(true);
    expect(hasMembershipManagePermission({ can_manage_memberships: false })).toBe(false);
  });
});

describe("membership 401/403 handling", () => {
  it("maps 401 to unauthorized and renders session-expired state", () => {
    const state = deriveMembershipPageState(new ApiError("401", 401, null));
    expect(state).toBe("unauthorized");

    const html = renderToStaticMarkup(
      React.createElement(MembershipState, { state, theme: "light" })
    );
    expect(html).toContain("Session expired");
  });

  it("maps 403 to forbidden and renders insufficient-permissions state", () => {
    const state = deriveMembershipPageState(new ApiError("403", 403, null));
    expect(state).toBe("forbidden");

    const html = renderToStaticMarkup(
      React.createElement(MembershipState, { state, theme: "light" })
    );
    expect(html).toContain("Insufficient permissions");
  });
});
