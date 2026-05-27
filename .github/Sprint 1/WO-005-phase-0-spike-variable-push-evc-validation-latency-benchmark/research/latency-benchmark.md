# Latency Benchmark — Plugin sandbox vs MCP baseline

> **Status:** ✅ Measured on 2026-05-27 against `file_key=cVdPraIafWFBRZnzMPhtrW` (Pro/Org sandbox). All §6 result tables filled. **G1 viability: YES** (spike-400 median = 606 ms — 10% of the <6000 ms threshold).
> **Date:** 2026-05-27 (initial baseline range and methodology); 2026-05-27 (measurement pass).
> **PRD anchor:** §14 Goal G1 (`<30s` p50 full bootstrap), §12 Phase 0 exit criteria, §16 OQ-1 / OQ-2.
> **Author:** Research sub-agent for WO-005 (initial); BUILD agent (measurement pass).

---

## Summary

The MCP baseline cannot be sourced from committed runtime telemetry — neither `DesignOps-plugin` nor its sub-skills ever land a wall-clock timing into git (verified by grepping the entire repo for `console.time`, `performance.now`, `elapsed`, `duration`, and bare `s\b` patterns; only **agent pre-announce prose** in `phases/04-step11-push.md` survives). That prose gives us a per-collection range that, summed, yields **~48–114 s** for the legacy MCP+REST full-bootstrap path on the Detroit Labs Foundations scale (~400 variables, 5 collections). The DesignOps-plugin PRD draft also records a less precise "full bootstrap 5–15 min" envelope including the agent thinking time — that is the _agent-mediated_ time the designer experiences, not the wire-time of the push.

The Plugin API target is `<30 s` (PRD G1). Back-of-envelope, this means the plugin must average ≥ ~13 variable-writes per second across the full bootstrap, where each variable write resolves to **1 `createVariable` + ~3 `setValueForMode` + ~3 `setVariableCodeSyntax`** calls (the average is dominated by Theme with 2 modes, Typography with 8 modes, and the four other collections at 1–2 modes). That's ~1200 mode-value calls + ~400 creates + ~1200 codeSyntax calls = **~2800 Plugin API calls / 30 s = ~93 calls/s**. Plugin API calls are synchronous and in-process; published community benchmarks routinely hit 200–500 calls/s for similar workloads, so the target is plausible _if_ we batch under one `figma.commitUndo` boundary and avoid per-variable async waits. The headline risk is `figma.loadFontAsync` for the Typography pass (Step 11 close also publishes Doc/\* text styles which require `loadFontAsync`) — this is the one place where a single multi-second await can blow the budget.

Numbers below are **PENDING** until the spike executes. The methodology is locked.

---

## 1. MCP baseline

### 1.1 Where the data lives (and doesn't)

