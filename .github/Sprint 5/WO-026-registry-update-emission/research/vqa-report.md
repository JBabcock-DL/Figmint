# VQA Report — WO-026: Registry update emission

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
**WO-026 scoped:** 22 passed | 1 skipped (23 total) — `registry`, `registryAuditRows`, `registryExport`

---

## Sprint gate (memory.md)

**Integrated WO-027 sandbox sign-off still gates sprint-level Completed.** Subsystem automated criteria pass; do **not** move this card to **Completed** (`167fdd81`) until WO-027 forward-flow VQA is designer-signed. This run moves the project item to **In Review** (`594e69fa`) only.

---

## Figma source

**N/A** — subsystem; ExportSheet UX covered by WO-020 + WO-027 integration.

---

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| New Button → registry entry with `nodeId` | **PASS** | `registry.test.ts` greenfield upsert |
| Re-scaffold → version increment, no duplicate | **PASS** | version 1→2 test |
| `RegistryV1` schema validation | **PASS** | AJV gate on fixtures + upsert output |
| Merge, fileKey guard, legacy normalize | **PASS** | SPK-026-1/2/3 covered in unit tests |
| End-to-end ExportSheet in Components tab | **N/A** | WO-027 owns; WO-026 API verified in isolation |

### Automated tests

```
npm test -- --run
→ 574 passed | 2 skipped (full suite)

WO-026 scoped
→ 22 passed | 1 skipped
```

---

## Failures detail

None.

---

## Artifacts

All N/A.

---

## Backend action

- **Backend:** GitHub — issue [#29](https://github.com/JBabcock-DL/FigHub/issues/29)
- **Project item:** `PVTI_lAHOD9B30s4BY4aYzgt5JOI`
- **Status:** **In Review** (`594e69fa`) — subsystem Ship; Completed blocked on WO-027 integrated sandbox
