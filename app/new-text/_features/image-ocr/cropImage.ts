import {
  applyCroppedRotationTransform,
  getConstrainedDimensions,
  getRotatedDimensions,
  isFullImageCrop,
  percentCropToPixels,
} from "./imageGeometry";
import type { SelectedImage } from "./imageOcrTypes";

export const MAX_OCR_IMAGE_PIXELS = 8_000_000;
export const MAX_OCR_IMAGE_SIDE = 4000;

const JPEG_OUTPUT_QUALITY = 0.92;

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob
        ? resolve(blob)
        : reject(new Error("The selected image could not be prepared for OCR.")),
      type,
      type === "image/jpeg" ? JPEG_OUTPUT_QUALITY : undefined,
    );
  });
}

function isWithinOcrLimits(width: number, height: number) {
  return Math.max(width, height) <= MAX_OCR_IMAGE_SIDE
    && width * height <= MAX_OCR_IMAGE_PIXELS;
}

function releaseCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

export async function prepareImageForOcr({
  crop,
  file,
  metadata,
  rotation,
}: SelectedImage): Promise<Blob> {
  if (
    rotation === 0
    && isFullImageCrop(crop)
    && isWithinOcrLimits(metadata.width, metadata.height)
  ) {
    return file;
  }

  const bitmapDimensions = getConstrainedDimensions(
    metadata.width,
    metadata.height,
    MAX_OCR_IMAGE_SIDE,
    MAX_OCR_IMAGE_PIXELS,
  );
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
    resizeHeight: bitmapDimensions.height,
    resizeQuality: "high",
    resizeWidth: bitmapDimensions.width,
  });
  let outputCanvas: HTMLCanvasElement | null = null;

  try {
    const rotatedDimensions = getRotatedDimensions(
      bitmap.width,
      bitmap.height,
      rotation,
    );
    const cropPixels = percentCropToPixels(
      crop,
      rotatedDimensions.width,
      rotatedDimensions.height,
    );
    const outputDimensions = getConstrainedDimensions(
      cropPixels.width,
      cropPixels.height,
      MAX_OCR_IMAGE_SIDE,
      MAX_OCR_IMAGE_PIXELS,
    );
    const outputScale = Math.min(
      outputDimensions.width / cropPixels.width,
      outputDimensions.height / cropPixels.height,
    );

    outputCanvas = document.createElement("canvas");
    outputCanvas.width = outputDimensions.width;
    outputCanvas.height = outputDimensions.height;

    const context = outputCanvas.getContext("2d");
    if (!context) {
      throw new Error("Image processing is not supported in this browser.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    applyCroppedRotationTransform(
      context,
      bitmap.width,
      bitmap.height,
      cropPixels,
      outputScale,
      rotation,
    );
    context.drawImage(bitmap, 0, 0);

    return await canvasToBlob(outputCanvas, file.type);
  } finally {
    releaseCanvas(outputCanvas);
    bitmap.close();
  }
}
