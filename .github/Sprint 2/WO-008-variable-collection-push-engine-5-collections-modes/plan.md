# Plan — WO-008: Variable collection push engine (5 collections + modes)

## Approach

Implement a deterministic, Plugin-API-only push engine under `src/core/variables/` that consumes canonical `TokensV1` (from `@detroitlabs/fighub-contracts` once WO-055 lands) and writes the five Foundations collections in strict dependency order. The engine snapshots local Figma state once at push start, reconciles collections and modes idempotently, then runs five sequential variable passes (Primitives → Theme → Typography → Layout → Effects) with runtime `varMap` alias resolution. Value and `codeSyntax` equality gates skip redundant writes on re-run. WO-009 and WO-010 integrate via compile-time stubs (`deriveCodeSyntax`, `runAudit`) replaced in place when those tickets merge. Main-thread code stays ES2017-safe (`esbuild` target `es2017`; no `?.` / `??` / `replaceAll`; `Date.now()` for timing). On per-variable or per-pass failures, **continue** the push and accumulate `errors[]` (do not abort remaining collections).

## Steps

### Foundation — types, constants, stubs

- [x] **Step 1** — Create `src/core/variables/` package layout: `types.ts`, `collections.ts`, `modes.ts`, `compare.ts`, `detectPlan.ts`, `resolveTokens.ts`, `push.ts`, and `index.ts` exporting `pushTokens`, `PushResult`, and shared types. Add `src/core/audit/runAudit.ts` stub (WO-010). **Skipped** `codeSyntax.ts` stub — WO-009 real `mapCodeSyntax` / `applyCodeSyntax` already landed.
- [x] **Step 2** — Implement `types.ts`: `PushError`, `CollectionPassResult`, `PushResult`, `PushOptions` (`evcEnabled?: boolean`, `continueOnAuditFail?: boolean` default `false`), `VarMaps`, `LocalVariableSnapshot` (`collectionByName`, `variableByKey`, raw arrays). Re-export `CollectionId`, `TokensV1`, `TokenV1`, `TokenAliasRef`, `CodeSyntaxPlatform` from `@detroitlabs/fighub-contracts` (WO-055 landed — no mirror).
- [x] **Step 3** — Add `collections.ts` constants: `COLLECTION_ORDER: CollectionId[]` = `['primitives','theme','typography','layout','effects']` and `DISPLAY_NAME: Record<CollectionId, string>` mapping to `Primitives`, `Theme`, `Typography`, `Layout`, `Effects` (Title Case, case-sensitive per research §3).
- [x] **Step 4** — ~~Stub `codeSyntax.ts`~~ **N/A (WO-009 pre-landed)** — `push.ts` imports `applyCodeSyntax` from real `codeSyntax.ts`; no stub written.
- [x] **Step 5** — Stub `src/core/audit/runAudit.ts` (WO-010): export `runAudit(scope: 'variables', ctx: { tokens: TokensV1; pushResult: PushResult })` returning a minimal pass-shaped object `{ passed: true, failures: [] }` typed loosely until `AuditReportV1` lands in contracts. No Figma reads in stub.
- [x] **Step 6** — Implement `detectPlan.ts`: `isEnterprise(): Promise<boolean>` using ephemeral `createVariableCollection('__fighub_evc_probe__')` + `extend('__probe__')` try/catch; treat message containing `enterprise plan` as non-Enterprise; always remove probe collection in `finally`. ES2017-safe error string extraction.

### Phase 1 modules — collections + modes (no variable writes)

- [x] **Step 7** — Implement `loadLocalVariableSnapshot()` inside `push.ts`: single `await figma.variables.getLocalVariableCollectionsAsync()` + `getLocalVariablesAsync()`; build `collectionByName` + `variableByKey` with key `` `${collection.id}:${variable.name}` ``. Never re-fetch inside the per-variable loop.
- [x] **Step 8** — Implement `collections.ts` — `ensureCollections(snapshot)`.
- [x] **Step 9** — Implement `modes.ts` — `COLLECTION_MODES` + `ensureModes(collections, tokens)`.
- [x] **Step 10** — Implement `compare.ts` — `valuesEqual`, `codeSyntaxEqual` (via `variable.codeSyntax`), `shouldSkipVariable`. No Figma writes.

### Phase 2 modules — push orchestrator + alias resolution

