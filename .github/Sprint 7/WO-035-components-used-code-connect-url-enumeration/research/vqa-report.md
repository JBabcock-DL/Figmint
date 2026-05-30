# VQA Report — WO-035: Components used + Code Connect URL enumeration

**Date:** 2026-05-29  
**Recommendation:** **Ship** (with manual follow-up)

## Summary

| Area | Pass | Fail | N/A |
|------|------|------|-----|
| Figma assertions | 0 | 0 | 1 |
| Functional QA | 3 | 0 | 0 |

## Figma source

**N/A** — subsystem ticket.

## Functional QA results

| Acceptance criterion | Result | Note |
| -------------------- | ------ | ---- |
| 4× Button + 2× Card instance counts | PASS | `components.test.ts` aggregation case |
| Code Connect URLs where mapped | PASS | Mock `getDevResourcesAsync` returns GitHub URL; field omitted when unmapped |
| Unit + integration tests | PASS | 12 tests in walk + components |

**Automated command:** `npm run test -- tests/unit/core/handoff/walk.test.ts tests/unit/core/handoff/components.test.ts` — 12 passed.

## Failures detail

None for automated QA. **SPK-035-1** (runtime dev-resources on DS file `Dw8NkEiG91NhjYqRPNTOOu`) not executed — recommend during designer smoke; not a code defect if dev resources differ from mocks.

## Artifacts

All N/A (no Figma UI artifact).

## Recommendation

**Ship.** Code path verified in CI. Schedule SPK-035-1 on a frame with known Code Connect mapping before GA sign-off.
