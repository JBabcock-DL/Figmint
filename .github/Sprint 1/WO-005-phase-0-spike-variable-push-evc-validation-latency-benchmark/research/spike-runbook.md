# Spike Runbook — WO-005 Phase 0

> **Audience:** the BUILD-phase agent (and any human operator) running the WO-005 spike against a real Figma file.
> **Status:** Authoring complete. Step-by-step reproducible.
> **Output of the spike:** populated `research/extended-collections.md` §3 PASS/FAIL slots, populated `research/latency-benchmark.md` §6 result tables, and a throwaway `spike/phase-0` branch under WO-005 that is **not merged** to `main` (per ticket §"Acceptance criteria" / `Docs/lift-sources.md` §0).
> **Date:** 2026-05-27.

---

## 0. Pre-flight

Before doing anything in Figma:

1. **WO-002 plugin scaffold must be merged** (Sprint 1 dependency from `memory.md` Sprint 1 state table). The spike code lands inside the scaffold; if WO-002 isn't ready, stop and surface the blocker.
2. **Branch:** `git checkout -b spike/phase-0` off `main`. Do not push anywhere; this branch is throwaway (Sprint 11 WO-051 hard-delete list confirms; `Docs/lift-sources.md` §0).
3. **Sandbox Figma file:** designer to provide a fresh, empty Detroit Labs sandbox file with at least an Enterprise-tier seat available on the operator's account.
   - If only Professional/Organization seats are available, the **EVC verification tests will fail with the documented `"in extend: Cannot create extended collections outside of enterprise plan."` error** — record that error as the §3 Test 1 result and skip Tests 2–4. This is an expected fallback path (see `research/extended-collections.md` §4.1).
4. **Plugin UI scope for the spike** — minimal: one paste `<textarea>`, one **Push** button, one **EVC Tests** button (for §3 EVC verification), one result `<pre>` block. No design polish. **W3C DTCG only** (`$value` / `$type` keys); no legacy `.figmint-registry.json` adapter for the spike (Sprint 2 owns adapters).
5. **Read these files before opening Figma:**
   - `Docs/PRD.md` §6.1 FR-BOOT-3..6, §14 G1.
   - `Docs/lift-sources.md` §0 (drift corrections — `phases/04-step11-push.md` is the source of truth; `step-15a-primitives.mcp.js` is NOT).
   - `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` (the legacy push sequence — for shape, not for line-by-line copy).
   - This runbook (you're already here).
   - `research/extended-collections.md` (for the EVC API calls the spike will exercise).
   - `research/latency-benchmark.md` (for the timing methodology and result-table shape).

> **Do NOT push variables against a client or production Figma file at any point in this spike.** Per ticket §Technical / architectural: "Spike runs on a fresh Figma file; do NOT push against any client / production file."

---

## 1. Step 1 — Variable push from pasted JSON (acceptance criterion 1)

**Goal:** confirm the legacy `phases/04-step11-push.md` sequence runs end-to-end in the plugin sandbox using _only_ the Plugin API (no REST PUT hop for codeSyntax).

### 1.1 Sample input — `spike/phase-0/fixtures/spike-10.json` (W3C DTCG)

Create a fixture file with this shape (10 color tokens, two modes implied by `$extensions.figmint.modes`):

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "primary": {
      "50": {
        "$type": "color",
        "$value": "#eef5ff",
        "$extensions": {
          "figmint": {
            "modes": { "light": "#eef5ff", "dark": "#0b1b2e" },
            "codeSyntax": {
              "WEB": "var(--color-primary-50)",
              "ANDROID": "color-primary-50",
              "iOS": ".Palette.primary.50"
            }
          }
        }
      },
      "500": {
        "$type": "color",
        "$value": "#3366ff",
        "$extensions": {
          "figmint": {
            "modes": { "light": "#3366ff", "dark": "#3366ff" },
            "codeSyntax": {
              "WEB": "var(--color-primary-500)",
              "ANDROID": "color-primary-500",
              "iOS": ".Palette.primary.500"
            }
          }
        }
      }
    }
  }
}
```

Repeat the pattern up to 10 / 100 / 400 entries for the three latency runs. The exact ramp values are not important for the spike — they only have to parse cleanly and produce valid `{r, g, b, a}` 0–1 floats after normalization.

### 1.2 Color value normalization (CRITICAL)

Per `phases/04-step11-push.md` §"Plugin API — values and aliases":

> **COLOR** values: `{ r, g, b, a }` with channels **0–1**.

Convert from `#rrggbb[aa]` hex string to `{r, g, b, a}` with each channel divided by **255** for RGB and by **255** for alpha (or default `a = 1` if the input lacks alpha).

