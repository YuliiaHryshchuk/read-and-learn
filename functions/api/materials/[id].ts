import {
  isAdaptationResult,
  type StructuredAdaptationResult,
} from "../../../lib/adaptation";
import {
  PuterAuthenticationError,
  requirePuterUser,
} from "../../../lib/server/puterAuth";
import {
  parseCreateMaterialBody,
  type CreateMaterialBody,
} from "../materials";

type D1Value = string | number | null;

type D1PreparedStatement = {
  bind: (...values: D1Value[]) => D1PreparedStatement;
  first: <T>() => Promise<T | null>;
};

type FunctionContext = {
  request: Request;
  env: {
    DB: {
      prepare: (query: string) => D1PreparedStatement;
    };
  };
  params: {
    id: string;
  };
};

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

const MAX_REQUEST_BYTES = 250_000;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function authenticationErrorResponse(error: PuterAuthenticationError) {
  return json(
    { error: { code: error.code, message: error.message } },
    error.status,
  );
}

export async function onRequestGet({ request, env, params }: FunctionContext) {
  try {
    const user = await requirePuterUser(request);
    const id = params.id;
    if (!id || id.length > 100) {
      return json(
        { error: { code: "not_found", message: "The material was not found." } },
        404,
      );
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
      return json(
        { error: { code: "not_found", message: "The material was not found." } },
        404,
      );
    }

    let adaptation: unknown;
    try {
      adaptation = JSON.parse(stored.adaptationJson);
    } catch {
      adaptation = null;
    }

    if (
      !isAdaptationResult(adaptation)
      || adaptation.kind !== "structured"
      || adaptation.sourceText !== stored.sourceText
    ) {
      console.error("Stored material has an invalid adaptation.", stored.id);
      return json(
        {
          error: {
            code: "invalid_material",
            message: "The saved material could not be read.",
          },
        },
        500,
      );
    }

    const material = {
      id: stored.id,
      title: stored.title,
      sourceText: stored.sourceText,
      sourceLanguage: stored.sourceLanguage,
      targetLanguage: stored.targetLanguage,
      adaptation: adaptation as StructuredAdaptationResult,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };

    return json({ material });
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to load material.", error);
    return json(
      {
        error: {
          code: "load_failed",
          message: "The material could not be loaded.",
        },
      },
      500,
    );
  }
}
export async function onRequestDelete({ request, env, params }: FunctionContext) {
  try {
    const user = await requirePuterUser(request);
    const id = params.id;
    if (!id || id.length > 100) {
      return json(
        { error: { code: "not_found", message: "The material was not found." } },
        404,
      );
    }

    const deleted = await env.DB.prepare(`
      DELETE FROM materials
      WHERE id = ? AND owner_uuid = ?
      RETURNING id
    `)
      .bind(id, user.uuid)
      .first<{ id: string }>();

    if (!deleted) {
      return json(
        { error: { code: "not_found", message: "The material was not found." } },
        404,
      );
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
    return json(
      {
        error: {
          code: "delete_failed",
          message: "The material could not be deleted.",
        },
      },
      500,
    );
  }
}

export async function onRequestPut({ request, env, params }: FunctionContext) {
  try {
    const contentLength = Number(request.headers.get("Content-Length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return json(
        { error: { code: "invalid_request", message: "The material is too large to save." } },
        400,
      );
    }

    const user = await requirePuterUser(request);
    const id = params.id;
    if (!id || id.length > 100) {
      return json(
        { error: { code: "not_found", message: "The material was not found." } },
        404,
      );
    }

    let bodyValue: unknown;
    try {
      bodyValue = await request.json();
    } catch {
      return json(
        { error: { code: "invalid_request", message: "The request body must be valid JSON." } },
        400,
      );
    }

    const body: CreateMaterialBody | null = parseCreateMaterialBody(bodyValue);
    if (!body) {
      return json(
        { error: { code: "invalid_request", message: "The material data is incomplete or invalid." } },
        400,
      );
    }

    const adaptationJson = JSON.stringify(body.adaptation);
    if (adaptationJson.length > MAX_REQUEST_BYTES) {
      return json(
        { error: { code: "invalid_request", message: "The material is too large to save." } },
        400,
      );
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
      return json(
        { error: { code: "not_found", message: "The material was not found." } },
        404,
      );
    }

    return json({ material });
  } catch (error) {
    if (error instanceof PuterAuthenticationError) {
      return authenticationErrorResponse(error);
    }

    console.error("Failed to update material.", error);
    return json(
      {
        error: {
          code: "update_failed",
          message: "The material could not be updated.",
        },
      },
      500,
    );
  }
}

