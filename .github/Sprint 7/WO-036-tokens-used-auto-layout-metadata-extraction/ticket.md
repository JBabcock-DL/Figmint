---
type: work-order
github_issue: 39
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JYg
---

## Goal

Walk the selected frame, collect every Variable referenced (via `boundVariables`), and capture auto-layout metadata (direction, gap, padding, sizing modes) for handoff context.

PRD anchors: `Docs/PRD.md` §6.6 FR-HAND-3..4.

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

1. `src/core/handoff/tokens.ts` — `enumerateTokensAndLayout(root: SceneNode)` → `{ tokens: string[], autoLayout: HandoffAutoLayout }`.
2. Recursive `boundVariables` scan (fills, strokes, typography, layout spacing/padding); resolve IDs via `getVariableByIdAsync` → **`{CollectionDisplayName}/{variable.name}`** using `DISPLAY_NAME` from `collections.ts`.
3. Dedupe + lexicographic sort of token paths (deterministic output).
4. Auto-layout on **root frame**: `direction` horizontal|vertical; `gap`/`padding` as bound variable path or px fallback string.
5. No literal/alias resolution — variable **names only** (ticket out of scope).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-034

---

## Acceptance criteria _(definition of done)_

- [ ] A frame using `Theme/Primary` + `Layout/spacing/3` + `Typography/Body/medium` returns those three token names.
- [ ] Auto-layout metadata correctly captures vertical/horizontal + gap + padding.
- [ ] Unit + integration tests.

## Out of scope

- Token value resolution (only names matter for handoff).

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

- Dependencies: WO-034.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.6 FR-HAND-3..4
- [Tokens + auto-layout extraction research](research/tokens-used-auto-layout-metadata-extraction.md)
- Pattern: `src/core/drift/figmaComponent.ts`, `src/core/variables/collections.ts`
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
