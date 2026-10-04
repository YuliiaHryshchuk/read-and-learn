export const MATERIAL_PREVIEW_LENGTH = 320;
export const MATERIAL_PREVIEW_MAX_LENGTH = MATERIAL_PREVIEW_LENGTH + 1;

const SENTENCE_END = /[.!?](?:["'»”’\)\}\]]+)?$/u;

export function formatMaterialPreview(
  preview: string,
  isTruncated: boolean,
) {
  const trimmedPreview = preview.trimEnd();
  return isTruncated && !SENTENCE_END.test(trimmedPreview)
    ? `${trimmedPreview}…`
    : trimmedPreview;
}
