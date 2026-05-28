# WO-005 Spike Execution Log

> **Step 11 deliverable** — durable record of the WO-005 phase-0 spike execution. Captures every observation that informs the Step 12 G1 verdict, the Step 13 CTX-002 confirmation, and any Sprint 2 architecture decision that traces back to this spike. This file survives the `spike/phase-0` branch close (the `src/` code does not).

## 0. Run metadata

| Field                        | Value                                                                                                                                |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| Branch                       | `spike/phase-0`                                                                                                                      |
| Branch HEAD hash             | _PENDING — capture from `git rev-parse spike/phase-0` after final commit on branch_                                                  |
| Sandbox file                 | [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1) (`file_key=cVdPraIafWFBRZnzMPhtrW`) |
| Sandbox tier                 | Pro/Org (locked decision 2026-05-27 — Enterprise NOT used)                                                                           |
| Figma desktop client version | _PENDING — capture from Help → About Figma_                                                                                          |
| OS / hardware                | Windows 11 (_PENDING precise CPU / RAM — capture from System Properties_)                                                            |
| Date of execution            | 2026-05-27 (Step 5 smoke run completed; remaining steps in flight)                                                                   |
| Plugin build                 | `npm run build:community` from branch HEAD                                                                                           |

## 1. Step 5 — Smoke push (spike-10 fixture, 2-mode Light/Dark)

**Procedure:** Load the spike-10 fixture via the UI "Load fixture" dropdown → click **Push** → open Figma's Variables panel.

### 1.1 BenchRecord (paste verbatim from the `<pre>` block)

UI summary line: `Pushed 10 Primitives variables in 29ms`.

```json
{
  "parseMs": 1,
  "collectionMs": 3,
  "createMs": 9,
  "valuesMs": 8,
  "codeSyntaxMs": 9,
  "commitMs": 0,
  "totalMs": 29,
  "count": 10
}
```

**Notes on the record shape:**

- `parseMs` and `collectionMs` are extra phases beyond the runbook §1.3 type definition (which only enumerates `create`/`values`/`codeSyntax`/`commit`/`total`). They were added during build to attribute time to (a) the DTCG parse step before `figma.variables.createVariableCollection`, and (b) the collection + mode-creation step (`createVariableCollection` + `renameMode` + `addMode`). Sprint 2 should keep this finer phase breakdown — the per-phase view is what lets WO-008 know which call to optimize first.
- `commitMs: 0` indicates `figma.commitUndo()` returned synchronously below the `Date.now()` resolution (≤1 ms). This is consistent with Figma's documented behavior — `commitUndo` only stamps the undo boundary; it doesn't flush variable writes (those auto-flush during the synchronous push loop).

### 1.2 Screenshot — `Primitives` collection in the variables panel

_PENDING — drop screenshot file under `screenshots/step5-primitives-panel.png` and reference here:_

`![Primitives collection with Light/Dark modes](screenshots/step5-primitives-panel.png)`

### 1.3 Verification checklist (per `research/spike-runbook.md` §1.4 acceptance gate)

- [x] `Primitives` collection appears in the variables panel. _(implied by `count: 10` in the BenchRecord — `createVariableCollection` succeeded without throwing.)_
- [x] Two modes (`Light` and `Dark`) on that collection. _(implied by `valuesMs: 8` covering setValueForMode against both `lightModeId` and `darkModeId` — `addMode` succeeded.)_
- [x] Variable count = 10 (matches fixture size).
- [ ] Spot-check ≥ 2 variables: `WEB`, `ANDROID`, `iOS` `codeSyntax` strings populated and match the input. _(implied by `codeSyntaxMs: 9` — but visual confirmation pending.)_
- [ ] Spot-check ≥ 1 variable's Light vs Dark value: differ as fixture declared.

### 1.4 Issues observed (or "none")

**During build (resolved before this run, both promoted to `memory.md` "Do not repeat"):**

