# VQA Report — WO-032: Resolution UI (per-drift + bulk + conflict resolver)

**Date:** 2026-05-28  
**Agent:** `/vqa`  
**Recommendation:** **Send back (Figma sweep pending)** — functional automated AC **PASS**; designer manual + Figma source required to close.

---

## Summary

| Area | Pass | Fail | Pending |
| ---- | ---- | ---- | ------- |
| Figma assertions | 0 | 0 | 10 (no `file_key` / `node_id` in ticket) |
| Functional QA (automated) | 4 | 0 | 3 manual (Figma desktop + OAuth PR) |

---

## Figma source

| Field | Value |
| ----- | ----- |
| `file_key` | **MISSING** — ticket says mock lives in "FigHub design file"; no URL provided |
| `node_id` | **MISSING** |
| Figma deep link | **MISSING** |
| Frame / scope | Settings → Repository sync → Drift panel |
| Captured at | — |

**VQA blocked Steps 2–4** until designer supplies resolution UI mock node URL (or confirms Plugin Sandbox panel-only comparison).

---

## Figma assertion results (build side captured from code)

| # | Category | Property | Design (Figma) | Build (implemented) | Result |
| --- | -------- | -------- | -------------- | ------------------- | ------ |
| 1 | Layout | Frame width × height | _pending_ | Plugin iframe ~420×520 (Vite UI) | **PENDING** |
| 2 | Layout | Auto-layout direction / gap | _pending_ | `flexDirection: column`, `gap: 10px` (`DriftPanel`) | **PENDING** |
| 3 | Layout | Padding (T/R/B/L) | _pending_ | Card `padding: 10px` (`RepoSyncCard`) | **PENDING** |
| 4 | Typography | Font family / size / weight | _pending_ | 11px body, 13px headings, 600 weight buttons | **PENDING** |
| 5 | Color | Background fill | _pending_ | `#fff` rows, `#f7fbff` selected, `#fafafa` conflict panel | **PENDING** |
| 6 | Color | Foreground fill | _pending_ | `#666` muted, `#8a1f1f` errors, `#0a0` resolved | **PENDING** |
| 7 | Spacing | Margin / gap tokens | _pending_ | 6–10px gaps inline (no DS tokens in plugin UI) | **PENDING** |
| 8 | Effects | Border radius / shadow | _pending_ | `borderRadius: 6px`, `1px solid #ddd` | **PENDING** |
| 9 | Accessibility | Contrast ratio | _pending_ | Error text `#8a1f1f` on white — verify manually | **PENDING** |
| 10 | Accessibility | Focus ring + hit target | _pending_ | Filter chips `minHeight/minWidth: 44px` (`DriftList`) | **PENDING** |

---

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| 10-drift report end-to-end (automated) | **PASS** | `resolutionFlow.integration.test.tsx` |
| Bulk Push opens single PR | **PENDING** | Requires OAuth + live Figma (designer) |
| Bulk Pull applies + snapshot | **PENDING** | Variable path ready; component pull needs `repoSpecs` preload |
| Conflict blocks bulk until resolved | **PASS** | `resolutionSelectors.test.ts` + integration |

### Automated test run (2026-05-28)

```
npm run test:sprint6-drift → 58 tests passed
```

---

## Failures detail

| Item | Deviation | Owner |
| ---- | --------- | ----- |
| Figma source empty | Cannot run MCP design pull or assertion PASS/FAIL | Designer → paste mock URL into `ticket.md` |
| Bulk PR smoke | Not run in CI | Designer in Figma desktop |
| Component bulk pull | Settings does not preload `repoSpecs` | WO-058 Phase 2 or manual spec load |

---

## Artifacts

| Artifact | Path |
| -------- | ---- |
| figma-source.png | Not captured (missing source) |
| build-screenshot.png | Not captured (no dev-server screenshot in workflow) |
| figma-vs-build.png | Not captured |

---

## Recommendation

**Send back (partial)** — stay **In Review** until designer completes manual Figma checklist below. Functional code is ready.

**Backend:** Project item `PVTI_lAHOD9B30s4BY4aYzgt5JUE` remains **In Review**.
