---
type: work-order
github_issue: 38
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JXY
---

## Goal

Walk the selected frame's subtree, enumerate every component instance, and include the Code Connect URL when one is mapped (via Figma's mapping API).

PRD anchors: `Docs/PRD.md` §6.6 FR-HAND-2.

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

1. `src/core/handoff/components.ts` — `enumerateComponents(root: SceneNode): HandoffComponentUsage[]`.
2. Depth-first walk; count **`INSTANCE`** nodes; aggregate by **component set name** (fallback: main component name).
3. Resolve `codeConnectUrl` via **`mainComponent.getDevResourcesAsync()`** — first HTTPS/GitHub dev resource URL; omit field when unmapped (no Plugin API for MCP `get_code_connect_map`).
4. Handle remote/detached instances: skip detached with warning; use `getMainComponentAsync` when needed.
5. Share tree-walk helper with WO-036 (`src/core/handoff/walk.ts`) where practical.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-034

---

## Acceptance criteria _(definition of done)_

- [ ] A frame with 4 Button instances + 2 Card instances returns `[{ name: 'Button', instances: 4, ... }, { name: 'Card', instances: 2, ... }]`.
- [ ] Code Connect URLs included where mapped.
- [ ] Unit + integration tests against fixture frames.

## Out of scope

- Code Connect creation (Sprint 8).

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

- PRD: `Docs/PRD.md` §6.6 FR-HAND-2
- [Components + Code Connect enumeration research](research/components-used-code-connect-url-enumeration.md)
- Pattern: `src/core/drift/figmaComponent.ts` (`scanBindings`)
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
