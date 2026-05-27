---
type: work-order
github_issue: 10
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt49nM
---

## Goal

Implement the two token-input adapters that normalize external token formats into Figmint's canonical internal token model: (a) **W3C DTCG** (`$value` / `$type` style) and (b) **legacy Detroit Labs Foundations** shape (carried forward from `DesignOps-plugin`). Both adapters return the same `TokensV1` canonical shape. This is what FR-BOOT-2 requires before the variable push engine (WO-008) can consume tokens uniformly.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-1..2, §8.2 (`tokens` hybrid contract).

---

## Problem story

As Figmint's variable-push engine, I want a single canonical `TokensV1` shape on input so I never branch on token format below the adapter layer.

## Hypothesis (optional)

Two thin adapters + one canonical shape (locked in promoted CTX-002) keep token-format support pluggable: future formats (Tokens Studio JSON, Style Dictionary native) drop in as new adapters without touching the engine.

---

## User stories

- [ ] As an engine developer, `import { adapt } from '@figmint/io/adapters'` returns `TokensV1` for any supported input.
- [ ] As a future maintainer, I can add a new format adapter by implementing one function and registering it.

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/io/sources/adapters/dtcg.ts` — `adaptDTCG(input: TokensV1WC3DTCG): TokensV1`.
2. `src/io/sources/adapters/legacy.ts` — `adaptLegacy(input: TokensV1Legacy): TokensV1`.
3. `src/io/sources/adapters/detect.ts` — `detectFormat(raw: unknown): "dtcg" | "legacy" | null` per PRD §8.2 detection rules.
4. `src/io/sources/adapters/index.ts` — `adapt(raw: unknown): TokensV1 | FormatError` (top-level entry; dispatches via `detectFormat`).
5. Lossless round-trip: `adapt(input)` followed by `serialize<Format>(canonical)` returns input modulo whitespace.

### Visual / UX

- N/A.

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` — in-memory token shape used during the legacy push; primary source for `TokensV1Legacy` adapter semantics
  - `skills/create-design-system/conventions/01-collections.md` — 5-collection model the canonical shape must express
  - `skills/create-design-system/conventions/02-codesyntax.md` — codeSyntax-per-platform attachment
  - `skills/create-component/conventions/07-token-paths.md` — token path / naming conventions
- W3C DTCG reference: https://www.w3.org/community/design-tokens/ (cite in code comments).
- Adapters are pure functions; no I/O, no Figma API calls.

---

## Acceptance criteria *(definition of done)*

- [ ] Both adapters export and pass unit tests on a fixture of ≥20 tokens each (color, dimension, typography, shadow).
- [ ] `detectFormat` correctly identifies dtcg vs legacy vs invalid for all fixtures.
- [ ] Round-trip test passes for at least 3 representative input documents per format.
- [ ] Canonical shape matches the decision locked in promoted CTX-002 (this ticket may not start until CTX-002 promotion lands).
- [ ] `tsc --noEmit` clean.

## Out of scope

- Variable push engine consumption (WO-008).
- Output serializers (Sprint 4 / WO-019).
- Tokens Studio / Style Dictionary native adapters (later).
- codeSyntax mapping per platform (WO-009).

---

## Testing & verification

### Functional QA

- Vitest unit tests for each adapter + the detector + round-trip fixtures.

### Visual / design QA

- N/A.

### Accessibility

- N/A.

### Telemetry / observability

- N/A.

---

## Figma VQA Checklist

**N/A — no Figma artifact (adapter / library ticket).**

---

## 🔍 Ready for `/research`

- Confirm canonical shape from promoted CTX-002 decision doc before writing adapters.

## 📋 Ready for `/plan`

- Dependencies: WO-003 (contract types), promoted CTX-002 (canonical shape locked).
- `plan.md` enumerates the fixtures + the exact field-by-field mapping per adapter.

## 🛠️ Ready for `/build`

- `/code-build` + `/script-build` (test fixtures) in parallel.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-1..2, §8.2
- Lift reference: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` + `conventions/01-collections.md`, `02-codesyntax.md`, `create-component/conventions/07-token-paths.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
