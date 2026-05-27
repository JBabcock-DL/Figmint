---
type: work-order
github_issue: 7
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt4CLw
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

The variable-push logic in `DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` is already correct Plugin API code — wrapped in MCP transport. Stripping the wrapper and running it directly in the plugin sandbox will (a) succeed without modification and (b) finish in <2s for the small input sizes we test.

---

## User stories

- [ ] As a Sprint 2 lead, I can read `research/extended-collections.md` and know whether the 5-collection theming model is viable as-is or needs adjustment.
- [ ] As a Sprint 2 lead, I can read `research/latency-benchmark.md` and know whether G1 is realistic.
- [ ] As a Sprint 2 lead, I can re-run the spike's variable push manually in a fresh Figma file and observe variables appearing.

## Design reference *(when UI work applies)*

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

2. **EVC validation:**
   - Create a parent collection + an extended collection via Plugin API.
   - Verify: extended collection inherits modes from parent.
   - Verify: extended collection can override individual variable values without breaking the inheritance link.
   - Verify: a `removeVariableValueOverride` (or equivalent) reverts back to parent value.
   - Document each verification with explicit `PASS` / `FAIL` notes plus the exact API call sequence used.

3. **Latency benchmark:**
   - Measure end-to-end push latency for three input sizes: **10**, **100**, **400** variables.
   - For baseline: pull recent `use_figma` call timings from any committed `*.min.mcp.js` execution logs in `DesignOps-plugin`, OR run the equivalent path once in DesignOps-plugin with `console.time` instrumentation and record the result.
   - Output a comparison table:

     | Input size | MCP baseline (s) | Plugin sandbox (s) | Speedup |
     |---|---|---|---|
     | 10 vars | … | … | …× |
     | 100 vars | … | … | …× |
     | 400 vars | … | … | …× |

### Visual / UX

- Minimal — single paste textarea + "Push" + result summary. No design polish required (spike).

### Technical / architectural

- **Lift reference (the variable push IS already written, just MCP-wrapped):**
  - `DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` — **read it**. Inside the MCP wrapper is the actual `figma.variables.createVariableCollection` / `setValueForMode` / `setVariableCodeSyntax` sequence. Strip the wrapper, drop into the spike plugin. **Most of acceptance criterion 1 already exists.**
  - `DesignOps-plugin/skills/create-design-system/conventions/01-collections.md` — 5-collection structure
  - `DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — per-platform mapping pattern
  - `DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` — what to assert after the push
- Spike runs on a fresh Figma file; do NOT push against any client / production file.
- **Throwaway:** spike branch `spike/phase-0` is **not** merged to `main`. Findings + scripts are kept under this ticket folder; code is discarded.

---

## Acceptance criteria *(definition of done)*

- [ ] All three criteria above complete with explicit pass/fail notes recorded in `research/`.
- [ ] `research/extended-collections.md` exists with EVC verification results.
- [ ] `research/latency-benchmark.md` exists with the comparison table populated.
- [ ] Phase 0 exit criteria (PRD §12) met: G1 latency target looks achievable; no platform blockers.
- [ ] Findings feed CTX-002 (canonical token model) — at minimum, a one-paragraph "EVC implication for token model" note in `research/extended-collections.md`.
- [ ] Spike branch is **not** merged to `main`; no production code change from this ticket.

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

**Figma source (filled when spike runs):**

| Field | Value |
| --- | --- |
| `file_key` | `<!-- filled by spike runner against sandbox file -->` |
| `node_id` | `<!-- filled by spike runner -->` |
| Figma deep link | `<!-- filled by spike runner -->` |
| Frame / scope | Spike sandbox file (Primitives collection) |
| Captured at | `<!-- ISO date -->` |

Spike acceptance is checked **via research findings**, not via 1:1 UI assertions — populate the 28-row table only if a Sprint 2 follow-up demands it. For this spike, mark the table:

**N/A — spike ticket; variable-push correctness verified via `research/` outputs and Figma file inspection, not the visual assertion grid.**

---

## 🔍 Ready for `/research`

- This whole ticket IS the research. Write outputs as you go:
  - `research/extended-collections.md` — EVC findings + pass/fail per assumption + token-model implications
  - `research/latency-benchmark.md` — comparison table vs MCP baseline
  - `research/spike-runbook.md` (optional) — exact reproduction steps for the next person

## 📋 Ready for `/plan`

- Dependencies: WO-002 (plugin scaffold).
- `plan.md` should enumerate the three deliverables + which Figma file the spike targets.

## 🛠️ Ready for `/build`

- After WO-002: `/code-build` (the spike code itself) + `/figma-build` is **not** applicable here (no canvas authoring beyond variables). `/doc-build` writes `research/*.md`.

## References

- PRD: `Docs/PRD.md` §12 (Phase 0), §6.1 FR-BOOT-3..6, §14 (latency target G1), §16 OQ-1 / OQ-2
- Lift reference (CRITICAL — read before writing code):
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/14-audit.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
