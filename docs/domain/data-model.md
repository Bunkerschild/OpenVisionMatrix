# Core Data Model

This document defines the canonical data model used across OpenVisionMatrix.

---

## 1. Project

Project {
  id: string
  name: string
  schemaVersion: number
  createdAt: ISO8601
  updatedAt: ISO8601
  surfaces: Surface[]
}

Rules:
- schemaVersion MUST be incremented on breaking changes
- Projects MUST be serializable (JSON-compatible)

---

## 2. Surface

A surface represents a single projection target.

Surface {
  id: string
  type: SurfaceType
  quad: Quad
  visible: boolean
  opacity: number (0.0 – 1.0)
  zIndex: number
  mask?: Polygon
}

---

### SurfaceType

enum SurfaceType {
  IMAGE
  VIDEO
  COLOR
  TEXT
  LINE
}

---

## 3. Asset Reference

Assets are referenced indirectly.

AssetRef {
  id: string
  kind: image | video
  width: number
  height: number
  duration?: number
}

Surfaces MUST NOT embed raw binary data.

---

## 4. Temporal Properties (Optional)

Timeline {
  start: number
  duration: number
  loop?: boolean
}

Used only when playback is enabled.

---

## 5. Invariants

- Every Surface MUST have a valid Quad
- Quad orientation MUST be clockwise
- Mask polygons MUST be closed and non-self-intersecting
- Renderer MUST NOT mutate domain objects

---

## 6. Responsibility Split

- packages/core
  - Owns this data model
  - No rendering, no UI

- packages/renderer
  - Consumes validated domain objects
  - Produces visual output

- packages/ui
  - Edits domain objects
  - MUST NOT perform rendering math

---

## 7. Non-Goals

- Persistence format
- Network transport
- User permissions
- Multi-user state

These are defined elsewhere.
