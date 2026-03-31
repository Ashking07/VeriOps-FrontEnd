import { describe, expect, it } from "vitest";
import { resolveCanManageApiKeys, createOneTimeKeyReveal, consumeOneTimeKeyReveal } from "./apiKeyViewModel";

describe("api key one-time reveal", () => {
  it("creates display payload and allows explicit clear", () => {
    const reveal = createOneTimeKeyReveal("Created key: Deploy", "vk_new_secret");
    expect(reveal.label).toBe("Created key: Deploy");
    expect(reveal.apiKey).toBe("vk_new_secret");
    expect(consumeOneTimeKeyReveal()).toBeNull();
  });
});

describe("api key 403 and permission handling", () => {
  it("disables actions for forbidden page state", () => {
    const canManage = resolveCanManageApiKeys({
      pageState: "forbidden",
      actionForbidden: false,
    });
    expect(canManage).toBe(false);
  });

  it("disables actions when action-level 403 occurs", () => {
    const canManage = resolveCanManageApiKeys({
      pageState: "ok",
      actionForbidden: true,
    });
    expect(canManage).toBe(false);
  });

  it("resolves permission hints for managed writes", () => {
    const canManage = resolveCanManageApiKeys({
      pageState: "ok",
      actionForbidden: false,
      permissionData: {
        permissions: ["project:api-keys:write"],
      },
    });
    expect(canManage).toBe(true);
  });

  it("keeps controls enabled for unrecognized permission hints", () => {
    const canManage = resolveCanManageApiKeys({
      pageState: "ok",
      actionForbidden: false,
      permissionData: {
        permissions: ["project:read"],
      },
    });
    expect(canManage).toBe(true);
  });

  it("respects explicit can_manage_api_keys false", () => {
    const canManage = resolveCanManageApiKeys({
      pageState: "ok",
      actionForbidden: false,
      permissionData: {
        can_manage_api_keys: false,
      },
    });
    expect(canManage).toBe(false);
  });
});
