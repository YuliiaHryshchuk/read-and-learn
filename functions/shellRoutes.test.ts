import { describe, expect, it, vi } from "vitest";
import { onRequestGet as editRoute } from "./edit/[id]";
import { onRequestGet as libraryRoute } from "./library/[id]";

describe("static shell routes", () => {
  it.each([
    [libraryRoute, "https://example.test/library/id?x=1", "/library/material"],
    [editRoute, "https://example.test/edit/id?x=1", "/edit/material"],
  ])("rewrites a dynamic URL to its static shell", async (route, url, pathname) => {
    const fetchAsset = vi.fn().mockResolvedValue(new Response("shell"));
    const response = await route({
      request: new Request(url),
      env: { ASSETS: { fetch: fetchAsset } },
    });
    expect(await response.text()).toBe("shell");
    const forwarded = fetchAsset.mock.calls[0][0] as Request;
    expect(new URL(forwarded.url)).toMatchObject({ pathname, search: "" });
    expect(forwarded.method).toBe("GET");
  });
});
