"use client";

import { useEffect, useRef } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import styles from "./imageOcr.module.scss";

const MAX_PREVIEW_SIDE = 1200;

export type ImageRotation = 0 | 90 | 180 | 270;

type ImageCropEditorProps = {
  crop: PercentCrop;
  previewUrl: string;
  rotation: ImageRotation;
  onCropChange: (crop: PercentCrop) => void;
  onImageError: () => void;
};

function drawRotatedPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  rotation: ImageRotation,
) {
  const scale = Math.min(
    1,
    MAX_PREVIEW_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const swapsDimensions = rotation === 90 || rotation === 270;

  canvas.width = swapsDimensions ? sourceHeight : sourceWidth;
  canvas.height = swapsDimensions ? sourceWidth : sourceHeight;

  const context = canvas.getContext("2d");
  if (!context) return;

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
}

export default function ImageCropEditor({
  crop,
  previewUrl,
  rotation,
  onCropChange,
  onImageError,
}: ImageCropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => drawRotatedPreview(canvas, image, rotation);
    image.onerror = onImageError;
    image.src = previewUrl;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [onImageError, previewUrl, rotation]);

  return (
    <div className={styles.cropEditor}>
      <div className={styles.cropViewport}>
        <ReactCrop
          crop={crop}
          keepSelection
          minHeight={24}
          minWidth={24}
          ruleOfThirds
          ariaLabels={{
            cropArea: "Text crop area",
            nwDragHandle: "Resize crop from top left",
            nDragHandle: "Resize crop from top",
            neDragHandle: "Resize crop from top right",
            eDragHandle: "Resize crop from right",
            seDragHandle: "Resize crop from bottom right",
            sDragHandle: "Resize crop from bottom",
            swDragHandle: "Resize crop from bottom left",
            wDragHandle: "Resize crop from left",
          }}
          onChange={(_, nextCrop) => onCropChange(nextCrop)}
        >
          <canvas
            ref={canvasRef}
            className={styles.cropPreview}
            role="img"
            aria-label="Selected image preview"
            data-image-src={previewUrl}
            data-rotation={rotation}
          />
        </ReactCrop>
      </div>
    </div>
  );
}
