# Plan — WO-007: Token input adapters (W3C DTCG + legacy)

## Approach

Implement pure token-format adapters under `src/io/sources/adapters/` that normalize W3C DTCG nested JSON and Detroit Labs Foundations legacy `collections[]` wire JSON into the locked `TokensV1` canonical shape from WO-055. Field mappings, detection discriminators, and fixture coverage are **not re-derived here** — they are locked in [token-adapter-field-mapping.md](./research/token-adapter-field-mapping.md) and [canonical-token-model.md](../../Sprint%201/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md). `detectFormat` mirrors WO-006 `detectContract` stages 2–3 on **parsed** JSON only; `detectContract` (WO-006, `src/io/sources/detect.ts`) remains the string-level contract classifier. Round-trip tests use **inline test serializers** (minimal `serializeDTCG` / `serializeLegacy` stubs) until WO-019 ships production exporters. No Figma API, no network, no LLM — adapters run in Node/Vitest and the UI iframe alike.

## Steps

- [x] **Step 0 — Prerequisite gate:** Confirm WO-055 has landed the full `TokensV1` interface in `packages/contracts/src/tokens.v1.ts` (not the current `{ v: 1, kind: 'tokens' }` stub). If still stubbed, stop `/build` and finish WO-055 first — adapters import `TokensV1`, `CollectionId`, `Token`, `ColorValue`, `TokenAliasRef`, `DtcgTokenType`, `TokensV1WC3DTCG`, `TokensV1Legacy` from `@detroitlabs/fighub-contracts`. Keep DTCG/Legacy **input** types in contracts until WO-055 explicitly moves them to `packages/contracts/src/tokens-input.v1.ts` per its plan notes.
- [x] **Step 1 — Vitest harness (if missing):** Add `vitest` + `@vitest/coverage-v8` devDependencies, `vitest.config.ts` at repo root (`environment: 'node'`, `include: ['tests/**/*.test.ts']`, resolve `@detroitlabs/fighub-contracts` via workspace). Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to root `package.json`. Mirror path convention from WO-006 research: `tests/unit/io/sources/adapters/`.
- [x] **Step 2 — Shared adapter utilities:** Create `src/io/sources/adapters/internal/` (private to adapters) with pure helpers referenced by both adapters: `COLLECTION_IDS`, `LEGACY_COLLECTION_NAMES`, `DTCG_TYPES`, `DTCG_WALK_MAX_DEPTH = 12`, `parseDtcgAlias(curly: string, defaultCollection: CollectionId)`, `parseHexColor` / `parseRgbColor`, `dotSegmentsToSlashName`, `normalizeModeKey` (`light`→`Light`, `dark`→`Dark`), `isTokensV1(raw)`, `rejectDotInName(name, path)`. Export nothing from `internal/` via public `index.ts`.
- [x] **Step 3 — `detect.ts`:** Implement `export type TokenWireFormat = 'dtcg' | 'legacy'` and `detectFormat(raw: unknown): TokenWireFormat | null`. **Legacy first:** `typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(collections) && collections[0].name ∈ LEGACY_COLLECTION_NAMES && Array.isArray(collections[0].variables)`. **DTCG second:** recursive `hasDtcgLeaf` (skip `$schema` and `$`-prefixed keys; true when any object has `$value` + `$type` where `$type ∈ DTCG_TYPES`). **Neither:** `null`. Do not treat `v:1 && kind:'tokens'` as a wire format — that is canonical passthrough for `adapt()`.
- [x] **Step 4 — Fixture generator script:** Add `.github/Sprint 2/WO-007-token-input-adapters-w3c-dtcg-and-legacy/scripts/generate-adapter-fixtures.mjs` (or `scripts/generate-adapter-fixtures.mjs` if ticket scripts preferred) that writes committed JSON under `src/io/sources/adapters/__fixtures__/`. Script is idempotent; banner comment in each fixture notes generator + date. Run once during build; commit outputs.
- [x] **Step 5 — `__fixtures__/dtcg-foundations-min.json`:** ≥24 semantic tokens across all five top-level groups (`primitives`, `theme`, `typography`, `layout`, `effects`). Coverage per research §G: hex + `rgba()` color; `dimension` px; inherited `$type` from parent group; cross-collection alias `{primitives.color.primary.500}`; `$extensions.fighub.modes` Light/Dark on Theme; `$extensions.fighub.codeSyntax` WEB/ANDROID/iOS triple; `$description`; `$deprecated: true`; vendor `$extensions` non-fighub key; one typography leaf decomposed from composite (or explicit multi-leaf set); Effects shadow tier (decomposed COLOR/FLOAT or documented `FormatError` fixture variant in invalid file).
- [x] **Step 6 — `__fixtures__/legacy-foundations-min.json`:** ≥24 variables across all five Title-Case collections. Coverage: Theme alias rows + `rawLiterals` RGBA objects; Layout `Space/*` aliases to primitives; Typography slot with ≥2 scale modes + `typeface/display` alias; Effects Light/Dark `shadow/color` RGBA + blur alias to `elevation/*`; `codeSyntax` on every variable; mode keys Title-Case (`Light`/`Dark`, not `light`/`dark`).
- [x] **Step 7 — `__fixtures__/invalid-ambiguous.json`:** Three cases in one file or three files: `{}`; `{ collections: [{ name: 'Unknown', variables: [] }] }`; DTCG group with `$value` but missing `$type` (and no inherited type).
- [x] **Step 8 — Round-trip fixture sets:** Add six files — `roundtrip-dtcg-a.json`, `roundtrip-dtcg-b.json`, `roundtrip-dtcg-c.json` (8–15 tokens each, varied alias + multi-mode + extensions) and `roundtrip-legacy-a.json`, `roundtrip-legacy-b.json`, `roundtrip-legacy-c.json` (same). These are hand-curated representative docs, not minimal coverage matrices.
- [x] **Step 9 — `legacy.ts`:** Implement `adaptLegacy(input: TokensV1Legacy): TokensV1`. Map Title-Case `collections[].name` → kebab `CollectionId`; reorder `collections[]` to canonical dependency order; copy slash `variables[].name` verbatim (error if name contains `.`); map `valuesByMode` literals (hex/rgb → `ColorValue`, numbers, booleans); resolve bare slash-path alias strings per research §C alias table (default `aliasOf.collection: 'primitives'` for Theme/Layout/Effects unless namespace matches); normalize mode keys; copy `codeSyntax` with `IOS` key rejection hint; default Theme missing `type` → `COLOR`. Emit document-level `collections` metadata with locked mode lists from `01-collections.md`. Return flat `tokens[]` + `v:1`, `kind:'tokens'`.
- [x] **Step 10 — `dtcg.ts`:** Implement `adaptDTCG(input: TokensV1WC3DTCG): TokensV1`. Walk top-level groups where keys ∈ `COLLECTION_IDS`; nested keys → slash `name`; resolve `$type` inheritance; map `$type` → Figma `Token.type` per research table; parse `$value` (colors, dimensions, aliases, booleans, strings); fold `$extensions.fighub.modes` → `valuesByMode`; fold `$extensions.fighub.codeSyntax`; preserve vendor `$extensions` → `Token.extensions`; map `$description` / `$deprecated`. Reject unknown top-level group keys and unsupported composites (`border`, `transition`, `gradient`) with `FormatError` at `adapt()` layer or collect errors — prefer `FormatError` over throw for ingest. Comment citing W3C DTCG spec URL at file top.
- [x] **Step 11 — `index.ts`:** Export `FormatError`, `adapt`, `adaptDTCG`, `adaptLegacy`, `detectFormat`, `TokenWireFormat`. Implement `adapt(raw: unknown): TokensV1 | FormatError`: (1) if `isTokensV1(raw)` → shallow validate `collections` + `tokens` arrays exist → return clone; (2) `fmt = detectFormat(raw)` → `FormatError` if null; (3) dispatch `adaptDTCG` / `adaptLegacy`. Re-export types from contracts where needed.
- [x] **Step 12 — `detect.test.ts`:** Assert `detectFormat` returns `'legacy'` for `legacy-foundations-min.json`, `'dtcg'` for `dtcg-foundations-min.json`, `null` for each invalid case. Assert canonical `TokensV1` input is **not** classified as legacy/dtcg (returns null from `detectFormat` — passthrough is `adapt()` only).
- [x] **Step 13 — `legacy.test.ts`:** Snapshot or structural assertions on `adaptLegacy` output: token count ≥20; every token has `collection` + `name` without dots; Theme alias resolves to `{ aliasOf: { collection: 'primitives', … } }`; `codeSyntax` keys only WEB|ANDROID|iOS; collections metadata mode lists match locked table.
- [x] **Step 14 — `dtcg.test.ts`:** Same depth for `adaptDTCG`: alias `{primitives.color.primary.500}` → structured ref; modes folded from fighub extensions; inherited `$type` leaf typed correctly; no dot in emitted `name`.
- [x] **Step 15 — Round-trip tests (`roundtrip.test.ts`):** Inline `serializeDTCG(canonical)` and `serializeLegacy(canonical)` per research §E algorithms (re-nest by `collection` + slash-split `name`; aliases as curly-brace strings; modes back to `$extensions.fighub.modes`). For each of 3 DTCG + 3 legacy round-trip fixtures: `expect(serialize(adapt(input))).toEqual(input)` modulo deep equality (ignore key order via `normalizeJson` helper). Document in test header that production serializers are WO-019.
- [x] **Step 16 — Barrel + IO wiring stub:** Ensure `src/io/sources/adapters/index.ts` is importable as `@fighub/io/sources/adapters` path alias **or** relative `../adapters` from future `src/io/sources/index.ts` (WO-006). Add `src/io/sources/adapters/.gitkeep` removal if present. Do **not** wire into paste/file loaders in this WO — WO-006 owns ports; WO-007 only exports adapters.
- [x] **Step 17 — Quality gates:** Run `npm run typecheck`, `npm run lint`, `npm run format:check` (or `format` on touched files), `npm run test`. Fix until clean. No git commit (per user instruction).

