---
type: work-order
github_issue: 13
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5I80
---

## Goal

Implement the audit pass that runs after every variable push (and later, every canvas build and component scaffold). Reports counts, drift, and rule violations inline so designers see failures immediately rather than silently passing.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-8.

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

1. **`packages/contracts/src/auditReport.v1.ts`** — versioned output contract (`v: 1`, `kind: 'audit-report'`) with `AuditRuleResult`, `AuditReportSummary`, and `AuditReportV1`. Export from `@detroitlabs/fighub-contracts`; regenerate JSON Schema via WO-003 wiring.
2. **`src/core/audit/runAudit.ts`** — `runAudit('variables', { canonical, pushResult, figmaCollections })` returns `AuditReportV1`. Sprint 2 implements `variables` scope only; `canvas` / `component` throw until later sprints.
3. **`src/core/audit/readFigmaVariableState.ts`** — main-thread Plugin API read → normalized `FigmaCollectionSnapshot[]` (mode IDs mapped to mode names). Rules consume snapshots, not live Figma handles.
4. **Rule engine** — one module per rule under `src/core/audit/rules/` (pure functions). Port Sprint 2 rules from `14-audit.md` Variables & codeSyntax section + WO-055 canonical integrity checks (see research rule catalog — 16 rules).
5. **`resolveTokens()` integration** — import from `src/core/variables/resolveTokens.ts` (WO-008) for alias-graph and literal value-equality rules only; do not re-implement alias walking.
6. **Push hook** — WO-008 `push.ts` calls audit synchronously after commit; returns `{ ...PushResult, audit: AuditReportV1 }`. Callers bubble failures via `audit.passed === false` (push `errors[]` stays operational-only).
7. **Summary fields** — `AuditReportSummary` includes `variablesCreated/Updated/Skipped`, `modeCoverage` per collection, and `codeSyntaxCoverage` per platform (`WEB` / `ANDROID` / `iOS`).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket (WO-015 reads `audit` JSON)._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` — Variables & codeSyntax bullets only (Sprint 2); canvas rules defer to Sprint 3
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — iOS dot-segment format rule
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/06-audit-checklist.md` — component-scaffold audit rules (Sprint 5)
- **Not the same as drift:** `driftReport.v1.ts` is 3-way Figma ↔ repo diff; audit validates post-operation correctness vs canonical input.
- **Dependencies:** WO-008 (push hook + `resolveTokens`), WO-055 (canonical `TokensV1` shape), WO-009 (shared codeSyntax derivation for match rules)

---

## Acceptance criteria _(definition of done)_

- [ ] After a variable push, `AuditReportV1.summary` reports variables created/updated/skipped, mode coverage per collection, and codeSyntax coverage per platform.
- [ ] A simulated rule failure (fixture: canonical token missing a mode value) produces `audit.passed === false` with `var/mode-value-present` FAIL and a one-line diagnostic naming the mode.
- [ ] Sprint 2 ships JSON serialization of `AuditReportV1` only; GFM markdown rendering deferred to WO-019 (add WO-010 as dependency when planning WO-019).
- [ ] Vitest unit tests cover rule logic with fixture JSON (no live Figma in CI).
- [ ] `tsc --noEmit` clean.

## Out of scope

- Component-scaffold audit (Sprint 5 WO-022..WO-027 reuses this engine).
- Canvas audit (Sprint 3 reuses this).
- Realtime audit while building — runs only at the end of an operation.
- GFM markdown formatter (Sprint 4 WO-019).

---

## Testing & verification

### Functional QA

- Vitest unit tests cover the acceptance criteria above (`tests/fixtures/audit/`, `tests/unit/audit/`).

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

- ✅ Complete — see [Post-push audit rules](research/post-push-audit-rules.md).

## 📋 Ready for `/plan`

- Dependencies: WO-008, WO-055, WO-009 (codeSyntax derivation for match rules).
- `plan.md` should lock rule module list, contract shape, and push integration before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-8
- [Post-push audit rules](research/post-push-audit-rules.md)
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` — audit checklist + rule set to port as code
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/06-audit-checklist.md` — component-scaffold audit rules (reused in Sprint 5)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
