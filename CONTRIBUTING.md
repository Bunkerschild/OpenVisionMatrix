# Contributing to OpenVisionMatrix

Thank you for your interest in contributing to OpenVisionMatrix.

OpenVisionMatrix is a projection-mapping PWA with shared math and domain
packages. Please read the guidelines below to ensure efficient collaboration.

## Scope of Contributions
We welcome contributions in the following areas:
- Bug fixes and performance improvements
- Projection mapping math and validation
- PWA UX and editor functionality
- Documentation improvements

Out of scope (unless discussed):
- New frameworks or UI libraries
- Unrelated refactors
- Features beyond the stated roadmap

## How to Contribute
### 1. Issues
Use GitHub Issues for:
- Bug reports
- Feature requests
- UX feedback

Please include:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS details for UI issues

Do not report security vulnerabilities via public issues. See `SECURITY.md`.

### 2. Pull Requests
Before submitting a PR:
- Fork the repository and create a feature branch
- Keep changes focused and minimal
- Ensure `npm run typecheck` and `npm run build` pass

PR requirements:
- Clear description of the change
- Reference related issues (if any)
- Note any behavior changes or migration steps

## Development Notes
- Use Node.js 20.x (see `.nvmrc`)
- Package manager is npm with workspaces
- Source is organized into:
  - `apps/pwa/` (PWA UI)
  - `packages/core/` (domain types)
  - `packages/renderer/` (math + rendering helpers)

## Licensing
OpenVisionMatrix is dual-licensed under AGPLv3 and a commercial license.
By contributing, you agree that your contributions are licensed under the
AGPLv3 terms. Commercial licensing is handled separately; see `LICENSE` and
`LICENSE_COMMERCIAL.md`.

## Communication
- Be respectful and constructive
- Keep discussions technical and on-topic
- Decisions are made based on project goals and maintainability

Thank you for helping improve OpenVisionMatrix.