## Build Agents

### Phase 1 (sequential within phase — script-build then code-build)

- `script-build` — Steps 1, 4–8: Vitest harness if missing; fixture generator script; commit all `__fixtures__/*.json` (≥20 tokens per min fixture; 3 round-trip docs per format).
- `code-build` — Steps 2–3, 16 (partial): `internal/` helpers + `detect.ts` (unblocks detector tests).

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 9–10: `legacy.ts` and `dtcg.ts` in parallel (no cross-imports; both depend on `internal/` + contracts types only).

### Phase 3 (parallel, after Phase 2)

- `code-build` — Step 11: `index.ts` + `adapt()` dispatch.
- `code-build` — Steps 12–15: Vitest suite under `tests/unit/io/sources/adapters/` (`detect.test.ts`, `legacy.test.ts`, `dtcg.test.ts`, `roundtrip.test.ts`).

### Phase 4 (after Phase 3)

- `code-build` — Step 17: typecheck, lint, prettier, test — final verification pass.

## Dependencies & Tools

| Dependency                       | Role                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **WO-055** (blocking)            | Full `TokensV1` + value/alias types in `packages/contracts/src/tokens.v1.ts`                                             |
| **WO-003** (complete)            | Contracts workspace package + schema generator wiring                                                                    |
| **WO-006** (parallel / upstream) | `detectContract` in `src/io/sources/detect.ts` — classifies raw string; WO-007 does not duplicate stage 1 (`v:1`+`kind`) |
| **WO-019** (future)              | Production DTCG/legacy serializers; WO-007 tests use inline stubs                                                        |

