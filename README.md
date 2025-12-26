# OpenVisionMatrix

Open-source projection mapping and spatial transformation engine.

## Scope
- Projection mapping on arbitrary surfaces
- Perspective warping & masking
- Offline-first PWA for live shows

## Current Status
Active development. The PWA already exposes a functional editor and playback
layer; core/renderer packages provide domain types and perspective math.

## Repository Structure
- `apps/pwa/`: Vite + React + TypeScript PWA (editor + stage playback)
- `packages/core/`: domain data model and types
- `packages/renderer/`: perspective math, validation, CSS matrix conversion
- `docs/domain/`: authoritative specs for the model and homography

## PWA Functionality (Current)
- Add surfaces: color, text, line, image, video
- Perspective warp and move via quad handles
- Mask edit mode with polygon points
- Timeline playback with loop modes
- Animations (glow, chase, draw, hue, spin, text flow, pulse, flip)
- Window and stage drawing tools
- Import/export project JSON
- Fullscreen toggle and UI hide (H)

## Getting Started
```bash
npm install
npm run dev
```

Build and typecheck:
```bash
npm run typecheck
npm run build
```

## Source Headers
New source files should include the header from `SOURCE_HEADER.tmpl` when
appropriate for the file type.

## Disclaimer of Warranty and Liability
This software is provided "as is", without any express or implied warranties.
The authors and copyright holders are not liable for any damages, losses, or
claims arising from the use of this software. The software is not offered or
guaranteed to be fit for any particular purpose.

## License

OpenVisionMatrix is licensed under the **GNU Affero General Public License v3 (AGPLv3)**.

Commercial use in closed-source or proprietary products requires a separate
commercial license.

See:
- LICENSE
- LICENSE_COMMERCIAL.md
