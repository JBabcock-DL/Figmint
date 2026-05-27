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

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/core/variables/collections.ts` — idempotent find-or-create the five collections by display name (`Primitives`, `Theme`, `Typography`, `Layout`, `Effects`); single snapshot from `getLocalVariableCollectionsAsync()` at push start.
2. `src/core/variables/modes.ts` — reconcile modes per collection per locked table (Primitives/Layout: `Default`; Theme/Effects: `Light`+`Dark`; Typography: `85`…`200` with default renamed to `100`).
3. `src/core/variables/push.ts` — orchestrator; accepts `TokensV1`, runs five sequential passes (Primitives → Theme → Typography → Layout → Effects), returns `PushResult` `{ created, updated, skipped, errors, passes, totalDurationMs }`.
4. Alias resolution — structured `{ aliasOf: { collection, name } }` → `{ type: 'VARIABLE_ALIAS', id }` via runtime `varMap`/`primMap` built in dependency order; error if target missing.
5. Idempotent re-run — compare values (RGBA 0–1, literals, alias ids) + `codeSyntax` per platform; identical input → `skipped` only, zero writes.
6. `setVariableCodeSyntax` called from `push.ts` only; triples from `token.codeSyntax` or `deriveCodeSyntax(token)` in WO-009's `codeSyntax.ts` (stub until WO-009 lands).
7. EVC projection behind `evcEnabled` flag (default off) + `isEnterprise()` plan-gate probe; `tokens.themes[]` → `extend()` on Theme/Effects only — never Typography.
8. Invoke `runAudit('variables', { tokens, pushResult })` at end of push (WO-010 stub until that ticket lands); audit failures bubble per caller options.
9. **End-to-end push wiring (in scope for this ticket):** after a successful WO-006 source load + WO-007 `adapt()`, the designer can trigger a live variable push from the plugin UI — not a throwaway dev-only handler.
10. `src/main.ts` — handle `push/variables` UI → main messages: accept canonical `TokensV1`, call `pushTokens()`, post `push/result` back with `PushResult` + `AuditReportV1`.
11. `src/ui/App.tsx` — after a valid token document loads, show **Push variables** (enabled when `adapt()` yields `TokensV1`); display push counts, errors, audit pass/fail summary, and `totalDurationMs` (for bench Step 27).
12. Re-push uses the same loaded `TokensV1` snapshot so idempotent re-run is exercisable from the UI without reloading the source.

### Visual / UX

Minimal push surface on the existing Sources panel (button + status text). Full Bootstrap tab layout, multi-step progress bar, and canvas orchestration remain **WO-015**.

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` — **primary lift** (Plugin API create/find, modes, values, aliases; drop REST codeSyntax split)
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md` — 5-collection model + mode counts
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md` — per-collection mode lists (data via WO-007 `TokensV1`, not parsed at runtime)
- **Do NOT lift:** `step-15a-primitives.mcp.js` (canvas reader only); WO-005 spike `src/spike/**` (rates only in research)
- **Dependencies:** WO-002, WO-003, WO-007 (input), WO-055 (canonical shape), WO-009 (codeSyntax derivation), WO-010 (audit)
- **Sandbox:** `file_key=cVdPraIafWFBRZnzMPhtrW` (Pro/Org); EVC override tests deferred to Enterprise follow-up
- **ES2017-safe main thread:** no `?.` / `??` / `replaceAll`; bench timing via `Date.now()`

---

## Acceptance criteria _(definition of done)_

- [x] A canonical `TokensV1` input with all 5 collections populated → all 5 collections appear in the Figma file with correct modes (**via the plugin UI push path**, not mock-only).
- [x] Re-running the same input is a no-op (`skipped` > 0, `created` = 0, `updated` = 0) — **verified in live Figma** by clicking Push variables twice on the same loaded document.
- [x] Bench: 400-variable Foundations-scale push completes **<2 s** p50 on a fresh sandbox file (WO-005 extrapolation ~904 ms); timing visible from UI or `console.debug` after push. **Recorded:** 490 ms idempotent re-push — [push-bench-result.md](research/push-bench-result.md).
- [x] `runAudit('variables', …)` invoked after push; returns without breaking push; audit summary shown inline in the UI.
- [x] Designer flow: paste or pick a token file → adapt succeeds → Push variables → collections + audit feedback appear without manual dev tooling.
- [x] `tsc --noEmit` clean.

## Out of scope

- Style-guide canvas building (Sprint 3 WO-011..WO-013).
- codeSyntax derivation rules (WO-009) — push only calls the mapper.
- Audit rule implementation detail (WO-010) — push only invokes `runAudit` and surfaces summary.
- **Full Bootstrap tab UX** (WO-015): tab shell, multi-step progress, canvas builders in one button press, G1 full-bootstrap bench.
- Step 11 close Doc/\* text styles + Effect styles publish.

---

## Testing & verification

### Functional QA

- Vitest unit tests cover engine modules; live Figma sandbox verification covers end-to-end push, idempotent re-run, and bench Step 27.

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

- ✅ Complete — see [variable-push-engine-design.md](research/variable-push-engine-design.md)

## 📋 Ready for `/plan`

- Dependencies: WO-002, WO-003, WO-007, WO-055.
- Research locks module boundaries, idempotency, modes, alias order, EVC gate, bench target.
- `plan.md` should lock implementation details + `## Build Agents` before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-3..6
- Research: [Variable push engine design](research/variable-push-engine-design.md)
- Research: [Push `not a function` error investigation](research/push-not-a-function-error.md)
- Research: [Push bench result (Step 27)](research/push-bench-result.md)
- Canonical model: `.github/Sprint 1/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md`
- WO-005 latency: `.github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/latency-benchmark.md`
- WO-005 EVC: `.github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/extended-collections.md`
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`
  - `Docs/lift-sources.md` §0 (drift corrections)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
