import type { OcrResultItem } from "@paddleocr/paddleocr-js";

const SECTION_GAP_HEIGHT_RATIO = 1.75;
const COLUMN_GAP_HEIGHT_RATIO = 1.25;
const COLUMN_GAP_WIDTH_RATIO = 0.025;
const COLUMN_MINIMUM_HEIGHT_RATIO = 2;
const COLUMN_MINIMUM_OVERLAP_RATIO = 0.45;
const SAME_ROW_TOP_TOLERANCE_RATIO = 0.4;

type LineBounds = {
  item: OcrResultItem;
  index: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  height: number;
};

type WhitespaceCut = {
  gap: number;
  first: LineBounds[];
  second: LineBounds[];
};

type Axis = "horizontal" | "vertical";

function getLineBounds(item: OcrResultItem, index: number): LineBounds | null {
  if (!Array.isArray(item.poly) || item.poly.length < 2) return null;

  const xs = item.poly.map((point) => point[0]);
  const ys = item.poly.map((point) => point[1]);
  if (![...xs, ...ys].every(Number.isFinite)) return null;

  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  if (right <= left || bottom <= top) return null;

  return {
    item,
    index,
    left,
    right,
    top,
    bottom,
    height: bottom - top,
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function getAxisStart(line: LineBounds, axis: Axis) {
  return axis === "horizontal" ? line.top : line.left;
}

function getAxisEnd(line: LineBounds, axis: Axis) {
  return axis === "horizontal" ? line.bottom : line.right;
}

function findLargestWhitespaceCut(
  lines: LineBounds[],
  axis: Axis,
): WhitespaceCut | null {
  if (lines.length < 2) return null;

  const sorted = [...lines].sort((a, b) =>
    getAxisStart(a, axis) - getAxisStart(b, axis)
  );
  let currentEnd = getAxisEnd(sorted[0], axis);
  let largestGap = 0;
  let split: number | null = null;

  for (let index = 1; index < sorted.length; index += 1) {
    const nextStart = getAxisStart(sorted[index], axis);
    const gap = nextStart - currentEnd;

    if (gap > largestGap) {
      largestGap = gap;
      split = currentEnd + gap / 2;
    }

    currentEnd = Math.max(currentEnd, getAxisEnd(sorted[index], axis));
  }

  if (split === null) return null;

  const first = lines.filter((line) => getAxisEnd(line, axis) < split);
  const second = lines.filter((line) => getAxisStart(line, axis) > split);

  return first.length > 0 && second.length > 0
    ? { gap: largestGap, first, second }
    : null;
}

function getVerticalSpan(lines: LineBounds[]) {
  return {
    top: Math.min(...lines.map((line) => line.top)),
    bottom: Math.max(...lines.map((line) => line.bottom)),
  };
}

function isColumnCut(
  cut: WhitespaceCut,
  lines: LineBounds[],
  medianLineHeight: number,
) {
  if (cut.first.length < 2 || cut.second.length < 2) return false;

  const pageLeft = Math.min(...lines.map((line) => line.left));
  const pageRight = Math.max(...lines.map((line) => line.right));
  const minimumGap = Math.max(
    medianLineHeight * COLUMN_GAP_HEIGHT_RATIO,
    (pageRight - pageLeft) * COLUMN_GAP_WIDTH_RATIO,
  );
  if (cut.gap < minimumGap) return false;

  const firstSpan = getVerticalSpan(cut.first);
  const secondSpan = getVerticalSpan(cut.second);
  const firstHeight = firstSpan.bottom - firstSpan.top;
  const secondHeight = secondSpan.bottom - secondSpan.top;
  const overlap = Math.max(
    0,
    Math.min(firstSpan.bottom, secondSpan.bottom)
      - Math.max(firstSpan.top, secondSpan.top),
  );

  return firstHeight >= medianLineHeight * COLUMN_MINIMUM_HEIGHT_RATIO
    && secondHeight >= medianLineHeight * COLUMN_MINIMUM_HEIGHT_RATIO
    && overlap / Math.min(firstHeight, secondHeight)
      >= COLUMN_MINIMUM_OVERLAP_RATIO;
}

function sortByPosition(lines: LineBounds[], medianLineHeight: number) {
  const rows: Array<{ anchorTop: number; lines: LineBounds[] }> = [];
  const topTolerance = medianLineHeight * SAME_ROW_TOP_TOLERANCE_RATIO;
  const linesByTop = [...lines].sort((a, b) =>
    a.top - b.top || a.left - b.left || a.index - b.index
  );

  for (const line of linesByTop) {
    const currentRow = rows.at(-1);
    if (currentRow && line.top - currentRow.anchorTop <= topTolerance) {
      currentRow.lines.push(line);
    } else {
      rows.push({ anchorTop: line.top, lines: [line] });
    }
  }

  return rows.flatMap((row) => row.lines.sort((a, b) =>
    a.left - b.left || a.top - b.top || a.index - b.index
  ));
}

function orderRegion(lines: LineBounds[]): LineBounds[] {
  if (lines.length <= 1) return lines;

  const medianLineHeight = median(lines.map((line) => line.height));
  const horizontalCut = findLargestWhitespaceCut(lines, "horizontal");

  // Separate page-wide sections before looking for columns. This keeps
  // headings above both columns and footnotes below both columns.
  if (
    horizontalCut
    && horizontalCut.gap >= medianLineHeight * SECTION_GAP_HEIGHT_RATIO
  ) {
    return [
      ...orderRegion(horizontalCut.first),
      ...orderRegion(horizontalCut.second),
    ];
  }

  const verticalCut = findLargestWhitespaceCut(lines, "vertical");
  if (
    verticalCut
    && isColumnCut(verticalCut, lines, medianLineHeight)
  ) {
    return [
      ...orderRegion(verticalCut.first),
      ...orderRegion(verticalCut.second),
    ];
  }

  return sortByPosition(lines, medianLineHeight);
}

export function sortOcrItemsByReadingOrder(items: OcrResultItem[]) {
  const lines: LineBounds[] = [];

  // Older or mocked results may not contain geometry. Preserve Paddle's
  // original order rather than partially reordering an incomplete result.
  for (const [index, item] of items.entries()) {
    const line = getLineBounds(item, index);
    if (!line) return items;
    lines.push(line);
  }

  return orderRegion(lines).map((line) => line.item);
}
