export type Matrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export type Matrix4x4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

export type Point2D = {
  x: number;
  y: number;
};

export type Quad = [Point2D, Point2D, Point2D, Point2D];