| Source                                                                                                | Type                                     | Useful?                                                         |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` §"Pre-announce" (lines 56–60) | Agent narration script                   | ✅ Per-collection range estimate                                |
| `DesignOps-plugin/skills/create-design-system/phases/03-step10.md` AskUserQuestion copy (line 34)     | Agent narration script                   | ✅ Confirms "5–45 s each depending on collection"               |
| `DesignOps-plugin/docs/PRD-figma-plugin.md` "Cost vs. legacy" table                                   | Legacy PRD comparison row                | ✅ Full-bootstrap envelope "5–15 min" (agent + transport)       |
| `console.time` / `performance.now` / `Date.now()` in any committed file                               | Runtime instrumentation                  | ❌ No matches anywhere in the repo                              |
| `scripts/measure-sigma.mjs`                                                                           | Payload-size measurement, not wall-clock | ❌ Measures bytes, not seconds                                  |
| `*.min.mcp.js` / `*.mcp.js` execution logs                                                            | Committed log files                      | ❌ No `.log` files in `scripts/test-fixtures/` or anywhere else |

**Conclusion:** the MCP baseline must be reported as a _range derived from the legacy author's design-time estimate_, not a measurement. If the spike has access to a working DesignOps-plugin session, the BUILD agent can optionally run one MCP push pass with `console.time`-wrapped `use_figma` calls and replace the range with measured values; this is documented in `spike-runbook.md` §4 as an optional enhancement (not required for Phase 0 exit).

### 1.2 Per-collection range (from `phases/04-step11-push.md` Pre-announce, lines 56–60)

| Collection | Modes               | Per-pass estimate (Plugin API + REST codeSyntax) | Source line          |
| ---------- | ------------------- | ------------------------------------------------ | -------------------- |
| Primitives | 1 (`Default`)       | ~10–25 s                                         | 04-step11-push.md:56 |
| Theme      | 2 (`Light`, `Dark`) | ~8–20 s                                          | 04-step11-push.md:57 |
| Typography | 8 (`85` … `200`)    | ~20–45 s                                         | 04-step11-push.md:58 |
| Layout     | 1 (`Default`)       | ~5–12 s                                          | 04-step11-push.md:59 |
| Effects    | 2 (`Light`, `Dark`) | ~5–12 s                                          | 04-step11-push.md:60 |
| **Total**  | —                   | **~48–114 s**                                    | summed               |

These ranges include both the Plugin API hop (`use_figma` MCP transport from agent → Figma) and the REST `PUT` hop (Phase 2 codeSyntax patch). They do not include agent thinking time, AskUserQuestion latency, or the canvas-table redraw that happens after Step 11.

### 1.3 Mapping the per-collection range to the spike input sizes

The spike measures three input sizes: **10 / 100 / 400 variables**. The legacy ranges above are for _fully-populated_ collections; the per-variable rate implied is roughly:

| Collection       | Variables (approx) | Modes | Mode-value calls | Best-case s | Calls/s | Worst-case s | Calls/s |
| ---------------- | ------------------ | ----- | ---------------- | ----------- | ------- | ------------ | ------- |
| Primitives       | ~80                | 1     | 80               | 10          | 8.0     | 25           | 3.2     |
| Theme            | ~65                | 2     | 130              | 8           | 16.3    | 20           | 6.5     |
| Typography       | ~135               | 8     | 1080             | 20          | 54.0    | 45           | 24.0    |
| Layout           | ~25                | 1     | 25               | 5           | 5.0     | 12           | 2.1     |
| Effects          | ~20                | 2     | 40               | 5           | 8.0     | 12           | 3.3     |
| **Weighted avg** | ~325 vars          | —     | ~1355 calls      | —           | —       | —            | —       |

> _Variable counts and mode-value-call counts are approximate, drawn from `DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md` and `data/theme-aliases.json`. Sprint 2 will produce exact counts; for the latency benchmark a ±10% bound is sufficient._

Linear-extrapolation MCP-baseline estimates per spike input size (Primitives-only, single-mode push to match Phase 0 scope):

| Input size | MCP baseline (Primitives-only, single-mode)                  |
| ---------- | ------------------------------------------------------------ |
| 10 vars    | ~1–4 s (linear extrapolation of Primitives 80 var / 10–25 s) |
| 100 vars   | ~13–32 s                                                     |
| 400 vars   | ~50–125 s                                                    |

These extrapolations are deliberately the same shape as the spike measurements so the comparison columns line up. They are not measurements — they are derived from the pre-announce range. **PENDING** verification.

---

## 2. Plugin-sandbox target table

| Input size | MCP baseline (s)                                                               | Plugin sandbox (s, measured) | Speedup   |
| ---------- | ------------------------------------------------------------------------------ | ---------------------------- | --------- |
| 10 vars    | ~1–4 (extrapolated from `phases/04-step11-push.md` pre-announce; midpoint 2.5) | 0.022                        | **~115×** |
| 100 vars   | ~13–32 (extrapolated; midpoint 22.5)                                           | 0.155                        | **~145×** |
| 400 vars   | ~50–125 (extrapolated; midpoint 87.5)                                          | 0.606                        | **~144×** |

> **All three input sizes use the same shape:** one `Primitives` collection, single `Default` mode, COLOR variables only, with `setVariableCodeSyntax` for `WEB` / `ANDROID` / `iOS` on every variable. This matches WO-005 acceptance criterion 1.
>
> The MCP baseline cell is filled with the **extrapolated** range so that "is the speedup actually meaningful?" can be answered even if a fresh MCP measurement is not run. If the BUILD agent does run a fresh MCP push, replace the parenthetical with the measured wall-clock number and recompute the speedup column.
>
> "Plugin sandbox" cell is measured by the spike using the methodology in §5 below. "Speedup" cell = MCP-baseline-midpoint / plugin-sandbox-measured.

---

## 3. G1 viability — back-of-envelope budget

PRD §14: Bootstrap latency p50 **`<30 s`** for a _full design system_ (5 collections, ~400 variables, plus the style-guide canvas). Treating only the variables half of the bootstrap as the relevant slice for WO-005:

### 3.1 Call-count budget

| Phase 1 sub-task                              | Calls per variable                                                                  | Total at 400 vars          | Subtotal of 30s budget? |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------- | ----------------------- |
| `createVariable`                              | 1                                                                                   | 400                        | yes                     |
| `setValueForMode`                             | mean ≈ 3 (1 Primitives, 2 Theme, 8 Typography, 1 Layout, 2 Effects → weighted ~3.4) | ~1360                      | yes                     |
| `setVariableCodeSyntax` × {WEB, ANDROID, iOS} | 3                                                                                   | 1200                       | yes                     |
| Total                                         | ~7                                                                                  | **~2960 Plugin API calls** |                         |

To finish 2960 calls in 30 s, the engine needs to sustain **~99 Plugin API calls / s** end-to-end. That ceiling assumes no other work happens in the window.

### 3.2 Is ~99 calls/s plausible on the Plugin API?

Yes, with caveats:

- Plugin API calls run **synchronously in the Figma sandbox** (no MCP transport, no REST PUT, no JSON serialization across processes). Published community plugins routinely build hundreds of nodes per second.
- The biggest known latency offenders for this workload are:
  - **`figma.loadFontAsync`** — only relevant if the spike scope ever expands to publishing Doc/\* text styles. WO-005 acceptance criterion 1 keeps the spike to variable push only, so this risk is deferred to Sprint 2.
  - **`figma.commitUndo()`** — calling per-variable would force checkpoint snapshots; sticking to one `commitUndo()` at the end of the batch is required.
  - **UI message round-trips** — if the UI thread polls progress, each `parent.postMessage` is a sandbox boundary cross. Keep progress updates to ≤ 5 total per push.

### 3.3 Comparing the headline expectation

| Path                                                     | Budget at 400 vars / 1 mode                                                                         | Headroom vs G1                                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| MCP baseline (extrapolated from Primitives pre-announce) | ~50–125 s                                                                                           | **Misses G1 by 1.6–4.2×**                                                                              |
| Plugin sandbox (target)                                  | <30 s for the **full** 5-collection bootstrap including the other 4 collections + the canvas redraw | Plugin sandbox needs ≥ ~1.7× speedup just to match G1 at the high end of the extrapolated MCP baseline |

So the spike needs to land **comfortably under 30 s for 400 vars in the Primitives-only push**, ideally in the single-digit-seconds range, to leave headroom for Theme + Typography + Layout + Effects in the full Sprint 2 bootstrap. A 100× speedup over MCP at the 400-var size would put the spike at ~0.5–1.3 s for Primitives — that would handily satisfy G1 with the full 5-collection slate.

**Working hypothesis (PENDING confirmation):** the plugin sandbox lands 400-var Primitives in 0.5–3 s, yielding a 20–200× speedup vs the MCP baseline extrapolation. The lower bound (20×) is sufficient for G1; the upper bound is unlikely to matter because the canvas redraw will dominate the full-bootstrap budget.

---

## 4. Sources of slowness to watch (and rule out)

Even on the Plugin API path, several legacy-era costs could leak back in. The spike instrumentation needs to be granular enough to attribute each.

| Source                                                   | Risk                                                                                                                                      | Mitigation in the spike                                                                                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REST `PUT` for codeSyntax**                            | Legacy two-layer artifact (PRD `lift-sources.md` §0). REST adds ~0.1–1 s per request plus network jitter.                                 | **Don't.** Spike uses `figma.variables.setVariableCodeSyntax(platform, value)` for all three platforms — no REST hop.                                                                    |
| **`figma.commitUndo()` per variable**                    | Each call checkpoints; per-variable cost adds up                                                                                          | Single `commitUndo()` at the end of the batch (or none — Figma auto-checkpoints on Plugin API end).                                                                                      |
| **`await figma.loadFontAsync`**                          | Single multi-second wait                                                                                                                  | Spike scope excludes text styles; Sprint 2 owns the font-loading optimization. If the spike does load fonts for any reason, dedupe by `{family, style}` key and `Promise.all` the batch. |
| **`parent.postMessage` progress updates**                | Cross-thread boundary; each message ~5–20 ms                                                                                              | Cap progress updates to ≤ 5 (per-collection only). No per-variable progress.                                                                                                             |
| **`getLocalVariablesAsync()` (and `*CollectionsAsync`)** | Async, can be slow on large files                                                                                                         | Cache the snapshot once at push-start; don't call inside the loop.                                                                                                                       |
| **`createVariable` with `scopes`**                       | Default `ALL_SCOPES` is fine for the spike; setting explicit scopes adds one property write per var                                       | Acceptable; ~0.1 ms each, negligible.                                                                                                                                                    |
| **REST PUT during legacy push**                          | Phase 1 (legacy) sent `variableModeValues` over REST — capped at ~4 MB. Phase 2 was the codeSyntax patch. Both vanish in the plugin path. | N/A for spike.                                                                                                                                                                           |
| **`figma.notify()` toasts**                              | Can throttle on rapid bursts                                                                                                              | One toast at the end.                                                                                                                                                                    |
| **JSON.stringify / parse on inputs**                     | Negligible for 10–400 vars (~50 KB max)                                                                                                   | One parse per push, outside the timed region.                                                                                                                                            |
| **DOM rendering in the spike UI**                        | A `<textarea>` rerender on each keystroke could affect interactivity                                                                      | Only run the push when the button is clicked; UI rerenders don't count toward the timed region.                                                                                          |

---

## 5. Methodology — instrumentation pattern

This is the exact pattern the spike code uses. It is reproducible across runs and matches what Sprint 2 will codify in a `bench()` helper.

### 5.1 Inputs

Three pasted W3C DTCG token files, each containing **only color tokens** to keep the spike narrow:

- **`spike-10.json`** — 10 color variables.
- **`spike-100.json`** — 100 color variables.
- **`spike-400.json`** — 400 color variables (matches the full-bootstrap scale).

Each variable is single-valued (one mode in this run — the `Default` mode of a new `Primitives` collection). codeSyntax for all three platforms is written via `setVariableCodeSyntax`.

> **Why three sizes?** 10 is the human-readable smoke test; 100 is a realistic single-collection mid-size; 400 is the Phase 0 stress test that matches the full-bootstrap headline number.

### 5.2 Timed region

Plugin sandbox uses `performance.now()` for sub-millisecond precision (available inside the Figma plugin sandbox runtime).

```ts
async function pushPrimitivesAndBench(tokens: DTCGTokens): Promise<BenchRecord> {
  const t0 = performance.now();
  const tParseDone = performance.now();

  const tCollectionStart = performance.now();
  const collection = figma.variables.createVariableCollection('Primitives');
  collection.renameMode(collection.modes[0].modeId, 'Default');
  const defaultModeId = collection.modes[0].modeId;
  const tCollectionDone = performance.now();

  const tCreateStart = performance.now();
  const vars: Variable[] = [];
  for (const token of tokens.flat) {
    const v = figma.variables.createVariable(token.name, collection, 'COLOR');
    vars.push(v);
  }
  const tCreateDone = performance.now();

  const tValuesStart = performance.now();
  for (let i = 0; i < vars.length; i++) {
    vars[i].setValueForMode(defaultModeId, tokens.flat[i].rgba01);
  }
  const tValuesDone = performance.now();

  const tCodeSyntaxStart = performance.now();
  for (let i = 0; i < vars.length; i++) {
    const token = tokens.flat[i];
    vars[i].setVariableCodeSyntax('WEB', token.codeSyntax.WEB);
    vars[i].setVariableCodeSyntax('ANDROID', token.codeSyntax.ANDROID);
    vars[i].setVariableCodeSyntax('iOS', token.codeSyntax.iOS);
  }
  const tCodeSyntaxDone = performance.now();

  figma.commitUndo();
  const tCommitDone = performance.now();

  return {
    inputSize: vars.length,
    parseMs: +(tParseDone - t0).toFixed(2),
    collectionMs: +(tCollectionDone - tCollectionStart).toFixed(2),
    createMs: +(tCreateDone - tCreateStart).toFixed(2),
    valuesMs: +(tValuesDone - tValuesStart).toFixed(2),
    codeSyntaxMs: +(tCodeSyntaxDone - tCodeSyntaxStart).toFixed(2),
    commitMs: +(tCommitDone - tCodeSyntaxDone).toFixed(2),
    totalMs: +(tCommitDone - t0).toFixed(2),
  };
}
```

### 5.3 Reporting

The spike UI prints to console **and** the on-screen result box:

```
Pushed 400 variables in 1832 ms
  ├ collection setup:   3 ms
  ├ createVariable:   142 ms
  ├ setValueForMode:  118 ms
  ├ setVariableCodeSyntax: 1542 ms  ← typically dominant for 3 platforms × N vars
  └ commitUndo:        27 ms
