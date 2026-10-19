// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { validateImageFile } from "./imageFileValidation";

function createJpegBytes(width: number, height: number) {
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >>> 8) & 0xff, height & 0xff,
    (width >>> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

function createRotatedJpegBytes(width: number, height: number) {
  const exif = new Uint8Array([
    0xff, 0xe1, 0x00, 0x22,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01,
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01,
    0x00, 0x06, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
  const sof = createJpegBytes(width, height).slice(2);
  const bytes = new Uint8Array(2 + exif.length + sof.length);
  bytes.set([0xff, 0xd8]);
  bytes.set(exif, 2);
  bytes.set(sof, 2 + exif.length);
  return bytes;
}

function createPngBytes(width: number, height: number) {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    (width >>> 24) & 0xff,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    (height >>> 24) & 0xff,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
  ]);
}

describe("validateImageFile", () => {
  it("reads JPEG dimensions without decoding the image", async () => {
    const file = new File([createJpegBytes(4032, 3024)], "photo.jpg", {
      type: "image/jpeg",
    });

    await expect(validateImageFile(file)).resolves.toEqual({
      error: null,
      metadata: { format: "jpeg", width: 4032, height: 3024 },
    });
  });

  it("reads PNG dimensions from IHDR", async () => {
    const file = new File([createPngBytes(1440, 2560)], "page.png", {
      type: "image/png",
    });

    await expect(validateImageFile(file)).resolves.toEqual({
      error: null,
      metadata: { format: "png", width: 1440, height: 2560 },
    });
  });

  it("accounts for EXIF orientation when reporting JPEG dimensions", async () => {
    const file = new File([
      createRotatedJpegBytes(4032, 3024),
    ], "portrait.jpg", { type: "image/jpeg" });

    await expect(validateImageFile(file)).resolves.toEqual({
      error: null,
      metadata: { format: "jpeg", width: 3024, height: 4032 },
    });
  });

  it("rejects a matching extension and MIME with an invalid signature", async () => {
    const file = new File(["not an image"], "fake.png", {
      type: "image/png",
    });

    await expect(validateImageFile(file)).resolves.toEqual({
      error: "This file does not appear to be a valid image.",
      metadata: null,
    });
  });

  it("rejects a truncated image without readable dimensions", async () => {
    const file = new File([
      new Uint8Array([0xff, 0xd8, 0xff]),
    ], "truncated.jpg", { type: "image/jpeg" });

    await expect(validateImageFile(file)).resolves.toEqual({
      error: "This image does not contain readable dimensions.",
      metadata: null,
    });
  });
});
