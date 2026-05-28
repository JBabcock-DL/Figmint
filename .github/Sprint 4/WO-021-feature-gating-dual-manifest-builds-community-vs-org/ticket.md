---
type: work-order
github_issue: 24
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JJQ
status: deferred
---

## Status: **Deferred → Context Backlog** (2026-05-27)

**Decision:** Ship **one FigHub build** with all Phase 1 features enabled (`manifest.json` + `src/config/flags.ts`). Community vs Org dual manifests and build-time gating are **out of scope until this ticket is re-prioritized**.

**Current repo state:**

- `npm run build` → single bundle in `dist/` (GitHub network access enabled)
- `flags.githubOAuth`, `flags.githubPRSink`, etc. are all `true` — use for future optional UI toggles only, not build variants
- Archived dual-build notes: [archived/dual-build-deferred.md](archived/dual-build-deferred.md)

**Re-open when:** FigHub Community public listing needs a network-isolated build per PRD §13.

---

## Goal

Lock in the Community vs Org build separation. Same source tree, two manifests, build-time feature flags. Org build adds GitHub OAuth + multi-file batch via REST + Code Connect PR emission. Community build is the public-listing version.

PRD anchors: `Docs/PRD.md` §13 (Distribution & feature gating), §12 Phase 1 exit.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. **Shared flags type** — `src/config/flags.types.ts` (or equivalent) defines `FigHubFlags`; `flags.community.ts` and `flags.org.ts` export `flags` with identical shape, differing values per PRD §13.1.
2. **I/O flags** — extend beyond Phase 4 stubs with at least `githubOAuth` (WO-016 source + settings) and `githubPRSink` (WO-018/WO-020 PR output). Community sinks (download, clipboard, Output page, pluginData) need **no** flag — always enabled in both builds.
3. **Build scripts unchanged in behavior** — `scripts/build-community.mjs` and `scripts/build-org.mjs` continue to set `BUILD_TARGET`, run UI → finalize → main, and copy the matching manifest. Vite aliases `@/config/flags` per target (already wired in WO-002).
4. **UI gating** — every gated affordance reads `flags.xxx` only. No `BUILD_TARGET` conditionals for feature visibility, no conditional/dynamic imports, no Vite aliases that stub out GitHub modules in community builds. All I/O modules ship in both bundles; community manifest `networkAccess: ["none"]` is the hard backstop.
5. **Manifest metadata** — `manifest.community.json` and `manifest.org.json` differ in `id`, `name`, and `networkAccess.allowedDomains` (community: `["none"]`; org: GitHub API domains only).
6. **Umbrella build** — `npm run build` runs `build:community` then `build:org` (both must exit 0).
7. **Integration after WO-016–020** — WO-021 wires centralized sink visibility (e.g. `visibleSinks()` for ExportSheet), audits the codebase for gating violations, and adds org-flag Vitest coverage. Does **not** re-implement OAuth, sinks, serializer, or ExportSheet.
8. **Phase 1 GA matrix** — verify PRD §13.1 checklist: Community gets bootstrap + local I/O + ExportSheet minus GitHub; Org adds GitHub OAuth source + GitHub PR sink.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-002 ✅, WO-016, WO-017, WO-018, WO-019, WO-020 (WO-021 starts `/build` after 016–020 land)

---

## Acceptance criteria _(definition of done)_

- [ ] Both builds produce loadable plugin bundles.
- [ ] Community build does not expose GitHub UI (ExportSheet, settings, or source picker).
- [ ] Org build exposes full I/O including GitHub OAuth and GitHub PR sink.
- [ ] Single `npm run build` runs both targets.
- [ ] Grep audit clean: no feature gating via `import.meta.env.BUILD_TARGET` or conditional GitHub imports.
- [ ] Org-flag Vitest coverage for ExportSheet / GitHub settings render paths.
- [ ] Phase 1 GA: bootstrap path benchmarked end-to-end vs MCP baseline (target: ≥10× speedup).

## Out of scope

- Variables REST API path (deferred — see PRD §11.5).
- Pre-configured token templates per client (later add-on).
- Replacing dev-placeholder plugin IDs (publish tickets).
- Gating dev/bench helpers (memory.md — stays visible until pre-release cleanup ticket).

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover the acceptance criteria above.
- Manual: load `dist/manifest.json` after each build target in Figma dev mode; confirm community cannot reach GitHub (UI hidden + network blocked).

### Visual / design QA

- See ticket-level scope; most subsystem tickets have visual QA in their UI counterpart.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- Console.debug per major event; production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- [x] [Feature gating & dual build](research/feature-gating-dual-build.md) — 2026-05-27

## 📋 Ready for `/plan`

- Dependencies: WO-016, WO-017, WO-018, WO-019, WO-020 must land before `/build`.
- `plan.md` should lock: shared flags type, sink registry helper, umbrella `build` script, org-flag test strategy, audit grep patterns.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.
- **Blocked** until WO-016–WO-020 merge.

## References

- PRD: `Docs/PRD.md` §13 (Distribution & feature gating), §12 Phase 1 exit
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
- Research: [Feature gating & dual build](research/feature-gating-dual-build.md)
- Scaffold: [WO-002 scaffold choice](../../Sprint%201/WO-002-bootstrap-fighub-typescript-vite-plugin-scaffold/research/scaffold-choice.md)
