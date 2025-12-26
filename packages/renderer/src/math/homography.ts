import type { Point2D, Quad } from "@openvisionmatrix/core";
import type { Matrix3x3 } from "./types";
import { validateQuad } from "./validate";

const DEFAULT_EPSILON = 1e-6;
const W_EPSILON = 1e-12;

declare const process: { env?: { NODE_ENV?: string } } | undefined;

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  for (let i = 0; i < n; i += 1) {
    let pivotRow = i;
    let max = Math.abs(A[i][i]);
    for (let r = i + 1; r < n; r += 1) {
      const value = Math.abs(A[r][i]);
      if (value > max) {
        max = value;
        pivotRow = r;
      }
    }

    if (max === 0) {
      throw new Error("Homography system is singular.");
    }

    if (pivotRow !== i) {
      const tmpRow = A[i];
      A[i] = A[pivotRow];
      A[pivotRow] = tmpRow;
      const tmpB = b[i];
      b[i] = b[pivotRow];
      b[pivotRow] = tmpB;
    }

    const pivot = A[i][i];
    for (let c = i; c < n; c += 1) {
      A[i][c] /= pivot;
    }
    b[i] /= pivot;

    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const factor = A[r][i];
      if (factor === 0) continue;
      for (let c = i; c < n; c += 1) {
        A[r][c] -= factor * A[i][c];
      }
      b[r] -= factor * b[i];
    }
  }

  return b;
}

function sanityCheckRectToQuad(
  width: number,
  height: number,
  quad: Quad,
  H: Matrix3x3
): void {
  const src: Point2D[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ];

  for (let i = 0; i < 4; i += 1) {
    const mapped = applyHomography(H, src[i]);
    const target = quad[i];
    const dx = mapped.x - target.x;
    const dy = mapped.y - target.y;
    if (Math.abs(dx) > DEFAULT_EPSILON || Math.abs(dy) > DEFAULT_EPSILON) {
      throw new Error("Homography sanity check failed.");
    }
  }
}

export function computeHomographyRectToQuad(
  width: number,
  height: number,
  quad: Quad
): Matrix3x3 {
  if (width <= 0 || height <= 0) {
    throw new Error("Width and height must be positive.");
  }

  const validation = validateQuad(quad, DEFAULT_EPSILON);
  if (!validation.ok) {
    throw new Error(`Invalid quad: ${validation.reason}`);
  }

  const src: Point2D[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const s = src[i];
    const t = quad[i];

    A.push([s.x, s.y, 1, 0, 0, 0, -t.x * s.x, -t.x * s.y]);
    b.push(t.x);

    A.push([0, 0, 0, s.x, s.y, 1, -t.y * s.x, -t.y * s.y]);
    b.push(t.y);
  }

  const h = solveLinearSystem(A, b);
  const H: Matrix3x3 = [
    h[0], h[1], h[2],
    h[3], h[4], h[5],
    h[6], h[7], 1
  ];

  const isProd = typeof process !== "undefined" && process?.env?.NODE_ENV === "production";
  if (!isProd) {
    sanityCheckRectToQuad(width, height, quad, H);
  }

  return H;
}

export function applyHomography(H: Matrix3x3, p: Point2D): Point2D {
  const x = p.x;
  const y = p.y;

  const xPrime = H[0] * x + H[1] * y + H[2];
  const yPrime = H[3] * x + H[4] * y + H[5];
  const wPrime = H[6] * x + H[7] * y + H[8];

  if (Math.abs(wPrime) < W_EPSILON) {
    throw new Error("Homography w is ~0 (degenerate transform)");
  }

  return {
    x: xPrime / wPrime,
    y: yPrime / wPrime
  };
}
