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

export async function getImageFileError(file: File) {
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

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const hasExpectedSignature = mimeType === "image/jpeg"
    ? hasJpegSignature(bytes)
    : hasPngSignature(bytes);

  return hasExpectedSignature
    ? null
    : "This file does not appear to be a valid image.";
}
