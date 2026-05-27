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

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/core/canvas/layout.ts` — port of `step-15c-layout.mcp.js`.
2. `src/core/canvas/effects.ts` — port of `step-15c-effects.mcp.js`.
3. Both produce auto-layout frames; consume `TokensV1`.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15c-layout.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15c-effects.mcp.js`
- **Dependencies:** WO-008, WO-014

---

## Acceptance criteria *(definition of done)*

- [ ] Layout page shows spacing scale, radii, grids with samples.
- [ ] Effects page shows shadow + blur tokens with rendered previews.
- [ ] Both pass audit; bench <3s each.

## Out of scope

- Other style-guide pages (WO-011, WO-012).
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
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15c-layout.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15c-effects.mcp.js`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
