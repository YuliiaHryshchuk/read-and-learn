import {
  serializeStoredAdaptation,
} from "../../lib/adaptation";
import {
  PuterAuthenticationError,
  requirePuterUser,
} from "../../lib/server/puterAuth";
import type { FunctionContext } from "../_shared/cloudflare";
import {
  authenticationErrorResponse,
  errorResponse,
  invalidRequest,
  jsonResponse,
} from "../_shared/http";
import {
  MAX_MATERIAL_REQUEST_BYTES,
  parseMaterialBody,
} from "../_shared/materialValidation";

type CreatedMaterial = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type MaterialListItem = {
  id: string;
  title: string;
  preview: string;
};

const PAGE_SIZE = 10;

export async function onRequestPost({ request, env }: FunctionContext) {
  try {
    const contentLength = Number(request.headers.get("Content-Length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_MATERIAL_REQUEST_BYTES) {
      return invalidRequest("The material is too large to save.");
    }

    const user = await requirePuterUser(request);

    let bodyValue: unknown;
    try {
      bodyValue = await request.json();
    } catch {
      return invalidRequest("The request body must be valid JSON.");
    }

    const body = parseMaterialBody(bodyValue);
    if (!body) {
      return invalidRequest("The material data is incomplete or invalid.");
    }

    const adaptationJson = serializeStoredAdaptation(body.adaptation);
    if (adaptationJson.length > MAX_MATERIAL_REQUEST_BYTES) {
      return invalidRequest("The material is too large to save.");
    }

    const id = crypto.randomUUID();
    const material = await env.DB.prepare(
      `
      INSERT INTO materials (
        id,
        owner_uuid,
        title,
        source_text,
        source_language,
        target_language,
        adaptation_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING
        id,
        title,
        created_at AS createdAt,
        updated_at AS updatedAt
    `,
    )
      .bind(
        id,
        user.uuid,
        body.title,
        body.sourceText,
        body.sourceLanguage,
        body.targetLanguage,
        adaptationJson,
      )
      .first<CreatedMaterial>();

    if (!material) {
      return errorResponse("save_failed", "The material could not be saved.", 500);
    }

    return jsonResponse({ material }, 201);
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to save material.", error);
    return errorResponse("save_failed", "The material could not be saved.", 500);
  }
}

export async function onRequestGet({ request, env }: FunctionContext) {
  try {
    const user = await requirePuterUser(request);
    const requestUrl = new URL(request.url);
    const offsetValue = requestUrl.searchParams.get("offset") ?? "0";
    if (!/^\d+$/u.test(offsetValue)) {
      return invalidRequest("The library offset is invalid.");
    }

    const offset = Number(offsetValue);
    if (!Number.isSafeInteger(offset) || offset > 100_000) {
      return invalidRequest("The library offset is invalid.");
    }

    const { results } = await env.DB.prepare(
      `
      SELECT id, title, source_text AS preview
      FROM materials
      WHERE owner_uuid = ?
      ORDER BY updated_at DESC, id DESC
      LIMIT ? OFFSET ?
    `,
    )
      .bind(user.uuid, PAGE_SIZE + 1, offset)
      .all<MaterialListItem>();

    return jsonResponse({
      materials: results.slice(0, PAGE_SIZE),
      hasMore: results.length > PAGE_SIZE,
    });
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to load materials.", error);
    return errorResponse("load_failed", "The library could not be loaded.", 500);
  }
}
