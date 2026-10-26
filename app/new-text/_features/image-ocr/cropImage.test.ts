// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareImageForOcr } from "./cropImage";
import type { SelectedImage } from "./imageOcrTypes";

const canvasMocks = vi.hoisted(() => ({
  context: {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    setTransform: vi.fn(),
  },
  getContext: vi.fn(),
  toBlob: vi.fn(),
}));

function createSelectedImage({
  crop = { unit: "%", x: 0, y: 0, width: 100, height: 100 },
  height = 1200,
  name = "photo.jpg",
  rotation = 0,
  type = "image/jpeg",
  width = 1600,
}: Partial<{
  crop: SelectedImage["crop"];
  height: number;
  name: string;
  rotation: SelectedImage["rotation"];
  type: string;
  width: number;
}> = {}): SelectedImage {
  return {
    crop,
    file: new File(["image"], name, { type }),
    metadata: {
      format: type === "image/png" ? "png" : "jpeg",
      height,
      width,
    },
    rotation,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  canvasMocks.getContext.mockReturnValue(canvasMocks.context);
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: canvasMocks.getContext,
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
    configurable: true,
    value: canvasMocks.toBlob.mockImplementation(function toBlob(
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string,
    ) {
      callback(new Blob(["prepared"], { type }));
    }),
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "createImageBitmap");
  Reflect.deleteProperty(HTMLCanvasElement.prototype, "getContext");
  Reflect.deleteProperty(HTMLCanvasElement.prototype, "toBlob");
});

describe("prepareImageForOcr", () => {
  it("returns a safe unchanged File directly to PaddleOCR", async () => {
    const selectedImage = createSelectedImage();
    const createBitmap = vi.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: createBitmap,
    });

    const result = await prepareImageForOcr(selectedImage);

    expect(result).toBe(selectedImage.file);
    expect(createBitmap).not.toHaveBeenCalled();
    expect(canvasMocks.getContext).not.toHaveBeenCalled();
  });

  it("downscales a large JPEG with one bitmap and one canvas", async () => {
    const close = vi.fn();
    const createBitmap = vi.fn(async (_file: Blob, options: ImageBitmapOptions) => ({
      close,
      height: options.resizeHeight,
      width: options.resizeWidth,
    }));
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: createBitmap,
    });
    const selectedImage = createSelectedImage({
      height: 6048,
      width: 8064,
    });

    const result = await prepareImageForOcr(selectedImage);

    expect(result.type).toBe("image/jpeg");
    expect(createBitmap).toHaveBeenCalledTimes(1);
    expect(createBitmap).toHaveBeenCalledWith(
      selectedImage.file,
      expect.objectContaining({
        resizeHeight: 2449,
        resizeWidth: 3265,
      }),
    );
    expect(canvasMocks.getContext).toHaveBeenCalledTimes(1);
    expect(canvasMocks.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/jpeg",
      0.92,
    );
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("keeps PNG output lossless when crop processing is required", async () => {
    const close = vi.fn();
    Object.defineProperty(globalThis, "createImageBitmap", {
      configurable: true,
      value: vi.fn(async () => ({ close, height: 1200, width: 1600 })),
    });
    const selectedImage = createSelectedImage({
      crop: { unit: "%", x: 10, y: 10, width: 80, height: 80 },
      name: "page.png",
      type: "image/png",
    });

    const result = await prepareImageForOcr(selectedImage);

    expect(result.type).toBe("image/png");
    expect(canvasMocks.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/png",
      undefined,
    );
    expect(close).toHaveBeenCalledTimes(1);
  });
});
