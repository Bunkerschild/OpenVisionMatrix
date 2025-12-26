# Repository Guidelines for Automated Agents (Codex, LLMs)

This file defines STRICT rules for automated agents operating in this repository.
Deviations are considered incorrect behavior.

---

## Project Scope & Status

Project: OpenVisionMatrix  
Status: INITIAL SCAFFOLDING PHASE

This repository is under active architectural construction.
Only explicitly requested changes are allowed.

---

## Authoritative Project Structure

- `apps/pwa/`
  - Production Progressive Web App (Vite + React + TypeScript)
  - UI scaffolding only unless explicitly instructed otherwise

- `packages/core/`
  - Domain models, types, project schemas
  - NO rendering logic
  - NO browser APIs

- `packages/renderer/`
  - Rendering, math, geometry, perspective transforms
  - NO UI components
  - NO framework-specific code unless explicitly allowed

- `packages/ui/`
  - Reusable UI components only
  - NO business logic
  - NO rendering math

- `docs/domain/`
  - Markdown specifications (math, data model, workflows)
  - Agents may update these docs when explicitly instructed

---

## Critical Rules (Non-Negotiable)

1. DO NOT introduce projection-mapping logic unless explicitly requested
2. DO NOT introduce additional frameworks, CDNs, or UI libraries
3. DO NOT restructure the repository without explicit instruction
4. DO NOT add features beyond the stated task
5. DO NOT guess architectural intent — ask or wait for instruction
6. Do NOT add domain specifications or design documents to AGENTS.md.
   Put specs into `docs/domain/*.md` (preferred) or `packages/core/README.md`.

---

## Build & Tooling Constraints

- Node.js version: **20.x** (see `.nvmrc`)
- Package manager: **npm with workspaces**
- No alternative package managers
- No global state outside defined packages
- No implicit side effects during build or dev

---

## Coding Style & Architecture

- Prefer small, focused files
- Explicit imports and exports only
- No implicit globals
- TypeScript strict mode is required
- Clear separation of:
  - domain (core)
  - rendering (renderer)
  - UI (ui)
  - application wiring (apps/pwa)

---

## Testing & Validation

- No test framework is configured yet
- Do NOT add tests unless instructed
- If tests are added, document execution in `README.md`

---

## Commits & Changes

- Make minimal, task-focused changes
- Avoid sweeping refactors
- Do not “improve” unrelated code
- Assume every change will be reviewed manually

---

## Security & Safety

- Treat `SECURITY.md` as authoritative
- Do not invent security policies
- Do not add telemetry, tracking, or network calls

---

## Default Behavior for Agents

If instructions are ambiguous:
- STOP
- DO NOT PROCEED
- Wait for clarification

Silence is preferred over incorrect assumptions.

## Licensing Rules (Strict)

- Do NOT remove or modify license headers.
- Do NOT relicense files or modules.
- Do NOT introduce code with incompatible licenses.
- All contributions are assumed to be compatible with AGPLv3.

