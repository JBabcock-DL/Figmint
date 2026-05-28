# VQA Report — WO-025: Usage frame generator

**Date:** 2026-05-28  
**Agent:** `/vqa` (functional QA only — Figma N/A)  
**Recommendation:** **Ship** (subsystem scope)

---

## Summary

| Area             | Pass | Fail | N/A |
| ---------------- | ---- | ---- | --- |
| Figma assertions | 0    | 0    | 1 — `node_id` optional spot-check |
| Functional QA    | 4    | 0    | 0   |

**Full suite:** `npm test -- --run` → **574 passed** | 2 skipped (576 total)  
**WO-025 scoped:** 23 passed — `curateVariantCombos`, `usageFrameAudit`, `usageFrame.integration`

---

## Sprint gate (memory.md)

**Integrated WO-027 sandbox sign-off still gates sprint-level Completed.** Subsystem automated criteria pass; do **not** move this card to **Completed** (`167fdd81`) until WO-027 forward-flow VQA is designer-signed. This run moves the project item to **In Review** (`594e69fa`) only.

---

## Figma source

| Field | Value |
| ----- | ----- |
| file_key | `cVdPraIafWFBRZnzMPhtrW` |
| node_id | N/A — subsystem; spot-check during WO-027 sandbox |
| Captured at | 2026-05-28 |

Functional criteria do not require MCP screenshot when integration tests cover FR-SCAF-5. Visual spot-check deferred to WO-027 SPK-027-1.

---

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| 12 combos → 6 curated instances + labels | **PASS** | `usageFrame.integration.test.ts` |
| `curateVariantCombos` snapshot tests | **PASS** | 8 tests in `curateVariantCombos.test.ts` |
| Inline `comp/usage-*` audit | **PASS** | `usageFrameAudit` + integration |
| SPK-025-1 visual sandbox | **N/A** | End-to-end verified via WO-027 checklist |

### Automated tests

```
npm test -- --run
→ 574 passed | 2 skipped (full suite)

WO-025 scoped
→ 23 passed
```

---

## Failures detail

None.

---

## Artifacts

| Artifact | Status |
| -------- | ------ |
| figma-source.png | Not captured — subsystem |
| build-screenshot.png | N/A |
| figma-vs-build.png | N/A |

---

## Backend action

- **Backend:** GitHub — issue [#28](https://github.com/JBabcock-DL/FigHub/issues/28)
- **Project item:** `PVTI_lAHOD9B30s4BY4aYzgt5JNQ`
- **Status:** **In Review** (`594e69fa`) — subsystem Ship; Completed blocked on WO-027 integrated sandbox
