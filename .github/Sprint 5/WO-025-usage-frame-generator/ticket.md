---
type: work-order
github_issue: 28
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JNQ
---

## Goal

Generate a 'usage' frame next to the scaffolded ComponentSet showing example instances across variant combinations. Implements FR-SCAF-5.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-5.

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

1. `src/core/components/scaffold/usageFrame.ts` — produces an auto-layout frame containing instance examples (one per variant combination or a curated subset).
2. Uses auto-layout helpers (WO-014).
3. Label each instance with its variant tuple.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-*.mcp.js` — `_usage-runner.fragment.js` patterns
- **Dependencies:** WO-022, WO-014

---

## Acceptance criteria *(definition of done)*

- [ ] After scaffolding a Button with `variant × size × disabled`, the usage frame shows representative instances (e.g. 4-6 curated combos, not all 12).
- [ ] Frame passes audit.

## Out of scope

- Designer-customizable usage examples beyond the default curation.

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

- Dependencies: WO-022, WO-014.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-5
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/canvas-templates/bundles/component-*.mcp.js` — `_usage-runner.fragment.js` patterns
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
