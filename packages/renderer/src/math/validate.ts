import type { Quad } from "@openvisionmatrix/core";
import type { Point2D } from "./types";

const DEFAULT_EPSILON = 1e-6;

export function quadArea(quad: Quad): number {
  let sum = 0;
  for (let i = 0; i < 4; i += 1) {
    const p1 = quad[i];
    const p2 = quad[(i + 1) % 4];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return sum / 2;
}

export function isClockwiseQuad(quad: Quad): boolean {
  return quadArea(quad) > 0;
}

function pointsEqual(a: Point2D, b: Point2D): boolean {
  return a.x === b.x && a.y === b.y;
}

function cross(a: Point2D, b: Point2D, c: Point2D): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const acx = c.x - a.x;
  const acy = c.y - a.y;
  return abx * acy - aby * acx;
}

function hasDuplicatePoints(quad: Quad): boolean {
  for (let i = 0; i < 4; i += 1) {
    for (let j = i + 1; j < 4; j += 1) {
      if (pointsEqual(quad[i], quad[j])) return true;
    }
  }
  return false;
}

function hasCollinearTriplet(quad: Quad, epsilon: number): boolean {
  const triplets: [number, number, number][] = [
    [0, 1, 2],
    [0, 1, 3],
    [0, 2, 3],
    [1, 2, 3]
  ];
  return triplets.some(([i, j, k]) => Math.abs(cross(quad[i], quad[j], quad[k])) <= epsilon);
}

function segmentsIntersect(a: Point2D, b: Point2D, c: Point2D, d: Point2D, epsilon: number): boolean {
  const ab = cross(a, b, c);
  const ab2 = cross(a, b, d);
  const cd = cross(c, d, a);
  const cd2 = cross(c, d, b);

  if (Math.abs(ab) <= epsilon && Math.abs(ab2) <= epsilon && Math.abs(cd) <= epsilon && Math.abs(cd2) <= epsilon) {
    return false;
  }

  return (ab > epsilon && ab2 < -epsilon) || (ab < -epsilon && ab2 > epsilon)
    ? (cd > epsilon && cd2 < -epsilon) || (cd < -epsilon && cd2 > epsilon)
    : false;
}

function isSelfIntersecting(quad: Quad, epsilon: number): boolean {
  return segmentsIntersect(quad[0], quad[1], quad[2], quad[3], epsilon)
    || segmentsIntersect(quad[1], quad[2], quad[3], quad[0], epsilon);
}

export function validateQuad(
  quad: Quad,
  epsilon: number = DEFAULT_EPSILON
): { ok: true } | { ok: false; reason: string } {
  if (hasDuplicatePoints(quad)) {
    return { ok: false, reason: "Quad contains duplicate points." };
  }

  if (hasCollinearTriplet(quad, epsilon)) {
    return { ok: false, reason: "Quad has collinear points." };
  }

  const area = quadArea(quad);
  if (Math.abs(area) <= epsilon) {
    return { ok: false, reason: "Quad area is too small." };
  }

  if (!isClockwiseQuad(quad)) {
    return { ok: false, reason: "Quad must be clockwise." };
  }

  if (isSelfIntersecting(quad, epsilon)) {
    return { ok: false, reason: "Quad is self-intersecting." };
  }

  return { ok: true };
}
