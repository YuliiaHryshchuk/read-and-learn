import { describe, expect, it, vi } from "vitest";
import { PuterAuthenticationError, requirePuterUser } from "./puterAuth";

function request(authorization?: string) {
  return new Request("https://example.test/api", {
    headers: authorization ? { Authorization: authorization } : {},
  });
}

describe("requirePuterUser", () => {
  it("requires a strict bearer token without making a request", async () => {
    const fetchPuter = vi.fn();
    await expect(requirePuterUser(request(), fetchPuter)).rejects.toMatchObject({
      status: 401,
      code: "authentication_required",
    });
    await expect(requirePuterUser(request("Basic token"), fetchPuter))
      .rejects.toBeInstanceOf(PuterAuthenticationError);
    expect(fetchPuter).not.toHaveBeenCalled();
  });

  it("passes the token to Puter and returns a valid UUID", async () => {
    const fetchPuter = vi.fn().mockResolvedValue(Response.json({ uuid: "user-1" }));
    await expect(requirePuterUser(request("Bearer secret"), fetchPuter))
      .resolves.toEqual({ uuid: "user-1" });
    expect(fetchPuter).toHaveBeenCalledWith("https://api.puter.com/whoami", {
      headers: { Authorization: "Bearer secret" },
    });
  });

  it.each([
    [new Response(null, { status: 401 }), 401, "invalid_token"],
    [new Response(null, { status: 500 }), 502, "authentication_unavailable"],
    [new Response("not json"), 502, "authentication_unavailable"],
    [Response.json({ uuid: " " }), 502, "authentication_unavailable"],
  ])("maps invalid Puter responses", async (response, status, code) => {
    await expect(requirePuterUser(
      request("Bearer secret"),
      vi.fn().mockResolvedValue(response),
    )).rejects.toMatchObject({ status, code });
  });

  it("maps transport errors without exposing them", async () => {
    await expect(requirePuterUser(
      request("Bearer secret"),
      vi.fn().mockRejectedValue(new Error("network")),
    )).rejects.toMatchObject({
      status: 502,
      code: "authentication_unavailable",
    });
  });
});
