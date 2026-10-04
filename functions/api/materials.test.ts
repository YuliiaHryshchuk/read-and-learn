import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeAdaptation } from "@/test/fixtures";
import { onRequestGet, onRequestPost } from "./materials";

type Result = unknown | { results: unknown[] };

function database(result: Result) {
  const first = vi.fn().mockResolvedValue(
    result && typeof result === "object" && "results" in result ? null : result,
  );
  const all = vi.fn().mockResolvedValue(
    result && typeof result === "object" && "results" in result
      ? result
      : { results: [] },
  );
  const bind = vi.fn().mockReturnValue({ first, all });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare }, prepare, bind, first, all };
}

function authenticatedRequest(url: string, init?: RequestInit) {
  return new Request(url, {
    ...init,
    headers: { Authorization: "Bearer token", ...init?.headers },
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ uuid: "owner" })));
});
afterEach(() => vi.unstubAllGlobals());

describe("materials collection function", () => {
  it("validates pagination before querying", async () => {
    const { db, prepare } = database({ results: [] });
    const response = await onRequestGet({
      request: authenticatedRequest("https://example.test/api/materials?offset=-1"),
      env: { DB: db },
      params: {},
    });
    expect(response.status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("returns one page with formatted previews", async () => {
    const rows = Array.from({ length: 11 }, (_, index) => ({
      id: String(index),
      title: `Lesson ${index}`,
      preview: index === 0 ? "unfinished " : "Done.",
      isTruncated: index === 0 ? 1 : 0,
    }));
    const { db, bind } = database({ results: rows });
    const response = await onRequestGet({
      request: authenticatedRequest("https://example.test/api/materials?offset=5"),
      env: { DB: db },
      params: {},
    });
    expect(response.status).toBe(200);
    const payload = await response.json() as {
      hasMore: boolean;
      materials: Array<{ preview: string }>;
    };
    expect(payload.hasMore).toBe(true);
    expect(payload.materials).toHaveLength(10);
    expect(payload.materials[0].preview).toBe("unfinished…");
    expect(bind).toHaveBeenCalledWith(320, 320, "owner", 11, 5);
  });

  it("saves a validated material", async () => {
    const adaptation = makeAdaptation();
    const created = { id: "1", title: "Lesson", createdAt: "a", updatedAt: "a" };
    const { db, bind } = database(created);
    const body = {
      title: "Lesson",
      sourceText: adaptation.sourceText,
      sourceLanguage: "Spanish",
      targetLanguage: "English",
      adaptation,
    };
    const response = await onRequestPost({
      request: authenticatedRequest("https://example.test/api/materials", {
        method: "POST",
        body: JSON.stringify(body),
      }),
      env: { DB: db },
      params: {},
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ material: created });
    expect(bind).toHaveBeenCalledWith(
      expect.any(String),
      "owner",
      "Lesson",
      adaptation.sourceText,
      "Spanish",
      "English",
      expect.stringContaining('"schemaVersion":1'),
    );
  });

  it("rejects oversized and malformed request bodies", async () => {
    const { db, prepare } = database(null);
    const oversized = await onRequestPost({
      request: authenticatedRequest("https://example.test/api/materials", {
        method: "POST",
        headers: { "Content-Length": "250001" },
        body: "{}",
      }),
      env: { DB: db },
      params: {},
    });
    expect(oversized.status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();

    const malformed = await onRequestPost({
      request: authenticatedRequest("https://example.test/api/materials", {
        method: "POST",
        body: "not json",
      }),
      env: { DB: db },
      params: {},
    });
    expect(malformed.status).toBe(400);
  });
});
