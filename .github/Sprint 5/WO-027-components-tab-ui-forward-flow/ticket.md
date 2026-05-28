---
type: work-order
github_issue: 30
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JPQ
---

## Goal

Build the Components tab UI for the forward-scaffold flow. Designer picks from the registry OR pastes a `ComponentSpecV1`; plugin scaffolds + binds + adds props + builds usage frame; registry export sheet appears. Phase 2 GA cut.

PRD anchors: `Docs/PRD.md` §5.2 UC-2, §5.3 UC-3, §6.2 FR-SCAF-1..6, §12 Phase 2 exit (G2).

---

## Problem story

Phase 1 delivered Bootstrap (tokens + style-guide). Phase 2 requires a **designer-facing surface** for the forward scaffold pipeline (spec → ComponentSet → bindings → properties → usage frame → registry export). Subsystem tickets WO-022..026 implement core functions; WO-027 wires them into a tab with preview-before-apply, progress, audit, and export — meeting UC-2 (registry pick), UC-3 (paste spec), and G2 (<5s scaffold).

---

## User stories

- As a designer, I pick **Button** from the connected repo's registry and scaffold it with one click after previewing the spec.
- As a designer, I paste an agent-generated `component-spec.v1.json` and scaffold it the same way.
- As a designer, I see step-by-step progress and audit results, then export the updated `.figmint-registry.json` via the unified export sheet (never a silent PR).

---

## Design reference _(when UI work applies)_

Components tab UI mock lives in the Figmint design file. **VQA execution** uses the locked [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) (`file_key=cVdPraIafWFBRZnzMPhtrW`) for the implemented plugin panel; link mock `node_id` during `/plan` when the design frame is identified.

---

## Requirements

### Functional

1. **`src/ui/tabs/Components.tsx`** — full tab UI; register in `App.tsx` as `AppTab` value `'components'` (nav between Bootstrap and Export).
2. **Registry entry path (UC-2):** When GitHub is connected (Settings), load `.figmint-registry.json` via `loadFromGitHub(repoUrl, registryPath)`; list `RegistryV1.components` keys; on select, resolve `component-spec.v1.json` from repo (`design/components/{key}.component-spec.v1.json` first, then `design/component-specs/{key}.v1.json`); surface clear error if spec file missing.
3. **Paste/load spec path (UC-3):** Reuse WO-006 ports (`SourcePasteTextarea`, `SourceFilePicker`, `ClipboardBanner`) — accept only `component-spec` or `registry` kinds; reject tokens with actionable message.
4. **Spec preview + edit:** Show draft `ComponentSpecV1` with editable `variantMatrix`, `props[]`, `bindings[]` (JSON editor minimum); display variant cross-product count; validate against `componentSpec.v1` schema before enabling Scaffold.
5. **Scaffold orchestration:** `Scaffold` button sends `scaffold/run` to main thread; main runs `scaffold` → `applyBindings` → `applyProperties` → `buildUsageFrame` → registry merge (WO-022..026); stream `scaffold/progress`; terminal `scaffold/result` or `scaffold/error`.
6. **Progress + audit:** Reuse Bootstrap-style step list + `AuditPanel`; steps: geometry, bindings, properties, usage frame, registry update, component audit.
7. **Registry export:** On success, show `ExportSheet` with `{ kind: 'registry', payload: RegistryV1 }`; default path `.figmint-registry.json`; sinks: download + GitHub PR when connected (FR-SCAF-6, never silent apply).
8. **Pass `registry` into scaffold** when loaded — required for composed archetypes (WO-022).

### Visual / UX

- Match Bootstrap tab inline styles (11px Inter, tab button pattern from `App.tsx`) until token-bound UI chrome ships.
- Disable registry section when GitHub disconnected; link to Settings.
- `role="progressbar"` on scaffold progress; failed audit rules expanded first.

### Technical / architectural

- **New modules:** `src/io/messages/scaffold.ts`, `src/core/components/scaffold/runScaffold.ts`, `src/ui/components/scaffold/*` (progress reducer).
- **Lift reference:** None — PRD-designed UI; patterns from WO-015 Bootstrap orchestration research.
- **Dependencies:** WO-006 (ingest), WO-016 (GitHub read), WO-020 (export sheet), WO-022, WO-023, WO-024, WO-025, WO-026 (pipeline). WO-010 (audit display).

