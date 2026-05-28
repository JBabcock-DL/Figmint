---
type: work-order
github_issue: 7
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt4CLw
phase: build-complete
verdict: G1=YES (spike-400 median 606ms ÷ 10× headroom; EVC Test 1 PASS; Tests 2–4 UNTESTED-ON-PLAN)
---

## Goal

De-risk the three Phase 0 platform assumptions in a single throwaway spike with documented findings:

1. **Variable push from pasted JSON** works end-to-end inside the plugin sandbox.
2. **Extended Variable Collections (EVC)** — the January 2026 platform feature — exhibits the inheritance + override semantics PRD §6.1 FR-BOOT-6 assumes.
3. **Latency benchmark** confirms the headline PRD §14 Goal G1 (<30s full bootstrap) is achievable on Plugin API vs. the legacy MCP transport.

Spike code is **throwaway**; the value is the documented findings that feed CTX-002 and unblock Sprint 2.

PRD anchors: `Docs/PRD.md` §12 (Phase 0 exit criteria), §6.1 FR-BOOT-3..6, §14 (latency targets G1), §16 OQ-1 / OQ-2.

---

## Problem story

As Sprint 2 leads, we need three platform facts confirmed before we commit Sprint 2's bootstrap engine to a specific architecture: (a) the variable push pattern actually works in the plugin sandbox, (b) EVC inheritance behaves as the 5-collection theming model needs, (c) latency clears the headline KPI by ≥10×. Without these confirmations Sprint 2 risks rework.

## Hypothesis (optional)

The variable-push sequence is already specified in `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` (Plugin API mode setup + `setValueForMode` + `setVariableCodeSyntax`). Translating that prose into TypeScript and running it directly in the plugin sandbox will (a) succeed without redesign and (b) finish in <2s for the small input sizes we test. The legacy two-layer split (Plugin API for structure + REST PUT for `codeSyntax`) is an MCP payload-budget artifact — FigHub can use Plugin API end-to-end.

> **Lift-source correction (see `Docs/lift-sources.md` §0):** Earlier ticket drafts cited `canvas-templates/bundles/step-15a-primitives.mcp.js` as the source for the push sequence. That file is actually a **canvas-table builder** that reads variables back to draw the Primitives style-guide page — it does NOT create variables. The real Plugin API push sequence lives in `phases/04-step11-push.md`.

---

## User stories

- [x] As a Sprint 2 lead, I can read `research/extended-collections.md` and know whether the 5-collection theming model is viable as-is or needs adjustment. _(Confirmed: model viable as-is; EVC = render-time projector on Enterprise; Pro/Org bootstraps work without EVC. CTX-002 ready for promotion.)_
- [x] As a Sprint 2 lead, I can read `research/latency-benchmark.md` and know whether G1 is realistic. _(Confirmed: G1 = YES with ~10× headroom. Variables = ~3% of G1 budget; Sprint 3 canvas + Sprint 5 components are the new "watch the latency" candidates.)_
- [x] As a Sprint 2 lead, I can re-run the spike's variable push manually in a fresh Figma file and observe variables appearing. _(Reproducible: load fixture in the UI dropdown → click Push → variables appear in the Variables panel. Procedure recorded in `research/spike-execution-log.md` §1.)_

## Design reference _(when UI work applies)_

A spike-grade UI exists (paste textarea + "Push" button). Real `file_key` / `node_id` populated when the spike is run against a Detroit Labs sandbox file (recorded in `research/extended-collections.md`).

---

## Requirements

### Functional

**Three acceptance criteria, one feature branch (`spike/phase-0`), throwaway code.**

1. **Variable push from pasted JSON:**
   - Plugin UI accepts pasted `tokens.json` (W3C DTCG only for spike — `$value` / `$type` keys).
   - Creates **one** variable collection (Primitives) in the current Figma file via `figma.variables.createVariableCollection`.
   - Sets color variables with values for two modes (`light`, `dark`) via `setValueForMode`.
   - Sets `codeSyntax` per platform via `setVariableCodeSyntax`.
   - Reports completion (count, latency) inline in the UI.

2. **EVC validation** _(Enterprise plan required — `VariableCollection.extend()` throws on lower tiers per [`research/extended-collections.md`](research/extended-collections.md))_:
   - Create a parent collection + an extended collection via Plugin API (`collection.extend(name)` — Plugin API Update 121, 2025-11-20).
   - Verify: extended collection inherits modes from parent.
   - Verify: extended collection can override individual variable values without breaking the inheritance link.
   - Verify: `variable.removeOverrideForMode(extendedModeId)` reverts back to parent value (per-mode revert); `extension.removeOverridesForVariable(variableId)` reverts all overrides for one variable. **API-name correction:** earlier ticket text cited a non-existent `removeVariableValueOverride` — see research file §2 for the real API surface.
   - Document each verification with explicit `PASS` / `FAIL` notes plus the exact API call sequence used.

