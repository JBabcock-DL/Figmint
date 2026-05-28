# WO-008 push bench result (Step 27)

**Date:** 2026-05-27  
**Fixture:** WO-005 `spike-400` (400 primitives color tokens via bench loader)  
**Environment:** FigHub community build (`dist/manifest.json`), live Figma plugin UI push path  
**Target:** p50 push **< 2 s** on 400-variable Foundations-scale input (ticket AC)

## Recorded run

| Field                 | Value                                                                   |
| --------------------- | ----------------------------------------------------------------------- |
| **Run type**          | Idempotent re-push (variables already present from prior push attempts) |
| **Created**           | 0                                                                       |
| **Updated**           | 0                                                                       |
| **Skipped**           | 400                                                                     |
| **Errors**            | 0                                                                       |
| **Audit**             | Passed (16 rules)                                                       |
| **`totalDurationMs`** | **490 ms**                                                              |

## Verdict

| Criterion                                                       | Result            |
| --------------------------------------------------------------- | ----------------- |
| Push completes via UI without fatal error                       | **PASS**          |
| Idempotent re-run (`skipped` > 0, `created` = 0, `updated` = 0) | **PASS**          |
| Bench timing < 2 s                                              | **PASS** (490 ms) |
| Audit invoked and summary shown                                 | **PASS**          |

## Notes

- First successful end-to-end UI push was blocked by `console.debug` on the Figma main-thread sandbox (not implemented — threw `TypeError: not a function` after a successful push). Fixed with `pluginLog()` → `console.log` in main-thread modules (`src/core/pluginLog.ts`). See [push-not-a-function-error.md](push-not-a-function-error.md).
- This recorded run confirms **re-push idempotency + timing + audit** on the WO-008 engine. Variables were already in the file from earlier attempts; a fresh-file `Created 400` run is optional follow-up but not required for bench timing on re-push.

## References

- Plan Step 27: `../plan.md`
- WO-005 spike baseline (606 ms median, primitives-only): `../../Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/spike-execution-log.md`
