---
type: work-order
github_issue: 16
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5I_Q
---

## Goal

Port the Layout (spacing, grids, radii) and Effects (shadows, blurs) canvas builders from DesignOps-plugin. Completes the style-guide canvas trio alongside WO-011 and WO-012.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-7.

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

1. **`src/core/canvas/layout.ts`** — `buildLayoutPage()` port of `canvas-templates/layout.js` (not the `.mcp.js` bundle).
   - One table per Layout collection group (first path segment: `space`, `radius`, optional `padding`/`gap`/`border`).
   - Spacing rows: horizontal preview bar (width = resolved px, bound to `color/primary/200`).
   - Radius rows: 64×64 square preview; `radius/full` or px ≥ 9999 displays `∞`.
   - Seven columns summing to 1640 per `10-column-spec.md` ↳ Layout.
2. **`src/core/canvas/effects.ts`** — `buildEffectsPage()` port of `canvas-templates/effects.js`.
   - Fixed tables: `effects/shadows` (5 blur tiers) + `effects/color` (1 row).
   - LIGHT/DARK preview columns with `setExplicitVariableModeForCollection` on Effects + Theme collections.
   - Shadow preview cards use local `Effect/shadow-{tier}` styles; BLUR column shows resolved px.
3. **`src/core/canvas/resolveLayoutRows.ts`** + **`resolveEffectsRows.ts`** — pure row resolvers ported from `_step15c-*-runner.fragment.js`; consume `TokensV1` + live variable snapshot (not host-injected maps).
4. Both builders import shared table/page helpers from **WO-014** (`buildTable`, `buildPageContent`, `makeBodyCell`, `columnSpec`) — no inline `resize()` calls.
5. Idempotent redraw: `buildPageContent` wipes non-header nodes and rebuilds `_PageContent` each run.

### Visual / UX

- Layout page: spacing scale + radius alias tables with bound preview samples (legacy has no separate grid matrix — spacing tokens are the grid-gap scale).
- Effects page: dual Light/Dark shadow cards with visible contrast (wrapper tint via `color/background/container-highest` or `variant`).
- Match shipped `effects.js` preview fidelity first; `10-column-spec.md` mat/wrapper upgrade is optional polish if VQA fails.

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/layout.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/effects.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js` (shared → WO-014)
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/_step15c-layout-runner.fragment.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/_step15c-effects-runner.fragment.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/data/layout-effects.json` (fixture source)
- **Dependencies:** WO-008 (variables pushed), WO-009 (codeSyntax fallback), WO-014 (canvas helpers)
- **Bench:** log `layoutMs` / `effectsMs` via `pluginLog()`; each builder < 3 s on Foundations-scale file.
- **Audit:** invoke `runAudit({ scope: 'canvas' })` post-draw; relevant rules from `14-audit.md`.
- **Tests:** Vitest unit tests on row resolvers + column width sums; integration test on Plugin Sandbox after push.

---

## Acceptance criteria _(definition of done)_

- [ ] Layout page shows spacing scale + radius tables with bound preview samples.
- [ ] Effects page shows shadow tier + shadow color rows with Light/Dark rendered previews.
- [ ] Re-run is idempotent (second draw replaces tables, no duplicates).
- [ ] Both pass canvas-scope audit; bench < 3 s each (logged in `research/layout-effects-bench-result.md`).

## Out of scope

- Other style-guide pages (WO-011, WO-012).
- Bootstrap tab UI (WO-015).
- `10-column-spec.md` gold mat/wrapper upgrade unless VQA requires it.
- Publishing `Effect/shadow-*` styles (dependency on push pipeline — track in WO-008 extension or bootstrap preflight).

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover row resolvers, column specs, and acceptance criteria above.

### Visual / design QA

- Plugin Sandbox push → build layout → build effects → verify preview contrast and monotonic spacing bars.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- `pluginLog()` per major event (not `console.debug` on main thread); production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- ✅ Complete — see [layout-effects-canvas-builders.md](research/layout-effects-canvas-builders.md)

## 📋 Ready for `/plan`

- ✅ Complete — see [plan.md](plan.md) (252 lines; requirement traceability + Build Agents Phases 1–3).

## 🛠️ Ready for `/build`

- `/code-build` after canvas helpers + shared `lib/` exist.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-7
- Research: [Layout & Effects canvas builders](research/layout-effects-canvas-builders.md)
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/layout.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/effects.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/data/layout-effects.json`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
