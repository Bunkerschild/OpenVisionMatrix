export type ISO8601 = string;

export type Point2D = {
  x: number;
  y: number;
};

export type Quad = [Point2D, Point2D, Point2D, Point2D];

export type Polygon = Point2D[];

export enum SurfaceType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  COLOR = "COLOR",
  TEXT = "TEXT",
  LINE = "LINE"
}

export type AssetRef = {
  id: string;
  kind: "image" | "video";
  width: number;
  height: number;
  duration?: number;
};

export type Timeline = {
  start: number;
  duration: number;
  loop?: boolean;
};

export type Surface = {
  id: string;
  type: SurfaceType;
  quad: Quad;
  visible: boolean;
  opacity: number;
  zIndex: number;
  mask?: Polygon;
};

export type Project = {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  surfaces: Surface[];
};