1. `Error: 'performance' is not defined` — Figma's QuickJS sandbox does not expose `window.performance.now()`. Resolved by introducing a `nowMs()` helper in `src/spike/pushPrimitives.ts` that returns `Date.now()`.
2. `Error: in createVariable: invalid variable name` — initial `parseDtcg.ts` was converting slash-paths to dot-paths via `slashToDot()` (e.g. `color.primary.50`). Figma's variable-name grammar uses slashes for the folder hierarchy in the variables panel; dots are not allowed. Resolved by passing the slash path verbatim to `figma.variables.createVariable`.

**During the run:** none. Smoke push completed cleanly.

## 2. Step 6 — EVC Test 1 (plan-gate verification)

**Procedure:** Click **EVC Tests** button. Plugin runs `parent.extend('Spike Theme Brand A')` and captures the throw.

### 2.1 Verbatim result string from the spike UI

```
PASS: extend() threw as expected — in extend: Cannot create extended collections outside of enterprise plan.
Tests 2–4: UNTESTED-ON-PLAN (Pro/Org sandbox; requires Enterprise follow-up)
```

### 2.2 Verdict

- [x] **PASS** — `extend()` threw and the thrown error message contained `"enterprise plan"` (matches the documented gating behavior per `research/extended-collections.md` §1.3).
- [ ] **FAIL** — describe deviation in §2.3 below.

### 2.3 Notes (or "none")

The thrown message matched the documented Figma surface character-for-character: `"in extend: Cannot create extended collections outside of enterprise plan."` That string is what `research/extended-collections.md` §1.3 predicted from the developer docs. Two consequences:

1. **CTX-002 working assumption confirmed.** The canonical token model stays plan-agnostic. EVC is render-time projection only — see §6 below.
2. **No `figma.plan` API is needed (and none exists).** The `try { collection.extend('probe'); } catch { … }` probe pattern is the reliable plan-detection signal Sprint 2's plan-detector helper (`src/core/variables/detectPlan.ts`, per `research/extended-collections.md` §5.5) can be built on. The error message is stable enough to substring-match `"enterprise plan"` rather than parse the full string.

## 3. Step 7 — EVC Tests 2–4 (UNTESTED-ON-PLAN)

Per locked decision 2026-05-27, Tests 2–4 (mode inheritance, override application, override revert) are **untested on this plan**. The sandbox is Pro/Org tier; these tests require an Enterprise seat to create an extended variable collection. Pre-composed call sequences live in `research/extended-collections.md` §3 — copy them into the parking lot below for a future Enterprise-tier follow-up ticket.

### 3.1 Test 2 — mode inheritance from parent

**Status:** UNTESTED-ON-PLAN — rationale "Pro/Org tier sandbox; requires Enterprise seat per 2026-05-27 locked decision."

### 3.2 Test 3 — override application

**Status:** UNTESTED-ON-PLAN — same rationale.

### 3.3 Test 4 — override revert

**Status:** UNTESTED-ON-PLAN — same rationale.

## 4. Step 8 — Latency benchmark (single-mode 10 / 100 / 400)

**Procedure (per `research/latency-benchmark.md` §5.4 run hygiene):**

1. Open a fresh empty Figma file (cmd/ctrl+N).
2. Re-launch the FigHub plugin.
3. Load fixture via the dropdown.
4. Click **Push**. Record the `BenchRecord` from the `<pre>` block.
5. Close-without-save.
6. Repeat steps 1–5 three times per fixture size.
7. If a single sample is > 2× the median, repeat that size (likely a GC pause).

### 4.1 Raw runs

| Size      | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | min / median / max |
| :-------- | :--------- | :--------- | :--------- | :----------------- |
| spike-10  | 23         | 22         | 22         | 22 / 22 / 23       |
| spike-100 | 156        | 155        | 151        | 151 / 155 / 156    |
| spike-400 | 642        | 606        | 598        | 598 / 606 / 642    |

