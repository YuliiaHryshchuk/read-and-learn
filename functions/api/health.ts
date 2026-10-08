import type { FunctionContext } from "../_shared/cloudflare";
import { errorResponse, jsonResponse } from "../_shared/http";

type HealthCheckRow = {
  ok: number;
};

export async function onRequestGet({ env }: FunctionContext) {
  try {
    const result = await env.DB.prepare("SELECT 1 AS ok").first<HealthCheckRow>();

    if (result?.ok !== 1) {
      throw new Error("D1 health check returned an unexpected result.");
    }

    return jsonResponse({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Health check failed.", error);
    return errorResponse(
      "health_check_failed",
      "The service is temporarily unavailable.",
      503,
    );
  }
}
