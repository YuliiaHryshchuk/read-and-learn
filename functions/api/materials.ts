import {
  isAdaptationResult,
  type StructuredAdaptationResult,
} from "../../lib/adaptation";
import { MAX_TARGET_LANGUAGE_LENGTH } from "../../lib/languages";
import { countWords } from "../../lib/text";
import {
  PuterAuthenticationError,
  requirePuterUser,
} from "../../lib/server/puterAuth";

type D1Value = string | number | null;

type D1PreparedStatement = {
  bind: (...values: D1Value[]) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<{ results: T[] }>;
};

type Env = {
  DB: {
    prepare: (query: string) => D1PreparedStatement;
  };
};

type FunctionContext = {
  request: Request;
  env: Env;
};

export type CreateMaterialBody = {
  title: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  adaptation: StructuredAdaptationResult;
};

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

const MAX_REQUEST_BYTES = 250_000;
const MAX_TITLE_LENGTH = 120;
const MAX_SOURCE_LENGTH = 3_000;
const MAX_SOURCE_LANGUAGE_LENGTH = 100;
const PAGE_SIZE = 10;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function invalidRequest(message: string) {
  return json({ error: { code: "invalid_request", message } }, 400);
}

function authenticationErrorResponse(error: PuterAuthenticationError) {
  return json(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    error.status,
  );
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

export function parseCreateMaterialBody(
  value: unknown,
): CreateMaterialBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const expectedKeys = [
    "title",
    "sourceText",
    "sourceLanguage",
    "targetLanguage",
    "adaptation",
  ];
  if (
    Object.keys(body).length !== expectedKeys.length ||
    !expectedKeys.every((key) => Object.hasOwn(body, key))
  ) {
    return null;
  }
  if (!isBoundedText(body.title, MAX_TITLE_LENGTH)) return null;
  if (!isBoundedText(body.sourceText, MAX_SOURCE_LENGTH)) return null;
  if (!isBoundedText(body.sourceLanguage, MAX_SOURCE_LANGUAGE_LENGTH))
    return null;
  if (!isBoundedText(body.targetLanguage, MAX_TARGET_LANGUAGE_LENGTH))
    return null;
  if (!isAdaptationResult(body.adaptation)) return null;
  if (body.adaptation.kind !== "structured") return null;
  if (body.adaptation.sourceText !== body.sourceText) return null;

  if (countWords(body.sourceText) > 300) return null;

  return {
    title: body.title.trim(),
    sourceText: body.sourceText,
    sourceLanguage: body.sourceLanguage.trim(),
    targetLanguage: body.targetLanguage.trim(),
    adaptation: body.adaptation,
  };
}

export async function onRequestPost({ request, env }: FunctionContext) {
  try {
    const contentLength = Number(request.headers.get("Content-Length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return invalidRequest("The material is too large to save.");
    }

    const user = await requirePuterUser(request);

    let bodyValue: unknown;
    try {
      bodyValue = await request.json();
    } catch {
      return invalidRequest("The request body must be valid JSON.");
    }

    const body = parseCreateMaterialBody(bodyValue);
    if (!body) {
      return invalidRequest("The material data is incomplete or invalid.");
    }

    const adaptationJson = JSON.stringify(body.adaptation);
    if (adaptationJson.length > MAX_REQUEST_BYTES) {
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
      return json(
        {
          error: {
            code: "save_failed",
            message: "The material could not be saved.",
          },
        },
        500,
      );
    }

    return json({ material }, 201);
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to save material.", error);
    return json(
      {
        error: {
          code: "save_failed",
          message: "The material could not be saved.",
        },
      },
      500,
    );
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

    return json({
      materials: results.slice(0, PAGE_SIZE),
      hasMore: results.length > PAGE_SIZE,
    });
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to load materials.", error);
    return json(
      {
        error: {
          code: "load_failed",
          message: "The library could not be loaded.",
        },
      },
      500,
    );
  }
}
