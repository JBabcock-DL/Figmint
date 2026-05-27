# VQA Report — WO-008: Variable collection push engine (5 collections + modes)

**Date:** 2026-05-27  
**Reviewer:** `/vqa` agent  
**Overall recommendation:** **Completed** (2026-05-27 re-verification)

---

## Summary

| Area             | Pass | Fail | N/A                                      |
| ---------------- | ---- | ---- | ---------------------------------------- |
| Figma assertions | 0    | 0    | 1 (subsystem ticket — no Figma artifact) |
| Functional QA    | 5    | 0    | 0                                        |

**Result:** Live Figma UI push verified. Idempotent re-push: skipped 400, 490 ms, audit 16/16. See [push-bench-result.md](push-bench-result.md).

---

## Prior review (2026-05-27 build)

**Overall recommendation:** ~~**Send back to build**~~ — superseded by UI wiring + sandbox bench above.

| Area          | Pass | Fail | N/A |
| ------------- | ---- | ---- | --- |
| Functional QA | 2    | 3    | 0   |

**Gating failures (resolved):** UI push wiring, live sandbox verification, bench Step 27 — all closed.

---

## Figma source

**N/A** — subsystem ticket; ticket Figma VQA Checklist marked N/A (no Figma artifact).

---

## Figma assertion results

No assertion table — Figma VQA skipped per ticket sentinel.

---

## Functional QA results

| Acceptance criterion                                                             | Result   | Note                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical `TokensV1` → all 5 collections appear in Figma file with correct modes | **FAIL** | `pushTokens` implemented in `src/core/variables/push.ts` and covered by Vitest mocks (20/20 pass). **Not reachable from the plugin UI:** `src/main.ts` only handles `io/loaded` stub; no message handler calls `pushTokens`. Live sandbox push (`file_key=cVdPraIafWFBRZnzMPhtrW`) not executed in this VQA pass. |
| Re-running same input is a no-op (`skipped` > 0, `created` = 0, `updated` = 0)   | **FAIL** | Proven in mock orchestration (`push.test.ts` — "second identical run skips all variables"). **Not verified in live Figma file** — AC requires file-level idempotency; manual sandbox re-run pending.                                                                                                              |
| Bench: 400-variable Foundations-scale push **< 2 s** p50 on fresh sandbox        | **FAIL** | `src/core/variables/bench.ts` harness exists; plan Step 27 explicitly **pending manual VQA**. No bench result recorded; WO-005 extrapolation (~904 ms) is research-only, not a substitute for Step 27 execution.                                                                                                  |
| `runAudit('variables', …)` invoked after push; returns without breaking push     | **PASS** | `push.ts` L384–404 calls `readFigmaVariableState()` + `runAudit('variables', …)` after `commitUndo()`; returns `{ ...result, audit: auditReport }`. WO-010 real implementation wired (not stub).                                                                                                                  |
| `tsc --noEmit` clean                                                             | **PASS** | `npm run typecheck` exit 0.                                                                                                                                                                                                                                                                                       |

### Automated test output

```
npm test -- tests/unit/core/variables/
 Test Files  5 passed (5)
      Tests  20 passed (20)
```

Files: `collections.test.ts`, `compare.test.ts`, `modes.test.ts`, `push.test.ts`, `resolveTokens.test.ts`.

---

## Failures detail

| AC                           | Gap                                                                    | Suggested owner                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Live Figma 5-collection push | Engine exists; no UI/main-thread entry point to invoke push in sandbox | `/code-build` (wire `pushTokens` message handler in `main.ts` or defer to bootstrap tab ticket with explicit cross-ref) |
| Live idempotent re-run       | Mock-only proof; sandbox second-run not executed                       | `/code-build` + manual VQA in Figma desktop                                                                             |
| Bench < 2 s p50              | Step 27 not run; no `PUSH_BENCH_RESULT` log captured                   | Manual sandbox bench per plan Notes; record in `research/`                                                              |

---

## Artifacts

| Artifact             | Path | Status              |
| -------------------- | ---- | ------------------- |
| figma-source.png     | —    | N/A                 |
| build-screenshot.png | —    | N/A (no UI surface) |
| figma-vs-build.png   | —    | N/A                 |

---

## Recommendation

**Send back to build** — 3 gating functional failures.

**Top failures (priority order):**

1. **No plugin UI wiring** — `main.ts` does not expose `pushTokens`; designers cannot trigger a live push in the sandbox file.
2. **Manual sandbox push unverified** — AC requires 5 collections + correct modes in Figma; only mock Vitest coverage exists.
3. **Bench Step 27 not executed** — `< 2 s` p50 target has no recorded measurement on the 400-variable fixture.

**What already ships-quality:** collections/modes/compare/resolveTokens modules, five-pass orchestrator, alias resolution, idempotent skip logic (mock-proven), EVC gate, `runAudit` hook integration, 20 unit tests green, typecheck clean.

**Unblock path:** Wire a minimal dev/push message handler (or document dependency on a specific UI ticket), run sandbox push + re-run in `cVdPraIafWFBRZnzMPhtrW`, execute bench Step 27 and log results, then re-run `/vqa`.
