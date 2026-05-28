# VQA Report — WO-024: Component property definitions

**Date:** 2026-05-28  
**Agent:** `/vqa` (functional QA only — Figma N/A)  
**Recommendation:** **Ship** (subsystem scope)

---

## Summary

| Area             | Pass | Fail | N/A |
| ---------------- | ---- | ---- | --- |
| Figma assertions | 0    | 0    | All |
| Functional QA    | 4    | 0    | 1   |

**Full suite:** `npm test -- --run` → **574 passed** | 2 skipped (576 total)  
**WO-024 scoped:** 13 passed — `applyProperties` unit + integration + `componentRules` + pre-combine timing

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
| `loading` boolean default false | **PASS** | `applyProperties.test.ts` + integration |
| VARIANT axes validated (WO-022 creates) | **PASS** | `variantPropsValidate` via integration |
| Chip Button fixture + implicit props | **PASS** | `component-spec-button-chip.v1.json` integration |
| `ApplyPropertiesResult` soft-fail | **PASS** | `componentRules.test.ts` S9.5–S9.9 |
| SPK-024-3 sandbox designer panel | **N/A** | Covered by WO-027 end-to-end sandbox gate |

### Remediation verification (SPK-027-2)

| Fix | Result | Evidence |
| --- | ------ | -------- |
| Pre-combine `applyPropertiesToVariants()` in `scaffold()` | **PASS** | `index.ts` before `combineAsVariants`; `applyPropertiesPreCombine.test.ts` |
| Post-combine validate-only when defs exist | **PASS** | `applyProperties.ts` `componentSetHasNonVariantProperties` |

### Automated tests

```
npm test -- --run
→ 574 passed | 2 skipped (full suite)

WO-024 scoped
→ 13 passed
```

---

## Failures detail

None.

---

## Artifacts

All N/A.

---

## Backend action

- **Backend:** GitHub — issue [#27](https://github.com/JBabcock-DL/Figmint/issues/27)
- **Project item:** `PVTI_lAHOD9B30s4BY4aYzgt5JMY`
- **Status:** **In Review** (`594e69fa`) — subsystem Ship; Completed blocked on WO-027 integrated sandbox
