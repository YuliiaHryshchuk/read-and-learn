// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
  applyCroppedRotationTransform,
  getConstrainedDimensions,
  getRotatedDimensions,
  isFullImageCrop,
  percentCropToPixels,
} from "./imageGeometry";

describe("imageGeometry", () => {
  it("constrains both the longest side and total pixel count", () => {
    const dimensions = getConstrainedDimensions(
      8064,
      6048,
      4000,
      8_000_000,
    );

    expect(Math.max(dimensions.width, dimensions.height)).toBeLessThanOrEqual(4000);
    expect(dimensions.width * dimensions.height).toBeLessThanOrEqual(8_000_000);
    expect(dimensions.width / dimensions.height).toBeCloseTo(4 / 3, 2);
  });

  it("does not enlarge an image that already fits", () => {
    expect(getConstrainedDimensions(1600, 1200, 4000, 8_000_000))
      .toEqual({ width: 1600, height: 1200 });
  });

  it("swaps dimensions only for quarter turns", () => {
    expect(getRotatedDimensions(1600, 1200, 0))
      .toEqual({ width: 1600, height: 1200 });
    expect(getRotatedDimensions(1600, 1200, 90))
      .toEqual({ width: 1200, height: 1600 });
    expect(getRotatedDimensions(1600, 1200, 180))
      .toEqual({ width: 1600, height: 1200 });
    expect(getRotatedDimensions(1600, 1200, 270))
      .toEqual({ width: 1200, height: 1600 });
  });

  it("converts and clamps percentage crops", () => {
    expect(percentCropToPixels(
      { unit: "%", x: 25, y: 10, width: 50, height: 80 },
      1200,
      1600,
    )).toEqual({ x: 300, y: 160, width: 600, height: 1280 });

    expect(percentCropToPixels(
      { unit: "%", x: 99, y: 99, width: 50, height: 50 },
      100,
      100,
    )).toEqual({ x: 99, y: 99, width: 1, height: 1 });
  });

  it("recognizes a full crop with harmless floating-point drift", () => {
    expect(isFullImageCrop({
      unit: "%",
      x: 0.001,
      y: 0,
      width: 99.999,
      height: 100,
    })).toBe(true);
    expect(isFullImageCrop({
      unit: "%",
      x: 1,
      y: 0,
      width: 99,
      height: 100,
    })).toBe(false);
  });

  it.each([
    [0, [1, 0, 0, 1, -10, -20]],
    [90, [0, 1, -1, 0, 1190, -20]],
    [180, [-1, 0, 0, -1, 1590, 1180]],
    [270, [0, -1, 1, 0, -10, 1580]],
  ] as const)("applies the crop transform for %i°", (rotation, expected) => {
    const setTransform = vi.fn();
    applyCroppedRotationTransform(
      { setTransform } as unknown as CanvasRenderingContext2D,
      1600,
      1200,
      { x: 10, y: 20, width: 600, height: 800 },
      1,
      rotation,
    );

    expect(setTransform).toHaveBeenCalledWith(...expected);
  });
});