- [x] **Step 11** — Implement `resolveTokens.ts` — pure alias-graph walk + `sortTokensForPush` for intra-collection DAG order.
- [x] **Step 12** — Implement `resolveAliasAtPush` in `push.ts`: lookup `varMap`; on miss append `PushError` phase `'alias'` and return null.
- [x] **Step 13** — Implement `pushCollectionPass` in `push.ts`: five-pass filter, topological sort, find-or-create, `setValueForMode`, then **`applyCodeSyntax(variable, token)`** (WO-009 — no inline `setVariableCodeSyntax`); skip via `compare.ts`; per-variable try/catch → continue.
- [x] **Step 14** — Implement `pushTokens` orchestrator: snapshot → collections → modes → five passes → merge `varMap`; continue on pass-level errors.
- [x] **Step 15** — Optional EVC Phase 2 in `push.ts` behind `evcEnabled` + `isEnterprise()`; `theme` / `effects` parents only.
- [x] **Step 16** — End of `pushTokens`: `figma.commitUndo()`; `runAudit('variables', …)` hook; `totalDurationMs` via `Date.now()`.
- [x] **Step 17** — Wire `src/core/variables/index.ts` + `src/core/index.ts`. **`setVariableCodeSyntax` only via `applyCodeSyntax` in `codeSyntax.ts`** (push.ts does not call it directly). Prettier applied.

### Phase 3 — Vitest + bench harness

- [x] **Step 18** — **Pre-existing (WO-006)** — Vitest + `vitest.config.ts` + npm scripts already present; no bootstrap needed.
- [x] **Step 19** — Create `tests/unit/core/variables/__mocks__/figmaVariables.ts`.
- [x] **Step 20** — Unit tests for `compare.ts`.
- [x] **Step 21** — Unit tests for `modes.ts`.
- [x] **Step 22** — Unit tests for `collections.ts`.
- [x] **Step 23** — Unit tests for `resolveTokens.ts` + alias resolver.
- [x] **Step 24** — Unit tests for `pushTokens` orchestration (five-pass order, idempotent re-run, continue-on-failure, `applyCodeSyntax` spy).
- [x] **Step 25** — Add `src/core/variables/__fixtures__/foundations-minimal.v1.json`.
- [x] **Step 26** — Bench harness: `src/core/variables/bench.ts` with `runPushBench`, `PUSH_BENCH_RESULT` message type (UI wiring deferred to bootstrap tab ticket).
- [x] **Step 27** — **Done (2026-05-27)** — Live Figma idempotent re-push: skipped 400, 490 ms, audit 16/16 pass. See `research/push-bench-result.md`.
- [x] **Step 28** — CI hygiene: `typecheck`, `lint`, `format:check`, `test`, `build:community` all green locally. Vitest not added to CI workflow (per WO-004 scope).

### Phase 4 — End-to-end push wiring (UI ↔ main)

- [x] **Step 29** — Add shared UI ↔ main message types under `src/io/messages/push.ts`: `push/variables` (UI → main, carries `TokensV1`), `push/result` (main → UI, carries `PushResult` + `AuditReportV1`), `push/error` (adapt/validation failures). ES2017-safe type guards in `main.ts`; UI may use modern syntax.
- [x] **Step 30** — Wire `src/main.ts`: extend `onmessage` dispatch; on `push/variables`, call `pushTokens(tokens)` and `figma.ui.postMessage` with `push/result`; log `totalDurationMs` via `console.debug`.
- [x] **Step 31** — Wire `src/ui/App.tsx`: after WO-006 load, run WO-007 `adapt(payload)`; cache canonical `TokensV1`; enable **Push variables** when adapt succeeds; disable while push in flight.
- [x] **Step 32** — UI result panel: show created / updated / skipped / error count, audit passed + rules failed, and `totalDurationMs` (supports bench Step 27 without a separate dev hook).
- [x] **Step 33** — Re-push path: second click on Push variables reuses cached `TokensV1` (idempotency AC exercisable from UI).
- [x] **Step 34** — Optional **Load bench fixture** control: bundle or fetch WO-005 `spike-400`-scale fixture (or `foundations-minimal.v1.json` for smoke) so sandbox bench does not depend on an external file picker.
- [x] **Step 35** — Vitest: unit tests for message type guards + UI-side adapt gating (pure functions only; no Figma main-thread harness).
- [x] **Step 36** — CI hygiene after Phase 4: `typecheck`, `lint`, `format:check`, `test`, `build:community` all green.

## Build Agents

### Phase 1 (parallel)

- `code-build` — Steps 1–10: directory layout, `types.ts`, collection constants, WO-009/WO-010 stubs, `detectPlan.ts`, `compare.ts`, `collections.ts`, `modes.ts`, snapshot loader signature in `push.ts` (Step 7 body can be completed here or defer variable loop to Phase 2 — prefer complete snapshot + collections + modes in Phase 1).

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 11–17: `resolveTokens.ts`, `push.ts` orchestrator (five passes, alias resolution, codeSyntax call sites, EVC flag, audit hook, `commitUndo`, barrel exports, Prettier).

### Phase 3 (parallel, after Phase 2)

- `code-build` — Steps 18–28: Vitest wiring, unit tests (compare, modes, collections, resolveTokens, push), minimal fixture, bench harness + manual sandbox bench checklist execution.

