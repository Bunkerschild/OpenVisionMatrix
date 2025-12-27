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
  LIVE_VIDEO = "LIVE_VIDEO",
  COLOR = "COLOR",
  TEXT = "TEXT",
  LINE = "LINE"
}

export type ScaleMode = "uniform" | "free";

export type SurfaceScale = {
  x: number;
  y: number;
  mode: ScaleMode;
};

export type FullscreenFit = "stretch" | "contain" | "cover";

export type FullscreenAlign =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type FullscreenLayout = {
  enabled: boolean;
  fit: FullscreenFit;
  align: FullscreenAlign;
};

export type LiveVideoConfig = {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpness?: number;
  whiteBalanceMode?: "continuous" | "manual";
  colorTemperature?: number;
  exposureMode?: "continuous" | "manual";
};

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
  width: number;
  height: number;
  locked?: boolean;
  visible: boolean;
  opacity: number;
  zIndex: number;
  mask?: Polygon;
  scale: SurfaceScale;
  fullscreen: FullscreenLayout;
  glowColor?: string;
  liveVideo?: LiveVideoConfig;
};

export type Project = {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  surfaces: Surface[];
};
