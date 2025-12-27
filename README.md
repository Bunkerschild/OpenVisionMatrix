# OpenVisionMatrix

Open-source projection mapping and spatial transformation engine.

[![License: AGPLv3](https://img.shields.io/badge/License-AGPLv3-green.svg)](LICENSE)
[![Security Policy](https://img.shields.io/badge/security-policy-blue.svg)](SECURITY.md)
[![GitHub stars](https://img.shields.io/github/stars/Bunkerschild/OpenVisionMatrix.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Bunkerschild/OpenVisionMatrix.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/network)

[![Nightly Build](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/nightly-build.yml/badge.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/nightly-build.yml)
[![Create Stable Release](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/build-release.yml/badge.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/build-release.yml)
[![VirusTotal Windows](https://img.shields.io/github/actions/workflow/status/Bunkerschild/OpenVisionMatrix/nightly-build.yml?label=VirusTotal%20Windows)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/nightly-build.yml)
[![VirusTotal macOS](https://img.shields.io/github/actions/workflow/status/Bunkerschild/OpenVisionMatrix/nightly-build.yml?label=VirusTotal%20macOS)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/nightly-build.yml)
[![VirusTotal Linux](https://img.shields.io/github/actions/workflow/status/Bunkerschild/OpenVisionMatrix/nightly-build.yml?label=VirusTotal%20Linux)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/nightly-build.yml)
[![GitHub release](https://img.shields.io/github/v/release/Bunkerschild/OpenVisionMatrix.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/Bunkerschild/OpenVisionMatrix/total.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/releases)
[![Last commit](https://img.shields.io/github/last-commit/Bunkerschild/OpenVisionMatrix.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/commits/main)

[![Build-Test](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/build.yml/badge.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/build.yml)
[![CodeQL Advanced](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/codeql.yml/badge.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/codeql.yml)
[![Deploy GitHub Pages](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/jekyll-gh-pages.yml/badge.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/jekyll-gh-pages.yml)
[![Dependency Review](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/dependency-review.yml/badge.svg)](https://github.com/Bunkerschild/OpenVisionMatrix/actions/workflows/dependency-review.yml)

Online demo: https://bunkerschild.github.io/OpenVisionMatrix/


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