```ts
function hexToRgba01(hex: string): { r: number; g: number; b: number; a: number } {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
  if (!m) throw new Error(`bad hex: ${hex}`);
  const rgb = m[1];
  const r = parseInt(rgb.slice(0, 2), 16) / 255;
  const g = parseInt(rgb.slice(2, 4), 16) / 255;
  const b = parseInt(rgb.slice(4, 6), 16) / 255;
  const a = m[2] ? parseInt(m[2], 16) / 255 : 1;
  return { r, g, b, a };
}
```

### 1.3 Plugin API push sequence (composed from `phases/04-step11-push.md`)

```ts
async function pushPrimitives(parsed: ParsedTokens) {
  const t0 = performance.now();

  const collection = figma.variables.createVariableCollection('Primitives');

  collection.renameMode(collection.modes[0].modeId, 'Light');
  const lightModeId = collection.modes[0].modeId;
  const darkModeId = collection.addMode('Dark');

  const tCreateStart = performance.now();
  const vars: Variable[] = [];
  for (const token of parsed.flat) {
    const v = figma.variables.createVariable(token.name, collection, 'COLOR');
    vars.push(v);
  }
  const tCreateDone = performance.now();

  const tValuesStart = performance.now();
  for (let i = 0; i < vars.length; i++) {
    const token = parsed.flat[i];
    vars[i].setValueForMode(lightModeId, token.modes.light);
    vars[i].setValueForMode(darkModeId, token.modes.dark);
  }
  const tValuesDone = performance.now();

  const tCodeSyntaxStart = performance.now();
  for (let i = 0; i < vars.length; i++) {
    const cs = parsed.flat[i].codeSyntax;
    vars[i].setVariableCodeSyntax('WEB', cs.WEB);
    vars[i].setVariableCodeSyntax('ANDROID', cs.ANDROID);
    vars[i].setVariableCodeSyntax('iOS', cs.iOS);
  }
  const tCodeSyntaxDone = performance.now();

  figma.commitUndo();
  const tDone = performance.now();

  return {
    count: vars.length,
    totalMs: +(tDone - t0).toFixed(2),
    createMs: +(tCreateDone - tCreateStart).toFixed(2),
    valuesMs: +(tValuesDone - tValuesStart).toFixed(2),
    codeSyntaxMs: +(tCodeSyntaxDone - tCodeSyntaxStart).toFixed(2),
    commitMs: +(tDone - tCodeSyntaxDone).toFixed(2),
  };
}
```

### 1.4 Things the spike must NOT do

- **No REST PUT to `https://api.figma.com/v1/files/.../variables`.** The legacy two-layer split (Plugin API for structure + REST for codeSyntax) exists only because the MCP `use_figma.code` payload had a 50 kB cap; the plugin sandbox has no such cap. See `Docs/lift-sources.md` §0.
- **No GitHub OAuth.** Spike is purely local plugin → Figma file.
- **No tokens.css emission.** Spike scope is variables only.
- **No style-guide canvas redraw.** Sprint 3 owns canvas builders; the spike never touches `canvas-templates/`.
- **No `figma.loadFontAsync`.** Spike scope is COLOR variables only.

### 1.5 Functional QA for Step 1

After the push, the operator confirms in the Figma variables panel:

- [ ] A single `Primitives` collection appears.
- [ ] Two modes (`Light` and `Dark`) on that collection.
- [ ] Variable count matches the input fixture size (10 / 100 / 400).
- [ ] Spot-check at least 2 variables for the codeSyntax pane: `WEB`, `ANDROID`, `iOS` strings all populated and match the input.
- [ ] Spot-check at least 1 variable's Light vs Dark value: they differ when the fixture said they should.

