---
type: work-order
github_issue: 30
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JPQ
blocked_by: WO-057
note: Forward-flow integration owner. UI preview render path will need extension for 5 sections in WO-057 Phase 3 Step 23. /vqa Ship gated on WO-057.
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
- As a designer, I see step-by-step progress and audit results, then export the updated `.fighub-registry.json` via the unified export sheet (never a silent PR).

---

## Design reference _(when UI work applies)_

Components tab UI mock lives in the FigHub design file. **VQA execution** uses the locked [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) (`file_key=cVdPraIafWFBRZnzMPhtrW`) for the implemented plugin panel; link mock `node_id` during `/plan` when the design frame is identified.

---

## Requirements

### Functional

1. **`src/ui/tabs/Components.tsx`** — full tab UI; register in `App.tsx` as `AppTab` value `'components'` (nav between Bootstrap and Export).
2. **Registry entry path (UC-2):** When GitHub is connected (Settings), load `.fighub-registry.json` via `loadFromGitHub(repoUrl, registryPath)`; list `RegistryV1.components` keys; on select, resolve `component-spec.v1.json` from repo (`design/components/{key}.component-spec.v1.json` first, then `design/component-specs/{key}.v1.json`); surface clear error if spec file missing.
3. **Registry path validation (remediation):** Reject JSON Schema paths (e.g. `*.schema.json`, `packages/contracts/dist/*`) with actionable copy — registry path must point to a **`RegistryV1` instance document** (`kind: "registry"`, `v: 1`), default `.fighub-registry.json` at repo root. Do not treat schema files as missing registry silently.
4. **Paste/load spec path (UC-3):** Reuse WO-006 ports (`SourcePasteTextarea`, `SourceFilePicker`, `ClipboardBanner`) — accept only `component-spec` or `registry` kinds; reject tokens with actionable message.
5. **Spec preview + edit:** Show draft `ComponentSpecV1` with editable `variantMatrix`, `props[]`, `bindings[]` (JSON editor minimum); display variant cross-product count; validate against `componentSpec.v1` schema before enabling Scaffold.
6. **Scaffold orchestration:** `Scaffold` button sends `scaffold/run` to main thread; main runs `scaffold` → `applyBindings` → `applyProperties` → `buildUsageFrame` → registry merge (WO-022..026); stream `scaffold/progress`; terminal `scaffold/result` or `scaffold/error`.
7. **Canvas output quality (remediation — depends WO-022/024):** Button canonical fixture (12 variants) must produce variant masters **≥ 48×32 px** on Components page; component property audit **6/6 pass** (`comp/prop-*` rules); not 1×1 collapsed masters.
8. **Progress + audit:** Reuse Bootstrap-style step list + `AuditPanel`; steps: geometry, bindings, properties, usage frame, registry update, component audit. Hide variable **Push stats** row when audit `scope === 'component'` (avoid misleading `created 0` beside property failures).
9. **Registry export:** On success, show `ExportSheet` with `{ kind: 'registry', payload: RegistryV1 }`; default path `.fighub-registry.json`; sinks: download + GitHub PR when connected (FR-SCAF-6, never silent apply).
10. **Pass `registry` into scaffold** when loaded — required for composed archetypes (WO-022).
11. **Usage frame expectation:** FR-SCAF-5 instance gallery lives on **Components** page (`{name}/usage-examples`). Foundations-style doc pages (properties table, matrix specimen, Do/Don't cards per v60 reference) are **out of scope** for WO-027 — label UI accordingly.

### Visual / UX

- Match Bootstrap tab inline styles (11px Inter, tab button pattern from `App.tsx`) until token-bound UI chrome ships.
- Disable registry section when GitHub disconnected; link to Settings.
- `role="progressbar"` on scaffold progress; failed audit rules expanded first.

### Technical / architectural

- **New modules:** `src/io/messages/scaffold.ts`, `src/core/components/scaffold/runScaffold.ts`, `src/ui/components/scaffold/*` (progress reducer).
- **Lift reference:** None — PRD-designed UI; patterns from WO-015 Bootstrap orchestration research.
- **Dependencies:** WO-006 (ingest), WO-016 (GitHub read), WO-020 (export sheet), WO-022, WO-023, WO-024, WO-025, WO-026 (pipeline). WO-010 (audit display).

---

## Open bugs — VQA follow-up _(2026-05-28; BUG-S5-001..004 resolved in code WO-057)_

**Register:** [designops-canvas-parity-bug-register.md](../research/designops-canvas-parity-bug-register.md)  
**Figma evidence (broken):** [Untitled sandbox](https://www.figma.com/design/Dw8NkEiG91NhjYqRPNTOOu/Untitled?node-id=5-193) — `file_key=Dw8NkEiG91NhjYqRPNTOOu`, `node_id=5:193`  
**DesignOps target:** [v60 Foundations Button](https://www.figma.com/design/uCpQaRsW4oiXW3DsC6cLZm/v60-updates-%E2%80%94-Foundations?node-id=433-335)

| Bug ID     | Status                        | Summary                                                            |
| ---------- | ----------------------------- | ------------------------------------------------------------------ |
| BUG-S5-001 | **Resolved in code (WO-057)** | Doc section STRETCH geometry + 1640px pipeline sections            |
| BUG-S5-002 | **Resolved in code (WO-057)** | `comp/doc-section-width` audit row                                 |
| BUG-S5-003 | **Resolved in code (WO-057)** | Do/Don't usage via `buildUsageNotes`; gallery removed              |
| BUG-S5-004 | **Resolved in code (WO-057)** | Full 5-section doc pipeline on forward scaffold                    |
| BUG-S5-006 | **Open**                      | Missing `_Header` / page chrome from `/new-project` on `↳ Buttons` |

**Next agent:** Run `/vqa WO-057` then `/vqa WO-027` on Plugin Sandbox. **Do not** move cards to Completed until Figma metadata + designer sign-off.

---

## Acceptance criteria _(definition of done)_

- [ ] Designer can scaffold a known shadcn component (e.g. Button) in **<5s** from registry pick on Plugin Sandbox (variables bootstrapped first).
- [ ] Designer can paste a **canonical** `component-spec.v1.json` (locked selector grammar per WO-023) and scaffold it.
- [ ] **Canvas remediation:** Button on **`↳ Buttons`** page matches DesignOps layout: `doc/component/button` **1640px** sections Hug correctly (no **1px width** on component-set-group, usage, or usage cells); property audit passes; usage readable (not sliver column).
- [ ] Phase 2 GA: `scaffold/result.totalDurationMs` p50 **<5s** on VQA matrix (G2).
- [ ] Post-scaffold export sheet opens with valid `RegistryV1`; designer must confirm export (no auto-PR).

## Out of scope

- Import-from-repo flow (Sprint 8 / WO-044).
- Code Connect PR emission (Sprint 8).
- Bulk scaffold (one component per run).
- Formal `src/ops/` dispatcher (inline orchestrator OK for Phase 2).
- **Repo-wide component discovery / multiselect scaffold** — see **Deferred product intent** below (not Phase 2 GA).

---

## Deferred product intent _(designer feedback 2026-05-28 — do not build in current remediation)_

Captured from manual VQA; full UX notes in [registry-ux-intent](research/registry-ux-intent.md).

**What the designer expected "Load registry" to mean:**

- After connecting GitHub, see **all components available in the codebase** (not only entries already in Figma).
- **Multiselect** components to scaffold in one session **without pasting** specs per component.

**What Phase 2 actually ships (UC-2):**

- **Load sync registry** → read `.fighub-registry.json` (**Figma ↔ repo sync ledger**: name → nodeId, version). Often **empty on first run**.
- Single-select from that list → resolve one `component-spec.v1.json` from fixed repo paths → preview → one scaffold.

**Future mapping (roadmap — committed):**

| Designer intent                                       | Roadmap ticket                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Discover specs in repo + multiselect + batch scaffold | **WO-056** (Sprint 8, Phase 4a) — [ticket](../../Sprint%208/WO-056-component-catalog-discovery-batch-scaffold/ticket.md) |
| Import React/source → spec                            | **WO-044** (UC-4)                                                                                                        |

**UX shipped (2026-05-28):** rename Load → **Load sync registry**; empty-state education; **Settings-only** repo URL + sync file path; paste section first. See [registry-ux-intent](research/registry-ux-intent.md) + [component-catalog-roadmap](../research/component-catalog-roadmap.md).

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

| Field           | Value                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `file_key`      | `cVdPraIafWFBRZnzMPhtrW`                                                                             |
| `node_id`       | N/A — panel-only code VQA (design mock not linked)                                                   |
| Figma deep link | `https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox`                                 |
| Frame / scope   | FigHub plugin window — **Components** tab (panel chrome; canvas ComponentSet = subsystem spot-check) |
| Captured at     | 2026-05-28                                                                                           |

**Precondition:** Bootstrap `bootstrap-complete` fixture run once in same file session so WO-023 bindings resolve.

**Assertions** _(agent fills `Design (Figma)` and `Build (implemented)` columns during `/vqa`):_

| #   | Category      | Property                          | Design (Figma)                                   | Build (implemented)                                                                                                    | Result |
| --- | ------------- | --------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Layout        | Tab nav includes **Components**   | Expected between Bootstrap and Export            | `App.tsx` — Components tab button + `'components'` state                                                               | PASS   |
| 2   | Layout        | Entry: registry + paste sections  | Registry pick + paste/load                       | `Components.tsx` — registry + SourcePaste/File sections                                                                | PASS   |
| 3   | Layout        | Spec preview panel visible        | Preview before scaffold                          | `SpecPreviewPanel` with variantMatrix/props/bindings JSON                                                              | PASS   |
| 4   | Typography    | Section headings 13px semibold    | 13px semibold                                    | `SECTION_HEADING` fontSize 13, fontWeight 600                                                                          | PASS   |
| 5   | Color         | Active tab background `#f0f0f0`   | `#f0f0f0`                                        | `App.tsx` active tab background `#f0f0f0`                                                                              | PASS   |
| 6   | Interaction   | Scaffold CTA disabled until valid | Disabled until schema OK                         | `validateComponentSpecDraft` gates button                                                                              | PASS   |
| 7   | Interaction   | Progress step list on run         | Step list during run                             | `ScaffoldStepList` + reducer; 7 steps                                                                                  | PASS   |
| 8   | Interaction   | Export sheet after success        | ExportSheet inline                               | Integration test `getByLabelText('Registry export')`                                                                   | PASS   |
| 9   | Accessibility | Tab `aria-current`                | Current tab marked                               | `aria-current={activeTab === 'components' ? 'page' : undefined}`                                                       | PASS   |
| 10  | Accessibility | Progress `role="progressbar"`     | Progressbar region                               | `ProgressBar` role="progressbar"                                                                                       | PASS   |
| 11  | Canvas        | ComponentSet on Components page   | 12-variant Button ≥ 48×32 px; property audit 6/6 | Pre-combine `applyPropertiesToVariants` + `normalizeVariantMastersInSet`; 112 scaffold tests green (2026-05-28 re-VQA) | PASS   |

**Per-row deviations:**

- Row 11 — prior FAIL (1×1 masters, 48 property add failures) remediated in WO-022/024. **Re-VQA 2026-05-28:** code + Vitest PASS. Optional designer spot-check: SPK-027-1 on Plugin Sandbox after `npm run build`.
- Tab persistence (Settings/GitHub, paste state) — **PASS** after keep-alive TabPanel fix.
- Figma MCP design-context sweep skipped — no design mock `node_id`; panel assertions verified from implementation + Vitest.

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
- Research: [scaffold-canvas-failure-remediation](research/scaffold-canvas-failure-remediation.md) — manual VQA C/D failures (2026-05-28)
- Research: [registry-ux-intent](research/registry-ux-intent.md) — sync registry vs codebase catalog; Settings placement ideation
- Orchestration pattern: `.github/Sprint 3/WO-015-bootstrap-tab-ui-paste-file-progress-audit/research/bootstrap-tab-ui-orchestration.md`
- IO ingest: `.github/Sprint 2/WO-006-io-subsystem-foundation-paste-file-clipboard/research/io-subsystem-design.md`
- Pipeline: WO-022..026 research under `.github/Sprint 5/`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
