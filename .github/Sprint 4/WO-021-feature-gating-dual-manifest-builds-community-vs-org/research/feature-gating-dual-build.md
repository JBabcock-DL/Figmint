# Feature gating & dual-manifest builds — Community vs Org

**Ticket:** [WO-021](../ticket.md) — Feature gating + dual manifest builds (Community vs Org)  
**Research date:** 2026-05-27  
**Scope:** PRD §13 (Distribution & feature gating), §10 (I/O subsystem), §12 Phase 1 exit — lock the integration model after WO-002 scaffold and before `/plan` on WO-021.  
**Dependencies:** WO-002 (scaffold — **landed**), WO-016–WO-020 (I/O subsystem — **in flight**; WO-021 integrates after they land).

---

## Summary

The dual-build pipeline from **WO-002 is already implemented and CI-green**: two Node orchestrators (`scripts/build-community.mjs`, `scripts/build-org.mjs`), one `vite.config.ts` that aliases `@/config/flags` from `BUILD_TARGET`, and two root manifests copied into `dist/manifest.json`. Current flags cover four future Phase 4 capabilities plus `buildTarget`; they do **not yet** expose I/O-specific gates (`githubPRSink`, etc.) that WO-016–WO-020 will need.

**WO-021 is an integration ticket, not greenfield scaffold work.** WO-016 (OAuth + GitHub source), WO-017 (four local sinks), WO-018 (GitHub PR sink), WO-019 (dual-format serializer), and WO-020 (ExportSheet UI) each ship their subsystem with local `flags.xxx` checks. WO-021 then: (1) extends the shared `flags` shape for I/O, (2) audits every gated affordance for the `flags.xxx`-only pattern (no conditional imports), (3) adds the umbrella `npm run build` script the ticket AC requires, and (4) verifies the Phase 1 GA capability matrix end-to-end in both builds.

**Defense in depth:** Community manifest sets `networkAccess.allowedDomains: ["none"]`, so even a missed UI gate cannot reach GitHub. Org manifest whitelists `api.github.com` and `github.com` only (PRD §11.3).

---

## Key Findings

### 1. Current dual-build pipeline (WO-002 — landed)

| Piece | Path | Behavior |
| ----- | ---- | -------- |
| Community orchestrator | `scripts/build-community.mjs` | Wipes `dist/`, sets `BUILD_TARGET=community`, runs UI → finalize → main Vite passes, copies `manifest.community.json` → `dist/manifest.json` |
| Org orchestrator | `scripts/build-org.mjs` | Same sequence with `BUILD_TARGET=org`, copies `manifest.org.json` |
| Vite config | `vite.config.ts` | Reads `BUILD_TARGET` + `VITE_BUILD_THREAD`; aliases `@/config/flags` → `flags.community.ts` or `flags.org.ts`; defines `import.meta.env.BUILD_TARGET` and `PACKAGE_VERSION` |
| UI finalize | `scripts/finalize-ui-html.mjs` | Runs between UI and main passes so `__html__` is injected into `code.js` |
| Dev default | `scripts/dev.mjs` | Watches **community** target only (reasonable default for daily work) |
| Package scripts | `package.json` | `build:community`, `build:org` — **no umbrella `build` yet** |
| Typecheck default | `tsconfig.json` | `@/config/flags` → `flags.community.ts` (IDE + `tsc`) |
| Test default | `vitest.config.ts` | Same community alias |

Build order is locked (from WO-002 / memory): **clean → UI build → finalize → main build**. Both threads share the same flag alias so UI and sandbox code see identical `flags` values.

**Dist artifact note:** Each script wipes `dist/` before building. Running `build:community` then `build:org` (as CI does) leaves **org** artifacts in `dist/`. That is acceptable for compile verification; developers who need a community bundle load `npm run build:community` alone.

### 2. Manifest `networkAccess` differences

| Field | `manifest.community.json` | `manifest.org.json` |
| ----- | ------------------------- | ------------------- |
| `name` | `FigHub` | `FigHub (Org)` |
| `id` | `fighub-community-dev-placeholder` | `fighub-org-dev-placeholder` |
| `networkAccess.allowedDomains` | `["none"]` | `["https://api.github.com", "https://github.com"]` |

Figma's `"none"` value blocks all outbound network from the plugin sandbox and UI iframe. Org build explicitly opts into GitHub REST/OAuth endpoints only. Plugin IDs remain dev placeholders until publish tickets assign real Community / private-org IDs.

This is the **hard security boundary**; UI flags are the **UX boundary**. Both must stay aligned: never add GitHub domains to the community manifest.

