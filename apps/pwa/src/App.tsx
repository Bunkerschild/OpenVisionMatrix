import type { CSSProperties, ChangeEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { LiveVideoConfig, Point2D, Polygon, Quad, ScaleMode } from "@openvisionmatrix/core";
import { SurfaceType } from "@openvisionmatrix/core";
import {
  computeHomographyRectToQuad,
  computeFullscreenQuad,
  cssMatrix3dToString,
  getQuadCenter,
  homographyToCssMatrix3d
} from "@openvisionmatrix/renderer";
import type { FullscreenAlign, FullscreenFit, Matrix4x4 } from "@openvisionmatrix/renderer";
import { scaleQuad } from "@openvisionmatrix/renderer";

const STAGE_DEFAULT_WIDTH = 980;
const STAGE_DEFAULT_HEIGHT = 620;
const DEFAULT_SIZE = { width: 320, height: 220 };

type Shape = "rect" | "circle" | "triangle";

type LoopMode = "infinite" | "once" | "count";

type AnimationType =
  | "none"
  | "glow"
  | "chase"
  | "draw"
  | "hue"
  | "spin3d"
  | "textflow"
  | "pulse"
  | "flip";

type Surface = {
  id: string;
  name: string;
  type: SurfaceType;
  quad: Quad;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  scaleMode: ScaleMode;
  isFullscreen: boolean;
  fullscreenFit: FullscreenFit;
  fullscreenAlign: FullscreenAlign;
  visible: boolean;
  opacity: number;
  zIndex: number;
  src: string;
  shape: Shape;
  maskPoints?: Polygon;
  lineWidth: number;
  animationSpeed: number;
  animationType: AnimationType;
  glowColor: string;
  isMuted: boolean;
  volume: number;
  timelineStart: number;
  timelineDuration: number;
  rotation: number;
  videoDuration?: number;
  loopMode: LoopMode;
  loopCount: number;
  textContent: string;
  fontSize: number;
  isVertical: boolean;
  liveVideo?: LiveVideoConfig;
};

type PlayConfig = {
  loopDuration: number;
  mode: "infinite" | "count" | "timer";
  count: number;
  stopAfter: number;
};

type DragHandle = {
  surfaceId: string;
  index: number;
  mode: "perspective" | "mask" | "scale";
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampScale(value: number): number {
  return clamp(value, 0.1, 10);
}

function unscalePoint(point: Point2D, center: Point2D, scaleX: number, scaleY: number): Point2D {
  const safeScaleX = scaleX === 0 ? 1 : scaleX;
  const safeScaleY = scaleY === 0 ? 1 : scaleY;
  return {
    x: center.x + (point.x - center.x) / safeScaleX,
    y: center.y + (point.y - center.y) / safeScaleY
  };
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, seconds);
  const mins = Math.floor(whole / 60);
  const secs = (whole % 60).toFixed(1).padStart(4, "0");
  return `${mins}:${secs}`;
}

function quadFromRect(x: number, y: number, width: number, height: number): Quad {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
}

function computeCenterQuad(
  width: number,
  height: number,
  stageWidth: number,
  stageHeight: number
): Quad {
  const cx = stageWidth / 2 - width / 2;
  const cy = stageHeight / 2 - height / 2;
  return quadFromRect(cx, cy, width, height);
}

function useLocalPos(containerRef: RefObject<HTMLDivElement>) {
  return useCallback(
    (clientX: number, clientY: number): Point2D => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: clientX, y: clientY };
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [containerRef]
  );
}