### Phase 4 (after Phase 3 — VQA unblock)

- `code-build` — Steps 29–36: shared push message protocol, `main.ts` + `App.tsx` end-to-end wiring (Sources → adapt → push → audit feedback), re-push idempotency path, optional bench fixture control, message guard tests, CI green.

## Dependencies & Tools

| Dependency           | Role                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **WO-002**           | Plugin scaffold, `esbuild` `es2017` main target, `src/core/` layout                                           |
| **WO-003**           | `@detroitlabs/fighub-contracts` import path; `TokensV1` stub until WO-055 fills body                          |
| **WO-055**           | Canonical `TokensV1` / `TokenV1` types in `packages/contracts/src/tokens.v1.ts` — WO-008 mirrors until merged |
| **WO-007**           | Production-scale `TokensV1` fixtures for integration/bench (minimal fixture in Step 25 unblocks earlier)      |
| **WO-009**           | Replaces `deriveCodeSyntax` stub in `codeSyntax.ts`; push call sites unchanged                                |
| **WO-010**           | Replaces `runAudit` stub; push hook already wired in Step 16                                                  |
| **Figma Plugin API** | Variables only — no REST, no MCP                                                                              |
| **Vitest**           | New devDependency (Step 18) — not in WO-004 CI yet                                                            |
| **Manual Figma**     | Sandbox `cVdPraIafWFBRZnzMPhtrW` for bench Step 27                                                            |

**Lift sources (read, do not copy spike code):**

- `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md`
- `DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`
- `Docs/lift-sources.md` §0

**MCP:** Not required for build. Optional Figma MCP for human VQA screenshots only.

## Open Questions

1. **Abort vs continue on pass failure** — **RESOLVED for build:** **continue** with `errors[]`. Per-variable failures skip to next variable; per-collection pass failures log and proceed to next collection in `COLLECTION_ORDER`. Rationale: partial push leaves Primitives usable for debugging; matches research recommendation and user direction.
2. **Extra modes on re-run** — **RESOLVED:** leave orphan modes; do not call destructive mode APIs; WO-010 audit flags gaps.
3. **`PushResult` in contracts package** — **Deferred** until ops-program needs typed push results; keep in `src/core/variables/types.ts` for Sprint 2.
4. **`deriveCodeSyntax` vs WO-009 `mapCodeSyntax`** — WO-008 stub uses `deriveCodeSyntax` name per research; WO-009 build may rename to `mapCodeSyntax` — WO-009 replaces stub export and updates import in `push.ts` only (one-line change).

## Notes

### Locked decisions (from research)

- **Five-pass order:** Primitives → Theme → Typography → Layout → Effects; runtime `varMap` / `primMap` after each pass.
- **Idempotency:** single snapshot; key `(collectionId, variable.name)`; skip when values + codeSyntax match.
- **Modes:** exact name table in research §3; Theme uses `Light`/`Dark` (Title Case), not legacy lowercase.
- **Variable names:** slash paths only (`color/primary/500`); dots throw in Figma API.
- **codeSyntax:** only `push.ts` calls `setVariableCodeSyntax`; platforms `WEB` \| `ANDROID` \| `iOS`.
- **EVC:** `evcEnabled` default `false`; Typography never extends; Pro/Org sandbox skips Phase 2.
- **Performance:** WO-005 extrapolation ~904 ms full push; ticket bench **< 2 s** p50 at 400 vars; use `Date.now()` on main thread.

### ES2017 checklist (main-thread modules under `src/core/variables/` and `src/core/audit/runAudit.ts`)

- No optional chaining, nullish coalescing, or `replaceAll`
- Explicit null checks: `if (x !== undefined && x !== null)`
- Error messages via `String(e && e.message ? e.message : e)`

### Manual bench procedure (Step 27)

**Status (2026-05-27):** **Done** — idempotent re-push recorded in `research/push-bench-result.md` (490 ms, skipped 400, audit passed).

1. Open Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW` in Figma desktop.
2. Plugins → Development → Import plugin from manifest → load `dist/manifest.json` after `npm run build:community`.
3. Clear local variables (or new file).
4. Trigger push with 400-token fixture; capture `totalDurationMs` from bench UI or `console.debug`.
5. Re-run same input → expect `skipped > 0`, `created === 0`, `updated === 0`.
6. EVC Tests 2–4 remain **UNTESTED-ON-PLAN** on Pro/Org; Test 1 gate covered by `detectPlan.ts` unit test with mocked throw message.

### Prettier / git

- Run `npm run format` before handoff; user reviews uncommitted changes on `main` (no auto-commit per project git strategy).

### References

- Ticket: `./ticket.md`
- Research: `./research/variable-push-engine-design.md`
- Canonical model: `../../Sprint 1/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md`
- WO-005 latency: `../../Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/latency-benchmark.md`
- Sandbox: `memory.md` Figma sandbox file row
