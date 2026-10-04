import { beforeEach, describe, expect, it, vi } from "vitest";

const chat = vi.fn();
vi.mock("@/lib/puterClient", () => ({
  getPuterClient: vi.fn(async () => ({ ai: { chat } })),
}));

import {
  PuterAIGenerationLimitError,
  PuterAIResponseError,
  requestPuterStructuredOutput,
} from "./puterAdapter";

describe("requestPuterStructuredOutput", () => {
  beforeEach(() => chat.mockReset());

  it("passes the schema to Puter and returns textual content", async () => {
    chat.mockResolvedValue({ message: { content: "{\"ok\":true}" } });
    const messages = [{ role: "user" as const, content: "hello" }];
    const schema = { type: "object" };
    await expect(requestPuterStructuredOutput({ messages, schema }))
      .resolves.toBe('{"ok":true}');
    expect(chat).toHaveBeenCalledWith(
      messages,
      expect.objectContaining({
        model: "gpt-5.4-mini",
        text: { format: expect.objectContaining({ schema, strict: true }) },
      }),
      expect.any(Boolean),
    );
  });

  it("distinguishes truncated and empty responses", async () => {
    chat.mockResolvedValueOnce({ finish_reason: "length", message: { content: "partial" } });
    await expect(requestPuterStructuredOutput({ messages: [], schema: {} }))
      .rejects.toBeInstanceOf(PuterAIGenerationLimitError);

    chat.mockResolvedValueOnce({ message: { content: "" } });
    await expect(requestPuterStructuredOutput({ messages: [], schema: {} }))
      .rejects.toBeInstanceOf(PuterAIResponseError);
  });
});
