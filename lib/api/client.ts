type ApiErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
  };
};

type ApiRequestOptions = RequestInit & {
  fallbackError: string;
};

export class ApiClientError extends Error {
  readonly code: string | null;
  readonly status: number;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

export function parseApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { code: null, message: fallback };
  }

  const error = (payload as ApiErrorPayload).error;
  return {
    code: typeof error?.code === "string" ? error.code : null,
    message:
      typeof error?.message === "string" && error.message
        ? error.message
        : fallback,
  };
}

export async function requestApi(
  input: string,
  { fallbackError, ...init }: ApiRequestOptions,
) {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    throw new ApiClientError(fallbackError, 0, "network_error");
  }

  if (response.status === 204) return null;

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = parseApiError(payload, fallbackError);
    throw new ApiClientError(apiError.message, response.status, apiError.code);
  }

  return payload;
}
