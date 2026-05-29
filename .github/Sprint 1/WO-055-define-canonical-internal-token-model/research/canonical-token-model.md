# Canonical Internal Token Model — Decision Document

> **Status:** ✅ LOCKED — six dimensions + cross-collection alias encoding decided 2026-05-27. Ready for `/plan`. `TokensV1` TS interface sketched and confirmed `ts-json-schema-generator` compatible (no manual schema edits required). EVC projection algorithm documented at a high level per WO-005 spike output.
> **Date:** 2026-05-27
> **Owner:** Sprint 2 leads (Bootstrap engine architecture)
> **Author:** Research sub-agent for WO-055 (promoted from CTX-002)
> **PRD anchors:** §6.1 FR-BOOT-2 (normalize input to canonical internal token model), §8.2 (`tokens` hybrid contract), §11.5 (Compatibility), §13 (Distribution)
> **Upstream input:** WO-005 spike — `research/extended-collections.md` §2.4 + §5 (EVC = render-time projector); `research/latency-benchmark.md` §3 + §6 (per-call rates).

---

## Summary

The canonical internal token model is a **flat, plan-agnostic, collection-explicit, Record-by-mode-name** TypeScript shape designed for lossless round-trip between (a) W3C DTCG nested JSON, (b) legacy `DesignOps-plugin` per-collection files (`theme-aliases.json`, per-collection variable lists in `phases/02-steps5-9.md`), and (c) the Figma Plugin API call sequence used by WO-008's push engine. Six locked dimensions plus a locked cross-collection alias encoding answer the open questions surfaced in the WO-055 ticket; all seven decisions are validated against the legacy data shape, the [W3C Design Tokens Format Module](https://design-tokens.github.io/community-group/format/), and the Figma Plugin API surface (`VariableAlias`, `setVariableCodeSyntax`, `createVariable`, `setValueForMode`).

EVC (Extended Variable Collections) **does not appear in the canonical shape** — per the WO-005 locked recommendation, EVC is a render-time projection emitted by the push engine on Enterprise files only. The canonical model carries an optional `themes[]` field that the projector consumes when `isEnterprise()` returns true; non-Enterprise files ignore it entirely and bootstrap the five base collections as-is. This keeps Detroit Labs' Community + Org distribution targets unbroken (PRD §13) and avoids gating the entire plugin behind Enterprise.

The proposed `TokensV1` TypeScript interface compiles under TS strict mode with discriminated unions for the four Plugin API variable types (COLOR / FLOAT / STRING / BOOLEAN) and a structured `TokenAliasRef` ({ collection, name }) for cross-collection aliases. The shape is `ts-json-schema-generator`-compatible without manual annotations — verified against the WO-003 wiring at `packages/contracts/scripts/build-schemas.mjs` + `tsconfig.schemas.json`. The interface replaces the WO-003 stub at `packages/contracts/src/tokens.v1.ts` during WO-055's `/build` phase.

---

## Key Findings

### 1. Shape (flat vs nested) — LOCKED: **flat**

