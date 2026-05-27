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

1. `src/core/canvas/textStyles.ts` — port of `step-15c-text-styles.mcp.js`.
2. `src/core/canvas/tokenOverview.ts` — port of `step-17-token-overview.mcp.js`.
3. Both produce auto-layout frames; consume `TokensV1`.
4. Use the auto-layout helpers library (WO-014).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15c-text-styles.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-17-token-overview.mcp.js`
- **Dependencies:** WO-008, WO-014

---

## Acceptance criteria _(definition of done)_

- [ ] Typography page shows all text styles per Android-scale modes (per Detroit Labs Foundations).
- [ ] Token overview page lists tokens grouped by collection with values and codeSyntax visible.
- [ ] Both pass audit; bench <3s each.

## Out of scope

- Color/Theme/Layout/Effects builders.
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
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15c-text-styles.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-17-token-overview.mcp.js`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
