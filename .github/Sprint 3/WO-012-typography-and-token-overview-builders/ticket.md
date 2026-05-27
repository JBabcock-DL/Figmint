---
type: work-order
github_issue: 15
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5I-s
---

## Goal

Port the typography text-styles builder (step-15c-text-styles) and the token overview builder (step-17) from DesignOps-plugin. The text-styles builder renders the typography specimen; the token overview builder renders the cross-collection summary.

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

1. `src/core/canvas/textStyles.ts` — port of modular `canvas-templates/text-styles.js` + `_step15c-text-styles-runner.fragment.js` (not the `.mcp.js` bundle).
   - Rebuild `doc/table/typography/styles` on `↳ Text Styles` page (`pageSlug: text-styles`).
   - **27 slot rows** (15 base + 12 body variants) + **5 category sub-headers** (Display, Headline, Title, Body, Label).
   - Specimen renders at Typography mode **100**; caption documents 8 Android-scale modes (`85`→`200`) in the Typography collection.
   - Columns sum to **1640** (SLOT 220 · SPECIMEN 360 · SIZE/LINE 140 · WEIGHT/FAMILY 180 · WEB 280 · ANDROID 200 · iOS 260).
   - Variant fill bindings: link → `color/primary/default`; strikethrough → `color/background/content-muted`; else → `color/background/content`.
2. `src/core/canvas/tokenOverview.ts` — port of modular `canvas-templates/token-overview.js` (not the `.mcp.js` bundle).
   - Refresh `/new-project` 05d scaffold on `↳ Token Overview` page (`pageSlug: token-overview`).
   - Sync `doc/table/token-overview/platform-mapping` cells from live variable `codeSyntax` (22 minimum rows per `platform-mapping-rows.json`, each tagged by collection).
   - Rebind architecture boxes, phone frames, apply §0.9 shadow hygiene (no double elevation on platform-mapping subtree), delete `placeholder/*`, upgrade `_Doc/*` text styles.
   - “Grouped by collection” = five `arch-box/{Collection}` frames + collection metadata on platform-mapping rows (legacy parity — not five full per-collection token tables).
3. Both accept `CanvasBuildContext { tokens: TokensV1, pushResult? }` but read **live Figma variables/text styles** at draw time (`ensureLocalVariableMapOnCtx`); `TokensV1` drives expected counts, codeSyntax fallbacks, and audit.
4. Shared canvas lib from `_lib.js` (`src/core/canvas/lib/*`) — coordinate with WO-011; do not duplicate table/font/binding helpers.
5. Invoke `runAudit('canvas', …)` after each builder with typography + token-overview rules from `14-audit.md` (extends WO-010).
6. Bench harness: each builder **p50 < 3 s** on Plugin Sandbox post-Foundations push; log to `research/canvas-bench-result.md`.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin — modular source per `Docs/lift-sources.md` §3):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/text-styles.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/token-overview.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/_step15c-text-styles-runner.fragment.js`
  - Data: `data/typography-slots.json`, `data/platform-mapping-rows.json`
- **Dependencies:** WO-008 (push + variables on canvas), WO-014 (auto-layout helpers — **hard gate**, no inline `resize()`), WO-010 (`scope: 'canvas'` audit extension)

---

## Acceptance criteria _(definition of done)_

- [ ] Typography page shows all **27** text-style specimen rows at mode **100**, grouped under 5 category headers, with WEB/ANDROID/iOS codeSyntax columns populated.
- [ ] Token overview platform-mapping table lists minimum cross-collection rows with live `codeSyntax`; architecture boxes bound; §0.9 shadow hygiene enforced.
- [ ] Both builders import WO-014 auto-layout helpers exclusively for resize/sizing.
- [ ] Both return `CanvasBuildResult` with `audit.passed === true` on a clean Foundations file.
- [ ] Bench logged: each builder **< 3 s** p50 on Plugin Sandbox.

## Out of scope

- Color/Theme/Layout/Effects builders (WO-011, WO-013).
- Publishing `_Doc/*` + 27 slot text styles (shared bootstrap prep — see research open question #1).
- Font-scale panel mode binding (optional appendix — defer unless scaffold exists).
- Bootstrap tab UI (WO-015).

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover the acceptance criteria above.

### Visual / design QA

- See ticket-level scope; most subsystem tickets have visual QA in their UI counterpart.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- `pluginLog()` per major event (not `console.debug` on main thread); production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- ✅ Complete — see [Typography + Token Overview Builders](research/typography-token-overview-builders.md).

## 📋 Ready for `/plan`

- ✅ Complete — see [plan.md](plan.md) (236 lines; requirement traceability + Build Agents Phases 1–3).

## 🛠️ Ready for `/build`

- `/code-build` after WO-014 + shared `src/core/canvas/lib/` from color/theme builder ticket.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-7
- Research: [Typography + Token Overview Builders](research/typography-token-overview-builders.md)
- Lift reference (modular — not bundles):
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/text-styles.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/token-overview.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/_lib.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/_step15c-text-styles-runner.fragment.js`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
