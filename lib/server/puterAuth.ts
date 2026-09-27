const PUTER_WHOAMI_URL = "https://api.puter.com/whoami";
const MAX_AUTHORIZATION_HEADER_LENGTH = 16_384;

export type AuthenticatedPuterUser = {
  uuid: string;
};

export class PuterAuthenticationError extends Error {
  constructor(
    public readonly status: 401 | 502,
    public readonly code:
      | "authentication_required"
      | "invalid_token"
      | "authentication_unavailable",
    message: string,
  ) {
    super(message);
    this.name = "PuterAuthenticationError";
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (
    !authorization
    || authorization.length > MAX_AUTHORIZATION_HEADER_LENGTH
  ) {
    throw new PuterAuthenticationError(
      401,
      "authentication_required",
      "Sign in with Puter before saving a material.",
    );
  }

  const match = /^Bearer\s+([^\s]+)$/iu.exec(authorization);
  if (!match) {
    throw new PuterAuthenticationError(
      401,
      "authentication_required",
      "Sign in with Puter before saving a material.",
    );
  }

  return match[1];
}

export async function requirePuterUser(
  request: Request,
  fetchPuter: typeof fetch = fetch,
): Promise<AuthenticatedPuterUser> {
  const token = getBearerToken(request);
  let response: Response;

  try {
    response = await fetchPuter(PUTER_WHOAMI_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new PuterAuthenticationError(
      502,
      "authentication_unavailable",
      "Puter authentication is temporarily unavailable.",
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new PuterAuthenticationError(
      401,
      "invalid_token",
      "Your Puter session has expired. Sign in again and retry.",
    );
  }
  if (!response.ok) {
    throw new PuterAuthenticationError(
      502,
      "authentication_unavailable",
      "Puter authentication is temporarily unavailable.",
    );
  }

  let user: unknown;
  try {
    user = await response.json();
  } catch {
    throw new PuterAuthenticationError(
      502,
      "authentication_unavailable",
      "Puter returned an invalid authentication response.",
    );
  }

  const uuid = user && typeof user === "object"
    ? (user as Record<string, unknown>).uuid
    : undefined;
  if (typeof uuid !== "string" || !uuid.trim() || uuid.length > 200) {
    throw new PuterAuthenticationError(
      502,
      "authentication_unavailable",
      "Puter returned an invalid authentication response.",
    );
  }

  return { uuid };
}