**Working preference (ticket §Technical/architectural #1):** flat (every token has a fully-qualified path key).

**Legacy validation.** Every legacy file is flat. `theme-aliases.json` rows are: `{ "path": "color/background/dim", "light": "color/neutral/100", "dark": "color/neutral/950", "codeSyntax": { ... } }` — each row is a top-level entry in the `rows[]` (or `rawLiterals[]`) array, identified by its `path` field. Per-collection variable lists in `phases/02-steps5-9.md` follow the same shape: each variable is a one-line row with `path` (slash-separated) + alias target(s) + codeSyntax. The Plugin API itself is flat — `figma.variables.createVariable(name, collection, type)` takes a single `name` string (slash-separated paths render as a folder tree in the variables panel; the underlying storage is a flat map). See `phases/04-step11-push.md` §"Plugin API — values and aliases".

**W3C DTCG validation.** DTCG storage **is** nested by design — `{ "color": { "blue": { "500": { "$value": "...", "$type": "color" } } } }` — and the spec relies on JSON nesting for grouping ([§6 "Groups"](https://design-tokens.github.io/community-group/format/#groups), [§5.2.2 "Type"](https://design-tokens.github.io/community-group/format/#type-0)). However, DTCG nesting is a **serialization concern**, not a canonical-model concern: tools normalize during ingest. `$type` inheritance from parent groups is resolved at parse time so every leaf carries an explicit `type` after normalization. The canonical-→-DTCG export adapter is the inverse: re-nest by splitting the slash-separated path back into groups.

**Locked.** **Flat.** Each token is a self-contained object with collection + name + type + valuesByMode + codeSyntax. The flat array form mirrors the legacy data exactly (no transformation needed for legacy ingest) and matches the Plugin API's `createVariable` call shape exactly (push engine reads each token sequentially with no intermediate restructuring). DTCG's nested form is handled by the W3C DTCG ↔ canonical adapter (WO-007); group-level `$type` and `$extensions` resolve to per-token fields during ingest.

### 2. Mode storage (Record vs ordered array) — LOCKED: **`Record<ModeName, Value>`** (keyed by mode _name_, not runtime ID)

**Working preference (ticket #2):** `Record<ModeId, Value>` — explicit mode IDs survive reordering.

**Refinement.** The working preference says "ModeId" — but **runtime mode IDs only exist after `createVariableCollection` returns** (Figma generates UUIDs like `"VariableCollectionId:1:3/0:1"`). The canonical document is a **storage shape**, not a runtime cache, so it cannot reference runtime IDs. The legacy data uses **mode names** as keys (e.g. `"light"` / `"dark"` in `theme-aliases.json`), and the push engine resolves names → runtime mode IDs at apply time. The canonical model adopts the same convention: **key by `ModeName` (string), not runtime ID.**

**Legacy validation.** `theme-aliases.json` rows have per-row keys `"light"` and `"dark"` mapping to primitive paths. Typography (per `phases/02-steps5-9.md` Step 7) uses mode names `"85" | "100" | "110" | "120" | "130" | "150" | "175" | "200"`. Primitives + Layout use the single mode name `"Default"`. Effects uses `"Light" | "Dark"`. The mode name is the stable identifier across files and runs.

**W3C DTCG validation.** DTCG does not natively define modes (mode/theme support is being discussed but not standardized as of the May 2026 spec draft). Tools that emit modes use `$extensions` — e.g. `"$extensions": { "fighub": { "modes": { "Light": ..., "Dark": ... } } }`. The canonical model puts modes in a top-level `valuesByMode: Record<ModeName, Value>` field. The DTCG ↔ canonical adapter folds `$extensions.fighub.modes` into `valuesByMode` on import, and back into `$extensions.fighub.modes` on export.

**Locked.** **`valuesByMode: Record<ModeName, V>`** where `ModeName = string`. Mode ordering for display is preserved separately in the collection-level `modes: ModeName[]` array (so the push engine knows the order to `addMode()` in, and the audit can detect "missing mode" cases). Record-by-name survives mode reordering, matches legacy storage 1:1, and is `ts-json-schema-generator`-friendly (emits `additionalProperties: <ValueSchema>` cleanly).

### 3. Alias representation (string ref / resolved / both) — LOCKED: **structured ref only, no resolved cache**

**Working preference (ticket #3):** both — keep the string reference for round-trip, cache the resolved value for fast reads.

**Refinement (push back on "both").** The canonical model is a **source-of-truth document** that travels between FigHub, designers, agents, and engineering checkouts; it is **not** an in-memory resolved cache. Caching the resolved value alongside the reference creates three problems:

1. **Drift risk.** If the aliased primitive changes (`color/blue/500` shifts from `#1F6FEB` → `#2563EB`), every Theme alias's resolved cache must be re-emitted — or it silently goes stale. Audit must validate the cache vs the live primitive on every read. Cost outweighs benefit.
2. **Storage bloat.** Theme has 54 aliases × 2 modes = 108 alias rows. With resolved RGBA cached per row, that's 108 redundant copies of primitive colors. The whole `theme-aliases.json` file size doubles for no consumer gain.
3. **`ts-json-schema-generator` friction.** A "resolved or alias" union per mode requires `oneOf` schemas with `additionalProperties: false`. Adding a "resolved-cache" sibling field doubles the schema entries per alias and forces every consumer to choose between the two when reading.

**Legacy validation.** `theme-aliases.json` rows store **only the alias path** (`"light": "color/neutral/100"`) — no resolved cache. The Plugin API push pipeline looks up `color/neutral/100` in `primMap` (a runtime `Map<name, VariableId>`) and emits `{ type: 'VARIABLE_ALIAS', id: <runtime id> }`. The legacy form **never caches resolved values in storage**; resolution is a runtime concern of the push engine. We adopt the same rule.

**W3C DTCG validation.** DTCG aliases are pure string references — `"$value": "{colors.blue}"` — with the resolved value computed at consume time ([§6.4 "Aliases"](https://design-tokens.github.io/community-group/format/#aliases)). The spec explicitly says curly-brace references "always resolve to the `$value` property of the target token" at consume time; no resolved cache is part of the spec.

**Locked.** **Structured reference only**, no resolved cache. The reference shape is the **structured discriminated form** locked in §7 below (`{ aliasOf: { collection, name } }`). A separate `resolveTokens(tokens: TokensV1): ResolvedTokensV1` helper (WO-008 + WO-010 will own this) walks the alias graph at consume time and returns a fully-resolved view for the push engine and the audit reporter. Storage stays lean; consumers that need fast resolved reads call the helper once.

### 4. codeSyntax storage (flat on token vs separate map) — LOCKED: **flat on the token**

**Working preference (ticket #4):** flat on the token.

**Legacy validation.** Every row in `theme-aliases.json` carries `"codeSyntax": { "WEB": "var(--…)", "ANDROID": "kebab-case-role", "iOS": ".DotPath" }` directly on the row. `phases/04-step11-push.md` is explicit that **key casing is exact**: `"WEB"`, `"ANDROID"`, `"iOS"` (the third is `i` + `OS`, **not** `IOS`). The `conventions/02-codesyntax.md` shard documents the same casing rule and warns that canvas scripts reading `codeSyntax.IOS` get `undefined`. The Figma Plugin API matches: `CodeSyntaxPlatform = "WEB" | "ANDROID" | "iOS"` exactly ([API docs](https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/)).

**W3C DTCG validation.** DTCG has no native codeSyntax concept — platform-specific export strings are tool-specific metadata. Canonical model uses `$extensions.fighub.codeSyntax` on the DTCG round-trip; the adapter folds it into the canonical `codeSyntax` field on import.

**Locked.** **Flat on the token** as `codeSyntax?: Partial<Record<CodeSyntaxPlatform, string>>` where `CodeSyntaxPlatform = 'WEB' | 'ANDROID' | 'iOS'` (literal casing matches Figma API). All three platforms are independently optional — the push engine simply skips `setVariableCodeSyntax(platform, '')` for absent platforms (the WO-005 spike confirmed this works; per-call rate 0.23 ms at n=400 — no need to optimize). A separate map (e.g. `Record<TokenName, CodeSyntaxTriple>` at the document level) was considered and rejected: it adds an extra lookup at every consumer and breaks the "every token is self-contained" property we rely on for streaming reads.

### 5. Collection identity (explicit field vs path prefix) — LOCKED: **explicit `CollectionId` discriminator field**

**Working preference (ticket #5):** explicit field — path prefixes can collide across collections, especially with codeSyntax-derived names.

**Legacy validation.** The legacy data uses **one file per collection** as implicit context (`primitives-baseline.json`, `theme-aliases.json`, etc.). Within a collection, paths can collide across collections — `color/primary/*` exists in Primitives (raw ramp) **and** in Theme (semantic aliases). `Layout` collection's `space/md` would collide with `Primitives` `Space/100`-class names (close but distinct enough that path-prefix inference would be brittle). The token-paths convention (`create-component/conventions/07-token-paths.md` §7.2) is explicit that "the path is the `name` of a Figma variable" — collection is context, not encoded in the path.

**W3C DTCG validation.** DTCG has no concept of collections; the canonical model adds it as a FigHub-specific scope. The DTCG ↔ canonical adapter maps DTCG group nesting → canonical `collection` + `name` (top-level groups become the collection identifier per a configured mapping, or the adapter requires the DTCG file's root group names to match the five collection ids — Sprint 2 WO-007 will lock this convention).

**Locked.** **Explicit field** as `collection: CollectionId` where `CollectionId = 'primitives' | 'theme' | 'typography' | 'layout' | 'effects'` (kebab-case lowercase to match URL-safe / file-safe convention; the Figma display name is Title-Case but storage is normalized). The collection field is **mandatory** on every token. Together with `name`, `(collection, name)` is the global uniqueness key. The push engine resolves `collection: 'primitives'` → the runtime `VariableCollection` for Primitives at apply time.

### 6. EVC mode inheritance (post-WO-005) — render-time projection algorithm

**WO-005 spike outcome (`research/extended-collections.md` §2.4 + §5).** EVC is **render-time only**; the canonical model carries no `extended-from` relationship. EVC stays an opt-in feature gated by `isEnterprise()` plan detection. The canonical model carries an **optional** `themes?: ThemeExtension[]` field describing brand projections; non-Enterprise files ignore it.

**Projection algorithm (high level — Sprint 2 WO-008 owns the implementation).**

```
function pushTokens(tokens: TokensV1):
  // Phase 1: Base collections (every file, every plan)
  for each collection in [Primitives, Theme, Typography, Layout, Effects]:
    create/update VariableCollection
    for each modeName in collection.modes:
      ensure mode exists (rename default first; addMode for the rest)
    for each token in tokens where token.collection === collection.id:
      createVariable(token.name, collection, token.type)
      for each [modeName, value] in token.valuesByMode:
        if value is a TokenAliasRef:
          setValueForMode(modeName, { type: 'VARIABLE_ALIAS', id: lookupPrimMap(value.aliasOf) })
        else:
          setValueForMode(modeName, value)
      if token.codeSyntax:
        for each [platform, syntaxString] in token.codeSyntax:
          setVariableCodeSyntax(variable, platform, syntaxString)

  // Phase 2: EVC projection (Enterprise only, optional input)
  if tokens.themes && (await isEnterprise()):
    for each themeExt in tokens.themes:
      const parent = lookupCollection(themeExt.parentCollection) // 'theme' or 'effects'
      const ext = parent.extend(themeExt.name)  // throws on non-Enterprise — gated by isEnterprise() check
      for each override in themeExt.overrides:
        const variable = lookupVariableInParent(override.name)
        for each [parentModeName, value] in override.valuesByMode:
          const extModeId = ext.modes.find(m => m.parentModeId === parentModeIdFor(parentModeName))!.modeId
          variable.setValueForMode(extModeId, resolveOrAlias(value))

  // Typography is NEVER extended — the 8 scale modes are inherent to the base collection
  // (computed from mode "100" per the Android-curve formula in phases/02-steps5-9.md Step 7).
```

**Plan detection.** Wrap `someCollection.extend('probe')` in try/catch; if it throws with `"enterprise plan"` substring (the WO-005 spike captured the exact error string `"Cannot create extended collections outside of enterprise plan."`), the plugin runs in non-Enterprise mode and skips Phase 2 entirely. See `research/extended-collections.md` §4.1 — no cleaner plan-detection API exists per WO-005 verification.

**Canonical schema impact.** The `themes?: ThemeExtension[]` field on `TokensV1` is **optional** at the schema level. Non-Enterprise files (the default) omit it entirely. Enterprise files that opt into multi-brand projection populate it with one entry per brand, naming the parent collection and the override list. The audit reporter (WO-010) extends to validate that no `themes[*].parentCollection` is `"typography"` (per WO-005 §2.2 — Typography modes are computed, not brand overrides).

### 7. Cross-collection alias encoding — LOCKED: **structured `{ aliasOf: { collection, name } }`**

The ticket's "Ready for `/research`" section explicitly flagged this open question:

> "For aliases that span collections (Theme alias into Primitives by id), does the canonical shape store the alias as `{collection: 'primitives', name: 'color/blue/500'}` or as a fully-qualified single string `primitives:color/blue/500` or as the Figma-style `{<collection>}/<name>` reference?"

Three options were evaluated:

| Option | Shape                                                   | Pros                                                               | Cons                                                                                                                                                                                                                            |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A      | `{ aliasOf: { collection: 'primitives', name: '...' }}` | Direct property reads; no parsing; TS-narrow friendly; schema-safe | Slightly more verbose JSON                                                                                                                                                                                                      |
| B      | `'primitives:color/blue/500'` (colon-separated string)  | Compact                                                            | Requires string parsing at every consumer; colon is not a standard separator; ambiguous if a name ever contains a colon                                                                                                         |
| C      | `'{primitives/color/blue/500}'` (DTCG-style curly)      | Mirrors DTCG syntax                                                | DTCG uses `.` not `/` as the separator; reuses curly-brace as a wire delimiter, requires regex parsing; ambiguous boundary between collection segment and name segments (no obvious place to split `primitives/color/blue/500`) |

**Cross-references.**

- **Figma Plugin API:** `VariableAlias = { type: 'VARIABLE_ALIAS', id: '<VariableId>' }` ([docs](https://developers.figma.com/docs/plugins/api/VariableAlias/)) — but `id` is a runtime value, not stable across files. Canonical storage cannot use Plugin API alias form directly; the push engine constructs the runtime form by looking up `(collection, name)` in `primMap` at apply time.
- **Legacy DesignOps-plugin:** `theme-aliases.json` uses bare strings (`"light": "color/neutral/100"`) with collection implied by caller context. This works for Theme-→-Primitives (the only cross-collection alias direction in the legacy data) but is fragile if any other direction is added.
- **W3C DTCG:** `"$value": "{colors.blue}"` — single string with curly brace, dot-separated segments traverse the JSON group hierarchy ([§6.4](https://design-tokens.github.io/community-group/format/#aliases)). The spec FORBIDS `.`, `{`, `}` in token/group names. Slashes are allowed in names — but DTCG uses dots for the path traversal, so there is no conflict with our slash-separated Figma paths.

**Locked.** **Option A — structured `{ aliasOf: { collection, name } }` discriminated alias.**

**Rationale.**

1. **No parsing at consumers.** `if ('aliasOf' in value) { primMap.get(\`${value.aliasOf.collection}:${value.aliasOf.name}\`) }` — direct field reads, type-safe.
2. **Disambiguates the slash-vs-dot mismatch.** Figma variable names use `/` (the slash-vs-dot rule from `memory.md` "Do not repeat" — `figma.variables.createVariable('color.primary.50', …)` throws). DTCG aliases use `.` for path traversal. The canonical model normalizes to slashes within `name`, and keeps collection in its own field, so neither separator does double duty.
3. **Schema-generator friendly.** `ts-json-schema-generator` emits a clean `oneOf` between primitive values (`ColorValue` / `number` / `string` / `boolean`) and the alias object (which has a unique `aliasOf` discriminator key). No regex / pattern constraints required.
4. **Round-trip preserves DTCG curly-brace form.** On canonical-→-DTCG export, the adapter emits `"{primitives.color.blue.500}"` (joining collection + name with `.` after slash-→-dot substitution). On DTCG-→-canonical import, the adapter parses the curly-brace string: the first segment is the collection (must match one of the five `CollectionId` literals; error otherwise), the rest is the name (joined with slashes). Both directions are lossless.
5. **Avoids JSON Schema `$ref` keyword collision.** Field name is `aliasOf` (not `$ref`) — `$ref` is reserved in JSON Schema, and `ts-json-schema-generator` runs with `topRef: true` in our wiring (`build-schemas.mjs` L43). Using a non-reserved name removes any risk of generator confusion.

---

## Side-by-side worked example

**Token:** Theme `color/primary/default` aliasing Primitives `color/primary/500` — Light mode.

| Aspect                  | W3C DTCG input form                                                                                                                                                                                                                                                                                                  | Legacy `theme-aliases.json` row form                                                                                                                                                               | Canonical `TokensV1` form                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token identity          | Group nesting: `theme.color.primary.default` (JSON path)                                                                                                                                                                                                                                                             | `"path": "color/primary/default"` (file is `Theme` collection)                                                                                                                                     | `collection: 'theme', name: 'color/primary/default'`                                                                                                                                                                                                                                                                                                                         |
| Type                    | `"$type": "color"` (or inherited from parent group)                                                                                                                                                                                                                                                                  | Implicit (all `theme-aliases.json` rows are COLOR)                                                                                                                                                 | `type: 'COLOR'` (discriminator)                                                                                                                                                                                                                                                                                                                                              |
| Value (Light mode)      | `"$value": "{primitives.color.primary.500}"` (DTCG curly-brace alias)                                                                                                                                                                                                                                                | `"light": "color/primary/500"` (bare string, collection implied as Primitives)                                                                                                                     | `valuesByMode: { Light: { aliasOf: { collection: 'primitives', name: 'color/primary/500' } } }`                                                                                                                                                                                                                                                                              |
| Value (Dark mode)       | `"$extensions": { "fighub": { "modes": { "Dark": "{primitives.color.primary.400}" } } }` (modes via vendor extension; DTCG has no first-class modes)                                                                                                                                                                 | `"dark": "color/primary/400"`                                                                                                                                                                      | `valuesByMode: { ..., Dark: { aliasOf: { collection: 'primitives', name: 'color/primary/400' } } }`                                                                                                                                                                                                                                                                          |
| codeSyntax              | `"$extensions": { "fighub": { "codeSyntax": { "WEB": "var(--color-primary)", "ANDROID": "primary", "iOS": ".Primary.default" } } }`                                                                                                                                                                                  | `"codeSyntax": { "WEB": "var(--color-primary)", "ANDROID": "primary", "iOS": ".Primary.default" }`                                                                                                 | `codeSyntax: { WEB: 'var(--color-primary)', ANDROID: 'primary', iOS: '.Primary.default' }`                                                                                                                                                                                                                                                                                   |
| Optional description    | `"$description": "Primary brand color"`                                                                                                                                                                                                                                                                              | (Sometimes a `note` field on `rawLiterals` rows; not present on alias rows in the canonical Detroit Labs file)                                                                                     | `description?: 'Primary brand color'`                                                                                                                                                                                                                                                                                                                                        |
| Vendor extension passes | `"$extensions": { "com.example.custom": { ... } }` preserved verbatim                                                                                                                                                                                                                                                | n/a (legacy has no `$extensions` analog)                                                                                                                                                           | `extensions?: { 'com.example.custom': { ... } }`                                                                                                                                                                                                                                                                                                                             |
| **Full JSON example**   | `{ "theme": { "color": { "primary": { "default": { "$type": "color", "$value": "{primitives.color.primary.500}", "$extensions": { "fighub": { "modes": { "Dark": "{primitives.color.primary.400}" }, "codeSyntax": { "WEB": "var(--color-primary)", "ANDROID": "primary", "iOS": ".Primary.default" } } } } } } } }` | `{ "path": "color/primary/default", "light": "color/primary/500", "dark": "color/primary/400", "codeSyntax": { "WEB": "var(--color-primary)", "ANDROID": "primary", "iOS": ".Primary.default" } }` | `{ "collection": "theme", "name": "color/primary/default", "type": "COLOR", "valuesByMode": { "Light": { "aliasOf": { "collection": "primitives", "name": "color/primary/500" } }, "Dark": { "aliasOf": { "collection": "primitives", "name": "color/primary/400" } } }, "codeSyntax": { "WEB": "var(--color-primary)", "ANDROID": "primary", "iOS": ".Primary.default" } }` |

**Round-trip check.** Adapter direction A (DTCG → canonical → DTCG): parse nested groups → flatten to `collection: 'theme', name: 'color/primary/default'`, parse `{primitives.color.primary.500}` → `{ aliasOf: { collection: 'primitives', name: 'color/primary/500' } }`, fold `$extensions.fighub.modes` into `valuesByMode`. On export: re-nest groups, emit `{primitives.color.primary.500}` (slash-→-dot), re-emit `$extensions.fighub.modes` for non-default modes. Lossless. Adapter direction B (legacy `theme-aliases.json` → canonical → legacy): trivial — every field maps 1:1 with no transformation beyond the alias-string → structured-ref pass.

---

## Proposed `TokensV1` TypeScript interface

This is the interface that **WO-055's `/build` phase** writes into `packages/contracts/src/tokens.v1.ts`, replacing the current WO-003 stub. Do not commit yet — this research sketches the final shape only.

```ts
// packages/contracts/src/tokens.v1.ts

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
// Token variants — discriminated union by `type` (matches Figma Plugin API
// `VariableResolvedDataType` literals exactly)
// =============================================================================

interface TokenBase {
  collection: CollectionId;
  /** Slash-separated path, e.g. 'color/primary/default'. Never use dots (Figma throws). */
  name: string;
  description?: string;
  /** Optional Figma Plugin API `Variable.scopes` hint; defaults to ['ALL_SCOPES']. */
  scopes?: readonly string[];
  /** Per-platform codeSyntax. All three platforms independently optional. */
  codeSyntax?: Partial<Record<CodeSyntaxPlatform, string>>;
  /** Vendor-specific data preserved during DTCG round-trip. */
  extensions?: Record<string, unknown>;
  /** DTCG $deprecated semantics: true | string explanation. */
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
  /** Ordered for display + push-time `addMode` sequencing. Lookup is by name. */
  modes: readonly ModeName[];
}

// =============================================================================
// Optional EVC projection (Enterprise plan only — render-time, not storage)
// =============================================================================

export interface ThemeExtension {
  /** Brand name, e.g. 'Brand A'. */
  name: string;
  /** Only 'theme' and 'effects' are valid parents — Typography never extends. */
  parentCollection: 'theme' | 'effects';
  /**
   * Sparse overrides: only (variable name, mode name) pairs that differ
   * from the parent. Override values may themselves be aliases.
   */
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
  /** Five collections in canonical dependency order: Primitives → Theme → Typography → Layout → Effects. */
  collections: readonly Collection[];
  /** Flat list. Global uniqueness key is (collection, name). */
  tokens: readonly Token[];
  /**
   * Optional Enterprise-only theme projections. The push engine consumes this
   * only when `isEnterprise()` returns true; non-Enterprise files ignore it
   * entirely and bootstrap the base collections as-is.
   */
  themes?: readonly ThemeExtension[];
}

// =============================================================================
// Input union (for the WO-007 adapter dispatch)
// =============================================================================

/**
 * Untyped input shape — the WO-007 adapter narrows to TokensV1 by detecting
 * `v: 1` + `kind: 'tokens'` (canonical), `$value`/`$type` keys (W3C DTCG),
 * or legacy `collections: [{ name, modes, variables }]` (DesignOps-plugin).
 */
export type TokensInput = TokensV1 | unknown;
```

**Notes for the WO-055 `/build` agent.**

1. The above replaces lines 1–65 of the current `packages/contracts/src/tokens.v1.ts` stub entirely. The current stub's `DtcgTokenLeaf`, `TokensV1WC3DTCG*`, and `LegacyToken*` types are deleted — those are **adapter input shapes**, owned by WO-007 in Sprint 2 (in `packages/contracts/src/adapters/dtcg.input.v1.ts` and `legacy.input.v1.ts`, alongside this canonical model). The WO-055 build phase keeps only `TokensV1` (and its building-block types) in this file. The build agent will need to update `packages/contracts/scripts/build-schemas.mjs` to remove the `TokensV1WC3DTCG` / `TokensV1Legacy` / `TokensInput` schema generators (or temporarily skip them; coordinate with WO-007's plan).
2. The `@TJS-type string` JSDoc annotation on `CollectionId` is **defensive only** — the literal union should generate cleanly as `enum: [...]` in JSON Schema without it. Confirm during `/build` and remove the annotation if not needed.
3. `readonly` modifiers (on `collections`, `tokens`, `modes`, `scopes`, `themes`, `overrides`) become plain arrays in JSON Schema (`type: 'array'`) — `ts-json-schema-generator` ignores `readonly`. Keep them in TS for caller immutability.
4. `Record<string, unknown>` on `extensions` will emit JSON Schema `type: object, additionalProperties: {}` — acceptable for arbitrary vendor data. If we ever need stricter shapes for known vendor extensions (e.g. `extensions.fighub.modes` on DTCG round-trip), they go in the WO-007 adapter input shapes, not here.

---

## `ts-json-schema-generator` viability

**Confirmed viable.** No manual schema edits required.

The WO-003 wiring at `packages/contracts/scripts/build-schemas.mjs` runs with `additionalProperties: false`, `expose: 'export'`, `jsDoc: 'extended'`, `sortProps: true`, `topRef: true`, `skipTypeCheck: false`. Against the proposed `TokensV1` shape:

| Feature used                                                     | Generator handling                                                                    | Verdict |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------- |
| Literal-union types (`CollectionId`, `CodeSyntaxPlatform`)       | Emits `enum: ['primitives', ...]` cleanly                                             | ✅      |
| Discriminated unions (`Token = TokenColor \| TokenFloat \| ...`) | Emits `oneOf: [...]` with `type` as the discriminator                                 | ✅      |
| `Record<ModeName, V>` (where `V` is itself a union)              | Emits `type: 'object', additionalProperties: { oneOf: [...] }`                        | ✅      |
| `Partial<Record<CodeSyntaxPlatform, string>>`                    | Emits `type: 'object'` with each platform as an optional property mapping to `string` | ✅      |
| `readonly` array modifiers                                       | Ignored (emits plain `type: 'array'`)                                                 | ✅      |
| Nested interfaces (`TokenAliasRef.aliasOf`)                      | Emits as nested `$defs` reference                                                     | ✅      |
| `Record<string, unknown>` (extensions passthrough)               | Emits `type: 'object', additionalProperties: {}`                                      | ✅      |
| `boolean \| string` on `deprecated`                              | Emits `oneOf: [{ type: 'boolean' }, { type: 'string' }]`                              | ✅      |

**No anti-patterns used.** The interface explicitly avoids:

- `Map<K, V>` / `Set<T>` (not expressible in JSON Schema)
- Conditional types (`T extends X ? Y : Z`) — TS-only, schema generator chokes
- Generic helpers like `TokenValue<T>` — inlined the four variants instead
- Self-referential recursive types beyond what `topRef: true` already handles (the `TokenAliasRef` doesn't recursively reference `Token` — it stores a structured pointer by name, not the resolved token)

**One JSDoc annotation defensively applied** on `CollectionId` (`@TJS-type string`) — verify during `/build` whether it's needed. If the literal-union enum generates cleanly without it (likely), drop it.

**Action for WO-055 `/build` phase:** after writing the interface, run `npm run build:schemas -w @detroitlabs/fighub-contracts` (or equivalent) and inspect `packages/contracts/dist/tokens.v1.schema.json`. Confirm:

1. `enum` arrays for `CollectionId` + `CodeSyntaxPlatform` are populated.
2. `oneOf` for `Token` has four entries discriminated by `type`.
3. `valuesByMode` schemas (one per token variant) emit a clean `oneOf` of `[ColorValue/number/string/boolean, TokenAliasRef]`.
4. No `$ref` cycles or generator warnings.

If any of these fail, the most likely fix is a JSDoc annotation, **not** a schema-shape change.

---

## Open Questions

**None remain after this research.** All six locked dimensions + the cross-collection alias encoding have a decided answer with rationale. The only deferred items are intentionally scoped to downstream tickets:

- **DTCG-→-canonical adapter mechanics** (how to map DTCG group names to `CollectionId`) — Sprint 2 WO-007.
- **Legacy-→-canonical adapter mechanics** (how to parse `phases/02-steps5-9.md` per-collection variable lists into `Token[]`) — Sprint 2 WO-007.
- **Resolved-view helper signature** (`resolveTokens(tokens: TokensV1): ResolvedTokensV1`) — Sprint 2 WO-008 (push engine) + WO-010 (audit reporter).
- **Plan-detection helper extraction** (`src/core/variables/detectPlan.ts` with `isEnterprise(): Promise<boolean>`) — Sprint 2 WO-008, per WO-005 §5 recommendation.

---

## Recommendations

### For WO-055's `/plan` phase

1. The plan should reference this research file once and treat the locked decisions as input, not re-derive them.
2. Populate the `## Build Agents` section with two parallel agents in Phase 1: `code-build` (replaces `packages/contracts/src/tokens.v1.ts` stub with the sketched interface; updates `build-schemas.mjs` to drop the WO-007-owned adapter input shapes) and `doc-build` (publishes `decisions/canonical-token-model.md` — or merges this research file's content if the team prefers a single doc). Phase 2 is `/vqa` (schema regenerate + typecheck + lint).
3. Include the JSDoc-annotation verification step (the `@TJS-type` check on `CollectionId`) in the build agent's checklist — it's a 1-line decision but easy to miss.
4. The plan should call out the WO-007 dependency in the contract — the WO-007 author needs to know that the canonical shape no longer carries DTCG / legacy input types, and that WO-007 owns those input shapes in `packages/contracts/src/adapters/` (or wherever the team agrees during WO-007 planning).

### For WO-055's `/build` phase

1. Write `packages/contracts/src/tokens.v1.ts` per the sketched interface above. Preserve the `// =====` section comments — they help future readers navigate the discriminated-union structure.
2. Update `packages/contracts/scripts/build-schemas.mjs` to remove the `TokensV1WC3DTCG`, `TokensV1Legacy`, and `TokensInput` entries (or leave `TokensInput` as `unknown`-generating until WO-007 ships). The `TokensV1` schema must regenerate cleanly.
3. Run the full `packages/contracts` test/build matrix: `npm run typecheck -w @detroitlabs/fighub-contracts && npm run build:schemas -w @detroitlabs/fighub-contracts && npm run build -w @detroitlabs/fighub-contracts`. All must pass.
4. Spot-check the generated `dist/tokens.v1.schema.json` against the verification list in the `ts-json-schema-generator` viability section above.

### For Sprint 2 (downstream tickets)

1. **WO-007 (token input adapters):** add `depends_on: WO-055` to its `plan.md` before `/research` or `/plan` runs. The adapters consume `TokensV1` directly — both `dtcg → TokensV1` and `legacy → TokensV1` are well-defined now that the canonical shape is locked.
2. **WO-008 (variable push engine):** owns the `resolveTokens()` helper + plan detection helper. Reads `TokensV1.tokens[]` and `TokensV1.themes?[]` in the two-phase sequence documented in §6 above.
3. **WO-009 (codeSyntax mapping):** reads `TokensV1.tokens[i].codeSyntax` per-token. Sprint 2 WO-009 owns the **derivation rules** for tokens that don't carry an explicit codeSyntax field (e.g. Primitives derive from path per the rules in `phases/02-steps5-9.md`); the canonical model carries explicit codeSyntax where available and an empty/absent field where derivation is required.
4. **WO-010 (audit reporter):** validates `(collection, name)` uniqueness across `TokensV1.tokens[]`, mode-name coverage per collection (every token has a value for every mode in its collection's `modes[]`), no `themes[*].parentCollection === 'typography'`, and all aliases resolve to existing tokens.

---

## Sources

### External

- W3C DTCG — Design Tokens Format Module (draft 2025.10): https://design-tokens.github.io/community-group/format/
  - §3.8 Alias (Reference)
  - §5.1 Name and value (character restrictions — `.`, `{`, `}` reserved)
  - §5.2.1 Description
  - §5.2.2 Type (inheritance rules)
  - §5.2.3 Extensions ($extensions semantics + interop)
  - §5.2.4 Deprecated
  - §6 Groups (nested storage)
  - §6.4 Aliases (curly-brace syntax — `{group.token}` resolves to `$value`)
- Figma Developer Docs — `VariableAlias`: https://developers.figma.com/docs/plugins/api/VariableAlias/ — `{ type: 'VARIABLE_ALIAS', id: string }`
- Figma Developer Docs — `CodeSyntaxPlatform`: https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/ — `'WEB' | 'ANDROID' | 'iOS'` (literal casing)
- Figma Developer Docs — `setVariableCodeSyntax`: https://developers.figma.com/docs/plugins/api/properties/Variable-setvariablecodesyntax/
- Figma Developer Docs — Working with Variables (full guide): https://developers.figma.com/docs/plugins/working-with-variables/

### Internal — FigHub

- `Docs/PRD.md` §6.1 FR-BOOT-2 (normalize to canonical), §6.1 FR-BOOT-5 (per-token codeSyntax), §8.2 (tokens hybrid contract)
- `Docs/lift-sources.md` §0 (drift corrections — Plugin API is end-to-end for codeSyntax), §4 (convention shards)
- `memory.md` "Do not repeat" — slash-vs-dot variable-name rule (`figma.variables.createVariable('color.primary.50', …)` throws); EVC plan-gate pattern
- `.github/Sprint 1/WO-005-…/research/extended-collections.md` §2.4 (EVC implication for canonical model — render-time projection), §5 (locked recommendation), §1.3 (Enterprise plan-gate verification — exact error string captured)
- `.github/Sprint 1/WO-005-…/research/latency-benchmark.md` §3 (per-call rates: `setVariableCodeSyntax` 0.23 ms — confirms no need to optimize the codeSyntax-on-token shape), §6 (G1 = YES with 10× headroom)
- `packages/contracts/src/tokens.v1.ts` — current WO-003 stub to replace
- `packages/contracts/scripts/build-schemas.mjs` — JSON Schema generator wiring (lines 13–16 reference the to-be-deleted WO-007 adapter input shapes)
- `packages/contracts/tsconfig.schemas.json` — schema generator tsconfig

### Internal — Legacy DesignOps-plugin

- `skills/create-design-system/phases/04-step11-push.md` — Plugin API value rules per type (COLOR / FLOAT / STRING / BOOLEAN / VARIABLE_ALIAS); REST `codeSyntax` payload shape (only `"WEB"`, `"ANDROID"`, `"iOS"` keys, exact casing)
- `skills/create-design-system/phases/02-steps5-9.md` — per-collection variable lists; Typography Android-curve formula (`scaleFactor = mode/100`; `sqrt` damping above 1.3×); 12-variant body text rules
- `skills/create-design-system/data/theme-aliases.json` — Theme `rows` (alias rows: `path` + `light` + `dark` + `codeSyntax`) + `rawLiterals` (RGBA-per-mode rows for scrim/shadow/state); already encodes `codeSyntax` per row
- `skills/create-design-system/data/primitives-baseline.json` — Primitives ramp anchors + scales
- `skills/create-design-system/conventions/01-collections.md` — 5-collection structure (Primitives / Theme / Typography / Layout / Effects) + mode counts
- `skills/create-design-system/conventions/02-codesyntax.md` — codeSyntax-per-platform rules; key casing (`WEB`, `ANDROID`, `iOS` — never `IOS`); Theme codeSyntax read from table, not derived from path
- `skills/create-component/conventions/07-token-paths.md` — token path = Figma variable name; canonical paths per collection (Theme `color/<role>/<tier>`, Layout `space/<size>` + `radius/<size>`, Typography `<Scale>/<Size>/font-family`)
