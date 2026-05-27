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

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (foundation / build-tooling ticket).** Only a minimal "Figmint" placeholder window is in scope here.

---

## Requirements

### Functional

1. `package.json` declares `engines.node` ≥ 20 and pins TypeScript / Vite / React versions.
2. `tsconfig.json` strict mode enabled (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`).
3. `vite.config.ts` bundles the plugin code thread + UI thread per `@figma/plugin-typings` patterns.
4. `manifest.community.json` and `manifest.org.json` exist at repo root; differ only by manifest fields the feature-gate distinguishes (per PRD §13.2).
5. `src/` directory tree matches PRD §7.3: `core/`, `ops/`, `io/`, `contracts/` (placeholder), `ui/`, `config/`.
6. `src/ui/App.tsx` renders a minimal "Figmint" placeholder window.
7. `src/config/flags.community.ts` and `src/config/flags.org.ts` exist with the same exported `flags` const shape and differing values.

### Visual / UX

- Plugin window: 320 × 240 minimum, centered text "Figmint" + version string from `package.json`.

### Technical / architectural

- **Lift reference (do NOT rebuild from scratch):**
  - `DesignOps-plugin/package.json` — ESLint / Prettier / TS / Vitest version choices and script-naming pattern
  - `DesignOps-plugin/CLAUDE.md`, `memory.md` — agent rules pattern (figmint already has its own — cross-reference, do not copy)
- **Do NOT port yet:** `canvas-templates/`, `scripts/`, or any skill source — those lift in WO-005 / Sprint 2+ / Sprint 3+ as scoped.

---

## Acceptance criteria *(definition of done)*

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

### Accessibility *(WCAG AA where applicable)*

- Placeholder window text uses default browser font-size; no a11y assertions until the Bootstrap tab ships (Sprint 4).

### Telemetry / observability *(if needed)*

- Not applicable.

---

## Figma VQA Checklist

**N/A — no Figma artifact (foundation / build-tooling ticket).**

---

## 🔍 Ready for `/research`

- Optional, time-boxed: pick between raw Vite + `@figma/plugin-typings` vs `create-figma-plugin` scaffolder; document tradeoffs in `research/scaffold-choice.md` if `/research` runs.

## 📋 Ready for `/plan`

- Dependencies: none (foundation).
- `plan.md` should lock the exact toolchain pick and the manifest field set both community and org variants need.

## 🛠️ Ready for `/build`

- After `/plan` lock: `/code-build` (TS source) + `/script-build` (build scripts + manifests) can run in parallel.

## References

- PRD: `Docs/PRD.md` §7.3 (Repo layout), §13 (Distribution & feature gating)
- Lift reference: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/package.json`, `CLAUDE.md`, `memory.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
