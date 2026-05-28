# Plan — WO-055: Define canonical internal token model

## Approach

This WO is a contracts-only build: replace the WO-003 `TokensV1` stub in `packages/contracts/src/tokens.v1.ts` with the locked canonical interface from `research/canonical-token-model.md`, delete the provisional adapter-input types that WO-003 parked in the same file (those move to Sprint 2 WO-007), trim `build-schemas.mjs` to generate only the `TokensV1` schema, regenerate JSON Schema, and verify the full repo typecheck/lint matrix passes. No Figma canvas work, no adapter implementation, and no new decision document — research already locked all six dimensions plus cross-collection alias encoding; this plan executes that decision as typed code.

## Steps

- [x] **Step 1 — Read research + current stub.** Open `research/canonical-token-model.md` §"Proposed `TokensV1` TypeScript interface" and the current `packages/contracts/src/tokens.v1.ts` (lines 1–65). Confirm the six locked dimensions match before editing.
- [x] **Step 2 — Replace `tokens.v1.ts` stub with canonical interface.** Delete `DtcgTokenLeaf`, `DtcgTokenType`, `TokensV1WC3DTCG*`, `LegacyCodeSyntaxTriple`, `LegacyTokenVariable`, `LegacyTokenCollection`, `TokensV1Legacy`, and the `TokensInput` union. Write the full `TokensV1` interface tree from research (see **Notes → Canonical interface** below): branded IDs, value types, four discriminated `Token*` variants, `Collection`, optional `ThemeExtension`, and top-level `TokensV1`. Preserve section-comment dividers (`// =====`).
- [x] **Step 3 — Do not create `tokensInput.v1.ts` in this WO.** Per research recommendation, adapter input shapes (`TokensV1WC3DTCG`, `TokensV1Legacy`, `TokensInput`) are owned by Sprint 2 WO-007 in `packages/contracts/src/adapters/` (exact filenames TBD in WO-007's plan). WO-055 removes them entirely; WO-007 reintroduces them when adapters ship.
- [x] **Step 4 — Update `packages/contracts/src/index.ts` exports.** Remove exports of deleted stub types (`DtcgTokenLeaf`, `DtcgTokenType`, `LegacyCodeSyntaxTriple`, `LegacyTokenCollection`, `LegacyTokenVariable`, `TokensInput`, `TokensV1Legacy`, `TokensV1WC3DTCG`, `TokensV1WC3DTCGGroup`, `TokensV1WC3DTCGNode`). Add exports for all new public types: `CollectionId`, `CodeSyntaxPlatform`, `ModeName`, `ColorValue`, `TokenAliasRef`, `Token`, `TokenColor`, `TokenFloat`, `TokenString`, `TokenBoolean`, `Collection`, `ThemeExtension`, and the updated `TokensV1`.
- [x] **Step 5 — Trim `packages/contracts/scripts/build-schemas.mjs`.** Remove the three WO-007-owned schema entries (lines 14–16): `TokensV1WC3DTCG` → `tokens.v1.w3c-dtcg.schema.json`, `TokensV1Legacy` → `tokens.v1.legacy.schema.json`, `TokensInput` → `tokens.v1.input.schema.json`. Keep only the `TokensV1` → `tokens.v1.schema.json` entry for this file.
- [x] **Step 6 — Regenerate JSON Schema.** Run `npm run build:schemas -w @detroitlabs/fighub-contracts`. Confirm `packages/contracts/dist/tokens.v1.schema.json` is rewritten and the three removed schema files are either deleted from `dist/` or left stale (prefer deleting stale outputs if the build script no longer emits them).
- [x] **Step 7 — Verify `@TJS-type string` on `CollectionId`.** Inspect generated schema: if `CollectionId` already emits `enum: ['primitives', 'theme', 'typography', 'layout', 'effects']` without the JSDoc annotation, remove `@TJS-type string` from the TS source and regenerate. If the generator needs it, keep it and note why in the build commit message.
- [x] **Step 8 — Spot-check generated schema shape.** Manually confirm in `dist/tokens.v1.schema.json`: (a) `CollectionId` and `CodeSyntaxPlatform` enums populated; (b) `Token` is a `oneOf` of four variants discriminated by `type`; (c) each token variant's `valuesByMode` is `additionalProperties` with a `oneOf` of primitive value + `TokenAliasRef`; (d) no `$ref` cycles or generator warnings in stdout.
- [x] **Step 9 — Run contracts package build.** Run `npm run build -w @detroitlabs/fighub-contracts` to confirm the package compiles and dist artifacts are consistent.
- [x] **Step 10 — Run full-repo typecheck.** From repo root: `npm run typecheck`. Must pass with zero errors — any consumer importing the removed stub types must be updated in this same diff (grep for `TokensV1WC3DTCG`, `TokensV1Legacy`, `TokensInput`, `DtcgTokenLeaf` across the repo).
- [x] **Step 11 — Run full-repo lint + format.** From repo root: `npm run lint` and `npm run format:check` (or `npx prettier --check` on changed files). Fix any violations in the touched contracts files.

## Build Agents

### Phase 1 (parallel)

- `code-build` — Steps 1–9: replace `tokens.v1.ts` with the locked canonical interface, update `index.ts` exports, trim `build-schemas.mjs`, regenerate `tokens.v1.schema.json`, verify `@TJS-type` on `CollectionId`, spot-check schema output, run contracts build.

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 10–11: full-repo typecheck, lint, and format verification. Grep the repo for any remaining imports of deleted stub types and fix before marking build complete.

## Dependencies & Tools

| Dependency        | Status      | Role                                                                                                                       |
| ----------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| WO-003            | ✅ Complete | Contracts package shell, `ts-json-schema-generator` wiring, `tsconfig.schemas.json`                                        |
| WO-005            | ✅ Complete | EVC = render-time projection only; `themes?: ThemeExtension[]` optional field; plan-gate error string for `isEnterprise()` |
| WO-007 (Sprint 2) | Downstream  | Will reintroduce DTCG/legacy input types in `packages/contracts/src/adapters/` and restore input schemas                   |
| WO-008 (Sprint 2) | Downstream  | Push engine consumes `TokensV1` directly; owns `resolveTokens()` helper                                                    |
| WO-009 (Sprint 2) | Downstream  | Reads per-token `codeSyntax` field                                                                                         |
| WO-010 (Sprint 2) | Downstream  | Audit reporter diffs against `TokensV1` document                                                                           |

**Tools (no MCP required):**

- Node 22 LTS (`engines.node: ">=22.0.0"`)
- `npm run build:schemas -w @detroitlabs/fighub-contracts`
- `npm run build -w @detroitlabs/fighub-contracts`
- `npm run typecheck` (repo root)
- `npm run lint` (repo root)
- `rg` / grep for orphan imports of deleted types

**Key files:**

- `packages/contracts/src/tokens.v1.ts` — primary edit target
- `packages/contracts/src/index.ts` — export surface
- `packages/contracts/scripts/build-schemas.mjs` — schema generator manifest
- `packages/contracts/dist/tokens.v1.schema.json` — regenerated output
- `research/canonical-token-model.md` — locked decision source (do not re-derive)

## Open Questions

- **None blocking WO-055 build.** All six architectural dimensions and cross-collection alias encoding are locked in research. Deferred to downstream tickets: DTCG group→`CollectionId` mapping (WO-007), legacy variable-list parsing (WO-007), `resolveTokens()` signature (WO-008/WO-010), `isEnterprise()` helper extraction (WO-008).
- **WO-007 plan prerequisite:** Before WO-007 enters `/research` or `/plan`, its author must add `depends_on: WO-055` and know that input adapter types no longer live in `tokens.v1.ts`.

## Notes

### Locked decisions (from research, 2026-05-27)

- **Shape:** flat — every token self-contained with `collection` + `name` + `type` + `valuesByMode` + `codeSyntax`. Matches legacy 1:1 and the Plugin API call shape.
- **Mode storage:** `Record<ModeName, Value>` keyed by stable mode _name_ (not runtime ID). Display order on `Collection.modes[]`.
- **Alias representation:** structured reference only, **no resolved cache**. Field name `aliasOf` avoids JSON Schema `$ref` collision. A separate `resolveTokens()` helper (WO-008 / WO-010) provides the resolved view at runtime.
- **codeSyntax storage:** flat `codeSyntax?: Partial<Record<CodeSyntaxPlatform, string>>` on each token. Literal casing `'WEB' | 'ANDROID' | 'iOS'` matches Figma Plugin API exactly.
- **Collection identity:** explicit `collection: CollectionId` field, restricted to `'primitives' | 'theme' | 'typography' | 'layout' | 'effects'`. `(collection, name)` is the global uniqueness key.
- **EVC mode inheritance:** render-time projection only — canonical model carries an _optional_ `themes?: ThemeExtension[]` field; non-Enterprise files ignore it. Projection algorithm documented in research §6.
- **Cross-collection alias encoding:** structured `{ aliasOf: { collection: CollectionId, name: string } }`. Round-trips losslessly to DTCG `{group.token}` curly-brace form via slash↔dot substitution.

### Canonical interface (build target — copy verbatim into `tokens.v1.ts`)

Source: `research/canonical-token-model.md` §"Proposed `TokensV1` TypeScript interface". The build agent writes this interface (minus the file-path comment and the `TokensInput` union at the bottom — that union is WO-007 scope):

```ts
// =============================================================================
// Branded identifier types
// =============================================================================

/**
 * One of the five canonical collections.
 *
 * @TJS-type string
 */
export type CollectionId = 'primitives' | 'theme' | 'typography' | 'layout' | 'effects';

/**
 * Figma Plugin API codeSyntax platforms — literal casing matches
 * `CodeSyntaxPlatform` exactly. The third value is `iOS` (i + OS), NOT `IOS`.
 *
 * @see https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/
 */
export type CodeSyntaxPlatform = 'WEB' | 'ANDROID' | 'iOS';

/**
 * Mode name as it appears in the variables panel. Collection-scoped:
 *   - Primitives, Layout: 'Default'
 *   - Theme, Effects: 'Light' | 'Dark'
 *   - Typography: '85' | '100' | '110' | '120' | '130' | '150' | '175' | '200'
 * Storage uses names (stable across files), not runtime mode IDs.
 */
export type ModeName = string;

// =============================================================================
// Value types
// =============================================================================

/** Color in 0..1 RGBA (matches Figma Plugin API). */
export interface ColorValue {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Structured cross-collection alias reference.
 * Field name is `aliasOf` (not `$ref`) to avoid JSON Schema reserved-word collision.
 */
export interface TokenAliasRef {
  aliasOf: {
    collection: CollectionId;
    name: string;
  };
}

// =============================================================================
// Token variants — discriminated union by `type`
// =============================================================================

interface TokenBase {
  collection: CollectionId;
  /** Slash-separated path, e.g. 'color/primary/default'. Never use dots (Figma throws). */
  name: string;
  description?: string;
  scopes?: readonly string[];
  codeSyntax?: Partial<Record<CodeSyntaxPlatform, string>>;
  extensions?: Record<string, unknown>;
  deprecated?: boolean | string;
}

export interface TokenColor extends TokenBase {
  type: 'COLOR';
  valuesByMode: Record<ModeName, ColorValue | TokenAliasRef>;
}

export interface TokenFloat extends TokenBase {
  type: 'FLOAT';
  valuesByMode: Record<ModeName, number | TokenAliasRef>;
}

export interface TokenString extends TokenBase {
  type: 'STRING';
  valuesByMode: Record<ModeName, string | TokenAliasRef>;
}

export interface TokenBoolean extends TokenBase {
  type: 'BOOLEAN';
  valuesByMode: Record<ModeName, boolean | TokenAliasRef>;
}

export type Token = TokenColor | TokenFloat | TokenString | TokenBoolean;

// =============================================================================
// Collection metadata
// =============================================================================

export interface Collection {
  id: CollectionId;
  modes: readonly ModeName[];
}

// =============================================================================
// Optional EVC projection (Enterprise plan only — render-time, not storage)
// =============================================================================

export interface ThemeExtension {
  name: string;
  parentCollection: 'theme' | 'effects';
  overrides: ReadonlyArray<{
    name: string;
    valuesByMode: Record<ModeName, ColorValue | number | string | boolean | TokenAliasRef>;
  }>;
}

// =============================================================================
// Top-level document
// =============================================================================

export interface TokensV1 {
  v: 1;
  kind: 'tokens';
  collections: readonly Collection[];
  tokens: readonly Token[];
  themes?: readonly ThemeExtension[];
}
```

### Research notes for build agent

1. `readonly` modifiers on arrays become plain `type: 'array'` in JSON Schema — keep them in TS for caller immutability.
2. `Record<string, unknown>` on `extensions` emits `additionalProperties: {}` — acceptable for vendor passthrough.
3. Do not use `Map`/`Set`, conditional types, or generic helpers — they break `ts-json-schema-generator`.
4. Decision document already exists at `research/canonical-token-model.md`; no separate `decisions/canonical-token-model.md` required unless the team opts to copy later.
5. WO-005 spike citations: EVC plan-gate error string `"Cannot create extended collections outside of enterprise plan."`; `setVariableCodeSyntax` 0.23 ms/call at n=400 — no performance reason to change the flat codeSyntax-on-token shape.

### Downstream consumers (notify before their `/build`)

- Sprint 2 WO-007 — token input adapters; add `depends_on: WO-055`
- Sprint 2 WO-008 — variable collection push engine
- Sprint 2 WO-009 — codeSyntax mapping rules
- Sprint 2 WO-010 — audit reporter
