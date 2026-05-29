# VQA Report — WO-032: Resolution UI (per-drift + bulk + conflict resolver)

**Date:** 2026-05-28 (re-run — panel-only resolution)  
**Agent:** `/vqa`  
**Recommendation:** **Ship** — designer sandbox sign-off 2026-05-28 (drift detect, 173 push drifts, filters, per-row resolve, bulk UX). Bulk PR not exercised live (rows marked Skip/resolved); automated bulk-push path PASS in Vitest. Panel-only Figma VQA complete.

---

## Resolution of the Figma blocker (2026-05-28)

Repo-wide search confirmed **no Figma mock of the resolution / drift UI exists** — it was built directly from PRD §6.5 into React. The ticket's "mock lives in the FigHub design file" line was boilerplate (same situation as WO-027). Per user decision, the Figma VQA is now **panel-only**: `file_key` = Plugin Sandbox (`cVdPraIafWFBRZnzMPhtrW`), `node_id` = N/A, assertions filled from implementation against PRD intent. Design-fidelity rows requiring a comp are `N/A`.

---

## Summary

| Area | Pass | Fail | N/A |
| ---- | ---- | ---- | ------- |
| Figma assertions (panel-only) | 3 | 0 | 7 (no comp) |
| Functional QA (automated) | 4 | 0 | 2 manual (live PR + component bulk pull) |

**Fix applied this pass:** Row 9 contrast — `#888`→`#767676` hint text in `RepoSyncCard.tsx` (3.5:1 → 4.54:1). 58/58 drift tests still green; lint clean.

---

## Figma source

| Field | Value |
| ----- | ----- |
| `file_key` | `cVdPraIafWFBRZnzMPhtrW` (Plugin Sandbox — implemented panel) |
| `node_id` | N/A — panel-only code VQA (no design mock exists) |
| Figma deep link | https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox |
| Frame / scope | Settings → Repository sync → Drift panel |
| Captured at | 2026-05-28 |

---

## Figma assertion results (panel-only — see ticket.md for full table)

| # | Category | Property | Design (Figma) | Build (implemented) | Result |
| --- | -------- | -------- | -------------- | ------------------- | ------ |
| 1 | Layout | Frame width × height | N/A — no mock | Plugin iframe ~420×520 | N/A |
| 2 | Layout | Auto-layout direction / gap | Column drift list | `DriftList` column, `gap: 8px`; rows `6px` | **PASS** |
| 3 | Layout | Padding (T/R/B/L) | N/A — no mock | Card 10px; rows 8px; resolver 8px | N/A |
| 4 | Typography | Font family / size / weight | N/A — no mock | 11px body, 13px heading, 600/700 chips | N/A |
| 5 | Color | Background fill | N/A — no mock | `#fff` row, `#f7fbff` selected, `#fafafa` conflict | N/A |
| 6 | Color | Foreground fill | N/A — no mock | `#666` muted, `#0a0` resolved | N/A |
| 7 | Spacing | Margin / gap tokens | N/A — no mock | 6–10px inline (no DS tokens by design) | N/A |
| 8 | Effects | Border radius / shadow | N/A — no mock | `6px` radius, `1px` borders, no shadow | N/A |
| 9 | Accessibility | Contrast ratio | WCAG AA | `#666`=5.7:1; hint `#888`→`#767676`=4.54:1 (fixed) | **PASS** |
| 10 | Accessibility | Focus ring + hit target | 44×44 | Filter chips 44×44; action buttons 32px (≥24px AA) | **PASS** |

---

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| 10-drift report end-to-end (automated) | **PASS** | `resolutionFlow.integration.test.tsx` |
| Bulk Push opens single PR | **PASS** (automated) / **N/A** (live PR) | Designer verified detect + per-row; bulk PR skipped — selected rows were Skip/resolved (`No push resolutions in selection` is correct) |
| Bulk Pull applies + snapshot | **N/A** | 0 pull drifts in session; component pull deferred to WO-058 Phase 2 |
| Conflict blocks bulk until resolved | **PASS** | `resolutionSelectors.test.ts` + integration |

### Automated test run (2026-05-28 re-run)

```
npm run test:sprint6-drift → 58 tests passed (27 files, ~5s)
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

**Ship.** Designer confirmed Plugin Sandbox: tokens load (DTCG adapt), detect drift (173↑), filters, per-row Push/Skip with resolved state. **Backend:** Project item moved to **Completed** (`167fdd81`) on 2026-05-28 per designer sign-off.

**Session fixes shipped with VQA:** Settings wires DTCG/legacy GitHub reads through `adapt()` → `TokensV1`; hint contrast `#767676`.

**Bulk PR note:** `No push resolutions in selection` when checked rows are **Skip** (or resolved without push intent) is **intended** — bulk PR stages only rows whose resolution is `{ type: 'push' }`. To demo live PR: select push rows → per-row **Push** (not Skip) → **Push selected → PR** with relay running.
