# VQA Report — WO-023: Variable bindings application

**Date:** 2026-05-28  
**Agent:** `/vqa` (functional QA only — Figma N/A)  
**Recommendation:** **Ship** (subsystem scope)

---

## Summary

| Area             | Pass | Fail | N/A |
| ---------------- | ---- | ---- | --- |
| Figma assertions | 0    | 0    | All |
| Functional QA    | 4    | 0    | 0   |

**Full suite:** `npm test -- --run` → **574 passed** | 2 skipped (576 total)  
**WO-023 scoped:** 10 passed — `applyBindings` unit + integration + `componentBindings` audit rules

---

## Sprint gate (memory.md)

**Integrated WO-027 sandbox sign-off still gates sprint-level Completed.** Subsystem automated criteria pass; do **not** move this card to **Completed** (`167fdd81`) until WO-027 forward-flow VQA is designer-signed. This run moves the project item to **In Review** (`594e69fa`) only.

---

## Figma source

**N/A** — subsystem ticket.

---

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| 10 bindings on every variant, zero failures | **PASS** | `applyBindings.integration.test.ts` — 11 bindings × 2 variants |
| Missing variable → audit FAIL with selector | **PASS** | `comp/binding-variable-resolved` in integration + `componentBindings.test.ts` |
| Missing node → audit FAIL with selector | **PASS** | `comp/binding-node-resolved` |
| Chip-archetype integration fixture | **PASS** | `button-chip-bindings.v1.json` under `tests/fixtures/components/` |

### Automated tests

```
npm test -- --run
→ 574 passed | 2 skipped (full suite)

WO-023 scoped
→ 10 passed
```

**Deferred:** SPK-023-3 live sandbox bind (WO-027 integrated checklist).

---

## Failures detail

None for automated acceptance criteria.

---

## Artifacts

All N/A (no Figma surface).

---

## Backend action

- **Backend:** GitHub — issue [#26](https://github.com/JBabcock-DL/FigHub/issues/26)
- **Project item:** `PVTI_lAHOD9B30s4BY4aYzgt5JLk`
- **Status:** **In Review** (`594e69fa`) — subsystem Ship; Completed blocked on WO-027 integrated sandbox
