import type { PercentCrop } from "react-image-crop";

export type ImageRotation = 0 | 90 | 180 | 270;

export type ImageFileMetadata = {
  format: "jpeg" | "png";
  height: number;
  width: number;
};

export type SelectedImage = {
  crop: PercentCrop;
  file: File;
  metadata: ImageFileMetadata;
  rotation: ImageRotation;
};
