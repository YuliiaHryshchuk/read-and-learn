import {
  isAdaptationResult,
  type StructuredAdaptationResult,
} from "@/lib/adaptation";
import { requestApi } from "@/lib/api/client";
import { MAX_TARGET_LANGUAGE_LENGTH } from "@/lib/languages";

export type MaterialListItem = {
  id: string;
  title: string;
  preview: string;
};

export type MaterialListPayload = {
  materials: MaterialListItem[];
  hasMore: boolean;
};

export type SavedMaterial = {
  id: string;
  title: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  adaptation: StructuredAdaptationResult;
  createdAt: string;
  updatedAt: string;
};

export type SaveMaterialInput = {
  title: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  adaptation: StructuredAdaptationResult;
};

const PAGE_SIZE = 10;

function authorizationHeaders(authToken: string, includeJson = false) {
  return {
    Authorization: `Bearer ${authToken}`,
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function listMaterials(authToken: string, offset: number) {
  const payload = await requestApi(`/api/materials?offset=${offset}`, {
    headers: authorizationHeaders(authToken),
    fallbackError: "The library could not be loaded.",
  });
  if (!isRecord(payload) || !Array.isArray(payload.materials)) {
    throw new Error("The library returned an invalid response.");
  }
  if (typeof payload.hasMore !== "boolean") {
    throw new Error("The library returned an invalid response.");
  }

  const materials = payload.materials.filter(isMaterialListItem);
  if (materials.length !== payload.materials.length || materials.length > PAGE_SIZE) {
    throw new Error("The library returned an invalid response.");
  }

  return { materials, hasMore: payload.hasMore } satisfies MaterialListPayload;
}

export async function getMaterial(authToken: string, id: string) {
  const payload = await requestApi(
    `/api/materials/${encodeURIComponent(id)}`,
    {
      headers: authorizationHeaders(authToken),
      fallbackError: "The material could not be loaded.",
    },
  );
  const material = isRecord(payload) ? payload.material : null;
  if (!isSavedMaterial(material)) {
    throw new Error("The material returned an invalid response.");
  }
  return material;
}

export async function saveMaterial(
  authToken: string,
  input: SaveMaterialInput,
  materialId?: string,
) {
  const payload = await requestApi(
    materialId
      ? `/api/materials/${encodeURIComponent(materialId)}`
      : "/api/materials",
    {
      method: materialId ? "PUT" : "POST",
      headers: authorizationHeaders(authToken, true),
      body: JSON.stringify(input),
      fallbackError: "The material could not be saved.",
    },
  );
  if (!isRecord(payload) || !isMaterialMutation(payload.material)) {
    throw new Error("The material returned an invalid response.");
  }
  return payload.material;
}

export async function deleteMaterial(authToken: string, id: string) {
  await requestApi(`/api/materials/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authorizationHeaders(authToken),
    fallbackError: "The material could not be deleted.",
  });
}

function isMaterialListItem(value: unknown): value is MaterialListItem {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.preview === "string";
}

function isSavedMaterial(value: unknown): value is SavedMaterial {
  if (!isRecord(value)) return false;
  const adaptation = value.adaptation;
  return typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.sourceText === "string"
    && typeof value.sourceLanguage === "string"
    && typeof value.targetLanguage === "string"
    && Boolean(value.targetLanguage.trim())
    && value.targetLanguage.length <= MAX_TARGET_LANGUAGE_LENGTH
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string"
    && isAdaptationResult(adaptation)
    && adaptation.sourceText === value.sourceText;
}

function isMaterialMutation(value: unknown) {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.createdAt === "string"
    && typeof value.updatedAt === "string";
}
