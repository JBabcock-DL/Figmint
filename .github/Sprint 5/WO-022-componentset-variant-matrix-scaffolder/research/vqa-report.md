# VQA Report — WO-022: ComponentSet variant matrix scaffolder

**Date:** 2026-05-28  
**Agent:** `/vqa` (functional QA only — Figma N/A)  
**Recommendation:** **Ship** (subsystem scope)

---

## Summary

| Area             | Pass | Fail | N/A                                 |
| ---------------- | ---- | ---- | ----------------------------------- |
| Figma assertions | 0    | 0    | All (subsystem — no Figma artifact) |
| Functional QA    | 4    | 0    | 0                                   |

**Full suite:** `npm test -- --run` → **574 passed** | 2 skipped (576 total)  
**WO-022 scoped:** 48 passed | 1 skipped (49 total) — variant matrix, archetypes, integration, idempotency, audit rows

---

## Sprint gate (memory.md)

**Integrated WO-027 sandbox sign-off still gates sprint-level Completed.** Subsystem automated criteria pass; do **not** move this card to **Completed** (`167fdd81`) until WO-027 forward-flow VQA is designer-signed. This run moves the project item to **In Review** (`594e69fa`) only.

---

## Figma source

**N/A** — no Figma artifact (subsystem ticket).

---

## Functional QA results

| Acceptance criterion                   | Result   | Note                                                                           |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| 3×2×2 axes → 12 children, Figma naming | **PASS** | `scaffold.integration.test.ts` — 12 variants, alphabetical `key=value` grammar |
| Each archetype integration test        | **PASS** | 8 archetype test files                                                         |
| Idempotent re-run                      | **PASS** | `idempotency.test.ts`                                                          |
| Audit reports cleanly                  | **PASS** | `auditRows.test.ts` + scaffold audit rows                                      |

### Remediation verification (SPK-027-3)

| Fix                                            | Result   | Evidence                                         |
| ---------------------------------------------- | -------- | ------------------------------------------------ |
| Chip `layoutSizingHorizontal/Vertical = 'HUG'` | **PASS** | `archetypes/chip.ts`                             |
| Post-combine `normalizeVariantMastersInSet()`  | **PASS** | `variantGeometry.ts` + `variantGeometry.test.ts` |

### Automated tests

```
npm test -- --run
→ 574 passed | 2 skipped (full suite)

WO-022 scoped (variantMatrix, archetypes, integration, idempotency, auditRows, …)
→ 48 passed | 1 skipped
```

**Deferred:** SPK-022-3 live sandbox variant grid (WO-027 integrated checklist).

---

## Failures detail

None.

---

## Artifacts

| Artifact             | Path | Status |
| -------------------- | ---- | ------ |
| figma-source.png     | —    | N/A    |
| build-screenshot.png | —    | N/A    |
| figma-vs-build.png   | —    | N/A    |

---

## Backend action

- **Backend:** GitHub — issue [#25](https://github.com/JBabcock-DL/FigHub/issues/25)
- **Project item:** `PVTI_lAHOD9B30s4BY4aYzgt5JKg`
- **Status:** **In Review** (`594e69fa`) — subsystem Ship; Completed blocked on WO-027 integrated sandbox
