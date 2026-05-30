# VQA Report — WO-059: Handoff Figma file key resolution

**Date:** 2026-05-29  
**Recommendation:** **Ship** (automated); manual Plugin Sandbox smoke optional on your side

## Summary

| Area | Pass | Fail | N/A |
|------|------|------|-----|
| Figma assertions (code VQA) | 10 | 0 | 0 |
| Functional QA (automated) | 4 | 0 | 0 |
| Manual Plugin Sandbox | — | — | **Not run by agent** |

## Figma source

**N/A** — no Figma design frame. Panel-only code VQA (WO-027 / WO-038 precedent).

## Figma assertion results

| # | Property | Result |
|---|----------|--------|
| 1 | enablePrivatePluginApi dev/org | PASS |
| 2 | Resolution precedence | PASS |
| 3 | URL + bare key parse | PASS |
| 4 | Capture uses resolved key | PASS |
| 5 | Build meta uses capture key | PASS |
| 6 | Settings file key section | PASS |
| 7 | Invalid input rejected | PASS |
| 8 | Handoff file-key status | PASS |
| 9 | Settings hint when none | PASS |
| 10 | Message contract | PASS |

Full table in `ticket.md`.

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| Dev manifest + saved file → auto fileKey/deep links | PASS | `enablePrivatePluginApi` in manifest.json/org; capture/build tests with native key |
| Community path → Settings override → deep links | PASS | `resolveFileKey.test.ts` override capture; handlers save URL |
| Invalid input rejected; clear removes override | PASS | `figmaFileKeyHandlers.test.ts` |
| Vitest parse, precedence, warnings, save/load | PASS | 40 tests in WO-059 suite |

**Command run:** `npm run test -- tests/unit/core/figma tests/unit/main/figmaFileKeyHandlers.test.ts tests/unit/ui/tabs/Handoff.test.tsx tests/unit/core/handoff/captureSelection.test.ts tests/unit/core/handoff/build.test.ts` — **40 passed** (2.50s).

## Failures detail

None (automated).

## Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| figma-source.png | `research/figma-source.png` | N/A — no design mock |
| build-screenshot.png | `research/build-screenshot.png` | N/A — no plugin dev-server screenshot |
| figma-vs-build.png | `research/figma-vs-build.png` | N/A |

## Recommendation

**Ship** on automated evidence. Move to **Completed** on Project #9 ([#73](https://github.com/JBabcock-DL/FigHub/issues/73)).

### Optional manual smoke (your side)

1. `npm run build` → re-import `dist/manifest.json`
2. **Auto path:** Saved [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) → Handoff → Capture → export shows `figmaFileKey: cVdPraIafWFBRZnzMPhtrW` + deep links
3. **Fallback path:** Settings → paste sandbox URL → Save → Capture on unsaved file → deep links still work
