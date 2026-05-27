---
type: work-order
github_issue: 11
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5I7U
---

## Goal

Implement the deterministic engine that pushes a canonical `TokensV1` into Figma as the 5 variable collections (Primitives, Theme, Typography, Layout, Effects) with the correct modes per collection. This is the core of Phase 1 — every other bootstrap feature feeds into or depends on this engine.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-3..6.

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

1. `src/core/variables/collections.ts` — creates/updates the 5 collections idempotently.
2. `src/core/variables/modes.ts` — handles per-collection modes (Light/Dark on Theme; Android-scale modes on Typography per Detroit Labs Foundations).
3. `src/core/variables/push.ts` — orchestration entry; accepts `TokensV1`, returns `{ created, updated, skipped, errors }`.
4. Extended Variable Collections (Jan 2026) support behind a feature flag — gated by WO-005 spike findings.
5. Idempotent: running the same input twice yields zero changes on the second run.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` — strip MCP wrapper, port the `figma.variables.createVariableCollection` / `setValueForMode` sequence
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md` — 5-collection model
  - WO-005 spike code (throwaway, but extracted patterns survive)
- **Dependencies:** WO-002, WO-003, WO-007

---

## Acceptance criteria *(definition of done)*

- [ ] A canonical `TokensV1` input with all 5 collections populated → all 5 collections appear in the Figma file with correct modes.
- [ ] Re-running the same input is a no-op (no duplicate variables or collections).
- [ ] Bench: 400-variable push completes <2s on a fresh file.
- [ ] Audit hook (WO-010) is invoked after push; failures bubble up.
- [ ] `tsc --noEmit` clean.

## Out of scope

- Style-guide canvas building (Sprint 3 WO-011..WO-013).
- codeSyntax mapping (WO-009).
- Audit reporting (WO-010).
- I/O sources (WO-006).

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

- Dependencies: WO-002, WO-003, WO-007.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-3..6
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` — strip MCP wrapper, port the `figma.variables.createVariableCollection` / `setValueForMode` sequence
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md` — 5-collection model
  - WO-005 spike code (throwaway, but extracted patterns survive)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
