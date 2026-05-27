# Bootstrap bench result (WO-015 Phase 2 / G1)

> **Status:** Stub — full bootstrap bench requires live Figma plugin run with `spike-400` fixture.
> **Date:** 2026-05-27
> **Target:** G1 full bootstrap **< 30 000 ms** on 400-variable spike fixture.

## Automated proxy (Vitest)

Unit tests do not execute Figma API calls. CI validates orchestration contract only.

## Manual bench procedure

1. Load **spike-400** bench fixture in Bootstrap tab.
2. Run **Bootstrap design system** (full canvas — `skipCanvas` not set).
3. Record `totalDurationMs` from completion banner.
4. Capture step-level `elapsedMs` from progress rows.

## Budget math (from plan)

| Phase              | Expected                      |
| ------------------ | ----------------------------- |
| Variable push      | ~490–900 ms (WO-008 measured) |
| Publish typography | < 2 s                         |
| Canvas 6 pages     | < 18 s theoretical (6 × 3 s)  |
| Canvas audit       | < 2 s                         |
| **Total headroom** | < 30 s G1 target              |

## Results

| Run                  | totalDurationMs | push-variables | canvas steps | audit-canvas | Pass G1? |
| -------------------- | --------------- | -------------- | ------------ | ------------ | -------- |
| _pending manual run_ | —               | —              | —            | —            | —        |

## Notes

- Record environment: Figma desktop vs browser, file size, cold vs warm plugin load.
- If any canvas step errors, note in `canvasErrors` from `bootstrap/result`.
