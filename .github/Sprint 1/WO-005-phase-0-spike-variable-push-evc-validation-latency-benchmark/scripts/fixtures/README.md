# WO-005 spike fixtures (SPIKE-SCOPE — throwaway reference)

> **Lifecycle:** Generated artifacts. Survive past the `spike/phase-0` branch close (per `plan.md` Step 14) as a durable reference for Sprint 2 architecture decisions. **Not** for production use; **not** to be lifted into `src/core/variables/` when Sprint 2 reimplements the canonical push engine (WO-007 / WO-008 / WO-009).

## What lives here

| File             | Tokens | Modes              | Purpose (per `../../plan.md`)                                                                                       |
| :--------------- | :----- | :----------------- | :------------------------------------------------------------------------------------------------------------------ |
| `spike-10.json`  | 10     | 2 (`light`,`dark`) | **Smoke test** (Plan Step 5). Verifies `setValueForMode` across multiple modes + variable panel render.             |
| `spike-100.json` | 100    | 1 (`Default`)      | **Latency mid-point** (Plan Step 8). Representative of one realistic design-system collection.                      |
| `spike-400.json` | 400    | 1 (`Default`)      | **Latency stress point** (Plan Step 8). Drives PRD §14 G1 verdict — see `../../research/latency-benchmark.md` §6.5. |

All three are valid W3C DTCG JSON with the `$extensions.fighub.{modes, codeSyntax}` envelope from `research/spike-runbook.md` §1.1.

## How they're generated

`../generate-fixtures.mjs` — pure Node ESM, zero deps. Hex values come from deterministic FNV-1a 32-bit hashes of each token name (low 24 bits → hex). Re-running the generator with the same source code reproduces byte-identical files; that's the property the latency comparison depends on.

To regenerate (only do this if the generator script itself changes, otherwise the JSON files are stable):

```bash
node ".github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/scripts/generate-fixtures.mjs"
```

The generator also emits `src/spike/fixtures.ts` (consumed by the spike UI's "Load fixture" dropdown). That `.ts` file is **branch-only throwaway** — it disappears when `spike/phase-0` is deleted. The JSON files here, the generator script, and this README **survive**.

## When to delete this whole folder

When ALL three are true:

1. WO-005 ticket is closed (research docs filled in, ticket VQA checklist done).
2. Sprint 2 (WO-007 / WO-008 / WO-009) has its own fixture set under `src/core/variables/__fixtures__/` (or wherever the canonical home ends up), generated from real design systems.
3. PRD §14 G1 verdict has been re-validated against the canonical fixtures, not these synthetic ones.

Until all three hold, keep this folder — re-running a latency benchmark against an old branch hash needs these exact bytes to be apples-to-apples comparable.

## What you must NOT do

- **Don't import these JSON files from `src/core/*`** — they are spike-only. Sprint 2 canonical code must own its own fixtures.
- **Don't edit the JSON by hand** — re-run the generator. Hand-edits break the determinism guarantee and break the latency comparison.
- **Don't add new fixture sizes here** (e.g. spike-800) — open a follow-up ticket if the latency curve needs more data points; this folder is locked to the 10/100/400 set captured in the plan.
