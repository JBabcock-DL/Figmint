---
type: work-order
github_issue: 18
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JBc
---

## Goal

Wire up the Bootstrap tab of the plugin UI: paste / file picker / clipboard sources flow into the push engine + canvas builders, with progress reporting and inline audit display. This is the first end-user-visible Sprint 1 → Sprint 3 integration.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-_, §6.8 FR-IO-_.

---

## Problem story

As a designer, I want to paste or pick a `tokens.json`, preview what Figmint detected, press one button, and watch the plugin push variables, build the style-guide canvas, and show me any audit failures — without leaving the Bootstrap tab.

---

## User stories

- [ ] As a designer, I can load tokens via paste, file picker, or clipboard banner and see a preview before committing.
- [ ] As a designer, I can press **Bootstrap design system** once to run variable push + all style-guide pages.
- [ ] As a designer, I see a progress bar with per-step status while bootstrap runs.
- [ ] As a designer, I see audit pass/fail counts inline and can expand failed rules or copy the audit JSON.

## Design reference _(when UI work applies)_

Bootstrap tab UI mock — first end-user-visible Figmint surface. Design lives in the Figmint design file (`file_key` to be assigned during `/plan`).

---

## Requirements

### Functional

1. **`src/ui/tabs/Bootstrap.tsx`** — full Bootstrap tab UI; extract (do not duplicate) the existing source/adapt/push prototype currently inlined in `src/ui/App.tsx`.
2. **Tab shell in `App.tsx`** — minimal tab navigation with Bootstrap as the default (only) tab for this ticket; future tabs (Components, Sync, Handoff) stay out of scope.
3. **Source picker** — reuse WO-006 UI components (`SourcePasteTextarea`, `SourceFilePicker`, `SourceDropZone`, `ClipboardBanner`) wired to `LoadedDocument` → `adapt()` (WO-007).
4. **Token preview panel** — before CTA: show port/kind, collection count, token count, mode names; block bootstrap on non-token contracts or `FormatError`.
5. **Primary CTA: "Bootstrap design system"** — sends `bootstrap/run { tokens }` to main thread (supersedes standalone `push/variables` for this tab).
6. **Main-thread orchestrator** — sequential steps: `pushTokens` (WO-008) → canvas builders (WO-011 color/theme, WO-012 typography/overview, WO-013 layout/effects) → audit (WO-010 variables now; canvas when available). Stream `bootstrap/progress` after each step boundary.
7. **Progress UI** — determinate progress bar + per-step status rows (`pending` / `running` / `done` / `error` / `skipped`); message contract in `src/io/messages/bootstrap.ts` (see research).
8. **Audit inline display** — render `AuditReportV1`: summary counts, failed/warn rules first in expandable list, Copy JSON + Dismiss actions; do not flatten audit into push error strings.
9. **Bench** — record full bootstrap `totalDurationMs` on 400-variable input; target **<30 s** (PRD G1). Log to `research/bootstrap-bench-result.md`.

### Visual / UX

- Progress bar: `role="progressbar"` with `aria-valuenow` / `aria-valuemax`.
- Audit failures: visible without scrolling on typical plugin height (420×520); failed rules use alert styling.
- Hide dev bench-fixture controls from the Bootstrap tab (keep behind dev flag or remove from tab).

### Technical / architectural

- **Lift reference (DesignOps-plugin):** _None — new UI; orchestration mirrors PRD §8.1 `ops-program.v1` op sequence in memory only._
- **Dependencies:** WO-006 ✅, WO-007 ✅, WO-008 ✅, WO-010 ✅ (variables scope). **Blocking for full AC:** WO-011, WO-012, WO-013 (canvas builders), WO-014 (helpers). Plan may split Phase 1 (variables + progress shell) vs Phase 2 (canvas steps).
- **Defer:** `src/ops/` formal dispatcher (Sprint 4); FR-BOOT-9 ops audit log sink (WO-017+).

---

## Acceptance criteria _(definition of done)_

- [ ] Designer can paste a `tokens.json` and complete a full bootstrap (5 collections + style guide canvas) in one button press.
- [ ] Progress bar updates in real time via `bootstrap/progress` messages.
- [ ] Audit failures appear inline with per-rule drill-down; designer can dismiss or copy audit JSON.
- [ ] Bench: full bootstrap on a 400-variable input completes **<30 s** (PRD G1 target).

## Out of scope

- GitHub OAuth source (Sprint 4 WO-016).
- Output sinks (Sprint 4 WO-017+).
- Components / Sync / Handoff tabs.
- Ops audit log emission (FR-BOOT-9).

---

## Testing & verification

### Functional QA

- Vitest: bootstrap message guards, progress state reducer, audit panel sorting.
- Manual: paste → preview → bootstrap → audit drill-down in Plugin Sandbox.

### Visual / design QA

- Figma VQA when design file is assigned during `/plan`.

### Accessibility

- Progress bar ARIA; audit expand/collapse keyboard reachable; focus ring on primary CTA.

### Telemetry / observability

- `console.debug` per major UI event; `pluginLog()` on main thread (never `console.debug` in `code.js`).

---

## Figma VQA Checklist

**N/A — no Figma artifact (plugin UI iframe; no separate design file assigned).** Functional QA covers Bootstrap tab via Vitest + manual Plugin Sandbox smoke documented in `research/bootstrap-phase1-smoke.md`.

**Assertions:** N/A — no Figma design reference to compare against.

---

## 🔍 Ready for `/research`

- ✅ Complete — see [Bootstrap tab UI orchestration](research/bootstrap-tab-ui-orchestration.md).

## 📋 Ready for `/plan`

- ✅ Complete — see [plan.md](plan.md) (334 lines; requirement traceability + Build Agents Phases 1–3). Phase 1 shippable without canvas builders.

## 🛠️ Ready for `/build`

- Phase 1: `/code-build` anytime (push + progress shell). Phase 2: after canvas builder APIs land.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-_, §6.8 FR-IO-_, §8.1 `ops-program.v1`, G1 latency
- [Bootstrap tab UI orchestration](research/bootstrap-tab-ui-orchestration.md)
- WO-006: [IO subsystem design](../../Sprint%202/WO-006-io-subsystem-foundation-paste-file-clipboard/research/io-subsystem-design.md)
- WO-008 bench: [push-bench-result.md](../../Sprint%202/WO-008-variable-collection-push-engine-5-collections-modes/research/push-bench-result.md)
- WO-010: [post-push audit rules](../../Sprint%202/WO-010-audit-reporter-post-build-validation/research/post-push-audit-rules.md)
- Lift reference: _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
