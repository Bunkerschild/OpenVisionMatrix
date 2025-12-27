import type { Point2D, Quad } from "./math/types";

export type FullscreenFit = "stretch" | "contain" | "cover";
export type FullscreenAlign =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

function quadFromRect(x: number, y: number, width: number, height: number): Quad {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
}

export function getQuadCenter(quad: Quad): Point2D {
  const sum = quad.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / quad.length, y: sum.y / quad.length };
}

export function scaleQuad(
  quad: Quad,
  scaleX: number,
  scaleY: number,
  origin?: Point2D
): Quad {
  const center = origin ?? getQuadCenter(quad);
  return quad.map((point) => ({
    x: center.x + (point.x - center.x) * scaleX,
    y: center.y + (point.y - center.y) * scaleY
  })) as Quad;
}

export function computeFullscreenQuad(
  stageWidth: number,
  stageHeight: number,
  contentWidth: number,
  contentHeight: number,
  fit: FullscreenFit,
  align: FullscreenAlign
): Quad {
  const safeContentWidth = contentWidth > 0 ? contentWidth : stageWidth;
  const safeContentHeight = contentHeight > 0 ? contentHeight : stageHeight;

  let targetWidth = stageWidth;
  let targetHeight = stageHeight;

  if (fit === "contain" || fit === "cover") {
    const scale = fit === "contain"
      ? Math.min(stageWidth / safeContentWidth, stageHeight / safeContentHeight)
      : Math.max(stageWidth / safeContentWidth, stageHeight / safeContentHeight);
    targetWidth = safeContentWidth * scale;
    targetHeight = safeContentHeight * scale;
  }

  let offsetX = 0;
  let offsetY = 0;

  switch (align) {
    case "center":
      offsetX = (stageWidth - targetWidth) / 2;
      offsetY = (stageHeight - targetHeight) / 2;
      break;
    case "top-right":
      offsetX = stageWidth - targetWidth;
      offsetY = 0;
      break;
    case "bottom-left":
      offsetX = 0;
      offsetY = stageHeight - targetHeight;
      break;
    case "bottom-right":
      offsetX = stageWidth - targetWidth;
      offsetY = stageHeight - targetHeight;
      break;
    case "top-left":
    default:
      offsetX = 0;
      offsetY = 0;
      break;
  }

  return quadFromRect(offsetX, offsetY, targetWidth, targetHeight);
}
