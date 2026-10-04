import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { serializeStoredAdaptation } from "@/lib/adaptation";
import { makeAdaptation } from "@/test/fixtures";
import { onRequestDelete, onRequestGet, onRequestPut } from "./[id]";

function database(firstValue: unknown) {
  const first = vi.fn().mockResolvedValue(firstValue);
  const bind = vi.fn().mockReturnValue({ first });
  const prepare = vi.fn().mockReturnValue({ bind });
  return { db: { prepare }, bind, prepare };
}

function request(method = "GET", body?: unknown) {
  return new Request("https://example.test/api/materials/1", {
    method,
    headers: {
      Authorization: "Bearer token",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ uuid: "owner" })));
});
afterEach(() => vi.unstubAllGlobals());

describe("material item function", () => {
  it("loads and decodes a stored material", async () => {
    const adaptation = makeAdaptation();
    const stored = {
      id: "1",
      title: "Lesson",
      sourceText: adaptation.sourceText,
      sourceLanguage: "Spanish",
      targetLanguage: "English",
      adaptationJson: serializeStoredAdaptation(adaptation),
      createdAt: "a",
      updatedAt: "b",
    };
    const { db, bind } = database(stored);
    const response = await onRequestGet({
      request: request(), env: { DB: db }, params: { id: "1" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      material: {
        id: "1",
        title: "Lesson",
        sourceText: adaptation.sourceText,
        sourceLanguage: "Spanish",
        targetLanguage: "English",
        adaptation,
        createdAt: "a",
        updatedAt: "b",
      },
    });
    expect(bind).toHaveBeenCalledWith("1", "owner");
  });

  it("returns not found without querying for invalid IDs", async () => {
    const { db, prepare } = database(null);
    const response = await onRequestGet({
      request: request(), env: { DB: db }, params: { id: "" },
    });
    expect(response.status).toBe(404);
    expect(prepare).not.toHaveBeenCalled();
  });

  it("rejects corrupt stored adaptations", async () => {
    const { db } = database({
      id: "1",
      title: "Lesson",
      sourceText: "Hola",
      sourceLanguage: "Spanish",
      targetLanguage: "English",
      adaptationJson: "not json",
      createdAt: "a",
      updatedAt: "b",
    });
    const response = await onRequestGet({
      request: request(), env: { DB: db }, params: { id: "1" },
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_material" },
    });
  });

  it("deletes only the current user's material", async () => {
    const { db, bind } = database({ id: "1" });
    const response = await onRequestDelete({
      request: request("DELETE"), env: { DB: db }, params: { id: "1" },
    });
    expect(response.status).toBe(204);
    expect(bind).toHaveBeenCalledWith("1", "owner");
  });

  it("returns not found when no material was deleted", async () => {
    const { db } = database(null);
    const response = await onRequestDelete({
      request: request("DELETE"), env: { DB: db }, params: { id: "1" },
    });
    expect(response.status).toBe(404);
  });

  it("updates a validated material", async () => {
    const adaptation = makeAdaptation();
    const body = {
      title: "Updated",
      sourceText: adaptation.sourceText,
      sourceLanguage: "Spanish",
      targetLanguage: "English",
      adaptation,
    };
    const updated = { id: "1", title: "Updated", createdAt: "a", updatedAt: "b" };
    const { db, bind } = database(updated);
    const response = await onRequestPut({
      request: request("PUT", body), env: { DB: db }, params: { id: "1" },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ material: updated });
    expect(bind).toHaveBeenCalledWith(
      "Updated",
      adaptation.sourceText,
      "Spanish",
      "English",
      expect.stringContaining('"schemaVersion":1'),
      "1",
      "owner",
    );
  });

  it("rejects invalid update bodies", async () => {
    const { db, prepare } = database(null);
    const response = await onRequestPut({
      request: request("PUT", { title: "only" }),
      env: { DB: db },
      params: { id: "1" },
    });
    expect(response.status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });
});