3. **Latency benchmark:**
   - Measure end-to-end push latency for three input sizes: **10**, **100**, **400** variables.
   - For baseline: pull recent `use_figma` call timings from any committed `*.min.mcp.js` execution logs in `DesignOps-plugin`, OR run the equivalent path once in DesignOps-plugin with `console.time` instrumentation and record the result.
   - Output a comparison table:

     | Input size | MCP baseline (s) | Plugin sandbox (s) | Speedup |
     | ---------- | ---------------- | ------------------ | ------- |
     | 10 vars    | …                | …                  | …×      |
     | 100 vars   | …                | …                  | …×      |
     | 400 vars   | …                | …                  | …×      |

### Visual / UX

- Minimal — single paste textarea + "Push" + result summary. No design polish required (spike).

### Technical / architectural

- **Lift reference — primary (the variable-push sequence specified for the legacy MCP path):**
  - `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` — **read it first**. Contains the exact mode-setup table per collection, the `setValueForMode` rules (COLOR / FLOAT / STRING / BOOLEAN / VARIABLE_ALIAS), the codeSyntax payload shape, and the dependency order. **The legacy two-layer split (Plugin API + REST PUT) is an MCP payload artifact — FigHub should use Plugin API for both, including `figma.variables.setVariableCodeSyntax`.**
  - `DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md` — per-collection variable lists (what to create).
  - `DesignOps-plugin/skills/create-design-system/conventions/01-collections.md` — 5-collection structure.
  - `DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — per-platform codeSyntax mapping.
  - `DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` — what to assert after the push.

- **Lift reference — secondary (canvas-table builder; for shape inspection only, not for push logic):**
  - `DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` (~57 KB / 1314 lines) — Primitives **canvas-table** builder. Reads variables via `ensureLocalVariableMapOnCtx` and binds paints. Useful to inspect the in-memory token shape used downstream (informs CTX-002), but does NOT contain `createVariableCollection` / `setValueForMode` push calls. **Sub-agent warning:** large file — load only if needed.
- Spike runs on a fresh Figma file; do NOT push against any client / production file.
- **Throwaway:** spike branch `spike/phase-0` is **not** merged to `main`. Findings + scripts are kept under this ticket folder; code is discarded.

---

## Acceptance criteria _(definition of done)_

- [x] All three criteria above complete with explicit pass/fail notes recorded in `research/`. _(Variable push: PASS. EVC Test 1: PASS; Tests 2–4: UNTESTED-ON-PLAN with documented rationale. Latency: PASS — G1 = YES.)_
- [x] `research/extended-collections.md` exists with EVC verification results. _(Test 1 PASS slot populated 2026-05-27; Tests 2–4 marked UNTESTED-ON-PLAN with pre-composed Enterprise follow-up sequences preserved.)_
- [x] `research/latency-benchmark.md` exists with the comparison table populated. _(§6.1 raw runs, §6.2 phase breakdown, §6.4 final comparison, §6.5 verdict all filled.)_
- [x] Phase 0 exit criteria (PRD §12) met: G1 latency target looks achievable; no platform blockers. _(spike-400 median = 606 ms; 10% of YES threshold. No platform blockers surfaced — six new gotchas captured as "Do not repeat" entries in `memory.md`, all bandwidth-of-life resolved during build.)_
- [x] Findings feed CTX-002 (canonical token model) — at minimum, a one-paragraph "EVC implication for token model" note in `research/extended-collections.md`. _(See `research/extended-collections.md` §2.4 — canonical model stays plan-agnostic; EVC = render-time projector. CTX-002 ready for promotion to Sprint 2 WO.)_
- [x] Spike branch is **not** merged to `main`; no production code change from this ticket. _(Per `Docs/lift-sources.md` §0 and the disposition rule in `research/spike-runbook.md` §6: code under `src/spike/**` and the UI dropdown block in `src/ui/App.tsx` are throwaway; the deliverables are the three populated research docs and the execution log under this ticket folder.)_

## Out of scope

- The 4 remaining variable collections (Theme, Typography, Layout, Effects) — Sprint 2.
- Style guide canvas building — Sprint 3.
- Any I/O source beyond paste — Sprint 2.
- Production-quality error handling, UI polish, or audit reporting — Sprint 2 owns the production build.
- Legacy (Detroit Labs Foundations) token input — Sprint 2 (adapter pattern).

---

## Testing & verification

### Functional QA

- Open the spike plugin in a fresh Figma file → paste a 10-variable W3C DTCG sample → click Push → observe variables appear in the file's variables panel under a "Primitives" collection with two modes (light, dark).
- Open the variables panel and confirm `codeSyntax` per platform is set on at least one variable.

### Visual / design QA

- N/A (spike).

### Accessibility

- N/A (spike).

### Telemetry / observability

- The spike UI prints latency to console + UI; record in `research/latency-benchmark.md`.

---

## Figma VQA Checklist

**Figma source (sandbox locked 2026-05-27; per-run timestamps filled when spike executes):**

| Field           | Value                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `file_key`      | `cVdPraIafWFBRZnzMPhtrW`                                                                       |
| `node_id`       | `0:1` (root page; per-run frame `node_id` recorded during execution)                           |
| Figma deep link | https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1                 |
| Frame / scope   | Spike Sandbox file — Primitives collection (Pro/Org tier; EVC tests 2–4 stay UNTESTED-ON-PLAN) |
| Captured at     | `<!-- ISO date — filled per spike run -->`                                                     |

Spike acceptance is checked **via research findings**, not via 1:1 UI assertions — populate the 28-row table only if a Sprint 2 follow-up demands it. For this spike, mark the table:

**N/A — spike ticket; variable-push correctness verified via `research/` outputs and Figma file inspection, not the visual assertion grid.**

---

## 🔍 Research complete (2026-05-27)

This ticket IS the research. The first research pass landed three deliverables; live in-file verification + measurements completed during BUILD on 2026-05-27:

- [Extended Collections findings + 5-collection model mapping + token-model implication for CTX-002](research/extended-collections.md) — EVC is **Enterprise-only**; canonical token model stays plan-agnostic with EVC as a render-time projector. **Test 1: PASS** (Pro/Org sandbox, 2026-05-27). Tests 2–4: UNTESTED-ON-PLAN with pre-composed Enterprise follow-up sequences preserved.
- [Latency benchmark methodology + measured results](research/latency-benchmark.md) — **G1 = YES.** spike-400 median = 606 ms vs <6000 ms threshold. Per-call rates at n=400 captured; ~144× speedup against extrapolated MCP baseline; full-bootstrap variable push extrapolates to ~904 ms (~3% of G1 budget).
- [Spike runbook for the BUILD agent](research/spike-runbook.md) — step-by-step reproducible play-by-play covering branch, Figma file selection, variable push, EVC tests, latency capture, acceptance checklist, throwaway disposition. _Source of truth used by the BUILD pass; no edits made — runbook prescribed the procedure that was followed verbatim._
- [Spike execution log](research/spike-execution-log.md) — durable record of the 2026-05-27 spike execution; full BenchRecord JSON for every run, phase breakdown, G1 verdict, CTX-002 confirmation, and Enterprise follow-up parking lot.

## ✅ Build phase complete (2026-05-27)

- BUILD pass executed on `spike/phase-0` branch off `main`.
- All four CI legs green (typecheck, lint, format, dual build).
- Six new "Do not repeat" entries promoted to `memory.md` (`code.js` ES2017 ceiling, `ui.html` script-placement rule, `String.prototype.replace` `$`-pattern footgun, `performance.now()` unavailable in main thread, `figma.showUI('')` empty-string footgun, slash-vs-dot variable-name grammar).
- Sprint 2 architecture commitment is unblocked. CTX-002 ready for promotion to a concrete Sprint 2 work order.

## 🛠️ Ready for `/vqa` and ticket closure

- `/vqa` is **N/A** for this ticket — acceptance is checked via the research deliverables, not a UI assertion grid (see `## Figma VQA Checklist` below).
- After user confirms the verdict, this ticket can move to Completed. The `spike/phase-0` branch stays unmerged per the disposition rule in `research/spike-runbook.md` §6.

## References

- PRD: `Docs/PRD.md` §12 (Phase 0), §6.1 FR-BOOT-3..6, §14 (latency target G1), §16 OQ-1 / OQ-2
- Lift-source map: `Docs/lift-sources.md` — read §0 (drift corrections) and §3 (canvas bundle sizes) before opening any `.mcp.js` file.
- Lift reference (CRITICAL — read before writing code):
  - **Primary:** `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md`
  - **Primary:** `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/14-audit.md`
  - Secondary (large; inspect-only): `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
- [Extended Collections research](research/extended-collections.md)
- [Latency benchmark](research/latency-benchmark.md)
- [Spike runbook](research/spike-runbook.md)
