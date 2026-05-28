# VQA Report — WO-016 GitHub OAuth integration (read + write PR)

**Date:** 2026-05-28  
**Agent:** `/vqa`  
**Recommendation:** **Send back to build**

---

## Summary

| Area             | Pass  | Fail | N/A                     |
| ---------------- | ----- | ---- | ----------------------- |
| Figma assertions | 0     | 0    | All (no Figma artifact) |
| Functional QA    | 2     | 3    | 1                       |
| **Overall**      | **2** | **3** | —                      |

Automated unit coverage is solid (316+ tests include OAuth modules), but **manual end-to-end VQA on the durable Settings UI is incomplete**. Plan Step 22 remains unchecked. Spike evidence (SPK-016-1) validated throwaway spike panel, not the shipped Settings tab.

---

## Figma source

**N/A** — subsystem ticket. Settings panel visual QA noted in Testing section (420×520 readability) — not executed this run.

---

## Figma assertion results

No assertion table — Figma N/A.

---

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| Device Flow OAuth end-to-end (desktop + browser) | **FAIL** | SPK-016-1 PASS on spike panel only; durable `Settings.tsx` not manually verified; SPK-016-2 (browser) still pending |
| Read `design/tokens.json` into valid `LoadedDocument` | **FAIL** | SPK-016-3 pending; `contents.test.ts` mocks relay only — no live repo read in Figma |
| Open PR with single file change | **FAIL** | `createPullRequestFlow.test.ts` mocks sequence; Settings "Test PR" not manually executed |
| Token persists across re-opens; Disconnect clears | **PASS** | `storage.test.ts` + message handlers; manual re-open not confirmed in Figma |
| Community build shows no GitHub UI | **N/A** | WO-021 deferred — single build; all GitHub UI visible |
| No `client_secret` in bundle/repo | **PASS** | `rg client_secret src/` — zero matches; relay-only HTTP |

### Plan Step 22 (manual VQA matrix)

| Step | Result | Note |
| ---- | ------ | ---- |
| Manual VQA matrix | **FAIL** | Unchecked in `plan.md` — requires relay + Figma desktop Settings tab |

### Automated test output

```
npm test — 374 passed (includes tests/unit/io/github/*, messages/github.test.ts)
npm run build — green
```

---

## Failures detail

| Failure | Owner | Suggested fix |
| ------- | ----- | ------------- |
| Device Flow on durable Settings (desktop + browser) | `/code-build` + manual | `npm run spike:oauth-relay` → rebuild → Settings tab Connect; repeat in figma.com |
| Live Contents API read smoke | manual | Settings "Test read" against repo with `design/tokens.json` |
| Live Test PR flow | manual | Settings Test PR against sandbox repo; verify PR URL |
| Plan Step 22 matrix | `/vqa` follow-up | Record results in `spike-github-oauth-results.md` or Step 22 table |

---

## Artifacts

| Artifact | Path | Status |
| -------- | ---- | ------ |
| Figma source screenshot | `research/figma-source.png` | N/A |
| Build screenshot | `research/build-screenshot.png` | Not captured — manual Settings pass required |
| Figma vs build overlay | `research/figma-vs-build.png` | N/A |

---

## Backend action

- **Backend:** GitHub
- **Issue:** [#19](https://github.com/JBabcock-DL/Figmint/issues/19)
- **Action:** Project item stays **In Build**; failure comment posted on issue
