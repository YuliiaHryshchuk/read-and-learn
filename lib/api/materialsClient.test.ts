import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeAdaptation } from "@/test/fixtures";

const { requestApi } = vi.hoisted(() => ({ requestApi: vi.fn() }));
vi.mock("./client", () => ({ requestApi }));

import {
  deleteMaterial,
  getMaterial,
  listMaterials,
  saveMaterial,
} from "./materialsClient";

describe("materials API client", () => {
  beforeEach(() => requestApi.mockReset());

  it("lists validated materials with authorization", async () => {
    requestApi.mockResolvedValue({
      materials: [{ id: "1", title: "Lesson", preview: "Hola" }],
      hasMore: false,
    });
    await expect(listMaterials("token", 10)).resolves.toEqual({
      materials: [{ id: "1", title: "Lesson", preview: "Hola" }],
      hasMore: false,
    });
    expect(requestApi).toHaveBeenCalledWith("/api/materials?offset=10", {
      headers: { Authorization: "Bearer token" },
      fallbackError: "The library could not be loaded.",
    });
  });

  it.each([
    {},
    { materials: [], hasMore: "no" },
    { materials: [{ id: 1, title: "Bad", preview: "" }], hasMore: false },
    {
      materials: Array.from({ length: 11 }, (_, id) => ({
        id: String(id), title: "T", preview: "P",
      })),
      hasMore: true,
    },
  ])("rejects malformed list payloads", async (payload) => {
    requestApi.mockResolvedValue(payload);
    await expect(listMaterials("token", 0)).rejects.toThrow("invalid response");
  });

  it("loads and validates a full material", async () => {
    const adaptation = makeAdaptation();
    const material = {
      id: "a/b",
      title: "Lesson",
      sourceText: adaptation.sourceText,
      sourceLanguage: "Spanish",
      targetLanguage: "English",
      adaptation,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    };
    requestApi.mockResolvedValue({ material });
    await expect(getMaterial("token", "a/b")).resolves.toEqual(material);
    expect(requestApi).toHaveBeenCalledWith("/api/materials/a%2Fb", expect.objectContaining({
      cache: "no-store",
      headers: { Authorization: "Bearer token" },
    }));
  });

  it("rejects inconsistent full materials", async () => {
    const adaptation = makeAdaptation();
    requestApi.mockResolvedValue({
      material: {
        id: "1",
        title: "Lesson",
        sourceText: "other",
        sourceLanguage: "Spanish",
        targetLanguage: "English",
        adaptation,
        createdAt: "now",
        updatedAt: "now",
      },
    });
    await expect(getMaterial("token", "1")).rejects.toThrow("invalid response");
  });

  it("creates and updates materials with the proper method", async () => {
    const adaptation = makeAdaptation();
    const input = {
      title: "Lesson",
      sourceText: adaptation.sourceText,
      sourceLanguage: "Spanish",
      targetLanguage: "English",
      adaptation,
    };
    const mutation = { id: "1", title: "Lesson", createdAt: "a", updatedAt: "b" };
    requestApi.mockResolvedValue({ material: mutation });

    await expect(saveMaterial("token", input)).resolves.toEqual(mutation);
    expect(requestApi).toHaveBeenLastCalledWith("/api/materials", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(input),
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
    }));

    await saveMaterial("token", input, "a/b");
    expect(requestApi).toHaveBeenLastCalledWith("/api/materials/a%2Fb", expect.objectContaining({
      method: "PUT",
    }));
  });

  it("deletes an encoded ID", async () => {
    requestApi.mockResolvedValue(null);
    await deleteMaterial("token", "a/b");
    expect(requestApi).toHaveBeenCalledWith("/api/materials/a%2Fb", expect.objectContaining({
      method: "DELETE",
    }));
  });
});
