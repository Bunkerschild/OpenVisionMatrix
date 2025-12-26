import type { Matrix3x3, Matrix4x4 } from "./types";

export function homographyToCssMatrix3d(H: Matrix3x3): Matrix4x4 {
  // CSS matrix3d expects column-major order. We embed the 3x3 homography as:
  // [ h00 h01 0 h02 ]
  // [ h10 h11 0 h12 ]
  // [ 0   0   1 0   ]
  // [ h20 h21 0 h22 ]
  // This maps (x,y,0,1) with projective divide on w.
  const h00 = H[0];
  const h01 = H[1];
  const h02 = H[2];
  const h10 = H[3];
  const h11 = H[4];
  const h12 = H[5];
  const h20 = H[6];
  const h21 = H[7];
  const h22 = H[8];

  return [
    h00, h10, 0, h20,
    h01, h11, 0, h21,
    0, 0, 1, 0,
    h02, h12, 0, h22
  ];
}

export function cssMatrix3dToString(M: Matrix4x4): string {
  return `matrix3d(${M.join(", ")})`;
}
