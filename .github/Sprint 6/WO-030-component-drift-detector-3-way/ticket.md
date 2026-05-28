---
type: work-order
github_issue: 33
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JSY
---

## Goal

Same 3-way classification as WO-029, but for components. Compares current Figma ComponentSets against repo `.fighub-registry.json` and per-component specs in the connected repo, using the snapshot as common ancestor.

PRD anchors: `Docs/PRD.md` §6.4 FR-DRIFT-2..3.

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

1. **`src/core/drift/figmaComponent.ts`** — `figmaComponentSetToComparable(set)` extracting variant matrix, props, bindings from live ComponentSet.
2. **`src/core/drift/components.ts`** — `detectComponentDrift(repoSpecs, figmaComponents, snapshot): ComponentDriftEntry[]`.
3. **Drift unit:** registry component key = spec `name` (e.g. `Button`); report id prefix `cmp/` (e.g. `cmp/button`).
4. **Compare facets (any mismatch → not equal):**
   - Variant matrix via `hashVariantMatrix` (fast path) + granular `{ added, removed }` combo names on drift
   - Props deep-equal vs `ComponentSpecV1.props`
   - Bindings deep-equal (selector + variable) vs `ComponentSpecV1.bindings`
5. **Repo source:** `ComponentSpecV1` JSON from `fighub.json` `specsPath` (WO-058); **not** `.fighub-registry.json` (deleted).
6. **Snapshot source:** `snapshot.registry.components` + per-key `cmp/{name}` comparable values (WO-058 envelope).
7. Classification rules same as WO-029 (`classifyThreeWay` shared module).
8. Each drift entry includes granular `ComponentDiff` in `figma` / `repo` / `lastSynced` fields.
9. **Quick detect mode:** hash-only compare for on-open badge (WO-033 absorbed); full facet compare when panel expanded.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-058 Phase 1 (snapshot registry), WO-022 (variant matrix + scaffold introspection)

---

## Acceptance criteria _(definition of done)_

- [ ] Test fixture: Button with `loading` variant added in Figma → push drift detected with correct granular delta.
- [ ] Test fixture: Button with new prop in repo spec → pull drift detected.
- [ ] Both-sides-changed → conflict.
- [ ] Performance: 20-component file <2s.

## Out of scope

- Code-side spec validation (assume repo specs are well-formed).
- Auto-resolution suggestions.

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

- Dependencies: WO-028, WO-022.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.4 FR-DRIFT-2..3, FR-DRIFT-6
- [Component drift detector research](research/component-drift-detector-3-way.md)
- [Variable drift detector research (shared classify)](../WO-029-variable-drift-detector-3-way/research/variable-drift-detector-3-way.md)
- [Sprint 6 research index](../research/sprint-6-drift-sync-research-index.md)
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