---

## Acceptance criteria _(definition of done)_

- [ ] Designer can scaffold a known shadcn component (e.g. Button) in **<5s** from registry pick on Plugin Sandbox (variables bootstrapped first).
- [ ] Designer can paste a **canonical** `component-spec.v1.json` (locked selector grammar per WO-023) and scaffold it.
- [ ] Phase 2 GA: `scaffold/result.totalDurationMs` p50 **<5s** on VQA matrix (G2).
- [ ] Post-scaffold export sheet opens with valid `RegistryV1`; designer must confirm export (no auto-PR).

## Out of scope

- Import-from-repo flow (Sprint 8 / WO-044).
- Code Connect PR emission (Sprint 8).
- Bulk scaffold (one component per run).
- Formal `src/ops/` dispatcher (inline orchestrator OK for Phase 2).

---

## Testing & verification

### Functional QA

- Vitest: `scaffold/*` message guards, progress reducer, ingest kind filter, variant count preview.
- Integration: mock main-thread scaffold handler; ExportSheet opens on `scaffold/result`.

### Visual / design QA

- Figma VQA: plugin **Components** tab panel vs design mock (when `node_id` linked); sandbox `file_key` pre-filled below.

### Accessibility

- Tab `aria-current`; progress `aria-valuenow`; export actions keyboard-reachable.

### Telemetry / observability

- `console.debug` per scaffold progress event in UI iframe; `pluginLog()` on main thread.

---

## Figma VQA Checklist

**Figma source (filled before `/vqa` runs):**

| Field           | Value                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `file_key`      | `cVdPraIafWFBRZnzMPhtrW`                                                                                   |
| `node_id`       | `<!-- design mock frame — fill during /plan when linked; panel-only VQA OK without -->`                    |
| Figma deep link | `https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox`                                       |
| Frame / scope   | Figmint plugin window — **Components** tab (panel chrome; canvas ComponentSet = subsystem spot-check)      |
| Captured at     | `<!-- ISO date at /vqa -->`                                                                                |

**Precondition:** Bootstrap `bootstrap-complete` fixture run once in same file session so WO-023 bindings resolve.

**Assertions** _(agent fills `Design (Figma)` and `Build (implemented)` columns during `/vqa`):_

| #   | Category      | Property                         | Design (Figma) | Build (implemented) | Result |
| --- | ------------- | -------------------------------- | -------------- | ------------------- | ------ |
| 1   | Layout        | Tab nav includes **Components**  |                |                     |        |
| 2   | Layout        | Entry: registry + paste sections |                |                     |        |
| 3   | Layout        | Spec preview panel visible       |                |                     |        |
| 4   | Typography    | Section headings 13px semibold   |                |                     |        |
| 5   | Color         | Active tab background `#f0f0f0`  |                |                     |        |
| 6   | Interaction   | Scaffold CTA disabled until valid|                |                     |        |
| 7   | Interaction   | Progress step list on run        |                |                     |        |
| 8   | Interaction   | Export sheet after success       |                |                     |        |
| 9   | Accessibility | Tab `aria-current`               |                |                     |        |
| 10  | Accessibility | Progress `role="progressbar"`    |                |                     |        |
| 11  | Canvas        | ComponentSet on Components page  |                |                     |        |

**Per-row deviations:**

- _Filled by `/vqa` with FAIL rationale._

---

## 🔍 Ready for `/research`

- ✅ Complete — see [components-tab-forward-flow](research/components-tab-forward-flow.md).

## 📋 Ready for `/plan`

- Research locks message contract, pipeline order, ingest paths, and VQA strategy.
- `/plan` must verify WO-022..026 plans are non-stub before build agents run.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §5.2–5.3, §6.2, §12 Phase 2 exit
- Research: [components-tab-forward-flow](research/components-tab-forward-flow.md)
- Orchestration pattern: `.github/Sprint 3/WO-015-bootstrap-tab-ui-paste-file-progress-audit/research/bootstrap-tab-ui-orchestration.md`
- IO ingest: `.github/Sprint 2/WO-006-io-subsystem-foundation-paste-file-clipboard/research/io-subsystem-design.md`
- Pipeline: WO-022..026 research under `.github/Sprint 5/`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
