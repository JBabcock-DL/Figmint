---
type: work-order
github_issue: 4
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt4AWc
---

## Goal

Bring up the Figmint plugin source tree so the repo can build a valid Figma plugin bundle from TypeScript. This is the foundation every other Sprint 1 ticket depends on.

PRD anchors: `Docs/PRD.md` §7.3 (Repo layout), §13.2 (Feature-gating mechanism).

---

## Problem story

As a Figmint developer, I want a working TypeScript + Vite + `@figma/plugin-typings` scaffold so I can start porting deterministic logic from `DesignOps-plugin` without first reinventing build tooling.

## Hypothesis (optional)

A standard Vite + `@figma/plugin-typings` setup with dual manifests (community + org) lets us ship feature-gated builds from a single codebase per PRD §13.

---

## User stories

- [ ] As a developer, `npm run build:community` produces a loadable plugin bundle.
- [ ] As a developer, `npm run build:org` produces the gated org bundle.
- [ ] As a developer, `npm run dev` opens a hot-reloading dev session.

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (foundation / build-tooling ticket).** Only a minimal "Figmint" placeholder window is in scope here.

---

## Requirements

### Functional

1. `package.json` declares `engines.node` `>=22.0.0` (Node 22 LTS — Node 20 reached EOL 2026-04-30, and WO-003's chosen JSON Schema generator `ts-json-schema-generator@2.x` requires Node ≥22) and pins the toolchain at the versions in **Technical / architectural** below (no `create-figma-plugin` framework — raw Vite chosen per [`research/scaffold-choice.md`](research/scaffold-choice.md)).
2. `tsconfig.json` strict mode enabled (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`) and registers `typeRoots: ["./node_modules/@types", "./node_modules/@figma"]` so `@figma/plugin-typings` is picked up globally.
3. Two-thread Vite build: one `vite.config.ts` (or two configs sharing a base) compiles `src/main.ts` → `dist/code.js` (Plugin API sandbox thread, Vite library mode) and `src/ui/index.tsx` → `dist/ui.html` (UI iframe thread, `vite-plugin-singlefile` inlines JS + CSS into one HTML file per Figma's single-file rule).
4. `manifest.community.json` and `manifest.org.json` exist at repo root; a small Node build script (`scripts/build-community.mjs` and `scripts/build-org.mjs` per PRD §7.3) copies the right one into `dist/manifest.json` based on `BUILD_TARGET`. They differ only by manifest fields the feature-gate distinguishes (per PRD §13.2).
5. `src/` directory tree matches PRD §7.3: `core/`, `ops/`, `io/`, `contracts/` (placeholder — actual contracts package lives in `packages/contracts/` per WO-003), `ui/`, `config/`.
6. `src/ui/App.tsx` renders a minimal "Figmint" placeholder window (React 19 component).
7. `src/config/flags.community.ts` and `src/config/flags.org.ts` exist with the same exported `flags` const shape and differing values; Vite resolves `@/config/flags` to the right file based on `BUILD_TARGET`.

### Visual / UX

- Plugin window: 320 × 240 minimum, centered text "Figmint" + version string from `package.json`.

### Technical / architectural

- **Pinned versions** (locked by [`research/scaffold-choice.md`](research/scaffold-choice.md), verified on npm 2026-05-27):
  - `typescript@^6.0.3`
  - `vite@^8.0.14`
  - `@vitejs/plugin-react@^6.0.2` (requires Vite 8)
  - `vite-plugin-singlefile@^2.3.3` (inlines UI JS + CSS into single `ui.html`)
  - `react@^19.2.6`, `react-dom@^19.2.6`
  - `@types/react@^19.0.0`, `@types/react-dom@^19.0.0`
  - `@figma/plugin-typings@^1.127.0`
  - `engines.node: ">=22.0.0"` (bumped from `>=20.0.0` during cross-ticket reconciliation 2026-05-27 — Node 20 EOL'd 2026-04-30; WO-003 + WO-004 both require Node ≥22)
- **Toolchain decision:** raw Vite (NOT `create-figma-plugin`). Rationale: native dual-manifest support, no Preact/React compat shim, full control over PRD §7.3 layout, no lock-in for the eventual CLI shell (PRD §7.1), and the workspace package (`packages/contracts/` per WO-003) is wired via plain npm workspaces.
- **Lift reference (do NOT rebuild from scratch):**
  - `DesignOps-plugin/package.json` — informational only; that repo is a Cursor / Claude skill pack (esbuild + terser), not a Figma plugin. Do not copy its dev deps.
  - `DesignOps-plugin/CLAUDE.md`, `memory.md` — agent rules pattern (Figmint already has its own — cross-reference, do not copy)
- **Do NOT port yet:** `canvas-templates/`, `scripts/`, or any skill source — those lift in WO-005 / Sprint 2+ / Sprint 3+ as scoped.

---

## Acceptance criteria _(definition of done)_

- [ ] `npm install` succeeds with zero peer-dependency warnings.
- [ ] `npm run build:community` produces a loadable plugin bundle (manifest.json + ui.html + code.js or Vite equivalent).
- [ ] `npm run build:org` produces a distinct org bundle.
- [ ] Plugin loads in Figma desktop dev mode and shows the placeholder UI.
- [ ] `tsc --noEmit` passes with zero errors under strict mode.
- [ ] No file references DesignOps-plugin paths in production code (documentation references only).

## Out of scope

- Any actual variable push, canvas building, or component scaffolding (Sprints 2+).
- Contracts package (WO-003 owns it).
- CI pipeline (WO-004 owns it).
- GitHub OAuth, file picker, paste/clipboard, or any I/O source (Sprint 2+).
- ESLint/Prettier rule definition (WO-004 owns it).

---

## Testing & verification

### Functional QA

- Load the built community bundle in Figma desktop and confirm the placeholder UI appears.
- Verify `npm run dev` hot-reloads on edits to `src/ui/App.tsx`.

### Visual / design QA

- Placeholder window renders centered text without layout overflow.

### Accessibility _(WCAG AA where applicable)_

- Placeholder window text uses default browser font-size; no a11y assertions until the Bootstrap tab ships (Sprint 4).

### Telemetry / observability _(if needed)_

- Not applicable.

---

## Figma VQA Checklist

**N/A — no Figma artifact (foundation / build-tooling ticket).**

---

## 🔍 Ready for `/research`

- [x] Scaffold choice locked — see [scaffold-choice.md](research/scaffold-choice.md). **Pick: raw Vite + `@figma/plugin-typings` + `vite-plugin-singlefile`, React 19, TypeScript 6, Node ≥ 22 LTS** (bumped from ≥20 during cross-ticket reconciliation — see `📋 Ready for /plan` Open question OQ-A).

## 📋 Ready for `/plan`

- Dependencies: none (foundation).
- `plan.md` should lock the exact toolchain pick and the manifest field set both community and org variants need.

## 🛠️ Ready for `/build`

- After `/plan` lock: `/code-build` (TS source) + `/script-build` (build scripts + manifests) can run in parallel.

## References

- PRD: `Docs/PRD.md` §7.3 (Repo layout), §13 (Distribution & feature gating)
- Lift reference: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/package.json`, `CLAUDE.md`, `memory.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
- [Scaffold choice research](research/scaffold-choice.md)
