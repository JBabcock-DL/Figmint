# VQA Report — WO-058: GitHub-Desktop-style sync

**Date:** 2026-05-28  
**Agent:** `/vqa`  
**Recommendation:** **Ship (automated)** — designer Plugin Sandbox spot-check (plan Step 34) pending before **Completed**.

---

## Summary

| Area                      | Pass | Fail | Pending                   |
| ------------------------- | ---- | ---- | ------------------------- |
| Figma assertions          | —    | —    | **N/A** (ticket sentinel) |
| Functional QA (automated) | 14   | 0    | 4 (live Figma + OAuth)    |

**Backend action:** Project item moved to **In Review** (`594e69fa`) per user request — not **Completed** until Step 34 manual VQA.

---

## Figma source

**N/A** — ticket §Figma VQA Checklist: plugin UI iframe; functional QA only (no design comp).

| Field           | Value |
| --------------- | ----- |
| `file_key`      | N/A   |
| `node_id`       | N/A   |
| Figma deep link | N/A   |
| Captured at     | —     |

---

## Figma assertion results

Skipped (Step 1 → N/A).

---

## Functional QA results

| Criterion / test                                                  | Result                  | Note                                                                                            |
| ----------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| No `.fighub-registry.json` in `src/` or `packages/contracts/src/` | **PASS**                | `rg` zero matches                                                                               |
| `comp/registry-envelope` + `comp/registry-filekey` removed        | **PASS**                | `rg` zero matches in `src/`                                                                     |
| `fighubJson.v1.ts` contract                                       | **PASS**                | `packages/contracts/src/fighubJson.v1.ts` exported                                              |
| `fighubJson.ts` parse + defaults + malformed warning              | **PASS**                | `tests/unit/io/formats/fighubJson.test.ts`                                                      |
| Settings: Connect + repo card, no path inputs                     | **PASS**                | `Settings.tsx` — repo URL only; `RepoSyncCard` with Fetch/Pull/Push                             |
| Components: no "Load sync registry"                               | **PASS**                | `rg` zero matches                                                                               |
| Registry from canvas snapshot (callers)                           | **PASS**                | `snapshotStore` + scaffold/components paths                                                     |
| Push via OAuth relay + `buildPrBody`                              | **PASS**                | `handleGitHubRepoPush` + `pluginLog push/started`, `push/pr-opened`                             |
| `doc-pipeline/fighub-config` preflight                            | **PASS**                | `tests/unit/audit/doc-fighub-config.test.ts`                                                    |
| WO-026 #29 closed superseded                                      | **PASS**                | Issue **CLOSED** `NOT_PLANNED`                                                                  |
| CI: `npm test`                                                    | **PASS**                | **664 passed**, 1 skipped                                                                       |
| CI: `npm run build`                                               | **PASS**                | `dist/` bundle green                                                                            |
| CI: `npm run typecheck`                                           | **FAIL** (pre-existing) | Test-file TS errors in drift/scaffold tests — not WO-058 regressions; Vitest suite still passes |
| Connect GitHub E2E (live)                                         | **PENDING**             | Designer — relay + Device Flow                                                                  |
| Fetch → last-synced updates                                       | **PENDING**             | Designer — Plugin Sandbox                                                                       |
| Pull → tokens cached for drift                                    | **PENDING**             | Designer — after Fetch + Pull                                                                   |
| Push → PR URL surfaces                                            | **PENDING**             | Designer — relay + org token                                                                    |
| Scaffold zero registry-envelope/filekey FAIL                      | **PENDING**             | Designer — Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW`                                              |
| A11y 44×44 Fetch/Pull/Push                                        | **PASS** (code)         | `RepoSyncCard.tsx` `minHeight: 44`, `minWidth: 44`                                              |

### Automated test run (2026-05-28)

```
npm run test → 664 passed | 1 skipped (174 files)
npm run build → green (dist/code.js 683 kB)
```

---

## Failures detail

None for automated functional QA.

**Non-blocking:** `npm run typecheck` reports errors in unrelated test fixtures (`loadDriftReport.test.ts`, `Components.scaffold.integration.test.tsx`, `scaffoldProgressReducer.test.ts`). Track separately; does not block WO-058 Ship on automated path.

---

## Artifacts

| Artifact             | Path                                    |
| -------------------- | --------------------------------------- |
| figma-source.png     | N/A                                     |
| build-screenshot.png | N/A (no dev-server screenshot workflow) |
| figma-vs-build.png   | N/A                                     |

---

## Recommendation

**Ship (automated).** All automatable acceptance criteria pass. **Gating manual work:** plan Step 34 (Fetch/Pull/Push + scaffold audit in Plugin Sandbox). Card stays **In Review** until designer signs off Step 34, then re-run `/vqa` or say **WO-058: Complete** to move to **Completed** (`167fdd81`).

**Top manual checks (Step 34):**

1. Connect → **Fetch latest** → last-synced updates
2. **Pull design system** → drift detect works (tokens loaded)
3. **Push updates** → PR URL in UI
4. Scaffold Button → no `comp/registry-envelope` / `comp/registry-filekey` FAIL

---

## Backend action

- **Backend:** GitHub — issue [#62](https://github.com/JBabcock-DL/FigHub/issues/62)
- **Project item:** `PVTI_lAHOD9B30s4BY4aYzguFtLg`
- **Status:** **In Review** (`594e69fa`) — 2026-05-28
