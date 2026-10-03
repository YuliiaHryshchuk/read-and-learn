import {
  decodeStoredAdaptation,
  serializeStoredAdaptation,
} from "../../../lib/adaptation";
import {
  PuterAuthenticationError,
  requirePuterUser,
} from "../../../lib/server/puterAuth";
import type { FunctionContext } from "../../_shared/cloudflare";
import {
  authenticationErrorResponse,
  errorResponse,
  invalidRequest,
  jsonResponse,
} from "../../_shared/http";
import {
  MAX_MATERIAL_REQUEST_BYTES,
  parseMaterialBody,
} from "../../_shared/materialValidation";

type StoredMaterial = {
  id: string;
  title: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  adaptationJson: string;
  createdAt: string;
  updatedAt: string;
};

type UpdatedMaterial = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export async function onRequestGet({
  request,
  env,
  params,
}: FunctionContext<{ id: string }>) {
  try {
    const user = await requirePuterUser(request);
    const id = params.id;
    if (!id || id.length > 100) {
      return errorResponse("not_found", "The material was not found.", 404);
    }

    const stored = await env.DB.prepare(`
      SELECT
        id,
        title,
        source_text AS sourceText,
        source_language AS sourceLanguage,
        target_language AS targetLanguage,
        adaptation_json AS adaptationJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM materials
      WHERE id = ? AND owner_uuid = ?
    `)
      .bind(id, user.uuid)
      .first<StoredMaterial>();

    if (!stored) {
      return errorResponse("not_found", "The material was not found.", 404);
    }

    let storedAdaptation: unknown;
    try {
      storedAdaptation = JSON.parse(stored.adaptationJson);
    } catch {
      storedAdaptation = null;
    }

    const adaptation = decodeStoredAdaptation(storedAdaptation);

    if (
      !adaptation
      || adaptation.sourceText !== stored.sourceText
    ) {
      console.error("Stored material has an invalid adaptation.", stored.id);
      return errorResponse(
        "invalid_material",
        "The saved material could not be read.",
        500,
      );
    }

    const material = {
      id: stored.id,
      title: stored.title,
      sourceText: stored.sourceText,
      sourceLanguage: stored.sourceLanguage,
      targetLanguage: stored.targetLanguage,
      adaptation,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };

    return jsonResponse({ material });
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to load material.", error);
    return errorResponse("load_failed", "The material could not be loaded.", 500);
  }
}
export async function onRequestDelete({
  request,
  env,
  params,
}: FunctionContext<{ id: string }>) {
  try {
    const user = await requirePuterUser(request);
    const id = params.id;
    if (!id || id.length > 100) {
      return errorResponse("not_found", "The material was not found.", 404);
    }

    const deleted = await env.DB.prepare(`
      DELETE FROM materials
      WHERE id = ? AND owner_uuid = ?
      RETURNING id
    `)
      .bind(id, user.uuid)
      .first<{ id: string }>();

    if (!deleted) {
      return errorResponse("not_found", "The material was not found.", 404);
    }

    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to delete material.", error);
    return errorResponse("delete_failed", "The material could not be deleted.", 500);
  }
}

export async function onRequestPut({
  request,
  env,
  params,
}: FunctionContext<{ id: string }>) {
  try {
    const contentLength = Number(request.headers.get("Content-Length"));
    if (
      Number.isFinite(contentLength)
      && contentLength > MAX_MATERIAL_REQUEST_BYTES
    ) {
      return invalidRequest("The material is too large to save.");
    }

    const user = await requirePuterUser(request);
    const id = params.id;
    if (!id || id.length > 100) {
      return errorResponse("not_found", "The material was not found.", 404);
    }

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

    const material = await env.DB.prepare(`
      UPDATE materials
      SET
        title = ?,
        source_text = ?,
        source_language = ?,
        target_language = ?,
        adaptation_json = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND owner_uuid = ?
      RETURNING
        id,
        title,
        created_at AS createdAt,
        updated_at AS updatedAt
    `)
      .bind(
        body.title,
        body.sourceText,
        body.sourceLanguage,
        body.targetLanguage,
        adaptationJson,
        id,
        user.uuid,
      )
      .first<UpdatedMaterial>();

    if (!material) {
      return errorResponse("not_found", "The material was not found.", 404);
    }

    return jsonResponse({ material });
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to update material.", error);
    return errorResponse("update_failed", "The material could not be updated.", 500);
  }
}

