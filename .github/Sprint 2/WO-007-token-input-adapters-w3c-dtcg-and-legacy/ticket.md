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

Two thin adapters + one canonical shape (locked in WO-055) keep token-format support pluggable: future formats (Tokens Studio JSON, Style Dictionary native) drop in as new adapters without touching the engine.

---

## User stories

- [ ] As an engine developer, `import { adapt } from '@figmint/io/sources/adapters'` returns `TokensV1` for any supported input.
- [ ] As a future maintainer, I can add a new format adapter by implementing one function and registering it.

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/io/sources/adapters/dtcg.ts` — `adaptDTCG(input: TokensV1WC3DTCG): TokensV1`. Top-level DTCG groups **must** be kebab-case `CollectionId` keys (`primitives`, `theme`, `typography`, `layout`, `effects`); nested groups flatten to slash `name`. Parse DTCG aliases `{primitives.color.primary.500}` → `{ aliasOf: { collection: 'primitives', name: 'color/primary/500' } }` (dot→slash; first segment = collection). Fold `$extensions.figmint.modes` → `valuesByMode`; `$extensions.figmint.codeSyntax` → flat `codeSyntax` (`WEB` / `ANDROID` / `iOS`).
2. `src/io/sources/adapters/legacy.ts` — `adaptLegacy(input: TokensV1Legacy): TokensV1`. Map Title-Case `collections[].name` → kebab `CollectionId`; preserve slash `variables[].name` verbatim (never dots). Bare alias strings (Theme→Primitives default) → structured `aliasOf`. Normalize mode keys to Figma casing (`Light`/`Dark`, not `light`/`dark`).
3. `src/io/sources/adapters/detect.ts` — `detectFormat(raw: unknown): 'dtcg' | 'legacy' | null`. Reuse WO-006 stage-2 legacy whitelist + stage-3 DTCG leaf walk on **parsed** JSON only (not raw string — that is `detectContract`'s job at IO layer).
4. `src/io/sources/adapters/index.ts` — `adapt(raw: unknown): TokensV1 | FormatError` (top-level entry; dispatches via `detectFormat`; passthrough when already `v: 1 && kind: 'tokens'`).
5. Lossless round-trip: `adapt(input)` followed by `serialize<Format>(canonical)` returns input modulo whitespace (runtime VariableIds never stored — see research §Round-trip).

### Visual / UX

- N/A.

### Technical / architectural

- **LOCKED:** Module path `src/io/sources/adapters/` per PRD §7.3 (not flat `src/io/adapters/`).
- **LOCKED:** DTCG top-level group = `CollectionId`; token `name` = nested path joined with `/`.
- **LOCKED:** Legacy Theme/Layout/Typography/Effects alias strings default target collection `primitives` unless prefix matches another collection namespace.
- **LOCKED:** Figma variable names use slashes only — reject or transform dots (`memory.md` "Do not repeat").
- **LOCKED:** `detectContract` (WO-006, `src/io/sources/detect.ts`) selects contract file kind; `detectFormat` (WO-007) distinguishes DTCG vs legacy wire shapes after parse.
- **Lift reference (DesignOps-plugin) — corrected per `Docs/lift-sources.md` §0:**
  - `skills/create-design-system/data/theme-aliases.json` — Theme alias rows + rawLiterals (primary legacy token data)
  - `skills/create-design-system/phases/02-steps5-9.md` — per-collection variable lists + mode strategy
  - `skills/create-design-system/data/primitives-baseline.json`, `layout-effects.json`, `typography-slots.json` — Primitives / Layout / Effects / Typography data
  - `skills/create-design-system/conventions/01-collections.md` — 5-collection model
  - `skills/create-design-system/conventions/02-codesyntax.md` — codeSyntax-per-platform (`WEB`, `ANDROID`, `iOS`)
  - `skills/create-component/conventions/07-token-paths.md` — slash token paths = Figma variable names
  - **NOT** `canvas-templates/bundles/step-15a-primitives.mcp.js` (canvas reader only — does not define token data)
- W3C DTCG reference: https://www.w3.org/community/design-tokens/ (cite in code comments).
- Adapters are pure functions; no I/O, no Figma API calls.

---

## Acceptance criteria _(definition of done)_

- [ ] Both adapters export and pass unit tests on a fixture of ≥20 tokens each (color, dimension, typography, shadow, alias across collections, multi-mode).
- [ ] `detectFormat` correctly identifies dtcg vs legacy vs invalid for all fixtures (aligned with WO-006 stage-2/stage-3 discriminators).
- [ ] Round-trip test passes for at least 3 representative input documents per format.
- [ ] Canonical shape matches the decision locked in WO-055 ([canonical-token-model.md](../../Sprint%201/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md)).
- [ ] `tsc --noEmit` clean.

## Out of scope

- Variable push engine consumption (WO-008).
- Output serializers (Sprint 4 / WO-019).
- Tokens Studio / Style Dictionary native adapters (later).
- codeSyntax derivation rules for tokens missing explicit triples (WO-009).

---

## Testing & verification

### Functional QA

- Vitest unit tests for each adapter + the detector + round-trip fixtures under `src/io/sources/adapters/__fixtures__/`.

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

- ~~Confirm canonical shape from promoted CTX-002 decision doc before writing adapters.~~ **Done** — see WO-055 research + [token-adapter-field-mapping.md](research/token-adapter-field-mapping.md).

## 📋 Ready for `/plan`

- Dependencies: WO-003 (contract types), WO-055 (canonical shape locked), WO-006 (`detectContract` boundary).
- `plan.md` enumerates the fixtures + the exact field-by-field mapping per adapter (research doc is the source).

## 🛠️ Ready for `/build`

- `/code-build` + `/script-build` (test fixtures) in parallel.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-1..2, §7.3, §8.2
- Canonical model: [WO-055 canonical-token-model.md](../../Sprint%201/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md)
- IO detector boundary: [WO-006 io-subsystem-design.md](../WO-006-io-subsystem-foundation-paste-file-clipboard/research/io-subsystem-design.md)
- **Research (this ticket):** [token-adapter-field-mapping.md](research/token-adapter-field-mapping.md)
- Lift reference (corrected): `DesignOps-plugin/skills/create-design-system/data/theme-aliases.json`, `phases/02-steps5-9.md`, `data/primitives-baseline.json`, `data/layout-effects.json`, `conventions/01-collections.md`, `02-codesyntax.md`, `create-component/conventions/07-token-paths.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
