import type { PercentCrop } from "react-image-crop";
import type { SelectedImage } from "./ImagePicker";
import type { ImageRotation } from "./ImageCropEditor";

const MAX_OCR_IMAGE_SIDE = 4000;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.94;

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be opened."));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob
        ? resolve(blob)
        : reject(new Error("The selected image could not be prepared for OCR.")),
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    );
  });
}

function drawRotatedImage(
  image: HTMLImageElement,
  rotation: ImageRotation,
) {
  const scale = Math.min(
    1,
    MAX_OCR_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const swapsDimensions = rotation === 90 || rotation === 270;
  const canvas = document.createElement("canvas");

  canvas.width = swapsDimensions ? sourceHeight : sourceWidth;
  canvas.height = swapsDimensions ? sourceWidth : sourceHeight;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is not supported in this browser.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (rotation === 90) {
    context.translate(canvas.width, 0);
    context.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    context.translate(canvas.width, canvas.height);
    context.rotate(Math.PI);
  } else if (rotation === 270) {
    context.translate(0, canvas.height);
    context.rotate(-Math.PI / 2);
  }

  context.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  return canvas;
}

function cropPixels(crop: PercentCrop, width: number, height: number) {
  const x = Math.max(0, Math.round(width * crop.x / 100));
  const y = Math.max(0, Math.round(height * crop.y / 100));
  const cropWidth = Math.max(1, Math.min(width - x, Math.round(width * crop.width / 100)));
  const cropHeight = Math.max(1, Math.min(height - y, Math.round(height * crop.height / 100)));

  return { x, y, width: cropWidth, height: cropHeight };
}

export async function createCroppedImageBlob({
  crop,
  previewUrl,
  rotation,
}: SelectedImage) {
  const image = await loadImage(previewUrl);
  const rotatedCanvas = drawRotatedImage(image, rotation);
  const pixels = cropPixels(crop, rotatedCanvas.width, rotatedCanvas.height);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = pixels.width;
  outputCanvas.height = pixels.height;

  const context = outputCanvas.getContext("2d");
  if (!context) throw new Error("Image processing is not supported in this browser.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  context.drawImage(
    rotatedCanvas,
    pixels.x,
    pixels.y,
    pixels.width,
    pixels.height,
    0,
    0,
    pixels.width,
    pixels.height,
  );

  return canvasToBlob(outputCanvas);
}
