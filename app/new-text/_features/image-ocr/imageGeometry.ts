import type { PercentCrop } from "react-image-crop";
import type { ImageRotation } from "./imageOcrTypes";

export type ImageDimensions = {
  height: number;
  width: number;
};

export type PixelCrop = ImageDimensions & {
  x: number;
  y: number;
};

export function getConstrainedDimensions(
  width: number,
  height: number,
  maxSide: number,
  maxPixels: number,
): ImageDimensions {
  const scale = Math.min(
    1,
    maxSide / Math.max(width, height),
    Math.sqrt(maxPixels / (width * height)),
  );

  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}

export function getRotatedDimensions(
  width: number,
  height: number,
  rotation: ImageRotation,
): ImageDimensions {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

export function percentCropToPixels(
  crop: PercentCrop,
  width: number,
  height: number,
): PixelCrop {
  const x = Math.max(0, Math.min(width - 1, Math.round(width * crop.x / 100)));
  const y = Math.max(0, Math.min(height - 1, Math.round(height * crop.y / 100)));

  return {
    x,
    y,
    width: Math.max(
      1,
      Math.min(width - x, Math.round(width * crop.width / 100)),
    ),
    height: Math.max(
      1,
      Math.min(height - y, Math.round(height * crop.height / 100)),
    ),
  };
}

export function isFullImageCrop(crop: PercentCrop) {
  const tolerance = 0.01;
  return Math.abs(crop.x) <= tolerance
    && Math.abs(crop.y) <= tolerance
    && Math.abs(crop.width - 100) <= tolerance
    && Math.abs(crop.height - 100) <= tolerance;
}

export function applyCroppedRotationTransform(
  context: CanvasRenderingContext2D,
  sourceWidth: number,
  sourceHeight: number,
  crop: PixelCrop,
  outputScale: number,
  rotation: ImageRotation,
) {
  if (rotation === 90) {
    context.setTransform(
      0,
      outputScale,
      -outputScale,
      0,
      outputScale * (sourceHeight - crop.x),
      -outputScale * crop.y,
    );
  } else if (rotation === 180) {
    context.setTransform(
      -outputScale,
      0,
      0,
      -outputScale,
      outputScale * (sourceWidth - crop.x),
      outputScale * (sourceHeight - crop.y),
    );
  } else if (rotation === 270) {
    context.setTransform(
      0,
      -outputScale,
      outputScale,
      0,
      -outputScale * crop.x,
      outputScale * (sourceWidth - crop.y),
    );
  } else {
    context.setTransform(
      outputScale,
      0,
      0,
      outputScale,
      -outputScale * crop.x,
      -outputScale * crop.y,
    );
  }
}
