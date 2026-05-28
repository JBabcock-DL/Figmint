---
type: work-order
github_issue: 32
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JRQ
---

## Goal

Implement variable drift detection: pull current repo `tokens.json`, walk current Figma local variables, compare both against the snapshot (common ancestor). Classify each diff as push / pull / conflict / synced.

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

1. **`src/core/drift/classify.ts`** — shared `classifyThreeWay<T>(figma, repo, snapshot, equal)` used by WO-030.
2. **`src/core/drift/variables.ts`** — `detectVariableDrift(repoTokens, figmaVars, snapshot): VariableDriftEntry[]` (pure function; no Plugin API inside detector).
3. **Key namespace:** flat slash keys `{collectionName}/{variableName}` matching Figma `variable.name` (never dot paths).
4. **Equality:** reuse `valuesEqual` + `codeSyntaxEqual` from `src/core/variables/compare.ts` via `variableStatesEqual` wrapper on `{ valuesByMode, codeSyntax, resolvedType }`.
5. **Classification (locked):**
   - Figma ≠ snapshot, repo = snapshot → **push**
   - Repo ≠ snapshot, Figma = snapshot → **pull**
   - Both ≠ snapshot and disagree → **conflict**
   - Both = snapshot OR both ≠ snapshot but agree → **synced** (count in summary only — omit from `drifts[]`)
6. **Missing snapshot entry:** treat snapshot value as repo value (PRD risk row — first-run no false mass-pull).
7. **Repo side:** adapt wire JSON through `src/io/sources/adapters/adapt()` → flatten `TokensV1` to comparable map.
8. **Figma side:** flatten output of `readFigmaVariableState()` (WO-008 audit path).
9. **Report IDs:** prefix `var/` (e.g. `var/primitives/color/blue-500`).
10. **Main-thread message:** `drift/detect-variables` returns drift array for WO-031 aggregator.
11. Output integrates into `drift-report.v1` (WO-031).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-058 Phase 1 (snapshot store — absorbed WO-028), WO-008
- **Blocked by:** WO-058 snapshot API landing (or parallel stub with mock snapshot in unit tests)

---

## Acceptance criteria _(definition of done)_

- [ ] Test fixture: 10 variables, 3 pushed in Figma, 2 pulled in repo, 1 conflict — detector classifies all 10 correctly.
- [ ] Performance: 400-variable comparison <2s.
- [ ] Integration test against a sample repo + Figma file.

## Out of scope

- Component drift (WO-030).
- Resolution UI (WO-032).
- PR emission (WO-031).

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

- Dependencies: WO-028, WO-008.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.4 FR-DRIFT-2..3
- [Variable drift detector research](research/variable-drift-detector-3-way.md)
- [Snapshot mechanism research (WO-028 → WO-058)](../WO-028-snapshot-mechanism-canvas-plugindata/research/snapshot-mechanism-canvas-plugindata.md)
- [Sprint 6 research index](../research/sprint-6-drift-sync-research-index.md)
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
