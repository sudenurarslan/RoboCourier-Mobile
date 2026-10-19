import type { HocaKatiMapSpec } from '@/src/constants/hocaKatiMap';

/** How the image is fitted inside the touch box (same math as contentFit="contain"). */
export function containLayout(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number
) {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  const ox = (boxW - dw) / 2;
  const oy = (boxH - dh) / 2;
  return { scale, ox, oy, dw, dh };
}

/**
 * Pixel (ix, iy): ix from left, iy from top (image / PGM row order).
 * Matches map_server: lower-left image pixel sits at origin in map frame; yaw rotates grid.
 */
export function imagePixelToMap(
  spec: HocaKatiMapSpec,
  ix: number,
  iyTop: number
): { x: number; y: number } {
  const rowFromBottom = spec.heightPx - 1 - iyTop;
  const c = Math.cos(spec.originYaw);
  const s = Math.sin(spec.originYaw);
  const colM = (ix + 0.5) * spec.resolution;
  const rowM = (rowFromBottom + 0.5) * spec.resolution;
  return {
    x: spec.originX + colM * c - rowM * s,
    y: spec.originY + colM * s + rowM * c,
  };
}

export function touchToImagePixel(
  lx: number,
  ly: number,
  spec: HocaKatiMapSpec,
  boxW: number,
  boxH: number
): { ix: number; iy: number } | null {
  const { scale, ox, oy, dw, dh } = containLayout(spec.widthPx, spec.heightPx, boxW, boxH);
  const x = lx - ox;
  const y = ly - oy;
  if (x < 0 || y < 0 || x > dw || y > dh) return null;
  const ix = Math.floor(x / scale);
  const iy = Math.floor(y / scale);
  return {
    ix: Math.max(0, Math.min(spec.widthPx - 1, ix)),
    iy: Math.max(0, Math.min(spec.heightPx - 1, iy)),
  };
}

export function imagePixelToTouchOffset(
  ix: number,
  iy: number,
  spec: HocaKatiMapSpec,
  boxW: number,
  boxH: number
): { left: number; top: number } {
  const { scale, ox, oy } = containLayout(spec.widthPx, spec.heightPx, boxW, boxH);
  return {
    left: ox + (ix + 0.5) * scale,
    top: oy + (iy + 0.5) * scale,
  };
}
