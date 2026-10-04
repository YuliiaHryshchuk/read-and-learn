import { describe, expect, it } from "vitest";
import { decodeMaterialId, encodeMaterialId } from "./materialId";

describe("material IDs", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("round-trips UUIDs through URL-safe short IDs", () => {
    const encoded = encodeMaterialId(uuid);
    expect(encoded).toHaveLength(22);
    expect(encoded).not.toMatch(/[+/=]/u);
    expect(decodeMaterialId(encoded)).toBe(uuid);
  });

  it("normalizes UUID casing and leaves non-UUID values unchanged", () => {
    expect(decodeMaterialId(uuid.toUpperCase())).toBe(uuid);
    expect(encodeMaterialId("custom-id")).toBe("custom-id");
  });

  it.each(["short", "!!!!!!!!!!!!!!!!!!!!!!"])(
    "rejects invalid short ID %j",
    (value) => expect(decodeMaterialId(value)).toBeNull(),
  );
});
