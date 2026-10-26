import type { ImageFileMetadata } from "./imageOcrTypes";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,image/jpeg,image/png";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png"]);

function hasJpegSignature(bytes: Uint8Array) {
  return bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff;
}

function hasPngSignature(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((byte, index) => bytes[index] === byte);
}

function readUint16(bytes: Uint8Array, offset: number, littleEndian: boolean) {
  if (offset < 0 || offset + 2 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getUint16(offset, littleEndian);
}

function readUint32(bytes: Uint8Array, offset: number, littleEndian: boolean) {
  if (offset < 0 || offset + 4 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    .getUint32(offset, littleEndian);
}

function readExifOrientation(bytes: Uint8Array, start: number, end: number) {
  if (end - start < 14) return 1;
  const isExif = bytes[start] === 0x45
    && bytes[start + 1] === 0x78
    && bytes[start + 2] === 0x69
    && bytes[start + 3] === 0x66
    && bytes[start + 4] === 0
    && bytes[start + 5] === 0;
  if (!isExif) return 1;

  const tiffStart = start + 6;
  const littleEndian = bytes[tiffStart] === 0x49
    && bytes[tiffStart + 1] === 0x49;
  const bigEndian = bytes[tiffStart] === 0x4d
    && bytes[tiffStart + 1] === 0x4d;
  if (!littleEndian && !bigEndian) return 1;

  const ifdOffset = readUint32(bytes, tiffStart + 4, littleEndian);
  if (ifdOffset === null) return 1;
  const ifdStart = tiffStart + ifdOffset;
  const entryCount = readUint16(bytes, ifdStart, littleEndian);
  if (entryCount === null) return 1;

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdStart + 2 + index * 12;
    if (entryOffset + 12 > end) return 1;
    const tag = readUint16(bytes, entryOffset, littleEndian);
    if (tag !== 0x0112) continue;
    const orientation = readUint16(bytes, entryOffset + 8, littleEndian);
    return orientation && orientation >= 1 && orientation <= 8
      ? orientation
      : 1;
  }

  return 1;
}

function getPngMetadata(bytes: Uint8Array): ImageFileMetadata | null {
  if (!hasPngSignature(bytes) || bytes.length < 24) return null;
  const isIhdr = bytes[12] === 0x49
    && bytes[13] === 0x48
    && bytes[14] === 0x44
    && bytes[15] === 0x52;
  if (!isIhdr) return null;

  const width = readUint32(bytes, 16, false);
  const height = readUint32(bytes, 20, false);
  return width && height ? { format: "png", width, height } : null;
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function getJpegMetadata(bytes: Uint8Array): ImageFileMetadata | null {
  if (!hasJpegSignature(bytes)) return null;
  let offset = 2;
  let orientation = 1;
  let encodedWidth = 0;
  let encodedHeight = 0;

  while (offset + 4 <= bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;

    const segmentLength = readUint16(bytes, offset, false);
    if (segmentLength === null || segmentLength < 2) return null;
    const segmentStart = offset + 2;
    const segmentEnd = offset + segmentLength;
    if (segmentEnd > bytes.length) break;

    if (marker === 0xe1) {
      orientation = readExifOrientation(bytes, segmentStart, segmentEnd);
    } else if (JPEG_SOF_MARKERS.has(marker) && segmentLength >= 7) {
      encodedHeight = readUint16(bytes, segmentStart + 1, false) ?? 0;
      encodedWidth = readUint16(bytes, segmentStart + 3, false) ?? 0;
    }

    if (encodedWidth && encodedHeight && orientation !== 1) break;
    offset = segmentEnd;
  }

  if (!encodedWidth || !encodedHeight) return null;
  const swapsDimensions = orientation >= 5 && orientation <= 8;
  return {
    format: "jpeg",
    width: swapsDimensions ? encodedHeight : encodedWidth,
    height: swapsDimensions ? encodedWidth : encodedHeight,
  };
}

const MAX_HEADER_BYTES = 1024 * 1024;

export type ImageFileValidationResult =
  | { error: string; metadata: null }
  | { error: null; metadata: ImageFileMetadata };

export async function validateImageFile(
  file: File,
): Promise<ImageFileValidationResult> {
  const basicError = getBasicImageFileError(file);
  if (basicError) return { error: basicError, metadata: null };

  const bytes = new Uint8Array(
    await file.slice(0, Math.min(file.size, MAX_HEADER_BYTES)).arrayBuffer(),
  );
  const isJpeg = file.type.toLocaleLowerCase("en-US") === "image/jpeg";
  const hasExpectedSignature = isJpeg
    ? hasJpegSignature(bytes)
    : hasPngSignature(bytes);
  if (!hasExpectedSignature) {
    return {
      error: "This file does not appear to be a valid image.",
      metadata: null,
    };
  }

  const metadata = isJpeg ? getJpegMetadata(bytes) : getPngMetadata(bytes);

  return metadata
    ? { error: null, metadata }
    : {
        error: "This image does not contain readable dimensions.",
        metadata: null,
      };
}

function getBasicImageFileError(file: File) {
  if (file.size === 0) return "The selected image is empty.";
  if (file.size > MAX_IMAGE_BYTES) {
    return "Choose an image smaller than 10 MB.";
  }

  const mimeType = file.type.toLocaleLowerCase("en-US");
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return "Choose a JPEG, JPG, or PNG image.";
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLocaleLowerCase("en-US")
    : undefined;
  if (extension && !ALLOWED_EXTENSIONS.has(extension)) {
    return "Choose a JPEG, JPG, or PNG image.";
  }

  return null;
}
