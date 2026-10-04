import { PuterAuthenticationError } from "../../lib/server/puterAuth";

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function errorResponse(code: string, message: string, status: number) {
  return jsonResponse({ error: { code, message } }, status);
}

export function invalidRequest(message: string) {
  return errorResponse("invalid_request", message, 400);
}

export function authenticationErrorResponse(error: PuterAuthenticationError) {
  return errorResponse(error.code, error.message, error.status);
}