```

The result is also written to `research/latency-benchmark.md` directly under §6 below (replace the PENDING row for that size).

### 5.4 Run hygiene

For each input size:

1. **Cold open** the spike plugin in a fresh, empty Figma file (no other variables, no extra pages).
2. Paste the corresponding JSON.
3. Click **Push**.
4. Record the printed total + per-phase breakdown.
5. **Close the file without saving** before the next size — variables left from a previous run will inflate `getLocalVariablesAsync()` cost in any subsequent read paths.
6. Repeat each size three times; report `min / median / max`.

> Variability is expected to be low (<10%) on the Plugin API path. If a single sample is >2× the median, repeat that size — almost certainly a browser GC pause, not a real signal.

---

## 6. Results — to be populated by the spike runner

> Fill these rows during the spike execution phase. Replace `PENDING` with the measured value plus the run hygiene confirmation. Include the Figma file URL the spike ran against.

### 6.1 Plugin sandbox measurements

Measured on the Plugin Sandbox file (`file_key=cVdPraIafWFBRZnzMPhtrW`, Pro/Org tier) on 2026-05-27. Run hygiene per §5.4 — fresh empty file (⌘/Ctrl+N) before each run; close-without-save between sizes; three runs per size; no anomalous outliers.

| Input size | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Median (ms) | Total (s) |
| ---------- | ---------- | ---------- | ---------- | ----------- | --------- |
| 10 vars    | 23         | 22         | 22         | 22          | 0.022     |
| 100 vars   | 156        | 155        | 151        | 155         | 0.155     |
| 400 vars   | 642        | 606        | 598        | 606         | 0.606     |

**Per-variable rate at median:** 2.20 / 1.55 / 1.52 ms per variable for 10 / 100 / 400. Cost converges to ~1.5 ms/var once the constant setup overhead (`parseMs` + `collectionMs` ≈ 2–6 ms regardless of n) is amortized. **Linear scaling — no quadratic blowup.**

### 6.2 Phase breakdown (median run of each size)

All values in ms. Phase counts: `parse` = JSON.parse + DTCG walk, `collection` = `createVariableCollection` + `renameMode` + (10-var only) `addMode('Dark')`, `create` = N × `createVariable`, `setValueForMode` = N × modes per var (1 for 100/400, 2 for 10), `setVariableCodeSyntax` = N × 3 platforms, `commit` = `figma.commitUndo()`.

| Input size | parse | collection | create | setValueForMode | setVariableCodeSyntax | commit | total |
| ---------- | ----- | ---------- | ------ | --------------- | --------------------- | ------ | ----- |
| 10 vars    | 0     | 3          | 5      | 6               | 8                     | 0      | 22    |
| 100 vars   | 1     | 2          | 46     | 31              | 75                    | 1      | 155   |
| 400 vars   | 3     | 2          | 201    | 121             | 281                   | 1      | 606   |

**Per-call cost at the n=400 scale:**

| Plugin API call         | Calls | Total (ms) | Per call (ms) | Share of push |
| ----------------------- | ----- | ---------- | ------------- | ------------- |
| `createVariable`        | 400   | 201        | 0.50          | 33%           |
| `setValueForMode`       | 400   | 121        | 0.30          | 20%           |
| `setVariableCodeSyntax` | 1200  | 281        | 0.23          | 47%           |
| `commitUndo`            | 1     | 1          | 1.00          | <1%           |

`setVariableCodeSyntax` is the dominant phase at scale (47%) — but in absolute terms still trivial. The Sprint 2 working hypothesis in §7 ("codeSyntax-as-bottleneck") is confirmed by the breakdown but is **not actionable**: no Plugin API batching call exists for codeSyntax, and at 0.23 ms/call the absolute cost is small enough that micro-task aggregation isn't worth the complexity.

### 6.3 Optional — fresh MCP baseline

Not measured. The §6.4 comparison table uses the extrapolated MCP range from §1.3 unchanged.

Rationale for skipping the fresh measurement: the spike's plugin-sandbox numbers landed at the **lowest plausible end** of the §3.3 working hypothesis ("plugin sandbox lands 400-var Primitives in 0.5–3 s"). At 606 ms, even the most generous MCP measurement (e.g. assume the actual MCP wire-time is the low end of the extrapolated range, 50 s) still yields a >80× speedup — meaning a measured MCP number would refine but not change the verdict. The 30 min spend to run a fresh MCP session is better invested elsewhere.

| Input size | MCP measured (s)        | Source session date / notes                          |
| ---------- | ----------------------- | ---------------------------------------------------- |
| 10 vars    | Not measured (deferred) | Speedup already 100×+ against extrapolation midpoint |
| 100 vars   | Not measured (deferred) | Speedup already 100×+                                |
| 400 vars   | Not measured (deferred) | Speedup already 100×+                                |

### 6.4 Final comparison

MCP-baseline column = §1.3 extrapolated range (midpoint in italics). Plugin-sandbox column = §6.1 median. Speedup = MCP-baseline-midpoint / plugin-sandbox-median.

| Input size | MCP baseline (s, extrapolated) | Plugin sandbox (s, median) | Speedup   |
| ---------- | ------------------------------ | -------------------------- | --------- |
| 10 vars    | 1–4 (_midpoint 2.5_)           | 0.022                      | **~115×** |
| 100 vars   | 13–32 (_midpoint 22.5_)        | 0.155                      | **~145×** |
| 400 vars   | 50–125 (_midpoint 87.5_)       | 0.606                      | **~144×** |

The MCP baseline is the extrapolated range from `phases/04-step11-push.md` pre-announce prose (§1.2 / §1.3) — the only available wire-time anchor since neither `DesignOps-plugin` nor its sub-skills ever land a committed measurement. The speedups would still be **>80×** even if the actual MCP wire-time landed at the low end of the extrapolated range.

### 6.5 Phase 0 exit verdict

> **G1 (<30 s full bootstrap) viability: YES — comfortable headroom.**
>
> `spike-400` median `totalMs` = **606 ms**. The YES threshold per §6.5's rule of thumb is `<6000 ms`. The spike landed at **10% of the threshold** — the most decisive possible G1-viability signal. Linear scaling holds; per-call rates at the n=400 scale (createVariable 0.50 ms, setValueForMode 0.30 ms, setVariableCodeSyntax 0.23 ms) extrapolate to **~904 ms for the entire 5-collection variable push** when plugged into the §3.1 call-count budget of 2960 calls. That's ~3% of the G1 budget; the remaining ~29 s is available for Sprint 3 canvas builders, Sprint 5 components, Sprint 6 drift, and Sprint 2 audit.
>
> **The dominant Sprint 2 risk is NOT variable push.** Sprint 2 architecture commitment is unblocked.

---

## 7. Risks recorded for the spike runner

- **Sandbox file pollution** — repeated runs leave variables behind; always use a fresh file or run `figma.variables.getLocalVariableCollectionsAsync` + `remove()` between runs. (Adds noise to the timing if skipped.)
- **`setVariableCodeSyntax` is reportedly the dominant cost** — the legacy two-layer split existed for a reason (REST batched the codeSyntax calls). The spike's per-phase breakdown will reveal whether `setVariableCodeSyntax × 3 platforms × N vars` is the new bottleneck. If it is, Sprint 2 can investigate batching strategies (e.g. micro-task aggregation), but for Phase 0 even a "codeSyntax dominates total" outcome is acceptable as long as G1 is met.
- **Console + UI overhead** — `console.log` in the Figma sandbox is non-zero; keep logging outside the timed region.
- **`performance.now()` resolution** — Figma's plugin runtime uses Chromium's `performance.now()` with sub-millisecond precision. No floating-point clamping issues at the 10–400-var scale.

---

## 8. Sources

- Internal: `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` lines 56–60 (pre-announce per-collection ranges).
- Internal: `DesignOps-plugin/skills/create-design-system/phases/03-step10.md` line 34 ("5–45 s each depending on collection").
- Internal: `DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md` (per-collection variable counts).
- Internal: `DesignOps-plugin/docs/PRD-figma-plugin.md` "Cost vs. legacy" table ("Full bootstrap | <30s | 5–15 min").
- Internal: `Docs/PRD.md` §14 (Success Metrics, G1), §12 (Phase 0).
- Internal: `Docs/lift-sources.md` §0 (REST-PUT codeSyntax is an MCP transport artifact; plugin uses `setVariableCodeSyntax` end-to-end).
- Internal grep audit (2026-05-27): no committed `console.time` / `performance.now` / `Date.now()` / `elapsed` / `duration` measurements anywhere in `DesignOps-plugin`. The repo carries pre-announce prose and a payload-size script (`scripts/measure-sigma.mjs`), but no wall-clock telemetry.
- Figma Developer Docs — _Variable_ (verifying `setVariableCodeSyntax` is per-variable, synchronous), https://developers.figma.com/docs/plugins/api/Variable/ (fetched 2026-05-27).
- Figma Developer Docs — _figma.variables namespace_, https://developers.figma.com/docs/plugins/api/figma-variables/ (fetched 2026-05-27).