If any check fails: capture the failure, write it under §"Issues" in the spike's run log, do NOT modify the spec — file a follow-up ticket if a real platform regression is found.

---

## 2. Step 2 — EVC validation (acceptance criterion 2)

> Plan-gate caveat: see §0 step 3. If the operator's seat isn't Enterprise, Tests 1–4 will fail with the documented error; record that as the result and stop. Do not attempt workarounds — the canonical model is designed to handle that exact case (`research/extended-collections.md` §5).

### 2.1 Test 1 — modes inherited from parent

Copy the call sequence verbatim from `research/extended-collections.md` §3 Test 1. Run it as a single `figma.codegen`-style script via the spike's **EVC Tests** button. Capture the returned object.

**Record under `research/extended-collections.md` §3 Test 1:**

- `Result:` replace `PENDING — to be filled during spike execution` with the JSON the script returned.
- `PASS / FAIL:` based on the criterion in that section.

### 2.2 Test 2 — single-value override

Same procedure with §3 Test 2 sequence. Record result + PASS/FAIL.

### 2.3 Test 3 — override removal

Same procedure with §3 Test 3. Record result + PASS/FAIL.

### 2.4 Test 4 — chained extension (bonus)

Same procedure with §3 Test 4. Record either `chainedOk: true` (with confirming property values) or the verbatim error message. Both outcomes answer the open platform question.

### 2.5 Functional QA for Step 2

After the EVC tests, the operator confirms in the Figma variables panel:

- [ ] The **Spike Theme Parent** collection appears with `Light` and `Dark` modes.
- [ ] The **Spike Theme Brand A** collection appears below it with the **Extension** affordance (Figma UI tag for extended collections).
- [ ] If Test 4 passed, **Spike Theme Brand A — Sub** appears underneath.
- [ ] In `Spike Theme Brand A`, the Light value for `spike/color/primary/500` shows the override color _only after_ Test 2 runs, and reverts to the parent value _after_ Test 3 runs.

---

## 3. Step 3 — Latency benchmark (acceptance criterion 3)

### 3.1 Pre-flight (per spec, do this once per input size)

1. Close the spike's Figma file without saving (or open a fresh file).
2. Open the spike plugin.
3. Paste `spike-10.json` (or `spike-100.json`, or `spike-400.json`).

### 3.2 Run (per spec)

Click **Push**. Note the printed total + per-phase breakdown. The on-screen `<pre>` should show the `BenchRecord` from §5.2 of `research/latency-benchmark.md`.

Repeat **three times** per input size. Capture min / median / max.

### 3.3 Record results

In `research/latency-benchmark.md` §6.1:

- Replace `PENDING` cells for the appropriate input size row with the measured values.

In §6.2, fill the phase breakdown (use the median run).

In §6.4, fill the final comparison table:

- `MCP baseline` column: use the extrapolated range from §1.3 of the latency-benchmark doc (e.g. `~13–32`), or — if the BUILD agent ran an optional fresh MCP measurement — the measured value.
- `Plugin sandbox` column: the median measured value.
- `Speedup` column: `(midpoint of MCP range) / (plugin sandbox median)`.

### 3.4 Verdict — §6.5 of `latency-benchmark.md`

Write the Phase 0 exit verdict per the rule of thumb:

- **`<6 s` at 400 vars:** "G1 has comfortable headroom; Sprint 2 can build on this baseline."
- **`6–15 s` at 400 vars:** "G1 is tight but plausible; Sprint 2 must measure each remaining collection (Theme/Typography/Layout/Effects) before committing the architecture."
- **`>15 s` at 400 vars:** "G1 at risk. Stop, surface to Sprint 2 leads."

---

## 4. Step 3 (optional) — Fresh MCP baseline measurement

If the BUILD agent has a working DesignOps-plugin session and 30 minutes to spare, they can replace the _extrapolated_ MCP baseline with a measured one. This is **optional** — Phase 0 exit does not require it.

Procedure (high level — full detail in `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md`):

