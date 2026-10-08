import { afterEach, describe, expect, it, vi } from "vitest";
import type { D1PreparedStatement } from "../_shared/cloudflare";
import { onRequestGet } from "./health";

function database(result: { ok: number } | null | Error) {
  const first = result instanceof Error
    ? vi.fn().mockRejectedValue(result)
    : vi.fn().mockResolvedValue(result);
  const statement: D1PreparedStatement = {
    bind: vi.fn(),
    first,
    all: vi.fn().mockResolvedValue({ results: [] }),
  };
  vi.mocked(statement.bind).mockReturnValue(statement);
  const prepare = vi.fn().mockReturnValue(statement);

  return { db: { prepare }, prepare, first };
}

afterEach(() => vi.restoreAllMocks());

describe("health function", () => {
  it("reports that the service and database are healthy", async () => {
    const { db, prepare, first } = database({ ok: 1 });

    const response = await onRequestGet({
      request: new Request("https://example.test/api/health"),
      env: { DB: db },
      params: {},
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      database: "ok",
    });
    expect(prepare).toHaveBeenCalledWith("SELECT 1 AS ok");
    expect(first).toHaveBeenCalledOnce();
  });

  it("returns 503 without exposing database errors", async () => {
    const error = new Error("sensitive database details");
    const { db } = database(error);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await onRequestGet({
      request: new Request("https://example.test/api/health"),
      env: { DB: db },
      params: {},
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "health_check_failed",
        message: "The service is temporarily unavailable.",
      },
    });
  });
});
