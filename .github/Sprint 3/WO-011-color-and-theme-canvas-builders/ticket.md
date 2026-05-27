---
type: work-order
github_issue: 14
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5I90
---

## Goal

Port the step-15a (Primitives color tables) and step-15b (Theme tables) canvas builders from DesignOps-plugin into figmint as deterministic TypeScript modules. Together these build the foundational color portion of the style-guide canvas.

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

1. `src/core/canvas/colorTables.ts` — port of `step-15a-primitives.mcp.js` (~1314 lines source).
2. `src/core/canvas/themeTables.ts` — port of `step-15b-theme.mcp.js`.
3. Both consume `TokensV1` + a target Figma page; produce auto-layout frames with all color swatches + value labels per mode.
4. Use the auto-layout helpers library (WO-014).
5. Idempotent on re-run.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` — primary source
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15b-theme.mcp.js` — primary source
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/00-gotchas.md`, `08-hierarchy-and-09-autolayout.md`, `10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`
- **Dependencies:** WO-008, WO-014

---

## Acceptance criteria _(definition of done)_

- [ ] Running both builders against a sample design system produces visually correct Primitives and Theme canvas pages matching the DesignOps-plugin reference output.
- [ ] Output frames pass the audit (WO-010) — no 1px masters, correct counter-axis behavior per `00-gotchas.md`.
- [ ] Bench: each builder completes <3s for ~100 swatches.

## Out of scope

- Typography / Layout / Effects builders (WO-012, WO-013).
- Token overview specimen (WO-012).
- Bootstrap tab UI invocation (WO-015).

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover the acceptance criteria above.

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

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-008, WO-014.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-7
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` — primary source
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15b-theme.mcp.js` — primary source
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/00-gotchas.md`, `08-hierarchy-and-09-autolayout.md`, `10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
