# VQA Report — WO-020 Unified export sheet UI

**Date:** 2026-05-28  
**Agent:** `/vqa`  
**Recommendation:** **Ship**

---

## Summary

| Area             | Pass  | Fail | N/A                     |
| ---------------- | ----- | ---- | ----------------------- |
| Figma assertions | 0     | 0    | All (design frame TBD)  |
| Functional QA    | 4     | 0    | 1                       |
| **Overall**      | **4** | **0** | —                      |

Functional acceptance criteria pass via Vitest + RTL. Figma pixel comparison deferred until design frame assigned.

---

## Figma source

**N/A** — no design frame assigned (`file_key` TBD per ticket). Build follows Bootstrap inline conventions (`ExportSheet.tsx` — 11px Inter, `#ddd` border, `#0a6b0a` / `#b00020` status colors).

---

## Figma assertion results

No assertion table — Figma N/A (design deferred).

---

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| ExportSheet renders all six `ContractDocument` variants | **PASS** | `ExportSheet.test.tsx` — `it.each(ALL_EXPORT_FIXTURES)` |
| Five sinks when `flags.githubOAuth`; github-pr absent when off | **PASS** | `availableSinks.test.ts` + mocked `availableSinks` in ExportSheet test |
| Multi-sink parallel; partial failure per-sink | **PASS** | `runExport.test.ts` + ExportSheet partial ✓/✗ test |
| Path defaults per contract kind | **PASS** | `defaultPaths.test.ts` — 6 rows + component slug |
| Community build github-pr hidden | **N/A** | WO-021 deferred; gating tested via mock when OAuth off |

### Accessibility (Testing section)

| Check | Result | Note |
| ----- | ------ | ---- |
| Checkbox groups labeled | **PASS** | `<fieldset>` + `<legend>` Format / Destinations |
| Export/Cancel keyboard reachable | **PASS** | Native `<button>` elements |
| Per-sink status `role="status"` | **PASS** | `ExportSheet.tsx` line 195 |

### Automated test output

```
npm test — 374 passed (includes 11 ExportSheet component tests)
npm run build — green
```

---

## Failures detail

None.

---

## Artifacts

| Artifact | Path | Status |
| -------- | ---- | ------ |
| Figma source screenshot | `research/figma-source.png` | N/A — no design frame |
| Build screenshot | `research/build-screenshot.png` | N/A — no dev server; Plugin Sandbox manual optional |
| Figma vs build overlay | `research/figma-vs-build.png` | N/A |

---

## Backend action

- **Backend:** GitHub
- **Issue:** [#23](https://github.com/JBabcock-DL/Figmint/issues/23)
- **Action:** Project item → **Completed**