### 3. Current flags shape (minimal — needs I/O extension)

**Community** (`src/config/flags.community.ts`):

```ts
export const flags = {
  buildTarget: 'community',
  githubOAuth: false,
  componentImport: false,
  codeConnectPR: false,
  evcProjector: false,
} as const;
```

**Org** (`src/config/flags.org.ts`): same keys, all gated capabilities `true`.

Only consumer today: `src/ui/App.tsx` displays `flags.buildTarget` in the header. No I/O code reads flags yet — expected, because WO-016–WO-020 have not landed.

### 4. Recommended extended flags for I/O (WO-021 deliverable)

Add a shared type (`src/config/flags.types.ts` or inline `satisfies`) so both files stay shape-identical. Proposed Phase 1 + forward-compatible shape:

| Flag | Community | Org | Gated surface | Owner ticket |
| ---- | --------- | --- | ------------- | ------------ |
| `buildTarget` | `'community'` | `'org'` | Header label, diagnostics | WO-002 |
| `githubOAuth` | `false` | `true` | OAuth settings panel, GitHub **input** source, token storage UI | WO-016 |
| `githubPRSink` | `false` | `true` | ExportSheet "Open GitHub PR" checkbox; `githubPR` sink registration | WO-018, WO-020 |
| `componentImport` | `false` | `true` | Phase 4 import tab (future) | PRD §13.1 |
| `codeConnectPR` | `false` | `true` | Phase 4 Code Connect PR flow (future) | PRD §13.1 |
| `evcProjector` | `false` | `true` | Extended Variable Collections theme inheritance (Enterprise files) | WO-005 spike |
| `tokenTemplates` | `false` | `true` | Pre-configured token templates picker (later add-on per ticket out-of-scope) | PRD §13.1 |

**Sinks that need no flag (always on in both builds for Phase 1 GA):** download, clipboard, Output page, pluginData — PRD §13.1 marks these ✅ for Community and Org. WO-017 implements them unconditionally; ExportSheet always lists them.

**Future org-only (stub now, wire when ticket lands):**

| Flag | Notes |
| ---- | ----- |
| `variablesRestBatch` | Multi-file batch via Variables REST — PRD §13.1 "future"; out of WO-021 scope |

`githubOAuth` and `githubPRSink` will both be `false`/`true` in lockstep for Phase 1, but **keep separate keys**: OAuth gates auth UI and read path; `githubPRSink` gates write/PR path and ExportSheet affordance. Splitting them avoids a single mega-flag and matches WO-016 vs WO-018 ownership.

### 5. UI gating pattern — `flags.xxx` only, no conditional imports

