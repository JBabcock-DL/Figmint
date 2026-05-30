---
type: work-order
github_issue: 47
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jes
---

## Goal

Add the Import-from-repo flow and the 'Emit Code Connect PR' flow to the Components tab. Phase 4a cut (React-only).

PRD anchors: `Docs/PRD.md` §6.3, §6.7, §12 Phase 4a.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

Components tab Import + CC PR UI mock lives in the FigHub design file.

---

## Requirements

### Functional

1. **`ImportFromRepoSection.tsx`** + **`CodeConnectSection.tsx`** — extend `Components.tsx` (section order per sprint index).
2. GitHub file browser (`*.tsx` under `componentsPath`); messages `import/list-files`, `import/parse`.
3. Dependency tree display (WO-043) → **`SpecPreviewPanel`** reuse → `scaffold/run` (FR-IMP-7).
4. **Emit Code Connect PR** → `codeconnect/emit-pr` → WO-040 + WO-018 sink.
5. Framework picker visible; **React only** enabled in Phase 4a.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-040, WO-041, WO-042, WO-043

---

## Acceptance criteria _(definition of done)_

- [ ] Designer imports a React component end-to-end: pick file → scan deps → preview spec → scaffold + add to registry → optional CC PR.
- [ ] Designer emits CC PR for 5 unmapped components → single PR opens in connected repo.
- [ ] Phase 4a GA: full React import + CC roundtrip works.

## Out of scope

- Vue/WC/SwiftUI/Compose flows (later sprints).

---

## Deferred designer intent _(related WO-027 feedback 2026-05-28)_

Manual VQA surfaced a mental model overlap with **WO-056** (committed roadmap) and this ticket:

- Designers expect **browse repo → multiselect → batch scaffold** without paste — **WO-056** owns catalog discovery + batch queue (Phase 4a).
- **Load sync registry** (WO-027) remains the **re-scaffold / linked components** path only.

**When planning WO-044:** coordinate UI layout with WO-056 — import-from-source for un-specced code; catalog for on-disk specs.

**Roadmap:** [component-catalog-roadmap](../../Sprint%205/research/component-catalog-roadmap.md)

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

**Figma source (code VQA — panel-only, WO-038 precedent):**

| Field           | Value                                                                 |
| --------------- | --------------------------------------------------------------------- |
| `file_key`      | `cVdPraIafWFBRZnzMPhtrW`                                             |
| `node_id`       | N/A — plugin panel; no design mock node                               |
| Figma deep link | https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox    |
| Frame / scope   | Plugin window — Components tab (Import + Code Connect sections)       |
| Captured at     | 2026-05-29                                                            |

**Assertions** _(code + Vitest; manual sandbox E2E deferred to user checklist):_

| #   | Category      | Property                    | Design (Figma) | Build (implemented) | Result |
| --- | ------------- | --------------------------- | -------------- | ------------------- | ------ |
| 1   | Layout        | Section order Paste→Catalog→Import→CC | WO-027 + sprint index | `Components.tsx` section order | PASS |
| 2   | Layout        | Section vertical gap 12px   | WO-027 inline  | `marginTop: 12` pattern | PASS |
| 3   | Layout        | Import file list scroll     | list panel     | `FileBrowserList` maxHeight scroll | PASS |
| 4   | Typography    | Section labels 11px semibold | WO-027        | matches existing Components labels | PASS |
| 5   | Color         | Disabled framework options  | muted          | `FrameworkPicker` disabled + tooltip | PASS |
| 6   | Color         | Error text                  | red            | inline error strings on failed parse | PASS |
| 7   | Spacing       | Dependency tree indent      | list           | `DependencyTreePanel` rows | PASS |
| 8   | Effects       | Primary button style        | WO-027         | reuses scaffold button classes | PASS |
| 9   | Accessibility | Import gated until preview valid | FR-IMP-7 | `canScaffold` + SpecPreviewPanel | PASS |
| 10  | Accessibility | Framework picker aria         | labeled        | `FrameworkPicker.test.tsx` | PASS |

**Per-row deviations:**

- Manual Plugin Sandbox E2E (import → scaffold → optional CC PR) not run by agent — see `research/sprint-8-user-checklist.md`.

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-040, WO-041, WO-042, WO-043.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.3, §6.7, §12 Phase 4a
- Research: [Components tab Import + CC UI](research/components-tab-ui-import-cc-pr-flows.md)
- [component-catalog-roadmap](../../Sprint%205/research/component-catalog-roadmap.md)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