**MCP / external:** None. Pure TypeScript.

**npm packages (build):** `vitest` (dev), existing `@detroitlabs/fighub-contracts`, `prettier`, `eslint`, `typescript`.

**Lift reference (read-only):** `DesignOps-plugin/skills/create-design-system/data/{theme-aliases,primitives-baseline,layout-effects}.json`, `phases/02-steps5-9.md`, `conventions/01-collections.md`, `02-codesyntax.md`, `create-component/conventions/07-token-paths.md` — for fixture realism only; do not import legacy repo at runtime.

## Open Questions

None — research §Open Questions is empty. If WO-055 build splits input types to a new file, update import paths in Steps 9–10 only (no mapping changes).

## Notes

- **Module path locked:** `src/io/sources/adapters/{detect,legacy,dtcg,index}.ts` + `__fixtures__/` (PRD §7.3).
- **Figma names:** slash-only; never emit or accept dots in `Token.name` (`memory.md`).
- **Detection split:** `detectContract`(string) vs `detectFormat`(parsed) — see research §D.
- **Primitives path casing:** preserve Title-Case segments (`Space/100`, `Corner/Medium`) on legacy ingest — do not kebab-case.
- **Errors:** `FormatError { kind: 'format-error', message, path? }` for recoverable ingest; reserve `throw` for internal invariant violations.
- **Canonical passthrough:** `adapt()` returns existing `TokensV1` when `v===1 && kind==='tokens'` without re-walking.
- **Shadow / typography composites:** Phase 1 adapter may decompose known Detroit Labs shapes or return `FormatError` for unsupported DTCG composites — do not silently drop tokens (ticket + research).
- **Git strategy:** `main`, uncommitted changes, user reviews manually (`memory.md`).

### Field mapping authority

All per-field rules live in [token-adapter-field-mapping.md](./research/token-adapter-field-mapping.md) Tables B–C. Build agents must not reinterpret aliases, mode folding, or DTCG walk semantics.

### Function signatures (locked)

```ts
// detect.ts
export type TokenWireFormat = 'dtcg' | 'legacy';
export function detectFormat(raw: unknown): TokenWireFormat | null;

// legacy.ts
export function adaptLegacy(input: TokensV1Legacy): TokensV1;

// dtcg.ts
export function adaptDTCG(input: TokensV1WC3DTCG): TokensV1;

// index.ts
export interface FormatError {
  kind: 'format-error';
  message: string;
  path?: string;
}
export function adapt(raw: unknown): TokensV1 | FormatError;
```

### References

- Ticket: [ticket.md](./ticket.md)
- Research: [token-adapter-field-mapping.md](./research/token-adapter-field-mapping.md)
- Canonical model: [canonical-token-model.md](../../Sprint%201/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md)
- IO boundary: [io-subsystem-design.md](../WO-006-io-subsystem-foundation-paste-file-clipboard/research/io-subsystem-design.md)
- Contracts stub: `packages/contracts/src/tokens.v1.ts`
- PRD: `Docs/PRD.md` §6.1 FR-BOOT-1..2, §7.3, §8.2