1. Set up an MCP `use_figma` session against a separate sandbox file.
2. Build the exact same Primitives-only, 10/100/400-var fixture as input.
3. Wrap the push in agent-side `Date.now()` markers (the MCP runtime does not expose `performance.now` to the calling agent reliably — `Date.now()` differences are good enough for the magnitude check).
4. Record the wall-clock per size into `research/latency-benchmark.md` §6.3.

This step is bracketed by:

- the time the MCP `use_figma` call is dispatched, **plus**
- the REST `PUT` round-trip for codeSyntax,
- **excluding** agent thinking time / AskUserQuestion prompts (those count for designer-experience time but not for the wire-time comparison).

---

## 5. Acceptance — match against ticket `## Acceptance criteria`

Run this checklist before declaring the spike complete (these mirror the ticket; the operator should be able to tick every box):

- [ ] **All three criteria above complete with explicit pass/fail notes recorded in `research/`.**
  - Criterion 1 covered by Step 1 §1.5 QA + the `research/latency-benchmark.md` §6 entries proving the push works.
  - Criterion 2 covered by `research/extended-collections.md` §3 PASS/FAIL slots (Tests 1–3 minimum; Test 4 bonus).
  - Criterion 3 covered by `research/latency-benchmark.md` §6.4 final comparison table + §6.5 verdict.
- [ ] **`research/extended-collections.md` exists with EVC verification results.**
- [ ] **`research/latency-benchmark.md` exists with the comparison table populated.**
- [ ] **Phase 0 exit criteria (PRD §12) met:** G1 latency target looks achievable; no platform blockers (or if EVC is plan-gated, the canonical model still works without it per `research/extended-collections.md` §2).
- [ ] **Findings feed CTX-002** — at minimum the one-paragraph "EVC implication for token model" in `research/extended-collections.md` §2.4.
- [ ] **Spike branch is NOT merged to `main`.**

If every box ticks, proceed to §6.

If any box doesn't tick, document the gap in `research/spike-runbook.md` §"Issues" (add the section at the end of this file if it does not exist) and surface to the Sprint 2 leads.

---

## 6. Throwaway disposition (per `Docs/lift-sources.md` §0 / ticket §Technical)

After the spike completes:

1. **Keep:** everything under `.github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/` and `…/scripts/` (the documented findings + any test fixtures or helper scripts under `scripts/`). These are the deliverable.
2. **Discard:** all code under `src/` that was added on the `spike/phase-0` branch — variable-push handlers, EVC test runner, latency instrumentation. Sprint 2's WO-007/WO-008/WO-009 will re-implement these in their canonical home (`src/core/variables/`, `src/core/audit/`).
3. **Do NOT open a PR** from `spike/phase-0` to `main`. Sprint 11 WO-051's hard-delete list includes this branch.
4. **Push the branch to a remote backup** (optional, e.g. `git push -u origin spike/phase-0`) so a later sub-agent can re-read it if they need to see the wire-time prototype. Confirm with the operator first; don't push silently.
5. **Update `memory.md`** with one new "Do not repeat" entry if the spike surfaced a new platform gotcha (e.g. "EVC plan probe must wrap `extend()` in try/catch — Figma exposes no `figma.plan` field"). Keep entries short.

---

## 7. References

- Ticket: `../ticket.md`
- Plan: `../plan.md`
- PRD: `Docs/PRD.md` §6.1 FR-BOOT-3..6, §11.5, §12, §14, §15, §16
- Lift-source corrections: `Docs/lift-sources.md` §0
- Legacy push sequence: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md`
- Legacy per-collection variable lists: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md`
- Legacy 5-collection structure: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`
- Legacy codeSyntax mapping: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md`
- Legacy audit checklist: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/14-audit.md`
- EVC research: `research/extended-collections.md`
- Latency methodology: `research/latency-benchmark.md`
- Figma Plugin API — _Working with Variables_ (full guide): https://developers.figma.com/docs/plugins/working-with-variables/
- Figma Plugin API — Update 121 changelog (EVC intro): https://developers.figma.com/docs/plugins/updates/2025/11/20/version-1-update-121/
