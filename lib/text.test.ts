import { describe, expect, it } from "vitest";
import { countWords } from "./text";

describe("countWords", () => {
  it.each([
    ["", 0],
    ["Hello, world!", 2],
    ["treinta-y-tres años", 2],
    ["¿Qué? — Sí.", 2],
    ["中文 测试 123", 3],
  ])("counts %j as %i words", (value, expected) => {
    expect(countWords(value)).toBe(expected);
  });
});