**Required pattern (PRD §13.2, ticket req #3):**

```tsx
import { flags } from '@/config/flags';

// Render gate
{flags.githubPRSink && (
  <label>
    <input type="checkbox" name="sink-github-pr" />
    Open GitHub PR
  </label>
)}

// Sink registry (WO-020 / WO-021 integration)
const SINK_CATALOG = [
  { id: 'download', label: 'Download file(s)', flag: null },
  { id: 'clipboard', label: 'Copy to clipboard', flag: null },
  { id: 'outputPage', label: 'FigHub Output page', flag: null },
  { id: 'pluginData', label: 'Frame pluginData', flag: null },
  { id: 'githubPR', label: 'Open GitHub PR', flag: 'githubPRSink' as const },
] as const;

export function visibleSinks() {
  return SINK_CATALOG.filter((s) => !s.flag || flags[s.flag]);
}
```

**Runtime guard (optional, recommended for GitHub call sites):**

```ts
if (!flags.githubOAuth) {
  throw new Error('GitHub I/O is not available in this build');
}
```

**Forbidden patterns:**

| Anti-pattern | Why |
| ------------ | --- |
| `if (import.meta.env.BUILD_TARGET === 'org')` for feature UI | Duplicates flag source; env is for diagnostics only |
| `import(...)` / separate entry files per build | Creates divergent code paths; violates single-codebase rule |
| Vite `resolve.alias` to stub modules in community build | Hides missing implementations; breaks type parity |
| Tree-shaking GitHub modules out of community bundle | Unnecessary — dead code is fine; manifest blocks network anyway |

**Import rule:** All I/O modules (`src/io/sources/github.ts`, `src/io/sinks/githubPR.ts`, etc.) are **statically imported** in both builds. Community never invokes them because UI gates and manifest block network.

**Exception (already documented in memory.md):** Dev/bench helpers in Bootstrap tab stay **ungated** until a pre-release cleanup ticket — not part of WO-021 product gating.

### 6. Phase 1 GA capability matrix — Community vs Org

Derived from PRD §13.1, scoped to Sprint 4 I/O + existing bootstrap work. WO-021 verification checklist:

| Capability | Community | Org | Verification |
| ---------- | --------- | --- | ------------ |
| Bootstrap (5-collection push + style-guide canvas) | ✅ | ✅ | WO-008–015 — already shipped |
| Paste / file / clipboard input | ✅ | ✅ | WO-006 — shipped |
| Download / clipboard / Output page / pluginData sinks | ✅ | ✅ | WO-017 + WO-019 + WO-020 |
| Dual-format export (JSON + GFM markdown) | ✅ | ✅ | WO-019 |
| Unified ExportSheet | ✅ | ✅ (minus GitHub row) | WO-020 + WO-021 flags |
| GitHub OAuth + read from repo | ❌ | ✅ | WO-016; hidden when `!flags.githubOAuth` |
| GitHub PR output sink | ❌ | ✅ | WO-018; hidden when `!flags.githubPRSink` |
| Component import | ❌ | ✅ (Phase 4) | Flag stub only in WO-021 |
| Code Connect PR emission | ❌ | ✅ (Phase 4) | Flag stub only |
| EVC theme projector | ❌ | ✅ (Enterprise) | Flag stub; runtime still plan-gated |
| Multi-file Variables REST batch | ❌ | ✅ (future) | Out of scope |
| Pre-configured token templates | ❌ | ✅ (later) | Out of scope |

**Phase 1 exit benchmark (ticket AC):** bootstrap path ≥10× speedup vs MCP baseline — tracked separately (WO-015 bench artifacts); WO-021 does not own the benchmark but must not regress build/load time.

### 7. CI — build both targets

`.github/workflows/ci.yml` already runs, in order:

1. `npm run lint`
2. `npm run format:check`
3. `npm run typecheck`
4. `npm test`
5. `npm run build --workspace=@detroitlabs/fighub-contracts`
6. `npm run build:community`
7. `npm run build:org`

No CI change required for dual-build verification. **Gap:** ticket AC #4 asks for `npm run build` as a single entry point — add to `package.json`:

```json
"build": "npm run build:community && npm run build:org"
```

Optional WO-021 enhancement: Vitest matrix or a second job step that runs critical tests with `@/config/flags` aliased to `flags.org.ts` (today Vitest always uses community flags).

### 8. WO-021 as integration ticket (after WO-016–020)

WO-021 should **not** implement OAuth, sinks, serializer, or ExportSheet from scratch. Integration scope:

| Step | Action |
| ---- | ------ |
| 1 | Land WO-016 → WO-020 on `main` (each uses local `flags.githubOAuth` / `flags.githubPRSink` checks as they merge) |
| 2 | Introduce `FigHubFlags` shared type; extend both flag files with I/O keys |
| 3 | Centralize sink visibility helper (`visibleSinks()` or equivalent) consumed by ExportSheet |
| 4 | Audit grep for `BUILD_TARGET`, dynamic imports, and GitHub UI not behind flags |
| 5 | Add `npm run build` umbrella script |
| 6 | Integration tests: community bundle has no GitHub checkbox in ExportSheet render; org bundle shows it |
| 7 | Manual smoke: load each manifest in Figma dev mode; confirm community cannot reach GitHub (network + UI) |
| 8 | Document real plugin IDs when publish tickets replace placeholders |

**Dependency order:** WO-002 ✅ → WO-016, WO-017, WO-019 (parallel) → WO-018 (needs 016+017) → WO-020 (needs 017–019) → **WO-021** (wires + audits + umbrella build).

---

## Recommendations

1. **Treat WO-021 as the "flags + audit + umbrella build" integration pass** once WO-016–WO-020 merge — do not start `/build` on WO-021 until ExportSheet and GitHub sinks exist to gate.
2. **Extend flags with `githubPRSink`** (and shared `FigHubFlags` type) in WO-021; WO-016/018/020 should import `@/config/flags` and read the keys even if the keys are added in a small preparatory commit on WO-021 branch rebased atop 016–020.
3. **Keep all GitHub modules in both bundles** with UI + runtime guards; rely on community manifest `networkAccess: none` as the hard backstop.
4. **Add `"build": "npm run build:community && npm run build:org"`** to satisfy ticket AC without changing CI step names.
5. **Add org-flag Vitest coverage** for at least ExportSheet and GitHub settings panel render tests.
6. **Do not gate dev/bench UI** per memory.md — product gating only.

---

## Open Questions

| ID | Question | Recommendation |
| -- | -------- | -------------- |
| OQ-A | Should `githubOAuth` and `githubPRSink` always mirror each other? | Yes for Phase 1; keep separate keys for future split (e.g. read-only org mode). |
| OQ-B | Separate `dist-community/` and `dist-org/` output dirs? | Not required for WO-021; document that sequential builds overwrite `dist/`. Revisit if publish pipeline needs both artifacts simultaneously. |
| OQ-C | Vitest org-flag runs — matrix job vs duplicate test file? | `/plan` to pick; minimum is one org-alias test file for ExportSheet. |
| OQ-D | Real Figma plugin IDs — when? | Out of WO-021; placeholders OK until Community/Org publish tickets. |
| OQ-E | Main-thread GitHub calls — stub no-op in community or throw? | Throw on invocation with clear message; code path should be unreachable from UI. |

---

## Validated evidence

### Repo inventory (grep-verified 2026-05-27)

| Path | Status | Role |
| ---- | ------ | ---- |
| `scripts/build-community.mjs` | ✅ | `BUILD_TARGET=community`, copies community manifest |
| `scripts/build-org.mjs` | ✅ | `BUILD_TARGET=org`, copies org manifest |
| `vite.config.ts` L7–12 | ✅ | Flags alias per build target |
| `vitest.config.ts` | ✅ | Community flags alias for tests |
| `tsconfig.json` | ✅ | Community flags for IDE/tsc |
| `.github/workflows/ci.yml` | ✅ | Runs both builds sequentially |
| `package.json` | ✅ | `build:community`, `build:org` — **no** `build` umbrella |
| `src/ui/App.tsx` L22 | ✅ | Only consumer of `flags` today |

### Phase 1 GA matrix (PRD §13.1 — validated against research)

| Capability | Community | Org | Gate |
| ---------- | --------- | --- | ---- |
| download / clipboard / Output / pluginData | ✅ | ✅ | none |
| GitHub OAuth + read | ❌ | ✅ | `githubOAuth` + manifest |
| GitHub PR sink | ❌ | ✅ | `githubPRSink` + manifest |
| componentImport / codeConnectPR / evcProjector | ❌ | ✅ | existing flags |

### Defense in depth (validated)

1. **UX gate:** `flags.xxx` conditional render — no dynamic `import()` per build
2. **Network gate:** Community manifest `"none"` blocks fetch even if UI bug exposes button
3. **Bundle parity:** Same code in both bundles; dead paths unreachable in Community

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D-021-1 | WO-021 after WO-016–020 | Integration audit, not greenfield | Re-build dual pipeline |
| D-021-2 | Add `githubPRSink` separate from `githubOAuth` | Read vs write ownership | Single mega-flag |
| D-021-3 | `"build": "build:community && build:org"` | Ticket AC | Replace CI steps |
| D-021-4 | No conditional imports | PRD §13.2 | Separate entry points |
| D-021-5 | Sequential dist overwrite OK | CI already does this | dual dist dirs (OQ-B defer) |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-021-1 | Add `npm run build`; run locally | Both builds green; org manifest in dist | ☐ at build |
| SPK-021-2 | `grep -r "api.github.com" dist/` after community build | No runtime fetch strings required; UI gates sufficient | ☐ audit script |
| SPK-021-3 | Vitest org-flag alias test file | ExportSheet shows github-pr when org flags mocked | ☐ at build |

---

## Risk register

| Risk | Sev | Likelihood | Mitigation |
| ---- | --- | ---------- | ---------- |
| Missed UI gate ships GitHub button in Community | Med | Low | SPK-021-2 grep + manifest backstop |
| Flags shape drift between community/org files | Med | Med | Shared `FigHubFlags` type |
| WO-021 builds before sinks exist | High | Med | Dependency: merge 016–020 first |

---

## Sources

- Sprint index: [sprint-4-io-gating-research-index.md](../../research/sprint-4-io-gating-research-index.md)
- Quality bar: [research-quality-bar.md](../../../templates/research-quality-bar.md)
- `.github/Sprint 1/WO-002-…/research/scaffold-choice.md` — dual-build rationale
- `.github/Sprint 1/WO-004-…/research/eslint-and-ci-config.md` — CI sequential dual-build
- `vite.config.ts`, `scripts/build-community.mjs`, `scripts/build-org.mjs`
- `manifest.community.json`, `manifest.org.json`
- `src/config/flags.{community,org}.ts`, `src/ui/App.tsx`
- `.github/workflows/ci.yml`
- WO-016–WO-020 `ticket.md` files (Sprint 4)
- `memory.md` — dev UI ungated until cleanup; build order / `__html__` fix