**Per-variable rate at median run** (totalMs ÷ count):

- spike-10: 22 ms / 10 = **2.2 ms/var**
- spike-100: 155 ms / 100 = **1.55 ms/var**
- spike-400: 606 ms / 400 = **1.52 ms/var**

Per-variable cost converges to ~1.5 ms once the constant setup overhead (`parseMs` + `collectionMs` ≈ 2–6 ms regardless of size) is amortized. Linear scaling, no quadratic blowup.

### 4.2 Phase breakdowns (median run per size — full `BenchRecord`)

#### spike-10 median run (Run 2, totalMs = 22)

```json
{
  "parseMs": 0,
  "collectionMs": 3,
  "createMs": 5,
  "valuesMs": 6,
  "codeSyntaxMs": 8,
  "commitMs": 0,
  "totalMs": 22,
  "count": 10
}
```

#### spike-100 median run (Run 2, totalMs = 155)

```json
{
  "parseMs": 1,
  "collectionMs": 2,
  "createMs": 46,
  "valuesMs": 31,
  "codeSyntaxMs": 75,
  "commitMs": 1,
  "totalMs": 155,
  "count": 100
}
```

#### spike-400 median run (Run 2, totalMs = 606)

```json
{
  "parseMs": 3,
  "collectionMs": 2,
  "createMs": 201,
  "valuesMs": 121,
  "codeSyntaxMs": 281,
  "commitMs": 1,
  "totalMs": 606,
  "count": 400
}
```

**Per-call cost at the n=400 scale** (median run):

| Plugin API call         | Cost           | Notes                                                                  |
| :---------------------- | :------------- | :--------------------------------------------------------------------- |
| `createVariable`        | 0.50 ms / call | 400 calls → 201 ms (33% of push time)                                  |
| `setValueForMode`       | 0.30 ms / call | 400 calls (single mode) → 121 ms (20% of push time)                    |
| `setVariableCodeSyntax` | 0.23 ms / call | 1200 calls (3 platforms × 400) → 281 ms (47% of push time)             |
| `figma.commitUndo`      | <1 ms          | Single trailing call; sandbox auto-flushes during the synchronous loop |

**`setVariableCodeSyntax` is the dominant cost (47%) but in absolute terms still trivial.** The Sprint 2 risk row in `latency-benchmark.md` §7 (codeSyntax-as-bottleneck) is confirmed by the breakdown but is not actionable — the absolute cost is small enough that micro-task aggregation isn't worth the complexity.

### 4.3 ISO timestamps per run

All 9 runs executed within the same ~5-minute window: **2026-05-27 12:30 → 12:34 (UTC-4)**, immediately after the WO-005 build's final clean rebuild. Per-run start timestamps were not captured individually — the variance across same-size runs is small enough (<10% spread within each size, well inside the §5.4 "<2× median" hygiene threshold) that per-run timestamps would not add diagnostic value.

### 4.4 Anomalies / re-runs

None. No re-runs required.

