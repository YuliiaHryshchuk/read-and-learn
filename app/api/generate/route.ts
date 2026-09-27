export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("text" in body) || typeof body.text !== "string") {
    return Response.json({ error: "Text must be a string." }, { status: 400 });
  }

  if (!body.text.trim()) {
    return Response.json({ error: "Enter some text first." }, { status: 400 });
  }
  if (body.text.length > 3000 || body.text.trim().split(/\s+/u).length > 300) {
    return Response.json({ error: "Use up to 300 words and 3000 characters." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Anthropic API key is not configured on the server." }, { status: 503 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1000,
        temperature: 1,
        messages: [{ role: "user", content: body.text }],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const error = response.status === 429
        ? "Anthropic is rate limiting requests. Please try again later."
        : response.status === 401 || response.status === 403
          ? "Anthropic rejected the server API credentials."
          : "Anthropic could not complete the request. Please try again.";
      return Response.json({ error }, { status: 502 });
    }

    const data = await response.json();
    const text = Array.isArray(data.content)
      ? data.content
          .filter((block: { type?: unknown; text?: unknown }) => block?.type === "text" && typeof block.text === "string")
          .map((block: { text: string }) => block.text)
          .join("\n")
      : "";
    if (!text) {
      return Response.json({ error: "Anthropic returned no text. Please try again." }, { status: 502 });
    }
    return Response.json({ text, truncated: data.stop_reason === "max_tokens" });
  } catch {
    return Response.json({ error: "Could not reach Anthropic or the request timed out. Please try again." }, { status: 502 });
  }
}
