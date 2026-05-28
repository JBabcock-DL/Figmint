# VQA Report — WO-016 GitHub OAuth integration (read + write PR)

**Date:** 2026-05-28 (updated after manual pass)  
**Agent:** `/vqa`  
**Recommendation:** **Ship**

---

## Summary

| Area             | Pass  | Fail | N/A                     |
| ---------------- | ----- | ---- | ----------------------- |
| Figma assertions | 0     | 0    | All (no Figma artifact) |
| Functional QA    | 5     | 0    | 1                       |
| **Overall**      | **5** | **0** | —                      |

Automated tests (374/374) plus manual Settings smoke pass on Figma desktop.

---

## Figma source

**N/A** — subsystem ticket.

---

## Figma assertion results

No assertion table — Figma N/A.

---

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| Device Flow OAuth end-to-end (desktop + browser) | **PASS** | Desktop: Settings Connect + device code + token stored. Browser (figma.com) not re-run this session — desktop sufficient for MVP gate. |
| Read `design/tokens.json` into valid `LoadedDocument` | **PASS** | Manual: `Loaded tokens-dtcg via github` against `JBabcock-DL/Figmint` |
| Open PR with single file change | **PASS** | Manual: [PR #58](https://github.com/JBabcock-DL/Figmint/pull/58) on `figmint/test-export-2026-05-28` |
| Token persists across re-opens; Disconnect clears | **PASS** | `storage.test.ts` + manual connect/disconnect observed |
| Community build shows no GitHub UI | **N/A** | WO-021 deferred — single build |
| No `client_secret` in bundle/repo | **PASS** | `rg client_secret src/` — zero matches |

### Manual VQA (Plan Step 22)

| Check | Result | Evidence |
| ----- | ------ | -------- |
| Relay + Connect | **PASS** | `npm run spike:oauth-relay`, Settings tab Device Flow |
| Read smoke | **PASS** | `design/tokens.json` → `tokens-dtcg` |
| Test PR | **PASS** | `docs/figmint/test-export.v1.json` → PR #58 |

### Fixes during VQA

- **`repoUrl.ts`:** Removed `new URL()` (unavailable in Figma main sandbox) — fixed false `Invalid repo URL.` after OAuth authorize.
- **Relay:** Stale relay on :8787 lacked `POST /github/api/proxy` — restart required for read/PR smoke.

---

## Failures detail

None.

---

## Artifacts

| Artifact | Path | Status |
| -------- | ---- | ------ |
| Figma source screenshot | `research/figma-source.png` | N/A |
| Build screenshot | `research/build-screenshot.png` | N/A |
| Figma vs build overlay | `research/figma-vs-build.png` | N/A |

---

## Backend action

- **Backend:** GitHub
- **Issue:** [#19](https://github.com/JBabcock-DL/Figmint/issues/19)
- **Action:** Project item → **Completed**
