import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProjectApiKey,
  getProjectApiKeys,
  revokeApiKey,
  rotateApiKey,
} from "./api";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });

describe("project API key endpoints", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists keys with include_revoked query flag", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          api_keys: [
            {
              id: "k1",
              name: "Deploy key",
              key_prefix: "vk_live_",
              revoked_at: null,
            },
          ],
        })
      );

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await getProjectApiKeys("project-1", true);

    expect(result.api_keys).toHaveLength(1);
    expect(result.api_keys[0].name).toBe("Deploy key");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/projects/project-1/api-keys?include_revoked=true"),
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });

  it("creates a key and returns one-time api_key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "k2", api_key: "vk_new_secret" }));

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createProjectApiKey("project-1", "CI key");

    expect(result.api_key).toBe("vk_new_secret");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/projects/project-1/api-keys"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "CI key" }),
      })
    );
  });

  it("rotates a key and sends optional name", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "k2", api_key: "vk_rotated_secret" }));

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await rotateApiKey("key-22", "Rotated name");

    expect(result.api_key).toBe("vk_rotated_secret");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/api-keys/key-22/rotate"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Rotated name" }),
      })
    );
  });

  it("revokes a key and sends optional reason", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 200 }));

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await revokeApiKey("key-22", "No longer needed");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/v1/api-keys/key-22/revoke"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "No longer needed" }),
      })
    );
  });
});
