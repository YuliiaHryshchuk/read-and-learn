import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, parseApiError, requestApi } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("parseApiError", () => {
  it("uses valid server error fields", () => {
    expect(parseApiError({ error: { code: "nope", message: "Nope" } }, "Fallback"))
      .toEqual({ code: "nope", message: "Nope" });
  });

  it("falls back for malformed payloads", () => {
    expect(parseApiError({ error: { code: 3, message: "" } }, "Fallback"))
      .toEqual({ code: null, message: "Fallback" });
  });
});

describe("requestApi", () => {
  it("returns successful JSON and handles empty responses", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ ok: true }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestApi("/ok", { fallbackError: "Failed" }))
      .resolves.toEqual({ ok: true });
    await expect(requestApi("/empty", { fallbackError: "Failed" }))
      .resolves.toBeNull();
  });

  it("maps network and API failures to ApiClientError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(requestApi("/offline", { fallbackError: "Failed" }))
      .rejects.toMatchObject({
        name: "ApiClientError",
        status: 0,
        code: "network_error",
        message: "Failed",
      });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { error: { code: "denied", message: "Denied" } },
      { status: 403 },
    )));
    await expect(requestApi("/denied", { fallbackError: "Failed" }))
      .rejects.toEqual(new ApiClientError("Denied", 403, "denied"));
  });

  it("uses the fallback when an error response is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("no", { status: 500 }),
    ));
    await expect(requestApi("/bad", { fallbackError: "Failed" }))
      .rejects.toMatchObject({ message: "Failed", status: 500, code: null });
  });
});
