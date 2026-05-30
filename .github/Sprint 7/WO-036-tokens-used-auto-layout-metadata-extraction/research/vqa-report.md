# VQA Report — WO-036: Tokens used + auto-layout metadata extraction

**Date:** 2026-05-29  
**Recommendation:** **Ship**

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
| Frame with bound tokens returns token path names | PASS | `tokens.test.ts` sorted paths |
| Auto-layout direction + gap + padding | PASS | Vertical/horizontal + bound/px fallback cases |
| Unit + integration tests | PASS | 10 tests across tokens.* |

**Automated command:** `npm run test -- tests/unit/core/handoff/tokens*.test.ts` — 10 passed.

## Failures detail

None.

## Artifacts

All N/A.

## Recommendation

**Ship.**