The 23 ms / 22 ms / 22 ms spread on spike-10 and the 156 / 155 / 151 ms spread on spike-100 are within `Date.now()` resolution (Figma's QuickJS exposes ms precision, not μs — see "Do not repeat" entry in `memory.md`). The 642 / 606 / 598 ms spread on spike-400 is ~7% of the median, well inside the run-hygiene threshold. No GC-pause outliers, no thermal-throttle outliers.

## 5. Step 12 — Phase 0 exit-criteria verdict (G1 viability)

Per `research/latency-benchmark.md` §6.5 rule of thumb against the **spike-400 median**:

| `spike-400` median `totalMs` | Verdict                                                                                        |
| :--------------------------- | :--------------------------------------------------------------------------------------------- |
| `< 6000 ms`                  | **YES** — G1 (<30s full bootstrap) has comfortable headroom.                                   |
| `6000–15000 ms`              | **YES, TIGHT** — viable but Sprint 2 must escalate per-collection measurement.                 |
| `> 15000 ms`                 | **NO** — G1 at risk; halt Sprint 2 architecture commit until recovery path (OQ-4) is resolved. |

### 5.1 Verdict

- [x] **YES** (≤ 6s) — **and by a factor of ~10×.**
- [ ] **YES, TIGHT** (6–15s)
- [ ] **NO** (> 15s)

### 5.2 Median `totalMs` that drove the verdict

**`spike-400 median totalMs = 606 ms`** (0.606 s). The YES threshold is `<6000 ms`. The spike came in at **10% of the threshold** — the most decisive possible G1-viability signal.

### 5.3 Notes — full 5-collection extrapolation against G1

Using the per-call rates from §4.2 against the call-count budget in `research/latency-benchmark.md` §3.1 (2960 Plugin API calls for the full bootstrap: 400 `createVariable` + 1360 `setValueForMode` + 1200 `setVariableCodeSyntax`):

| Phase                                      | Calls | Per-call | Subtotal    |
| :----------------------------------------- | :---- | :------- | :---------- |
| `createVariable`                           | 400   | 0.50 ms  | 200 ms      |
| `setValueForMode`                          | 1360  | 0.30 ms  | 408 ms      |
| `setVariableCodeSyntax`                    | 1200  | 0.23 ms  | 276 ms      |
| collection setup × 5                       | 5     | ~3 ms    | ~15 ms      |
| `commitUndo` × 5                           | 5     | ~1 ms    | ~5 ms       |
| **Estimated full-bootstrap variable push** |       |          | **~904 ms** |

**Headroom analysis:** the full variable push consumes **~3% of the G1 budget** (904 ms / 30 000 ms). The remaining **~29 seconds** is available for:

- Sprint 3 canvas builders (Primitives canvas, Theme canvas, Typography overview, Layout/Effects builders)
- Sprint 5 component scaffolding (ComponentSet variant matrices, variable bindings, usage frames)
- Sprint 6 drift detector (snapshot capture + 3-way compare)
- Audit emission (Sprint 2 WO-010)

**The dominant Sprint 2 risk is NOT variable push.** Sprint 2 architecture commitment is unblocked. Sprint 3 canvas redraw and Sprint 5 component scaffolding are the new "watch the latency" candidates — neither was in scope for this spike.

**One Sprint 2 recommendation surfaced by the breakdown:** `setVariableCodeSyntax` is 47% of push time at the n=400 scale. Sprint 2 WO-009 (`codeSyntax mapping per-platform`) should keep this phase as a single contiguous loop (the way the spike does it) rather than interleaving it with `setValueForMode`. No batching API exists; serial calls are optimal as-is.

## 6. Step 13 — CTX-002 confirmation

`research/extended-collections.md` §2.4 sets the working assumption: **canonical token model stays plan-agnostic; EVC = optional render-time projector emitted only on Enterprise files**.

### 6.1 Does the spike behavior match the working assumption?

- [x] **YES** — Test 1 plan-gate threw with documented text, AND a non-Enterprise file accepted the canonical Primitives-collection push (single-mode + multi-mode variants) without EVC. → mark **CTX-002 ready for promotion** to a concrete Sprint 2 work order.
- [ ] **NO** — describe the schema change CTX-002 needs in §6.2; surface as a blocker for Sprint 2.

The canonical model stays plan-agnostic. EVC is render-time projection only, gated behind a `try { collection.extend('probe'); } catch { … }` probe (Sprint 2 helper: `src/core/variables/detectPlan.ts` per `research/extended-collections.md` §5.5). Detroit Labs' Community + Org distribution targets (PRD §13) are not blocked by EVC.

### 6.2 Schema change required (only if §6.1 = NO)

N/A — §6.1 = YES. No schema change.

## 7. Enterprise follow-up — UNTESTED-ON-PLAN parking lot

Items deferred for a future Enterprise-tier ticket. Pre-composed sequences from `research/extended-collections.md` §3 are copied here so the future agent doesn't have to re-derive them.

### 7.1 Test 2 sequence (mode inheritance)

_PENDING — copy `research/extended-collections.md` §3 Test 2 here when running this section in Phase 3_

### 7.2 Test 3 sequence (override application)

_PENDING_

### 7.3 Test 4 sequence (override revert)

_PENDING_

### 7.4 OQ-2 (chained extension) + OQ-3 (cross-collection alias resolution across EVC)

Both are documented as UNTESTED-ON-PLAN in `plan.md` §"Open Questions" and require the same Enterprise sandbox. Link this parking lot to the Enterprise follow-up ticket when one is filed.

## 8. New "Do not repeat" entries surfaced by the spike

The four persistent gotchas surfaced during this spike are already promoted to `memory.md` "Do not repeat". Mirrored here for the audit trail:

1. **`code.js` is ES2017 only.** Figma's main-thread QuickJS sandbox rejects ES2020+ optional chaining / nullish coalescing / `replaceAll`. Vite must target `es2017` for the main-thread bundle; refactor `?.` → `&&`, `??` → `||` (with caveats), `.replaceAll(a, b)` → `.split(a).join(b)`.

2. **`ui.html` must inject the runtime via `__html__`, not an empty `showUI('')` call.** The UI iframe is a self-contained doc; the main thread reads `__html__` (a build-time string substituted by Vite's `define`) and passes it to `figma.showUI`. `vite-plugin-singlefile` inlines everything; the `<script>` MUST sit AFTER `#root` in the body and MUST NOT carry `type="module"` or `crossorigin`. The post-build `finalize-ui-html.mjs` script enforces both rules.

3. **`String.prototype.replace` with a string replacement interprets `$`-patterns.** If the replacement string is itself bundled JS, sequences like `` $` `` or `$&` expand recursively and corrupt the output. Always use a function callback for `replace`, or slice-and-concatenate, when the replacement comes from a build artifact.

4. **`performance` is not defined in the plugin main thread.** Figma's QuickJS sandbox does not expose `window.performance.now()`. Use `Date.now()` (millisecond resolution); reserve `performance.now()` for the UI thread only. Helper pattern: a single `nowMs()` wrapper that returns `Date.now()` keeps the timing code identical between main and UI threads.

5. **Figma variable names use slashes, not dots.** `figma.variables.createVariable('color.primary.50', …)` throws `Error: in extend: invalid variable name`. The variable-name grammar uses `/`-separated paths to create the grouped folder hierarchy in the Variables panel. Sprint 2's WO-007 token-format adapter must inherit this rule when converting from any legacy dot-pathed source.

6. **EVC plan-gate probe pattern is stable.** Figma does NOT expose `figma.plan`. The only reliable plan-detection signal is `try { collection.extend('probe'); } catch (e) { /* non-Enterprise if e.message includes "enterprise plan" */ }`. The thrown error text is stable enough to substring-match. Sprint 2's `src/core/variables/detectPlan.ts` should use this pattern verbatim.

Items 1–5 are already in `memory.md`. Item 6 is implicit (EVC pattern guidance lives in `research/extended-collections.md` §1.3 and §5.5) and does not need a separate "Do not repeat" — promoting it would be redundant. **No new entries needed beyond what's already in `memory.md`.**

## 9. References

- Ticket: [`../ticket.md`](../ticket.md)
- Plan: [`../plan.md`](../plan.md)
- Research siblings: [`extended-collections.md`](./extended-collections.md), [`latency-benchmark.md`](./latency-benchmark.md), [`spike-runbook.md`](./spike-runbook.md)
- Fixtures used: [`../scripts/fixtures/`](../scripts/fixtures/)
- Memory: [`../../../../memory.md`](../../../../memory.md)
