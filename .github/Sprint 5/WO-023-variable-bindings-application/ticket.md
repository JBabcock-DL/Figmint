---
type: work-order
github_issue: 26
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JLk
---

## Goal

Apply variable bindings to scaffolded components per the spec — `setBoundVariable` / `setBoundVariableForPaint` per the binding definitions in `ComponentSpecV1.bindings`. Implements FR-SCAF-3.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-3.

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

1. `src/core/components/scaffold/applyBindings.ts` — applies all bindings from `spec.bindings[]` to **every variant `ComponentNode`** under the scaffolded `ComponentSetNode` (see locked API in research).
2. **Selector grammar (locked):** `{nodePath}.{kind}` where `nodePath` is slash-separated layer names from the variant root (`root.fill`, `text/label.text-style`, `icon-slot/leading.stroke`); `kind` ∈ `fill` | `stroke` | `radius` | `padding` | `gap` | `text-style`.
3. **Variable paths:** Figma variable `name` strings per `07-token-paths.md` (`color/primary/default`, `space/md`, …); strip optional `{Collection}/` prefix when resolving; **no hex fallback** on miss.
4. **Binding mechanics:** reuse `bindPaintToVar` / `bindStrokeToVar` for color; `setBoundVariable` for padding (×4), gap (`itemSpacing`), radius (four corners); `text-style` applies published TextStyle by name from `variable`.
5. `src/core/components/scaffold/selector.ts` — parse + resolve node paths (pure, Vitest-covered).
6. **Audit:** extend WO-010 `runAudit` with `scope: 'component'` rules (`comp/binding-*`) — missing variables and missing selectors FAIL with selector path in diagnostic; wire `ApplyBindingsResult` as input.
7. **Pipeline order:** run after WO-022 `scaffold()`, before WO-024 properties.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/07-token-paths.md` — binding paths convention
  - `component-*.mcp.js` §5 — `bindColor` / `bindNum` lift patterns
- **Patterns to mirror:** `src/core/canvas/helpers/bindings.ts`, `src/core/canvas/lib/variables.ts`, `src/core/canvas/typographyStyleBinding.ts`
- **WO-022 dependency:** variant layer names must match selector map (`text/label`, `icon-slot/*`, `state-layer/*`, `focus-ring`)
- **Dependencies:** WO-022, WO-008, WO-010

---

## Acceptance criteria _(definition of done)_

- [ ] A spec with 10 bindings applied to a scaffolded ComponentSet leaves every selector bound on **each** variant (no `ApplyBindingsResult.failed` entries).
- [ ] Missing variable references surface in audit as FAIL with the selector path and variable name (`comp/binding-variable-resolved`).
- [ ] Missing node paths surface in audit as FAIL with the selector path (`comp/binding-node-resolved`).
- [ ] Integration test against a canonical chip-archetype shadcn spec fixture (`tests/fixtures/components/`).

## Out of scope

- Property definitions (WO-024).
- Token resolution from CSS classes (Sprint 8 token resolver).
- Per-typography-field variable binds on text nodes (`fontSize`, `fontFamily`, …) — use `text-style` kind with published TextStyle names only.

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover the acceptance criteria above.

### Visual / design QA

- See ticket-level scope; most subsystem tickets have visual QA in their UI counterpart.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- `pluginLog()` per major event (main thread — not `console.debug`); production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- [x] Research complete — [variable-bindings-application.md](research/variable-bindings-application.md)

## 📋 Ready for `/plan`

- Dependencies: WO-022, WO-008, WO-010.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-3
- Research: [Variable bindings application](research/variable-bindings-application.md)
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/07-token-paths.md` — binding paths convention
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
