import { describe, expect, it } from "vitest";
import { PuterAuthenticationError } from "@/lib/server/puterAuth";
import {
  authenticationErrorResponse,
  errorResponse,
  invalidRequest,
  jsonResponse,
} from "./http";

describe("HTTP response helpers", () => {
  it("returns hardened no-store JSON", async () => {
    const response = jsonResponse({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("formats API errors consistently", async () => {
    await expect(errorResponse("failed", "Failure", 500).json()).resolves
      .toEqual({ error: { code: "failed", message: "Failure" } });
    expect(invalidRequest("Bad").status).toBe(400);

    const auth = new PuterAuthenticationError(401, "invalid_token", "Expired");
    const response = authenticationErrorResponse(auth);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "invalid_token", message: "Expired" },
    });
  });
});
