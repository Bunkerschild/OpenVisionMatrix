# Perspective Mapping & Homography

This document defines the mathematical and conceptual foundations for perspective
mapping in OpenVisionMatrix. It is implementation-agnostic and authoritative.

---

## 1. Terminology

### Point2D
A two-dimensional point in local container coordinates.

Point2D := { x: number, y: number }

- Units: pixels
- Origin: top-left corner of the container
- X-axis: rightwards
- Y-axis: downwards

---

### Quad
A quadrilateral defined by four ordered points.

Quad := [p0, p1, p2, p3]

Rules:
- Points MUST be ordered clockwise
- Quad MUST NOT self-intersect
- Quad MUST have non-zero area

---

### Polygon
An ordered list of points forming a closed shape.

Polygon := Point2D[]

Used for:
- Masks
- Clip paths
- Arbitrary surface boundaries

---

## 2. Coordinate System

All perspective calculations operate in local container pixel space.

- No global/world coordinates
- No Z-axis modeling at this stage
- Depth is simulated via projective distortion

---

## 3. Homography (Projective Transformation)

Perspective mapping is defined as a 2D homography:

- Represented by a 3×3 matrix H
- Has 8 degrees of freedom (scale is ignored)

### Homogeneous Coordinates

[x', y', w']ᵀ = H · [x, y, 1]ᵀ

Normalized screen coordinates:

x_screen = x' / w'
y_screen = y' / w'

---

## 4. Rect → Quad Mapping

### Source Rectangle

The canonical source rectangle is axis-aligned:

S0 = (0, 0)
S1 = (W, 0)
S2 = (W, H)
S3 = (0, H)

Where:
- W = source width
- H = source height

---

### Target Quad

T = [p0, p1, p2, p3]

- Each Si maps to corresponding pi
- Order MUST be preserved (clockwise)

---

### Equation System

Each point correspondence yields two linear equations.

Total:
- 4 points × 2 equations = 8 equations
- 8 unknowns → solvable linear system

The homography matrix is solved up to scale.

---

## 5. Renderer Contract (Non-Code)

The resulting homography matrix MUST be convertible into a renderer-compatible
representation.

### CSS Renderer Contract

- The 3×3 homography is embedded into a 4×4 matrix
- Z-components are fixed
- Used with matrix3d(...)

This is a rendering concern, not a mathematical one.

---

## 6. Validation & Degeneracy

Before computing a homography, the target quad MUST be validated:

- No two points identical
- No three points collinear
- Area > ε (small epsilon threshold)
- Clockwise orientation

Invalid quads MUST be rejected before rendering.

---

## 7. Non-Goals (Explicit)

- No 3D geometry
- No camera model
- No physical units (mm, meters)
- No lighting or shading

These may be layered later but are OUT OF SCOPE here.
