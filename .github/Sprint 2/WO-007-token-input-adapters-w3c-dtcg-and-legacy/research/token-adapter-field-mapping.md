# Token Input Adapters — Field-by-Field Mapping (WO-007)

> **Status:** ✅ Research complete — mappings locked for `/plan` and `/build`.
> **Date:** 2026-05-27
> **Owner:** WO-007 (Sprint 2)
> **PRD anchors:** §6.1 FR-BOOT-1..2, §7.3 (`src/io/sources/adapters/`), §8.2 (tokens hybrid contract)
> **Upstream:** [WO-055 canonical token model](../../Sprint%201/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md) (authoritative `TokensV1` shape)

---

## Summary

WO-007 implements two pure adapters (`adaptDTCG`, `adaptLegacy`) plus a token-format detector (`detectFormat`) that normalize external token JSON into the locked `TokensV1` canonical shape. **Legacy token data does not live in `step-15a-primitives.mcp.js`** (canvas-table reader only); authoritative legacy field names come from `DesignOps-plugin/skills/create-design-system/data/theme-aliases.json`, `phases/02-steps5-9.md`, and convention shards `01-collections.md`, `02-codesyntax.md`, `07-token-paths.md`.

**Locked decisions:**

1. **Module path:** `src/io/sources/adapters/` (PRD §7.3 — not a flat `src/io/adapters/`).
2. **DTCG collection convention:** top-level group keys **must** be kebab-case `CollectionId` literals (`primitives`, `theme`, `typography`, `layout`, `effects`); nested JSON groups flatten to slash-separated `name`.
3. **Legacy alias resolution:** bare slash-path strings in Theme/Layout/Typography/Effects rows default to `aliasOf.collection: 'primitives'` unless the path prefix matches another collection's namespace.
4. **Detection boundary:** `detectContract` (WO-006, IO layer) picks the contract file kind; `detectFormat` (WO-007, adapter layer) distinguishes DTCG nested vs legacy `collections[]` **after JSON parse** on token payloads only.
5. **Figma variable names:** always slash-separated; never dots (`memory.md` "Do not repeat").

---

## Key Findings

### A. Corrected lift-source pointer

Per `Docs/lift-sources.md` §0, **`step-15a-primitives.mcp.js` does NOT create variables** — it reads existing variables for style-guide canvas tables. Legacy token **data** and field semantics live in:

| Source                                           | Role                            | Key field names                                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/theme-aliases.json`                        | Theme collection (Step 6)       | `collection`, `modes`, `rows[]`, `rawLiterals[]`; row: `path`, `light`, `dark`, `codeSyntax`; literal row: `path`, `light`/`dark` as `{r,g,b,a}`, `codeSyntax`, optional `note` |
| `data/primitives-baseline.json`                  | Primitives (Step 5)             | `collection`, ramp `path` pattern `color/{ramp}/{stop}`, `Space/*`, `Corner/*`, `elevation/*`, `typeface/*`, `font/weight/medium`; `codeSyntaxRules`                            |
| `data/layout-effects.json`                       | Layout + Effects (Steps 8–9)    | Layout: `spacing[]`, `radius[]` with `path`, `alias`, `codeSyntax`; Effects: `color` (RGBA per mode), `blurs[]` with `path`, `alias`, `codeSyntax`                              |
| `data/typography-slots.json`                     | Typography (Steps 7–7b)         | `baseSlots`, `fontFamilyAliases`, `bodyVariants`, `codeSyntaxRules`                                                                                                             |
| `phases/02-steps5-9.md`                          | Per-collection generation rules | Mode lists, alias targets, scaling formula, rawLiterals vs alias rows                                                                                                           |
| `conventions/01-collections.md`                  | Five collections + modes        | Title-Case display names; mode strategy per collection                                                                                                                          |
| `conventions/02-codesyntax.md`                   | Platform triple                 | Keys **`WEB`**, **`ANDROID`**, **`iOS`** (never `IOS`)                                                                                                                          |
| `create-component/conventions/07-token-paths.md` | Path = Figma variable name      | Slash paths; Theme `color/<role>/<tier>`, Layout `space/*` / `radius/*`, Typography `<Scale>/<Size>/font-family`                                                                |

The `TokensV1Legacy` wire shape (`collections[].variables[].valuesByMode`) is the **normalized ingest target** for `adaptLegacy`. Raw Detroit Labs JSON files (`theme-aliases.json` rows with `light`/`dark` keys) are converted to `TokensV1Legacy` by a fixture loader or upstream normalizer before `adaptLegacy` runs — field mapping below covers both the wire contract and the legacy source semantics.

### B. Table 1 — W3C DTCG → TokensV1 (`adaptDTCG`)

| DTCG source                                                        | Canonical `TokensV1` target         | Rule / algorithm                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document root                                                      | `v: 1`, `kind: 'tokens'`            | Always emitted by adapter (canonical envelope)                                                                                                                                                                                                                              |
| Top-level group key (e.g. `theme`, `primitives`)                   | `Token.collection`                  | **LOCKED:** key must ∈ `{primitives, theme, typography, layout, effects}` (kebab-case `CollectionId`). Error if unknown top-level key.                                                                                                                                      |
| Nested group path under top-level                                  | `Token.name`                        | Join remaining segments with `/` (e.g. `theme.color.primary.default` → `name: 'color/primary/default'`). Never emit `.` in name.                                                                                                                                            |
| Leaf without `$value`/`$type`                                      | —                                   | Skip (group node only)                                                                                                                                                                                                                                                      |
| `$type` on leaf                                                    | `Token.type`                        | See **DTCG type → Figma type** table below. Inherited from nearest ancestor group per DTCG §5.2.2 — resolved at walk time so every leaf has explicit type.                                                                                                                  |
| `$type` on ancestor group                                          | (resolved onto leaf)                | Walk accumulates `$type` from parent chain; leaf `$type` overrides.                                                                                                                                                                                                         |
| `$value` string `#RRGGBB` or `#RRGGBBAA`                           | `ColorValue` `{r,g,b,a}` 0..1       | Parse hex; alpha defaults to 1 if omitted.                                                                                                                                                                                                                                  |
| `$value` string `rgb()` / `rgba()`                                 | `ColorValue`                        | Parse to 0..1 RGBA.                                                                                                                                                                                                                                                         |
| `$value` dimension `"16px"`, `"1.5rem"`                            | `number` (FLOAT token)              | Strip unit; store numeric px as FLOAT (`rem` → px at 16px base unless `$extensions.figmint.unit` overrides).                                                                                                                                                                |
| `$value` plain number                                              | `number`                            | FLOAT token literal.                                                                                                                                                                                                                                                        |
| `$value` boolean                                                   | `boolean`                           | BOOLEAN token literal.                                                                                                                                                                                                                                                      |
| `$value` string (non-color, non-alias)                             | `string`                            | STRING token literal (e.g. font family name when `$type: 'fontFamily'`).                                                                                                                                                                                                    |
| `$value` `{...}` shadow composite                                  | Decompose or reject                 | **Phase 1:** if `$type: 'shadow'`, map to Effects collection token(s) per Detroit Labs shape (`shadow/color`, `shadow/{tier}/blur`) or emit `FormatError` for unsupported composites — do not silently drop.                                                                |
| `$value` `{ fontFamily, fontSize, ... }` typography composite      | Decompose to Typography tokens      | Split into per-property tokens under `typography` collection matching `Display/LG/font-size` pattern, or emit structured error. Single composite → multiple canonical tokens is **one-way expand** (round-trip merges only if unambiguous).                                 |
| `$value` `"{group.token.ref}"` (curly alias)                       | `{ aliasOf: { collection, name } }` | Strip `{}`; split on `.`; **first segment** = `collection` (must match `CollectionId`); remaining segments joined with `/` after dot→slash on each segment → `name`. Example: `{primitives.color.primary.500}` → `{ collection: 'primitives', name: 'color/primary/500' }`. |
| `$value` same-collection alias `{color.primary.500}`               | `{ aliasOf: { collection, name } }` | If first segment is NOT a known `CollectionId`, treat current walk's top-level group as `collection`; join rest with `/`.                                                                                                                                                   |
| Default single-mode value in `$value`                              | `valuesByMode['Default']`           | When no mode extensions present and collection is Primitives or Layout.                                                                                                                                                                                                     |
| `$extensions.figmint.modes`                                        | `valuesByMode`                      | Keys = mode names (`Light`, `Dark`, `85`…`200`); values parsed per same rules as `$value`. Fold into `valuesByMode`; do not duplicate default mode.                                                                                                                         |
| `$extensions.figmint.modes` missing; collection = Theme or Effects | `valuesByMode`                      | Infer `Light`/`Dark` from dual `$value` pattern not used — require extensions or error.                                                                                                                                                                                     |
| `$extensions.figmint.codeSyntax`                                   | `Token.codeSyntax`                  | Copy `{ WEB?, ANDROID?, iOS? }` verbatim; validate keys ∈ `CodeSyntaxPlatform`.                                                                                                                                                                                             |
| `$description`                                                     | `Token.description`                 | Direct copy.                                                                                                                                                                                                                                                                |
| `$deprecated`                                                      | `Token.deprecated`                  | Direct copy (`boolean \| string`).                                                                                                                                                                                                                                          |
| Other `$extensions.*` (non-figmint)                                | `Token.extensions`                  | Preserve vendor keys verbatim for round-trip.                                                                                                                                                                                                                               |
| `$schema`                                                          | (ignored on ingest)                 | May re-emit on export; not stored in canonical.                                                                                                                                                                                                                             |
| (derived)                                                          | `collections[]` metadata            | Emit five `Collection` entries in dependency order with locked mode lists (see below).                                                                                                                                                                                      |

**DTCG nested traversal algorithm:**

```
function walkDtcg(node, collectionId, pathSegments[], inheritedType):
  if node has $value AND $type (or inheritedType):
    emit Token { collection: collectionId, name: join(pathSegments,'/'), type, valuesByMode, ... }
  else for each child key k not starting with '$':
    walkDtcg(node[k], collectionId, pathSegments + [k], node.$type ?? inheritedType)
```

**Collection → default modes (locked, from `01-collections.md`):**

| `CollectionId` | `Collection.modes`                                 |
| -------------- | -------------------------------------------------- |
| `primitives`   | `['Default']`                                      |
| `theme`        | `['Light', 'Dark']`                                |
| `typography`   | `['85','100','110','120','130','150','175','200']` |
| `layout`       | `['Default']`                                      |
| `effects`      | `['Light', 'Dark']`                                |

**DTCG `$type` → Figma `VariableResolvedDataType` (locked):**

| DTCG `$type`                       | Canonical `Token.type` | Value shape in `valuesByMode`            |
| ---------------------------------- | ---------------------- | ---------------------------------------- |
| `color`                            | `COLOR`                | `ColorValue`                             |
| `dimension`                        | `FLOAT`                | `number` (px)                            |
| `number`                           | `FLOAT`                | `number`                                 |
| `fontFamily`                       | `STRING`               | `string`                                 |
| `fontWeight`                       | `FLOAT`                | `number`                                 |
| `duration`                         | `FLOAT`                | `number` (ms)                            |
| `cubicBezier`                      | `STRING`               | JSON-stringify composite                 |
| `shadow`                           | `COLOR` or `FLOAT`     | Decomposed per Effects model             |
| `typography`                       | (decomposed)           | Multiple tokens                          |
| `border`, `transition`, `gradient` | `FormatError` in v1    | Unsupported until explicit mapping added |

### C. Table 2 — TokensV1Legacy → TokensV1 (`adaptLegacy`)

| Legacy wire / source field                                         | Canonical `TokensV1` target                                            | Rule / algorithm                                                                                                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------ | ------------------------------------ |
| (document)                                                         | `v: 1`, `kind: 'tokens'`                                               | Emitted by adapter                                                                                                                     |
| `collections[].name` `'Primitives'`…`'Effects'`                    | `Collection.id`                                                        | Title-Case → kebab `CollectionId`: `Primitives→primitives`, `Theme→theme`, `Typography→typography`, `Layout→layout`, `Effects→effects` |
| `collections[].modes`                                              | `Collection.modes`                                                     | Copy verbatim (must match locked mode lists; warn/error on mismatch)                                                                   |
| `collections[]` (order)                                            | `collections[]` order                                                  | Reorder to canonical dependency order: primitives → theme → typography → layout → effects                                              |
| `variables[].name`                                                 | `Token.name`                                                           | Slash path verbatim (`color/primary/default`). Reject names containing `.`.                                                            |
| `variables[].type` `'COLOR'                                        | 'FLOAT'                                                                | 'STRING'                                                                                                                               | 'BOOLEAN'` | `Token.type` | Direct copy (already Figma literals) |
| `variables[].valuesByMode[modeName]` string matching `^#` or `rgb` | `ColorValue`                                                           | Parse to 0..1 RGBA                                                                                                                     |
| `variables[].valuesByMode[modeName]` object `{r,g,b,a}`            | `ColorValue`                                                           | Direct copy (from `rawLiterals` rows)                                                                                                  |
| `variables[].valuesByMode[modeName]` number                        | `number`                                                               | FLOAT literal                                                                                                                          |
| `variables[].valuesByMode[modeName]` boolean                       | `boolean`                                                              | BOOLEAN literal                                                                                                                        |
| `variables[].valuesByMode[modeName]` string slash path (alias)     | `{ aliasOf: { collection, name } }`                                    | See **legacy alias resolution** below                                                                                                  |
| `variables[].codeSyntax`                                           | `Token.codeSyntax`                                                     | Copy `{ WEB?, ANDROID?, iOS? }`; reject `IOS` key with hint                                                                            |
| (missing type on Theme rows)                                       | `type: 'COLOR'`                                                        | Default for Theme collection per legacy data                                                                                           |
| `theme-aliases.json` `rows[].path`                                 | `name`                                                                 | Maps to `variables[].name` when building legacy wire                                                                                   |
| `rows[].light` / `rows[].dark`                                     | `valuesByMode.Light` / `.Dark`                                         | Mode keys Title-Case per Figma (`Light`, not `light`)                                                                                  |
| `rows[].light` alias string `color/neutral/100`                    | `{ aliasOf: { collection: 'primitives', name: 'color/neutral/100' } }` | Theme→Primitives is the dominant cross-collection direction                                                                            |
| Layout `alias: "Space/100"`                                        | `{ aliasOf: { collection: 'primitives', name: 'Space/100' } }`         | Layout→Primitives                                                                                                                      |
| Typography `font-family` alias `typeface/display`                  | `{ aliasOf: { collection: 'primitives', name: 'typeface/display' } }`  | Typography→Primitives                                                                                                                  |
| Effects blur `alias: "elevation/100"`                              | `{ aliasOf: { collection: 'primitives', name: 'elevation/100' } }`     | Effects→Primitives                                                                                                                     |
| `rawLiterals` RGBA rows                                            | `valuesByMode` with `ColorValue`                                       | No alias — opacity tokens                                                                                                              |
| `note` on source row                                               | `description?`                                                         | Optional map to `Token.description`                                                                                                    |

**Legacy alias resolution (bare slash-path strings):**

| Source collection | String pattern                             | `aliasOf.collection`         | `aliasOf.name`                                                                                           |
| ----------------- | ------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `theme`           | `color/*`, `color/state/*`                 | `primitives`                 | path verbatim                                                                                            |
| `layout`          | `Space/*`, `Corner/*` in alias target      | `primitives`                 | alias target verbatim (Title-Case segment preserved: `Space/100`)                                        |
| `typography`      | `typeface/*`, `font/weight/*`, `Body/*`, … | `primitives` or `typography` | If target starts with `typeface/` or `font/` → `primitives`; if `Body/`, `Display/`, etc. → `typography` |
| `effects`         | `elevation/*`                              | `primitives`                 | path verbatim                                                                                            |
| Any               | `primitives:`-style prefix (future)        | explicit prefix              | remainder                                                                                                |

Mode key normalization for legacy source files using lowercase `light`/`dark`: normalize to `Light`/`Dark` during legacy-wire construction (before or inside `adaptLegacy`).

### D. `detectFormat` vs WO-006 `detectContract`

| Concern                     | Owner                                                          | Input                                        | Output                                                                                                                                                   | Scope                                                                                                  |
| --------------------------- | -------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Which contract file?**    | `detectContract` in `src/io/sources/detect.ts` (WO-006)        | Raw JSON **string**                          | `ContractKind \| null` — includes `ops-program`, `component-spec`, `drift-report`, `handoff-context`, `registry`, **`tokens-legacy`**, **`tokens-dtcg`** | All §8 contract types; 3-stage: (1) `v:1`+`kind`, (2) legacy collections whitelist, (3) DTCG leaf walk |
| **Which token wire shape?** | `detectFormat` in `src/io/sources/adapters/detect.ts` (WO-007) | Parsed **`unknown`** (already `JSON.parse`d) | `'dtcg' \| 'legacy' \| null`                                                                                                                             | Token payloads only — called after IO knows kind is token-related OR when adapting raw token JSON      |

**`detectFormat` discriminators (reuse WO-006 stages 2–3):**

1. **Legacy (check first):** `typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.collections) && raw.collections.length > 0 && typeof raw.collections[0].name === 'string' && raw.collections[0].name ∈ {Primitives, Theme, Typography, Layout, Effects} && Array.isArray(raw.collections[0].variables)` → `'legacy'`.
2. **DTCG (check second):** recursive walk (max depth 12); skip keys `$schema` and `$`-prefixed; true if any object has both `$value` and `$type` where `$type` ∈ 12-value `DtcgTokenType` enum from `packages/contracts/src/tokens.v1.ts` → `'dtcg'`.
3. **Neither:** `null`.

**Not `detectFormat`'s job:** canonical `TokensV1` with `v: 1 && kind: 'tokens'` — `adapt()` passes through or validates separately. **Not `detectContract`'s job:** field-level normalization.

**Call sequence:**

```
JSON string → detectContract → 'tokens-dtcg' | 'tokens-legacy'
           → JSON.parse → detectFormat (confirm/narrow) → adaptDTCG | adaptLegacy → TokensV1
```

### E. Round-trip strategy ("lossless")

**Definition:** `serialize<Format>(adapt(input))` reproduces the input document's **semantic token data**; whitespace and key ordering may differ.

| Direction                   | Serializer owner                  | Lossless fields                                                                                                        | Intentional non-round-trip                                                                 |
| --------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| DTCG → canonical → DTCG     | WO-019 (Sprint 4) / stub in tests | All tokens, `$type`, `$value`, `$extensions.figmint.*`, vendor `$extensions`, aliases as `{collection.path.with.dots}` | `$schema` URL may differ; group re-nesting uses locked top-level=`CollectionId` convention |
| Legacy → canonical → legacy | WO-019 / test stub                | `collections[]`, modes, variables, codeSyntax triples, alias strings                                                   | Collection order normalized; mode key casing normalized to Title-Case names                |

**DTCG re-nesting algorithm (export):**

```
for each Token t:
  ensure root[t.collection] exists
  walk segments of t.name split by '/':
    create nested groups; at leaf emit { $type, $value, $extensions... }
fold valuesByMode → $extensions.figmint.modes when |modes| > 1 or collection requires multi-mode
emit aliases: canonical { aliasOf: { collection, name } } → `{${collection}.${name with slashes→dots}}`
```

**Never stored in any serialized format:** Figma runtime `VariableId`, `VariableCollectionId`, resolved alias RGBA caches, `primMap` entries.

### F. Module layout (locked)

Per PRD §7.3 (authoritative over ticket draft path typo):

```
src/io/sources/adapters/
  dtcg.ts       — adaptDTCG
  legacy.ts     — adaptLegacy
  detect.ts     — detectFormat
  index.ts      — adapt, re-exports
  __fixtures__/ — unit-test JSON (≥20 tokens per format)
```

Pure functions only — no Figma API, no network, no `figma.*`.

Import types from `@detroitlabs/figmint-contracts` (`TokensV1`, `TokensV1WC3DTCG`, `TokensV1Legacy`, `DtcgTokenType`, …).

### G. Test fixtures plan

**Location:** `src/io/sources/adapters/__fixtures__/` (co-located with adapters; ticket `scripts/fixtures/` reserved for manual QA samples if needed).

| Fixture file                                                                    | Token count | Coverage                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dtcg-foundations-min.json`                                                     | ≥24         | Top-level groups: all 5 collections; color hex + rgba(); dimension px; typography composite (1 slot decomposed); shadow tier; alias `{primitives.color.primary.500}` cross-collection; `$extensions.figmint.modes` Light/Dark; `$extensions.figmint.codeSyntax` triple; inherited `$type` from parent group; `$description`; vendor `$extensions`; `$deprecated: true` |
| `legacy-foundations-min.json`                                                   | ≥24         | All 5 `collections[]`; Theme alias rows + `rawLiterals` RGBA; Layout `Space/*` aliases; Typography mode `100` slot + alias to `typeface/display`; Effects Light/Dark `shadow/color` RGBA + blur alias; `codeSyntax` on every row; multi-mode Typography (≥2 modes on one token)                                                                                        |
| `invalid-ambiguous.json`                                                        | 3           | `{}`, `{ collections: [{ name: 'Unknown' }] }`, `{ color: { x: { $value: '#000' } } }` ($type missing)                                                                                                                                                                                                                                                                 |
| `roundtrip-dtcg-a.json`, `roundtrip-dtcg-b.json`, `roundtrip-dtcg-c.json`       | 8–15 each   | Representative docs for serialize→adapt cycle                                                                                                                                                                                                                                                                                                                          |
| `roundtrip-legacy-a.json`, `roundtrip-legacy-b.json`, `roundtrip-legacy-c.json` | 8–15 each   | Same for legacy                                                                                                                                                                                                                                                                                                                                                        |

**Vitest:** `tests/unit/io/sources/adapters/{dtcg,legacy,detect,adapt}.test.ts` — mirror WO-006 detect test matrix pattern.

### H. Proposed function signatures

```ts
// src/io/sources/adapters/dtcg.ts
import type { TokensV1, TokensV1WC3DTCG } from '@detroitlabs/figmint-contracts';

export function adaptDTCG(input: TokensV1WC3DTCG): TokensV1;
```

```ts
// src/io/sources/adapters/legacy.ts
import type { TokensV1, TokensV1Legacy } from '@detroitlabs/figmint-contracts';

export function adaptLegacy(input: TokensV1Legacy): TokensV1;
```

```ts
// src/io/sources/adapters/detect.ts
export type TokenWireFormat = 'dtcg' | 'legacy';

export function detectFormat(raw: unknown): TokenWireFormat | null;
```

```ts
// src/io/sources/adapters/index.ts
import type { TokensV1 } from '@detroitlabs/figmint-contracts';

export interface FormatError {
  kind: 'format-error';
  message: string;
  path?: string;
}

export function adapt(raw: unknown): TokensV1 | FormatError;

export { adaptDTCG } from './dtcg';
export { adaptLegacy } from './legacy';
export { detectFormat } from './detect';
export type { FormatError };
```

**`adapt()` dispatch (locked):**

1. If `isTokensV1(raw)` (`v === 1 && kind === 'tokens'`) → validate minimal shape → return as-is (or shallow clone).
2. `const fmt = detectFormat(raw)`; if `null` → `FormatError`.
3. `fmt === 'dtcg'` → `adaptDTCG(raw as TokensV1WC3DTCG)`.
4. `fmt === 'legacy'` → `adaptLegacy(raw as TokensV1Legacy)`.

---

## Recommendations

1. **`/plan`:** Reference this file once; do not re-derive mappings. Add `depends_on: WO-055` (canonical shape) and `depends_on: WO-006` (detector boundary).
2. **`/build` Phase 1:** Implement `detect.ts` + fixtures first (unblocks tests); then `legacy.ts` (simpler 1:1 field map); then `dtcg.ts` (walk + alias parser).
3. **Contracts:** Keep adapter **input** types in `packages/contracts/src/tokens.v1.ts` until WO-055 build splits them; WO-007 imports from package either way.
4. **Primitives path casing:** Legacy Primitives use Title-Case path segments (`Space/100`, `Corner/Medium`); canonical `name` preserves legacy casing exactly — do not kebab-case Primitives paths on ingest.
5. **Errors:** Prefer `FormatError` with JSON pointer–style `path` over throws for recoverable parse failures; reserve throw for programmer errors (impossible states).

---

## Open Questions

**None.** All items flagged in the WO-007 ticket "Ready for `/research`" section are resolved above. Downstream serializers (WO-019) own export round-trip implementation details.

---

## Sources

### External

- [W3C Design Tokens Format Module](https://design-tokens.github.io/community-group/format/) — §5.2.2 Type inheritance, §6 Groups, §6.4 Aliases
- [Figma Plugin API — CodeSyntaxPlatform](https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/)

### Internal — Figmint

- `Docs/PRD.md` §6.1 FR-BOOT-1..2, §7.3, §8.2
- `Docs/lift-sources.md` §0 (step-15a drift), §4 (convention shards)
- `memory.md` — slash-not-dot rule; spike code deleted
- `.github/Sprint 1/WO-055-…/research/canonical-token-model.md` — locked `TokensV1`
- `.github/Sprint 2/WO-006-…/research/io-subsystem-design.md` — `detectContract` 3-stage detector
- `packages/contracts/src/tokens.v1.ts` — DTCG + Legacy input stubs

### Internal — DesignOps-plugin (legacy data)

- `skills/create-design-system/data/theme-aliases.json`
- `skills/create-design-system/data/primitives-baseline.json`
- `skills/create-design-system/data/layout-effects.json`
- `skills/create-design-system/phases/02-steps5-9.md`
- `skills/create-design-system/conventions/01-collections.md`
- `skills/create-design-system/conventions/02-codesyntax.md`
- `skills/create-component/conventions/07-token-paths.md`
