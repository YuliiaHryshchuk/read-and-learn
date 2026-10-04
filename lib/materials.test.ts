import { describe, expect, it } from "vitest";
import { formatMaterialPreview } from "./materials";

describe("formatMaterialPreview", () => {
  it("trims trailing whitespace", () => {
    expect(formatMaterialPreview("Text.  ", false)).toBe("Text.");
  });

  it("adds an ellipsis only to truncated unfinished text", () => {
    expect(formatMaterialPreview("Unfinished ", true)).toBe("Unfinished…");
    expect(formatMaterialPreview("Finished!\" ", true)).toBe("Finished!\"");
    expect(formatMaterialPreview("Unfinished", false)).toBe("Unfinished");
  });
});