function SurfaceLayer({
  surface,
  renderQuad,
  isSelected,
  isPlaying,
  globalTime,
  onSelect,
  onStartDrag,
  isDragging,
  onLiveMeta
}: {
  surface: Surface;
  renderQuad: Quad;
  isSelected: boolean;
  isPlaying: boolean;
  globalTime: number;
  onSelect: (id: string) => void;
  onStartDrag: (event: ReactPointerEvent, id: string) => void;
  isDragging: boolean;
  onLiveMeta: (id: string, meta: { capabilities?: MediaTrackCapabilities; settings?: MediaTrackSettings; error?: string }) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isActive = !isPlaying
    || (globalTime >= surface.timelineStart
      && globalTime <= surface.timelineStart + surface.timelineDuration);

  const matrix: Matrix4x4 = useMemo(() => {
    try {
      const H = computeHomographyRectToQuad(surface.width, surface.height, renderQuad);
      return homographyToCssMatrix3d(H);
    } catch (error) {
      console.warn("Invalid homography", error);
      return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ] as Matrix4x4;
    }
  }, [surface.width, surface.height, renderQuad]);

  useEffect(() => {
    if (surface.type !== SurfaceType.VIDEO) return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = surface.isMuted;
    video.volume = clamp(surface.volume, 0, 1);

    if (!isPlaying || !isActive) {
      video.pause();
      return;
    }

    const start = surface.timelineStart;
    const elapsed = globalTime - start;
    const duration = video.duration || surface.videoDuration || surface.timelineDuration;

    if (duration <= 0) return;

    if (surface.loopMode === "once") {
      const target = Math.min(elapsed, duration);
      if (Math.abs(video.currentTime - target) > 0.3) {
        video.currentTime = target;
      }
      if (elapsed <= duration) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
      return;
    }

    if (surface.loopMode === "count") {
      const maxTime = duration * Math.max(1, surface.loopCount);
      if (elapsed >= maxTime) {
        video.pause();
        return;
      }
    }

    const mod = elapsed % duration;
    if (Math.abs(video.currentTime - mod) > 0.3) {
      video.currentTime = mod;
    }
    if (video.paused) {
      video.play().catch(() => undefined);
    }
  }, [
    surface.type,
    surface.isMuted,
    surface.volume,
    surface.loopMode,
    surface.loopCount,
    surface.timelineStart,
    surface.timelineDuration,
    surface.videoDuration,
    isPlaying,
    isActive,
    globalTime
  ]);

  useEffect(() => {
    if (surface.type !== SurfaceType.LIVE_VIDEO) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      onLiveMeta(surface.id, { error: "getUserMedia nicht verfügbar." });
      return;
    }

    let active = true;
    let stream: MediaStream | null = null;

    const buildConstraints = (config?: LiveVideoConfig): MediaTrackConstraints => {
      if (!config) return {};
      const toIdeal = (value?: number) => (value ? { ideal: value } : undefined);
      return {
        deviceId: config.deviceId ? { exact: config.deviceId } : undefined,
        width: toIdeal(config.width),
        height: toIdeal(config.height),
        frameRate: toIdeal(config.frameRate),
        brightness: toIdeal(config.brightness),
        contrast: toIdeal(config.contrast),
        saturation: toIdeal(config.saturation),
        sharpness: toIdeal(config.sharpness),
        whiteBalanceMode: config.whiteBalanceMode ? { ideal: config.whiteBalanceMode } : undefined,
        colorTemperature: toIdeal(config.colorTemperature),
        exposureMode: config.exposureMode ? { ideal: config.exposureMode } : undefined
      };
    };

    const startStream = async () => {
      try {
        const constraints = buildConstraints(surface.liveVideo);
        stream = await navigator.mediaDevices.getUserMedia({
          video: constraints,
          audio: false
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        onLiveMeta(surface.id, {
          capabilities: track?.getCapabilities ? track.getCapabilities() : undefined,
          settings: track?.getSettings ? track.getSettings() : undefined
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Live-Video konnte nicht gestartet werden.";
        onLiveMeta(surface.id, { error: message });
      }
    };

    startStream();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [surface.id, surface.type, surface.liveVideo, onLiveMeta]);

  const maskClip = useMemo(() => {
    if (!surface.maskPoints || surface.maskPoints.length < 3) return undefined;
    if (surface.type === SurfaceType.LINE) return undefined;
    const points = surface.maskPoints.map((p) => `${p.x}px ${p.y}px`).join(", ");
    return `polygon(${points})`;
  }, [surface.maskPoints, surface.type]);

  const animationClass = useMemo(() => {
    if (surface.animationSpeed <= 0 || surface.animationType === "none") return "";
    const map: Record<AnimationType, string> = {
      none: "",
      glow: "anim-glow",
      chase: "anim-chase",
      draw: "anim-draw",
      hue: "anim-hue",
      spin3d: "anim-spin",
      textflow: "anim-textflow",
      pulse: "anim-pulse",
      flip: "anim-flip"
    };
    return map[surface.animationType];
  }, [surface.animationSpeed, surface.animationType]);

  const animationStyle: CSSProperties = surface.animationSpeed > 0
    ? { animationDuration: `${surface.animationSpeed}s` }
    : {};

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: surface.zIndex,
    clipPath: maskClip,
    pointerEvents: "none",
    opacity: isActive && surface.visible ? surface.opacity : 0,
    transition: isPlaying ? "opacity 0.2s ease" : undefined,
    ...(surface.glowColor ? ({ ["--glow-color"]: surface.glowColor } as CSSProperties) : {})
  };

  const surfaceStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: surface.width,
    height: surface.height,
    transformOrigin: "0 0",
    transform: cssMatrix3dToString(matrix),
    opacity: 1,
    borderRadius: !surface.maskPoints && surface.shape === "circle" ? "50%" : undefined,
    clipPath: !surface.maskPoints && surface.shape === "triangle"
      ? "polygon(50% 0%, 0% 100%, 100% 100%)"
      : undefined
  };

  const contentClass = [
    "surface-content",
    isSelected ? "surface-selected" : "",
    isDragging ? "is-dragging" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const contentStyle: CSSProperties = {
    ...animationStyle,
    width: "100%",
    height: "100%",
    opacity: isDragging ? 0.1 : 1
  };

  const renderContent = () => {
    switch (surface.type) {
      case SurfaceType.VIDEO:
        return (
          <video
            ref={videoRef}
            src={surface.src}
            className="surface-media"
            playsInline
            muted={surface.isMuted}
          />
        );
      case SurfaceType.LIVE_VIDEO:
        return (
          <video
            ref={videoRef}
            className="surface-media"
            playsInline
            muted={surface.isMuted}
          />
        );
      case SurfaceType.IMAGE:
        return (
          <img
            src={surface.src}
            className="surface-media"
            alt="Surface"
            draggable={false}
          />
        );
      case SurfaceType.TEXT:
        return (
          <div
            className="surface-text"
            style={{
              ...animationStyle,
              color: surface.src,
              fontSize: surface.fontSize,
              writingMode: surface.isVertical ? "vertical-rl" : "horizontal-tb"
            }}
          >
            {surface.textContent}
          </div>
        );
      case SurfaceType.COLOR:
        return <div className="surface-color" style={{ backgroundColor: surface.src }} />;
      case SurfaceType.LINE:
        if (surface.maskPoints && surface.maskPoints.length >= 2) {
          return null;
        }
        return (
          <div
            className="surface-line"
            style={{
              ...animationStyle,
              borderColor: surface.src,
              borderWidth: surface.lineWidth
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="surface-wrapper" style={wrapperStyle}>
      {surface.type === SurfaceType.LINE && surface.maskPoints && surface.maskPoints.length >= 2 && (
        <svg
          className="line-overlay"
          style={{ ...animationStyle, pointerEvents: isPlaying ? "none" : "auto" }}
          onPointerDown={(event) => {
            onSelect(surface.id);
            onStartDrag(event, surface.id);
          }}
        >
          <polyline
            points={surface.maskPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={surface.src}
            strokeWidth={surface.lineWidth}
            className={animationClass}
          />
        </svg>
      )}
      <div
        className={contentClass}
        style={{ ...surfaceStyle, pointerEvents: isPlaying ? "none" : "auto" }}
        onPointerDown={(event) => {
          event.preventDefault();
          onSelect(surface.id);
          onStartDrag(event, surface.id);
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        <div className={`surface-inner ${animationClass}`} style={contentStyle}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function DrawingModal({
  title,
  onClose,
  onSave
}: {
  title: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState("#2dd4bf");
  const [lineWidth, setLineWidth] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [straightMode, setStraightMode] = useState(false);
  const [startPos, setStartPos] = useState<Point2D | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 520;
    canvas.height = 520;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
  }, [color, lineWidth]);

  const getPos = (event: ReactPointerEvent<HTMLCanvasElement>): Point2D => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width),
      y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height)
    };
  };

  const startDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(event);
    setIsDrawing(true);
    setStartPos(pos);
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(event);
    if (straightMode && startPos && snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      return;
    }
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="drawing-canvas">
          <canvas
            ref={canvasRef}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
          />
        </div>
        <div className="drawing-controls">
          <label>
            Farbe
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <label>
            Pinsel
            <input
              type="range"
              min={1}
              max={20}
              value={lineWidth}
              onChange={(event) => setLineWidth(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className={`toggle ${straightMode ? "active" : ""}`}
            onClick={() => setStraightMode((prev) => !prev)}
          >
            Gerade Linie
          </button>
          <button type="button" className="ghost" onClick={clearCanvas}>
            Leeren
          </button>
        </div>
        <button className="primary" onClick={handleSave}>
          Als Surface hinzufügen
        </button>
      </div>
    </div>
  );
}

function StageDrawingOverlay({
  stageRef,
  onClose,
  onSave
}: {
  stageRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onSave: (dataUrl: string, rect: { x: number; y: number; w: number; h: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState("#4ade80");
  const [lineWidth, setLineWidth] = useState(10);
  const [isDrawing, setIsDrawing] = useState(false);
  const dprRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    canvas.width = stage.clientWidth * dpr;
    canvas.height = stage.clientHeight * dpr;
    canvas.style.width = `${stage.clientWidth}px`;
    canvas.style.height = `${stage.clientHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }, [stageRef]);

  const getPos = (event: ReactPointerEvent<HTMLCanvasElement>): Point2D => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const startDraw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(event);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const idx = i / 4;
        const x = idx % width;
        const y = Math.floor(idx / width);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        found = true;
      }
    }

    if (!found) {
      onClose();
      return;
    }

    const cropX = Math.max(0, minX - 5);
    const cropY = Math.max(0, minY - 5);
    const cropW = Math.min(width - cropX, maxX - minX + 10);
    const cropH = Math.min(height - cropY, maxY - minY + 10);

    const temp = document.createElement("canvas");
    temp.width = cropW;
    temp.height = cropH;
    const tctx = temp.getContext("2d");
    if (!tctx) return;
    tctx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    const dpr = dprRef.current || 1;
    onSave(temp.toDataURL("image/png"), {
      x: cropX / dpr,
      y: cropY / dpr,
      w: cropW / dpr,
      h: cropH / dpr
    });
  };

  return (
    <div className="stage-overlay">
      <div className="overlay-toolbar">
        <div className="overlay-controls">
          <label>
            Farbe
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label>
            Breite
            <input
              type="range"
              min={2}
              max={30}
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="overlay-actions">
          <button className="ghost" onClick={onClose}>Abbrechen</button>
          <button className="primary" onClick={handleSave}>Übernehmen</button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
      />
    </div>
  );
}

function PlayModal({
  config,
  onChange,
  onClose,
  onStart
}: {
  config: PlayConfig;
  onChange: (config: PlayConfig) => void;
  onClose: () => void;
  onStart: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>Playback</h3>
          <button className="icon-button" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <label className="field">
            Loop-Dauer (s)
            <input
              type="number"
              min={1}
              step={0.1}
              value={config.loopDuration}
              onChange={(event) =>
                onChange({ ...config, loopDuration: Number(event.target.value) })
              }
            />
          </label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="play-mode"
                checked={config.mode === "infinite"}
                onChange={() => onChange({ ...config, mode: "infinite" })}
              />
              Endlos
            </label>
            <label>
              <input
                type="radio"
                name="play-mode"
                checked={config.mode === "count"}
                onChange={() => onChange({ ...config, mode: "count" })}
              />
              Anzahl
            </label>
            {config.mode === "count" && (
              <input
                type="number"
                min={1}
                value={config.count}
                onChange={(event) =>
                  onChange({ ...config, count: Number(event.target.value) })
                }
              />
            )}
            <label>
              <input
                type="radio"
                name="play-mode"
                checked={config.mode === "timer"}
                onChange={() => onChange({ ...config, mode: "timer" })}
              />
              Stopp nach Zeit
            </label>
            {config.mode === "timer" && (
              <input
                type="number"
                min={1}
                value={config.stopAfter}
                onChange={(event) =>
                  onChange({ ...config, stopAfter: Number(event.target.value) })
                }
              />
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>Abbrechen</button>
          <button className="primary" onClick={onStart}>Starten</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const stageRef = useRef<HTMLDivElement>(null);
  const getLocalPos = useLocalPos(stageRef);

  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<"perspective" | "mask" | "scale">("perspective");
  const [dragHandle, setDragHandle] = useState<DragHandle | null>(null);
  const [dragSurfaceId, setDragSurfaceId] = useState<string | null>(null);
  const [lastPos, setLastPos] = useState<Point2D | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playConfig, setPlayConfig] = useState<PlayConfig>({
    loopDuration: 30,
    mode: "infinite",
    count: 1,
    stopAfter: 60
  });
  const [showPlayModal, setShowPlayModal] = useState(false);
  const [showWindowDrawing, setShowWindowDrawing] = useState(false);
  const [showStageDrawing, setShowStageDrawing] = useState(false);
  const [hideUI, setHideUI] = useState(false);
  const [uploadShape, setUploadShape] = useState<Shape>("rect");
  const [dragListId, setDragListId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: STAGE_DEFAULT_WIDTH, height: STAGE_DEFAULT_HEIGHT });
  const [mediaDevices, setMediaDevices] = useState<MediaDeviceInfo[]>([]);
  const [liveMeta, setLiveMeta] = useState<Record<string, { capabilities?: MediaTrackCapabilities; settings?: MediaTrackSettings; error?: string }>>({});

  const timerRef = useRef<number | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const dragPointerTarget = useRef<Element | null>(null);

  const getStageSize = useCallback(() => {
    return stageSize;
  }, [stageSize]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateSize = () => {
      const rect = stage.getBoundingClientRect();
      setStageSize({
        width: rect.width || STAGE_DEFAULT_WIDTH,
        height: rect.height || STAGE_DEFAULT_HEIGHT
      });
    };

    updateSize();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateSize());
      observer.observe(stage);
    }

    window.addEventListener("resize", updateSize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const refreshDevices = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => setMediaDevices(devices))
      .catch(() => undefined);
  }, []);

  const selectedSurface = surfaces.find((surface) => surface.id === selectedId) || null;

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const updateSurface = useCallback((id: string, updates: Partial<Surface>) => {
    setSurfaces((prev) => prev.map((surface) => (surface.id === id ? { ...surface, ...updates } : surface)));
  }, []);

  const getRenderQuad = useCallback((surface: Surface) => {
    const baseQuad = surface.isFullscreen
      ? computeFullscreenQuad(
        stageSize.width,
        stageSize.height,
        surface.width,
        surface.height,
        surface.fullscreenFit,
        surface.fullscreenAlign
      )
      : surface.quad;
    return surface.isFullscreen ? baseQuad : scaleQuad(baseQuad, surface.scaleX, surface.scaleY);
  }, [stageSize]);

  const reorderSurfaces = useCallback((fromId: string, toId: string) => {
    setSurfaces((prev) => {
      const fromIndex = prev.findIndex((surface) => surface.id === fromId);
      const toIndex = prev.findIndex((surface) => surface.id === toId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((surface, index) => ({
        ...surface,
        zIndex: index + 1
      }));
    });
  }, []);

  const addSurface = useCallback((
    type: SurfaceType,
    src: string,
    shape: Shape,
    width: number,
    height: number,
    duration?: number,
    position?: { x: number; y: number }
  ) => {
    const { width: stageWidth, height: stageHeight } = getStageSize();
    const quad = position
      ? quadFromRect(position.x, position.y, width, height)
      : computeCenterQuad(width, height, stageWidth, stageHeight);
    const nextIndex = surfaces.length + 1;
    const newSurface: Surface = {
      id: createId(),
      name: `${type === SurfaceType.TEXT ? "Text" : "Surface"} ${nextIndex}`,
      type,
      quad,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
      scaleMode: "uniform",
      isFullscreen: false,
      fullscreenFit: "contain",
      fullscreenAlign: "center",
      visible: true,
      opacity: 1,
      zIndex: nextIndex,
      src,
      shape,
      lineWidth: 8,
      animationSpeed: 0,
      animationType: "none",
      glowColor: "#38bdf8",
      isMuted: type === SurfaceType.LIVE_VIDEO,
      volume: 1,
      timelineStart: 0,
      timelineDuration: duration || 10,
      rotation: 0,
      videoDuration: duration,
      loopMode: "infinite",
      loopCount: 1,
      textContent: type === SurfaceType.TEXT ? "OPENVISION" : "",
      fontSize: type === SurfaceType.TEXT ? 64 : 24,
      isVertical: false,
      liveVideo: type === SurfaceType.LIVE_VIDEO ? {} : undefined
    };
    setSurfaces((prev) => [...prev, newSurface]);
    setSelectedId(newSurface.id);
    setEditMode("perspective");
    return newSurface;
  }, [surfaces.length]);

  const addLiveSurface = useCallback(() => {
    const surface = addSurface(
      SurfaceType.LIVE_VIDEO,
      "",
      "rect",
      DEFAULT_SIZE.width,
      DEFAULT_SIZE.height
    );
    updateSurface(surface.id, { name: `Live Source ${surfaces.length + 1}` });
    refreshDevices();
  }, [addSurface, refreshDevices, surfaces.length, updateSurface]);

  const removeSurface = useCallback((id: string) => {
    setSurfaces((prev) => prev.filter((surface) => surface.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (isPlaying) return;
    if (event.target === stageRef.current) setSelectedId(null);
  }, [isPlaying]);

  const handleStartDragSurface = (event: ReactPointerEvent, surfaceId: string) => {
    if (isPlaying) return;
    const surface = surfaces.find((item) => item.id === surfaceId);
    if (surface?.isFullscreen) return;
    event.preventDefault();
    event.stopPropagation();
    const pos = getLocalPos(event.clientX, event.clientY);
    setDragSurfaceId(surfaceId);
    setLastPos(pos);
    setSelectedId(surfaceId);
    if (event.currentTarget instanceof Element && event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragPointerId.current = event.pointerId;
      dragPointerTarget.current = event.currentTarget;
    }
  };

  const handleStartDragHandle = (event: ReactPointerEvent, surfaceId: string, index: number, mode: DragHandle["mode"]) => {
    if (isPlaying) return;
    event.preventDefault();
    event.stopPropagation();
    setDragHandle({ surfaceId, index, mode });
    setSelectedId(surfaceId);
    if (event.currentTarget instanceof Element && event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragPointerId.current = event.pointerId;
      dragPointerTarget.current = event.currentTarget;
    }
  };

  const handleAddMaskPoint = (surfaceId: string, index: number) => {
    const surface = surfaces.find((item) => item.id === surfaceId);
    if (!surface || !surface.maskPoints || surface.maskPoints.length < 2) return;
    const points = surface.maskPoints;
    const prev = points[(index - 1 + points.length) % points.length];
    const next = points[index % points.length];
    const mid = { x: (prev.x + next.x) / 2, y: (prev.y + next.y) / 2 };
    const updated = [...points];
    updated.splice(index, 0, mid);
    updateSurface(surfaceId, { maskPoints: updated });
    setDragHandle({ surfaceId, index, mode: "mask" });
  };

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (isPlaying) return;
      if (!dragHandle && !dragSurfaceId) return;
      const pos = getLocalPos(event.clientX, event.clientY);
      if (dragHandle) {
        setSurfaces((prev) => prev.map((surface) => {
          if (surface.id !== dragHandle.surfaceId) return surface;
          if (dragHandle.mode === "mask") {
            const maskPoints = surface.maskPoints ? [...surface.maskPoints] : [];
            if (maskPoints[dragHandle.index]) maskPoints[dragHandle.index] = pos;
            return { ...surface, maskPoints };
          }
          if (dragHandle.mode === "scale") {
            const center = getQuadCenter(surface.quad);
            const baseCorner = surface.quad[dragHandle.index];
            let nextScaleX = baseCorner.x !== center.x
              ? (pos.x - center.x) / (baseCorner.x - center.x)
              : surface.scaleX;
            let nextScaleY = baseCorner.y !== center.y
              ? (pos.y - center.y) / (baseCorner.y - center.y)
              : surface.scaleY;
            if (!Number.isFinite(nextScaleX)) nextScaleX = surface.scaleX;
            if (!Number.isFinite(nextScaleY)) nextScaleY = surface.scaleY;
            if (surface.scaleMode === "uniform") {
              const uniform = Math.abs(nextScaleX) >= Math.abs(nextScaleY) ? nextScaleX : nextScaleY;
              nextScaleX = uniform;
              nextScaleY = uniform;
            }
            return {
              ...surface,
              scaleX: clampScale(nextScaleX),
              scaleY: clampScale(nextScaleY)
            };
          }
          const center = getQuadCenter(surface.quad);
          const unscaled = unscalePoint(pos, center, surface.scaleX, surface.scaleY);
          const quad = [...surface.quad];
          quad[dragHandle.index] = unscaled;
          return { ...surface, quad } as Surface;
        }));
        return;
      }
      if (dragSurfaceId && lastPos) {
        const dx = pos.x - lastPos.x;
        const dy = pos.y - lastPos.y;
        setSurfaces((prev) => prev.map((surface) => {
          if (surface.id !== dragSurfaceId) return surface;
          if (surface.isFullscreen) return surface;
          const quad = surface.quad.map((p) => ({ x: p.x + dx, y: p.y + dy })) as Quad;
          const maskPoints = surface.maskPoints
            ? surface.maskPoints.map((p) => ({ x: p.x + dx, y: p.y + dy }))
            : undefined;
          return { ...surface, quad, maskPoints };
        }));
        setLastPos(pos);
      }
    };

    const handleUp = () => {
      setDragHandle(null);
      setDragSurfaceId(null);
      setLastPos(null);
      if (dragPointerTarget.current && dragPointerId.current !== null) {
        const target = dragPointerTarget.current;
        if (target.releasePointerCapture) {
          target.releasePointerCapture(dragPointerId.current);
        }
      }
      dragPointerId.current = null;
      dragPointerTarget.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragHandle, dragSurfaceId, lastPos, getLocalPos, isPlaying]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((event.target as HTMLElement).tagName)) return;
      if (event.key === "Escape") setSelectedId(null);
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedId && !isPlaying) removeSurface(selectedId);
      }
      if (event.key.toLowerCase() === "h") setHideUI((prev) => !prev);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedId, isPlaying, removeSurface]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const startTime = Date.now() - currentTime * 1000;
    const initialStart = Date.now();

    timerRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;

      if (playConfig.mode === "timer" && (now - initialStart) / 1000 >= playConfig.stopAfter) {
        setIsPlaying(false);
        return;
      }

      if (playConfig.loopDuration > 0 && elapsed >= playConfig.loopDuration) {
        if (playConfig.mode === "count") {
          const loops = Math.floor(elapsed / playConfig.loopDuration);
          if (loops >= playConfig.count) {
            setIsPlaying(false);
            return;
          }
        }
        setCurrentTime(elapsed % playConfig.loopDuration);
        return;
      }

      setCurrentTime(elapsed);
    }, 50);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, currentTime, playConfig]);

  const getMaxDuration = () => {
    return surfaces.reduce((max, surface) => {
      const end = surface.timelineStart + surface.timelineDuration;
      return Math.max(max, end);
    }, 10);
  };

  const startPlayback = () => {
    setShowPlayModal(false);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const stopPlayback = () => setIsPlaying(false);

  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
      document.exitFullscreen().catch(() => undefined);
    }
  };

  const ensureMaskMode = () => {
    if (!selectedSurface) return;
    if (!selectedSurface.maskPoints || selectedSurface.maskPoints.length === 0) {
      updateSurface(selectedSurface.id, { maskPoints: [...getRenderQuad(selectedSurface)] });
    }
    setEditMode("mask");
  };

  const clearMask = () => {
    if (!selectedSurface) return;
    updateSurface(selectedSurface.id, { maskPoints: undefined });
    setEditMode("perspective");
  };

  const resetMask = () => {
    if (!selectedSurface) return;
    updateSurface(selectedSurface.id, { maskPoints: [...getRenderQuad(selectedSurface)] });
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>, shape: Shape) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          const w = video.videoWidth || DEFAULT_SIZE.width;
          const h = video.videoHeight || DEFAULT_SIZE.height;
          const scale = 420 / Math.max(w, h);
          addSurface(
            SurfaceType.VIDEO,
            result,
            shape,
            w * scale,
            h * scale,
            video.duration || 10
          );
        };
        video.src = result;
      } else if (file.type.startsWith("image/")) {
        const img = new Image();
        img.onload = () => {
          const scale = 420 / Math.max(img.width, img.height);
          addSurface(
            SurfaceType.IMAGE,
            result,
            shape,
            img.width * scale,
            img.height * scale
          );
        };
        img.src = result;
      }
    };
    reader.readAsDataURL(file);
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(surfaces, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "openvisionmatrix-project.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importProject = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Partial<Surface>[];
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((surface, index) => ({
            ...surface,
            id: surface.id ?? createId(),
            name: surface.name ?? `Surface ${index + 1}`,
            scaleX: surface.scaleX ?? 1,
            scaleY: surface.scaleY ?? 1,
            scaleMode: surface.scaleMode ?? "uniform",
            isFullscreen: surface.isFullscreen ?? false,
            fullscreenFit: surface.fullscreenFit ?? "contain",
            fullscreenAlign: surface.fullscreenAlign ?? "center",
            glowColor: surface.glowColor ?? "#38bdf8",
            liveVideo: surface.type === SurfaceType.LIVE_VIDEO ? (surface.liveVideo ?? {}) : surface.liveVideo
          })) as Surface[];
          setSurfaces(normalized);
          setSelectedId(null);
        }
      } catch (error) {
        console.error("Invalid project file", error);
      }
    };
    reader.readAsText(file);
  };

  const handleWindowDrawingSave = (dataUrl: string) => {
    setShowWindowDrawing(false);
    const surface = addSurface(
      SurfaceType.IMAGE,
      dataUrl,
      "rect",
      520,
      520
    );
    updateSurface(surface.id, { animationSpeed: 4, animationType: "spin3d", name: "Zeichnung" });
  };

  const handleStageDrawingSave = (dataUrl: string, rect: { x: number; y: number; w: number; h: number }) => {
    setShowStageDrawing(false);
    const surface = addSurface(
      SurfaceType.IMAGE,
      dataUrl,
      "rect",
      rect.w,
      rect.h,
      undefined,
      { x: rect.x, y: rect.y }
    );
    updateSurface(surface.id, { animationSpeed: 5, animationType: "spin3d", name: "Stage Sketch" });
  };

  const handleSelect = (id: string) => {
    if (!isPlaying) setSelectedId(id);
  };

  const activeMaskPoints = selectedSurface?.maskPoints || [];
  const selectedRenderQuad = selectedSurface ? getRenderQuad(selectedSurface) : null;
  const liveInfo = selectedSurface ? liveMeta[selectedSurface.id] : undefined;
  const whiteBalanceModes = liveInfo?.capabilities?.whiteBalanceMode ?? [];
  const exposureModes = liveInfo?.capabilities?.exposureMode ?? [];
  const videoDevices = useMemo(
    () => mediaDevices.filter((device) => device.kind === "videoinput"),
    [mediaDevices]
  );

  const handleLiveMeta = useCallback((id: string, meta: { capabilities?: MediaTrackCapabilities; settings?: MediaTrackSettings; error?: string }) => {
    setLiveMeta((prev) => ({ ...prev, [id]: { ...prev[id], ...meta } }));
    if (meta.settings && mediaDevices.length === 0) {
      refreshDevices();
    }
  }, [mediaDevices.length, refreshDevices]);

  const updateLiveConfig = useCallback((updates: Partial<LiveVideoConfig>) => {
    if (!selectedSurface) return;
    updateSurface(selectedSurface.id, {
      liveVideo: {
        ...(selectedSurface.liveVideo ?? {}),
        ...updates
      }
    });
  }, [selectedSurface, updateSurface]);

  return (
    <div className={`app ${hideUI ? "ui-hidden" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <h1>OpenVisionMatrix</h1>
            <p>Projection Control Suite · UI ausblenden: Taste H</p>
          </div>
        </div>
        {!hideUI && (
          <div className="topbar-hint">
            {isPlaying ? "Playback aktiv" : "Ziehe Punkte zum Verzerren."}
          </div>
        )}
        <div className="topbar-actions">
          <button className="ghost" onClick={() => setShowPlayModal(true)}>Playback</button>
          <button className="ghost" onClick={toggleFullscreen}>Fullscreen</button>
          <button className="ghost" onClick={exportProject}>Export</button>
          <label className="ghost file">
            Import
            <input type="file" accept="application/json" onChange={importProject} />
          </label>
          <a
            className="ghost"
            href="https://github.com/Bunkerschild/OpenVisionMatrix"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>

      <div className="workspace">
        <aside className="panel left">
          <section>
            <h2>Neue Surface</h2>
            <div className="button-grid">
              <button onClick={() => addSurface(SurfaceType.COLOR, "#38bdf8", "rect", 320, 220)}>
                Farbe
              </button>
              <button onClick={() => addSurface(SurfaceType.TEXT, "#f8fafc", "rect", 420, 220)}>
                Text
              </button>
              <button onClick={() => addSurface(SurfaceType.LINE, "#22d3ee", "rect", 320, 220)}>
                Linie
              </button>
              <button onClick={addLiveSurface}>
                Live Video
              </button>
              <button onClick={() => setShowWindowDrawing(true)}>Canvas Draw</button>
              <button onClick={() => setShowStageDrawing(true)}>Stage Draw</button>
            </div>
          </section>

          <section>
            <h2>Medien Upload</h2>
            <div className="shape-toggle">
              {(["rect", "circle", "triangle"] as Shape[]).map((shape) => (
                <button
                  key={shape}
                  className={`shape-pill ${uploadShape === shape ? "active" : ""}`}
                  onClick={() => setUploadShape(shape)}
                >
                  {shape}
                </button>
              ))}
            </div>
            <label className="file-button">
              Bild/Video wählen
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(event) => handleFileUpload(event, uploadShape)}
              />
            </label>
          </section>

          <section>
            <h2>Surfaces</h2>
            <div className="surface-list">
              {surfaces.map((surface) => (
                <div
                  key={surface.id}
                  className={`surface-item ${surface.id === selectedId ? "active" : ""} ${surface.id === dragOverId ? "drag-over" : ""}`}
                  onClick={() => handleSelect(surface.id)}
                  draggable
                  onDragStart={(event) => {
                    setDragListId(surface.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", surface.id);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dragOverId !== surface.id) setDragOverId(surface.id);
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const sourceId = event.dataTransfer.getData("text/plain") || dragListId;
                    if (sourceId) reorderSurfaces(sourceId, surface.id);
                    setDragListId(null);
                    setDragOverId(null);
                  }}
                  onDragEnd={() => {
                    setDragListId(null);
                    setDragOverId(null);
                  }}
                >
                  <div className="surface-meta">
                    <strong>{surface.name}</strong>
                    <span>{surface.type}</span>
                  </div>
                  <div className="surface-actions">
                    <button
                      className={surface.visible ? "" : "muted"}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateSurface(surface.id, { visible: !surface.visible });
                      }}
                    >
                      {surface.visible ? "👁" : "🚫"}
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        removeSurface(surface.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {surfaces.length === 0 && (
                <p className="empty">Noch keine Surfaces. Füge links eine hinzu.</p>
              )}
            </div>
          </section>
        </aside>

        <main className="stage-area">
          <div
            className="stage"
            ref={stageRef}
            onPointerDown={handlePointerDown}
          >
            {surfaces.map((surface) => (
              <SurfaceLayer
                key={surface.id}
                surface={surface}
                renderQuad={getRenderQuad(surface)}
                isSelected={selectedId === surface.id}
                isPlaying={isPlaying}
                globalTime={currentTime}
                onSelect={handleSelect}
                onStartDrag={handleStartDragSurface}
                isDragging={dragSurfaceId === surface.id}
                onLiveMeta={handleLiveMeta}
              />
            ))}
            {showStageDrawing && (
              <StageDrawingOverlay
                stageRef={stageRef}
                onClose={() => setShowStageDrawing(false)}
                onSave={handleStageDrawingSave}
              />
            )}

            {selectedSurface && selectedRenderQuad && !isPlaying && (
              <div className="overlay">
                {editMode === "perspective" && !selectedSurface.isFullscreen && (
                  <>
                    <svg className="quad-outline">
                      <polygon
                        points={selectedRenderQuad.map((p) => `${p.x},${p.y}`).join(" ")}
                      />
                    </svg>
                    {selectedRenderQuad.map((corner, index) => (
                      <div
                        key={`corner-${index}`}
                        className="handle"
                        style={{ left: corner.x, top: corner.y }}
                        onPointerDown={(event) =>
                          handleStartDragHandle(event, selectedSurface.id, index, "perspective")
                        }
                      />
                    ))}
                    <div
                      className="handle center"
                      style={{
                        left: (selectedRenderQuad[0].x + selectedRenderQuad[2].x) / 2,
                        top: (selectedRenderQuad[0].y + selectedRenderQuad[2].y) / 2
                      }}
                      onPointerDown={(event) => handleStartDragSurface(event, selectedSurface.id)}
                    />
                  </>
                )}
                {editMode === "scale" && !selectedSurface.isFullscreen && (
                  <>
                    <svg className="quad-outline scale">
                      <polygon
                        points={selectedRenderQuad.map((p) => `${p.x},${p.y}`).join(" ")}
                      />
                    </svg>
                    {selectedRenderQuad.map((corner, index) => (
                      <div
                        key={`scale-${index}`}
                        className="handle scale"
                        style={{ left: corner.x, top: corner.y }}
                        onPointerDown={(event) =>
                          handleStartDragHandle(event, selectedSurface.id, index, "scale")
                        }
                      />
                    ))}
                    <div
                      className="handle center"
                      style={{
                        left: (selectedRenderQuad[0].x + selectedRenderQuad[2].x) / 2,
                        top: (selectedRenderQuad[0].y + selectedRenderQuad[2].y) / 2
                      }}
                      onPointerDown={(event) => handleStartDragSurface(event, selectedSurface.id)}
                    />
                  </>
                )}
                {editMode === "mask" && selectedSurface.maskPoints && (
                  <>
                    <svg className="quad-outline mask">
                      <polygon points={activeMaskPoints.map((p) => `${p.x},${p.y}`).join(" ")} />
                    </svg>
                    {activeMaskPoints.map((point, index) => {
                      const next = activeMaskPoints[(index + 1) % activeMaskPoints.length];
                      const mid = { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 };
                      return (
                        <div key={`mask-${index}`}>
                          <div
                            className="handle mask"
                            style={{ left: point.x, top: point.y }}
                            onPointerDown={(event) =>
                              handleStartDragHandle(event, selectedSurface.id, index, "mask")
                            }
                            onDoubleClick={() => {
                              if (activeMaskPoints.length <= 3) return;
                              const updated = [...activeMaskPoints];
                              updated.splice(index, 1);
                              updateSurface(selectedSurface.id, { maskPoints: updated });
                            }}
                          />
                          <div
                            className="handle ghost"
                            style={{ left: mid.x, top: mid.y }}
                            onPointerDown={() => handleAddMaskPoint(selectedSurface.id, index + 1)}
                          />
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

          </div>
        </main>

        <aside className="panel right">
          <section>
            <h2>Inspector</h2>
            {!selectedSurface && <p className="empty">Wähle eine Surface aus.</p>}
            {selectedSurface && (
              <div className="inspector">
                <label className="field">
                  Name
                  <input
                    type="text"
                    value={selectedSurface.name}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { name: event.target.value })
                    }
                  />
                </label>

                <div className="toggle-row">
                  <button
                    className={editMode === "perspective" ? "active" : ""}
                    onClick={() => setEditMode("perspective")}
                  >
                    Perspektive
                  </button>
                  <button
                    className={editMode === "scale" ? "active" : ""}
                    onClick={() => setEditMode("scale")}
                  >
                    Skalieren
                  </button>
                  <button
                    className={editMode === "mask" ? "active" : ""}
                    onClick={ensureMaskMode}
                  >
                    Maske
                  </button>
                </div>

                {editMode === "mask" && (
                  <div className="inline-actions">
                    <button className="ghost" onClick={resetMask}>Maske = Quad</button>
                    <button className="ghost" onClick={clearMask}>Maske löschen</button>
                  </div>
                )}

                <label className="field">
                  Sichtbarkeit
                  <input
                    type="checkbox"
                    checked={selectedSurface.visible}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { visible: event.target.checked })
                    }
                  />
                </label>

                <label className="field">
                  Opazität
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedSurface.opacity}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { opacity: Number(event.target.value) })
                    }
                  />
                </label>

                <label className="field">
                  Z-Index
                  <input
                    type="number"
                    value={selectedSurface.zIndex}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { zIndex: Number(event.target.value) })
                    }
                  />
                </label>

                <label className="field">
                  Größe
                  <div className="field-row">
                    <input
                      type="number"
                      value={Math.round(selectedSurface.width)}
                      onChange={(event) =>
                        updateSurface(selectedSurface.id, { width: Number(event.target.value) })
                      }
                    />
                    <input
                      type="number"
                      value={Math.round(selectedSurface.height)}
                      onChange={(event) =>
                        updateSurface(selectedSurface.id, { height: Number(event.target.value) })
                      }
                    />
                  </div>
                </label>

                <label className="field">
                  Skalierung
                  <div className="field-row">
                    <input
                      type="number"
                      step={0.05}
                      value={Number(selectedSurface.scaleX.toFixed(2))}
                      onChange={(event) => {
                        const value = clampScale(Number(event.target.value));
                        if (selectedSurface.scaleMode === "uniform") {
                          updateSurface(selectedSurface.id, { scaleX: value, scaleY: value });
                          return;
                        }
                        updateSurface(selectedSurface.id, { scaleX: value });
                      }}
                    />
                    <input
                      type="number"
                      step={0.05}
                      value={Number(selectedSurface.scaleY.toFixed(2))}
                      onChange={(event) =>
                        updateSurface(selectedSurface.id, { scaleY: clampScale(Number(event.target.value)) })
                      }
                      disabled={selectedSurface.scaleMode === "uniform"}
                    />
                  </div>
                </label>

                <label className="field">
                  Seitenverhältnis sperren
                  <input
                    type="checkbox"
                    checked={selectedSurface.scaleMode === "uniform"}
                    onChange={(event) => {
                      const mode: ScaleMode = event.target.checked ? "uniform" : "free";
                      updateSurface(selectedSurface.id, {
                        scaleMode: mode,
                        scaleY: event.target.checked ? selectedSurface.scaleX : selectedSurface.scaleY
                      });
                    }}
                  />
                </label>

                <div className="inline-actions">
                  <button
                    className="ghost"
                    onClick={() => updateSurface(selectedSurface.id, { scaleX: 1, scaleY: 1 })}
                  >
                    Skalierung zurücksetzen
                  </button>
                </div>

                <label className="field">
                  Form
                  <select
                    value={selectedSurface.shape}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { shape: event.target.value as Shape })
                    }
                  >
                    <option value="rect">Rechteck</option>
                    <option value="circle">Kreis</option>
                    <option value="triangle">Dreieck</option>
                  </select>
                </label>

                <label className="field">
                  Farbe / Quelle
                  <input
                    type="color"
                    value={selectedSurface.type === SurfaceType.IMAGE
                      || selectedSurface.type === SurfaceType.VIDEO
                      || selectedSurface.type === SurfaceType.LIVE_VIDEO
                      ? "#ffffff"
                      : selectedSurface.src}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { src: event.target.value })
                    }
                    disabled={selectedSurface.type === SurfaceType.IMAGE
                      || selectedSurface.type === SurfaceType.VIDEO
                      || selectedSurface.type === SurfaceType.LIVE_VIDEO}
                  />
                </label>

                <label className="field">
                  Fullscreen
                  <input
                    type="checkbox"
                    checked={selectedSurface.isFullscreen}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { isFullscreen: event.target.checked })
                    }
                  />
                </label>

                {selectedSurface.isFullscreen && (
                  <>
                    <label className="field">
                      Fullscreen Fit
                      <select
                        value={selectedSurface.fullscreenFit}
                        onChange={(event) =>
                          updateSurface(selectedSurface.id, { fullscreenFit: event.target.value as FullscreenFit })
                        }
                      >
                        <option value="stretch">Strecken</option>
                        <option value="contain">Contain</option>
                        <option value="cover">Cover</option>
                      </select>
                    </label>
                    <label className="field">
                      Fullscreen Ausrichtung
                      <select
                        value={selectedSurface.fullscreenAlign}
                        onChange={(event) =>
                          updateSurface(selectedSurface.id, { fullscreenAlign: event.target.value as FullscreenAlign })
                        }
                      >
                        <option value="center">Zentriert</option>
                        <option value="top-left">Oben links</option>
                        <option value="top-right">Oben rechts</option>
                        <option value="bottom-left">Unten links</option>
                        <option value="bottom-right">Unten rechts</option>
                      </select>
                    </label>
                  </>
                )}

                <label className="field">
                  Timeline Start (s)
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={selectedSurface.timelineStart}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { timelineStart: Number(event.target.value) })
                    }
                  />
                </label>

                <label className="field">
                  Timeline Dauer (s)
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={selectedSurface.timelineDuration}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { timelineDuration: Number(event.target.value) })
                    }
                  />
                </label>

                {selectedSurface.type === SurfaceType.TEXT && (
                  <>
                    <label className="field">
                      Text
                      <textarea
                        value={selectedSurface.textContent}
                        onChange={(event) =>
                          updateSurface(selectedSurface.id, { textContent: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Schriftgröße
                      <input
                        type="number"
                        min={12}
                        value={selectedSurface.fontSize}
                        onChange={(event) =>
                          updateSurface(selectedSurface.id, { fontSize: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="field">
                      Vertikal
                      <input
                        type="checkbox"
                        checked={selectedSurface.isVertical}
                        onChange={(event) =>
                          updateSurface(selectedSurface.id, { isVertical: event.target.checked })
                        }
                      />
                    </label>
                  </>
                )}

                {selectedSurface.type === SurfaceType.LINE && (
                  <label className="field">
                    Linienbreite
                    <input
                      type="range"
                      min={1}
                      max={40}
                      value={selectedSurface.lineWidth}
                      onChange={(event) =>
                        updateSurface(selectedSurface.id, { lineWidth: Number(event.target.value) })
                      }
                    />
                  </label>
                )}

                {selectedSurface.type === SurfaceType.VIDEO && (
                  <>
                    <label className="field">
                      Loop Mode
                      <select
                        value={selectedSurface.loopMode}
                        onChange={(event) =>
                          updateSurface(selectedSurface.id, { loopMode: event.target.value as LoopMode })
                        }
                      >
                        <option value="infinite">Unendlich</option>
                        <option value="once">Einmal</option>
                        <option value="count">Anzahl</option>
                      </select>
                    </label>
                    {selectedSurface.loopMode === "count" && (
                      <label className="field">
                        Loop Count
                        <input
                          type="number"
                          min={1}
                          value={selectedSurface.loopCount}
                          onChange={(event) =>
                            updateSurface(selectedSurface.id, { loopCount: Number(event.target.value) })
                          }
                        />
                      </label>
                    )}
                    <label className="field">
                      Lautstärke
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={selectedSurface.volume}
                        onChange={(event) =>
                          updateSurface(selectedSurface.id, { volume: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="field">
                      Mute
                      <input
                        type="checkbox"
                        checked={selectedSurface.isMuted}
                        onChange={(event) =>
                          updateSurface(selectedSurface.id, { isMuted: event.target.checked })
                        }
                      />
                    </label>
                  </>
                )}

                {selectedSurface.type === SurfaceType.LIVE_VIDEO && (
                  <>
                    {liveInfo?.error && <p className="empty">{liveInfo.error}</p>}
                    <label className="field">
                      Live Kamera
                      <select
                        value={selectedSurface.liveVideo?.deviceId || ""}
                        onChange={(event) => updateLiveConfig({ deviceId: event.target.value || undefined })}
                      >
                        <option value="">Standard</option>
                        {videoDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Kamera ${device.deviceId.slice(0, 6)}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="inline-actions">
                      <button className="ghost" onClick={refreshDevices}>Geräte aktualisieren</button>
                    </div>
                    <label className="field">
                      Auflösung (px)
                      <div className="field-row">
                        <input
                          type="number"
                          min={1}
                          value={selectedSurface.liveVideo?.width ?? liveInfo?.settings?.width ?? ""}
                          onChange={(event) => updateLiveConfig({ width: Number(event.target.value) || undefined })}
                        />
                        <input
                          type="number"
                          min={1}
                          value={selectedSurface.liveVideo?.height ?? liveInfo?.settings?.height ?? ""}
                          onChange={(event) => updateLiveConfig({ height: Number(event.target.value) || undefined })}
                        />
                      </div>
                    </label>
                    <label className="field">
                      Frame Rate
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={selectedSurface.liveVideo?.frameRate ?? liveInfo?.settings?.frameRate ?? ""}
                        onChange={(event) => updateLiveConfig({ frameRate: Number(event.target.value) || undefined })}
                      />
                    </label>
                    <label className="field">
                      Helligkeit
                      <input
                        type="number"
                        step={0.1}
                        value={selectedSurface.liveVideo?.brightness ?? liveInfo?.settings?.brightness ?? ""}
                        onChange={(event) => updateLiveConfig({ brightness: Number(event.target.value) || undefined })}
                      />
                    </label>
                    <label className="field">
                      Weißabgleich
                      <select
                        value={selectedSurface.liveVideo?.whiteBalanceMode ?? ""}
                        onChange={(event) =>
                          updateLiveConfig({
                            whiteBalanceMode: event.target.value ? event.target.value as LiveVideoConfig["whiteBalanceMode"] : undefined
                          })
                        }
                      >
                        <option value="">Automatisch</option>
                        {whiteBalanceModes.map((mode) => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Farbtemperatur
                      <input
                        type="number"
                        step={1}
                        value={selectedSurface.liveVideo?.colorTemperature ?? liveInfo?.settings?.colorTemperature ?? ""}
                        onChange={(event) => updateLiveConfig({ colorTemperature: Number(event.target.value) || undefined })}
                      />
                    </label>
                    <label className="field">
                      Kontrast
                      <input
                        type="number"
                        step={0.1}
                        value={selectedSurface.liveVideo?.contrast ?? liveInfo?.settings?.contrast ?? ""}
                        onChange={(event) => updateLiveConfig({ contrast: Number(event.target.value) || undefined })}
                      />
                    </label>
                    <label className="field">
                      Sättigung
                      <input
                        type="number"
                        step={0.1}
                        value={selectedSurface.liveVideo?.saturation ?? liveInfo?.settings?.saturation ?? ""}
                        onChange={(event) => updateLiveConfig({ saturation: Number(event.target.value) || undefined })}
                      />
                    </label>
                    <label className="field">
                      Schärfe
                      <input
                        type="number"
                        step={0.1}
                        value={selectedSurface.liveVideo?.sharpness ?? liveInfo?.settings?.sharpness ?? ""}
                        onChange={(event) => updateLiveConfig({ sharpness: Number(event.target.value) || undefined })}
                      />
                    </label>
                    <label className="field">
                      Exposure Modus
                      <select
                        value={selectedSurface.liveVideo?.exposureMode ?? ""}
                        onChange={(event) =>
                          updateLiveConfig({
                            exposureMode: event.target.value ? event.target.value as LiveVideoConfig["exposureMode"] : undefined
                          })
                        }
                      >
                        <option value="">Automatisch</option>
                        {exposureModes.map((mode) => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}

                <label className="field">
                  Animation
                  <select
                    value={selectedSurface.animationType}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { animationType: event.target.value as AnimationType })
                    }
                  >
                    <option value="none">Keine</option>
                    <option value="glow">Glow</option>
                    <option value="chase">Chase</option>
                    <option value="draw">Draw</option>
                    <option value="hue">Hue</option>
                    <option value="spin3d">Spin 3D</option>
                    <option value="textflow">Text Flow</option>
                    <option value="pulse">Pulse</option>
                    <option value="flip">Flip</option>
                  </select>
                </label>
                <label className="field">
                  Animations-Speed
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={0.5}
                    value={selectedSurface.animationSpeed}
                    onChange={(event) =>
                      updateSurface(selectedSurface.id, { animationSpeed: Number(event.target.value) })
                    }
                  />
                </label>
                {selectedSurface.animationType === "glow" && (
                  <label className="field">
                    Glow Farbe
                    <input
                      type="color"
                      value={selectedSurface.glowColor}
                      onChange={(event) =>
                        updateSurface(selectedSurface.id, { glowColor: event.target.value })
                      }
                    />
                  </label>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>

      <footer className="timeline">
        <div className="timeline-info">
          <span>{formatTime(currentTime)}</span>
          <div className="timeline-controls">
            {!isPlaying ? (
              <button onClick={() => {
                setPlayConfig((prev) => ({ ...prev, loopDuration: getMaxDuration() }));
                setShowPlayModal(true);
              }}>▶</button>
            ) : (
              <button onClick={stopPlayback}>❚❚</button>
            )}
            <button onClick={resetPlayback}>■</button>
          </div>
        </div>
        <div className="timeline-bar">
          <div
            className="timeline-progress"
            style={{ width: `${(currentTime / Math.max(1, playConfig.loopDuration)) * 100}%` }}
          />
        </div>
      </footer>

      {showPlayModal && (
        <PlayModal
          config={playConfig}
          onChange={setPlayConfig}
          onClose={() => setShowPlayModal(false)}
          onStart={startPlayback}
        />
      )}

      {showWindowDrawing && (
        <DrawingModal
          title="Canvas Zeichnen"
          onClose={() => setShowWindowDrawing(false)}
          onSave={handleWindowDrawingSave}
        />
      )}
    </div>
  );
}
