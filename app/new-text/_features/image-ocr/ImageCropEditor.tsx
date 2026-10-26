"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  applyCroppedRotationTransform,
  getConstrainedDimensions,
  getRotatedDimensions,
} from "./imageGeometry";
import type {
  ImageFileMetadata,
  ImageRotation,
} from "./imageOcrTypes";
import styles from "./imageOcr.module.scss";

const MAX_PREVIEW_SIDE = 1200;
const MAX_PREVIEW_PIXELS = MAX_PREVIEW_SIDE * MAX_PREVIEW_SIDE;

type ImageCropEditorProps = {
  crop: PercentCrop;
  file: File;
  metadata: ImageFileMetadata;
  rotation: ImageRotation;
  onCropChange: (crop: PercentCrop) => void;
  onImageError: () => void;
};

type PreviewBitmap = {
  bitmap: ImageBitmap;
  file: File;
};

function drawRotatedPreview(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  rotation: ImageRotation,
) {
  const dimensions = getRotatedDimensions(
    bitmap.width,
    bitmap.height,
    rotation,
  );
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  applyCroppedRotationTransform(
    context,
    bitmap.width,
    bitmap.height,
    { x: 0, y: 0, ...dimensions },
    1,
    rotation,
  );
  context.drawImage(bitmap, 0, 0);
}

export default function ImageCropEditor({
  crop,
  file,
  metadata,
  rotation,
  onCropChange,
  onImageError,
}: ImageCropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onImageErrorRef = useRef(onImageError);
  const [preview, setPreview] = useState<PreviewBitmap | null>(null);

  useEffect(() => {
    onImageErrorRef.current = onImageError;
  }, [onImageError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }

    const dimensions = getConstrainedDimensions(
      metadata.width,
      metadata.height,
      MAX_PREVIEW_SIDE,
      MAX_PREVIEW_PIXELS,
    );
    let cancelled = false;
    let activeBitmap: ImageBitmap | null = null;

    void createImageBitmap(file, {
      imageOrientation: "from-image",
      resizeHeight: dimensions.height,
      resizeQuality: "high",
      resizeWidth: dimensions.width,
    }).then((bitmap) => {
      if (cancelled) {
        bitmap.close();
        return;
      }
      activeBitmap = bitmap;
      setPreview({ bitmap, file });
    }).catch(() => {
      if (!cancelled) onImageErrorRef.current();
    });

    return () => {
      cancelled = true;
      activeBitmap?.close();
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
  }, [file, metadata.height, metadata.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !preview || preview.file !== file) return;
    drawRotatedPreview(canvas, preview.bitmap, rotation);
  }, [file, preview, rotation]);

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
            data-file-name={file.name}
            data-rotation={rotation}
          />
        </ReactCrop>
      </div>
    </div>
  );
}
