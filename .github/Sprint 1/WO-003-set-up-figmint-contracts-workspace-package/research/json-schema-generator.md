# Research — JSON Schema generator for `@detroitlabs/fighub-contracts`

**Ticket:** WO-003 — Set up `@detroitlabs/fighub-contracts` workspace package
**Date:** 2026-05-27
**Author:** Research Agent
**Status:** Decision ready for `/plan`

---

## Summary

**Recommendation: `ts-json-schema-generator` v2.9.0 (pinned `~2.9.0`), invoked from a Node script at `packages/contracts/scripts/build-schemas.mjs`.**

FigHub's six contracts (`ops-program.v1`, `tokens.v1`, `component-spec.v1`, `drift-report.v1`, `handoff-context.v1`, `registry.v1`) are pure-interface, version-discriminated TS shapes that get authored once (PRD §7.4) and emitted once per build into `packages/contracts/dist/*.schema.json`. The plugin itself does **not** validate at runtime (PRD §10.3 — JSON Schema exists for _external_ consumers: CI, agents, the sunsetting DesignOps-plugin skills). Given that constraint, a build-time TS-interface → JSON Schema generator beats every runtime-schema-first alternative (Zod, Valibot, TypeBox, typia) because nothing else needs to ship in the plugin bundle, and the authoring model in `src/*.v1.ts` stays "TS interface, no DSL." `ts-json-schema-generator` is the most actively maintained tool in that category (v2.9.0 published April 2026, TS 6 support, 141 releases), it natively targets JSON Schema Draft 7 with full Draft 2020-12 idioms available, and it serializes FigHub's `v: 1` + `kind: "..."` discriminator pattern as `anyOf` branches with `const` literals on the discriminator fields — which is exactly what AJV-strict and OpenAPI-aware consumers expect.

`@sinclair/typebox` 1.x and Zod 4 `z.toJSONSchema` are both attractive runtime-validator stacks with first-class Draft 2020-12 emission, but adopting either inverts WO-003's authoring model (schema-first, types-derived) and either (a) bloats the plugin if the validator is also used at runtime, or (b) adds a parallel DSL that the team has to keep in sync with hand-written TS interfaces, which is the exact drift WO-003 exists to prevent. `typia` is fastest in raw runtime numbers but requires a `ts-patch` compiler plugin that fights the Vite/TS pipeline already locked by WO-002, and FigHub has zero runtime-validation need that would justify that cost. `typescript-json-schema` is explicitly in maintenance mode and its README points at `ts-json-schema-generator` as the recommended successor. The full comparison and build-script outline are below.

---

## Key Findings (per tool)

### 1. `ts-json-schema-generator` — vega/ts-json-schema-generator [PRIMARY]

- **Latest version (npm):** `2.9.0` — published ~2 months ago (Apr 2026). Source: <https://www.npmjs.com/package/ts-json-schema-generator>.
- **Latest GitHub release tag:** `v2.5.0` (2026-02-04); newer minors (2.6–2.9) are published via the `next`-branch auto-deploy process; both auto-published canaries and stable releases are tracked on npm. Last repo push: 2026-04-02. Source: <https://github.com/vega/ts-json-schema-generator>.
- **Maintenance:** Active. 110 contributors. 141 releases. 1.7k+ stars. TypeScript 6 support landed in PR #2509 (Mar 30 2026) while keeping TS 5 compatibility — important because the rest of FigHub stays on stable TS through Sprint 1/2 and may upgrade later.
- **Node engine:** `>=22.0.0` (per latest `package.json`). Aligns with FigHub memory.md "Stack / runtimes: Node 20+" — **we'd need to bump the CI matrix to Node 22 for this package's build script**, but the plugin runtime itself is sandboxed inside Figma and untouched.
- **Output JSON Schema version:** Draft 7 by default; emits Draft 7 keywords that are forward-compatible with Draft 2020-12 (no `additionalItems`-only features used). Setting `$schema` to 2020-12 in post-processing is trivial.
- **Discriminated-union output (FigHub's `v: 1` pattern):** Default behavior on a `type X = A | B | C` where every branch has `v: 1` and `kind: "ops-program" | "tokens" | …` is `anyOf` with each branch carrying `properties.v.const = 1` and `properties.kind.const = "<literal>"` plus a tight `required: ["v", "kind", ...]`. That's the standard JSON Schema 2020-12 "discriminator via `const`" pattern (Jsonic.io reference: <https://jsonic.io/guides/json-schema-discriminator>) and AJV-strict validates it correctly.
- **Explicit discriminator support:** `@discriminator <prop>` JSDoc tag generates an `if/then/else` schema; `discriminatorType: "open-api"` config switch emits the non-standard OpenAPI `discriminator` object for consumers that want it (PR #1572, merged 2023). We do **not** need this for AJV — `anyOf` + `const` is sufficient and standards-compliant.
- **`$ref` for shared types:** Yes — referenced types are emitted under `definitions` (Draft 7) or `$defs` (2020-12 idiom) and consumed via `$ref`. Renaming to `$defs` is a one-line post-processing step if we want strict 2020-12 output.
- **Complex unions / mapped types / generics / conditionals:** Supported per project README (`interface`, `enum`, `union`, `tuple`, generics, `typeof`, `keyof`, conditional types, type aliases).
- **Build integration:** Pure Node CLI (`ts-json-schema-generator --path ... --type ... --out ...`) or programmatic (`tsj.createGenerator({path, tsconfig, type}).createSchema(type)`). Does **not** touch Vite/tsc — runs as a post-`tsc` script. No compiler plugin. No runtime cost.
- **Bundle-size impact on plugin:** **Zero.** Build-time only. The plugin never imports this package.
- **Output one file per contract:** Trivial — programmatic API takes a `type` parameter; we loop the six contract type names and write `dist/<name>.schema.json` each iteration.
- **Three-shape tokens handling (`TokensV1`, `TokensV1WC3DTCG`, `TokensV1Legacy`):** Author all three as separate exported types in `src/tokens.v1.ts`. Run the generator three times (one per type) → three `.schema.json` files. Additionally export a `TokensInput = TokensV1WC3DTCG | TokensV1Legacy | TokensV1` discriminated union; generate a fourth `tokens-input.schema.json` so external consumers can validate any of the three accepted shapes in one call. Discrimination keys differ between the three: W3C DTCG identifies via `$value`/`$type` keys (best handled via a `patternProperties` heuristic in the schema), legacy uses Detroit Labs Foundations' shape, canonical uses `v: 1`. Detection rules live in PRD §8.2.

### 2. `typescript-json-schema` — YousefED/typescript-json-schema

- **Latest version (npm):** `0.67.2` — published May 5 2026. Source: <https://registry.npmjs.org/typescript-json-schema>.
- **Maintenance:** **Maintenance mode.** README explicitly says "more or less in maintenance mode" and recommends `ts-json-schema-generator` for new projects: <https://github.com/YousefED/typescript-json-schema/blob/master/README.md>. Still gets quarterly patch releases (3 releases between Nov 2025 and May 2026), so it's not dead — but it's not where new features land.
- **Output:** Draft 7 by default; uses the older "type hierarchy" approach rather than the AST. The README's own warning is that it has "better support for type aliases" only on `ts-json-schema-generator` because of this.
- **Discriminator support:** Same `anyOf` + `const` default as `ts-json-schema-generator`, but with several known quirks around literal unions and inheritance that have stale unfixed issues.
- **Why not pick it:** Authoritative recommendation from its own maintainers points at `ts-json-schema-generator`. No upside for FigHub.

### 3. `typia` — samchon/typia

- **Latest version:** `12.0.2` — published Apr 1 2026. Source: <https://github.com/samchon/typia/releases/tag/v12.0.2>. Very active (258 releases, 5.7k stars, last push Apr 2026).
- **Model:** **Compile-time TS transformer**, not a generator. `typia.is<T>()`, `typia.validate<T>()`, `typia.json.schemas<[T1, T2, …]>()` etc. are rewritten by a ts-patch / TypeScript-Go-native transform at compile time into hand-tuned runtime code.
- **Build integration:** Requires either (a) `ts-patch` mutating the TS compiler (`Legacy` path, recommended for production) plus the `@typia/unplugin/vite` plugin for Vite, OR (b) the experimental `ttsc`/`typescript-go` toolchain. From <https://typia.io/docs/setup/>: "you must use ttsc and ttsx. The stock tsc, ts-node, and tsx cannot apply the typia transform, so they will silently produce a build with no validators."
- **Discriminator handling:** Excellent — typia preserves TS narrowing semantics 1:1, so discriminated unions on literal keys work out of the box.
- **Why not pick it:**
  1. **Compiler-plugin friction with WO-002.** WO-002 just locked in Vite + plain `tsc` strict mode. Adding `ts-patch` to that pipeline introduces a non-standard postinstall step, complicates `npm ci` in CI, and creates an upgrade cliff every TS major.
  2. **The plugin never validates at runtime.** PRD §10.3 says JSON Schema is for external consumers; the plugin's deterministic core trusts that ops programs were validated upstream. Typia's primary value (runtime validation) is exactly the value FigHub doesn't need.
  3. **Cost-benefit asymmetry.** Typia generates _both_ schemas and runtime validators, but if we only use the schema-emission half (`typia.json.schemas`), we get all of typia's compile-time overhead with none of its runtime payoff, and a far simpler tool (`ts-json-schema-generator`) does the same job without the compiler plugin.

### 4. `@sinclair/typebox` 0.x / `typebox` 1.x

- **Latest version:** `typebox@1.1.38` (May 6 2026, ESM-only, TS 6/7+); `@sinclair/typebox@0.34.49` (Mar 28 2026, LTS for TS 5.0–6.0, CJS+ESM). Sources: <https://registry.npmjs.org/typebox>, <https://registry.npmjs.org/@sinclair/typebox>.
- **Maintenance:** Extremely active. 1.7M+ weekly downloads on the 1.x line, 102M+ on the 0.x line. 6.6k stars.
- **Model:** **Schema-first / type-derived.** Author declares `Type.Object({ v: Type.Literal(1), kind: Type.Literal('ops-program'), ops: Type.Array(…) })`; TypeScript type is inferred via `Static<typeof Schema>`. The TypeBox value _is_ a JSON Schema fragment.
- **JSON Schema version:** **Native Draft 2020-12 support in 1.x** (also drafts 3, 4, 6, 7, 2019-09). Best-in-class spec coverage of any tool in this comparison.
- **Discriminator:** `Type.Union([…])` emits `anyOf`; combined with `Type.Literal` on the discriminator field, this gives the same standards-compliant pattern as ts-json-schema-generator. No special tag needed.
- **Bundle-size impact on plugin:** Non-zero **if** the plugin imports validators at runtime. The `typebox` package is 1.4 MB unpacked but tree-shakes well; ESM-only on 1.x. Importing only `Type.*` factory functions at build time has near-zero plugin impact, but the moment someone wires `TypeCompiler.Compile(schema)` into the plugin you're shipping the compiler.
- **Why not pick it (despite being the best validator):**
  1. **Inverts WO-003's authoring model.** The ticket says "one TS file per contract" with pure interfaces (§Functional #2). TypeBox replaces that with `const OpsProgramV1Schema = Type.Object({…})` plus `type OpsProgramV1 = Static<typeof OpsProgramV1Schema>`. Existing legacy schemas (`registry.schema.json`, `shadcn-props.schema.json`) ported by hand to TypeBox would also need every JSON Schema quirk (`patternProperties`, `additionalProperties: true`, `$defs`, `if/then/else`) re-expressed in TypeBox's API — translatable but more code than just transcribing the structure to TS interfaces.
  2. **No runtime-validation need yet.** TypeBox's compiler outperforms AJV (its main selling point), but PRD §10.3 punts validation to external consumers. Adopting TypeBox now is paying for capability we don't use.
  3. **ESM-only on 1.x is a constraint, not a blocker.** Vite is fine with ESM. But it does mean the `dist/` build script must be ESM (`build-schemas.mjs`, not `.ts` with `module: "commonjs"`).
- **When we'd revisit:** Sprint 7+ if the ops protocol grows runtime validation requirements (e.g. accepting third-party ops programs over an open boundary). At that point a `Type.Object` rewrite is justified and gives us validators + schemas for one cost.

### 5. `zod-to-json-schema` (and Zod 4 native `z.toJSONSchema`)

- **Status of standalone package:** **No longer actively maintained as of November 2025.** Latest: `zod-to-json-schema@3.25.2` (Mar 27 2026). The README directs users to Zod v4's built-in `z.toJSONSchema()`. Source: <https://github.com/StefanTerdell/zod-to-json-schema/>.
- **Zod 4 native:** `z.toJSONSchema(schema, { target: 'draft-2020-12' })` is now the recommended path. Targets Draft 2020-12 by default, with `draft-07`, `draft-04`, and `openapi-3.0` fallbacks. Source: <https://zod.dev/json-schema>.
- **Discriminated unions:** `z.discriminatedUnion()` maps to `oneOf` (correct for FigHub's mutually-exclusive `kind` discriminator); `z.union()` maps to `anyOf`. Fixed in Zod 4.1.13 (Nov 2025). Source: <https://github.com/colinhacks/zod/issues/4089>.
- **Why not pick it (same trade-offs as TypeBox, with one extra):**
  1. **Same model inversion** as TypeBox — schema-first, types-derived. Same rewrite cost for `tokens.v1.ts`'s three-shape adapter union.
  2. **Plugin bundle cost.** Zod's runtime is ~12 KB minified+gzipped (smaller than TypeBox but not free). The plugin would either need to import Zod for parsing/validation (against PRD §10.3) or import it only at build time (in which case `ts-json-schema-generator` does the same job for $0 plugin bytes).
  3. **Ecosystem coupling.** Adopting Zod implicitly couples the contracts package to the Zod ecosystem (resolvers, integrations, etc.) which we don't need for a pure cross-runtime schema package.

### 6. `@valibot/to-json-schema`

- **Latest version:** `1.7.0` (May 5 2026). Targets draft-07, draft-2020-12, OpenAPI 3.0. Source: <https://registry.npmjs.org/@valibot/to-json-schema>.
- **Model:** Same as Zod (schema-first, type-derived) but with Valibot's pipe-based API and smaller bundle (~5 KB).
- **Maturity:** Now at v1 (Mar 2025) with steady minor releases; reaching ~200k monthly downloads on the JSON-schema package per the Valibot team's own blog post.
- **Why not pick it:** Same model-inversion argument as Zod/TypeBox, with the additional caveat that Valibot's discriminator support is via `v.variant(key, [...])` which is less mature in the JSON Schema converter than Zod 4's. No upside specific to FigHub.

---

## Comparison matrix

| Dimension                                                                                                       | `ts-json-schema-generator` ✅                       | `typescript-json-schema`                     | `typia`                           | `typebox` 1.x                                   | Zod 4 `z.toJSONSchema`                     | `@valibot/to-json-schema`   |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------- | --------------------------------- | ----------------------------------------------- | ------------------------------------------ | --------------------------- |
| **Latest version (2026-05-27)**                                                                                 | 2.9.0 (Apr 2026)                                    | 0.67.2 (May 2026, maint.)                    | 12.0.2 (Apr 2026)                 | 1.1.38 (May 2026)                               | zod 4.x                                    | 1.7.0 (May 2026)            |
| **Active maintenance**                                                                                          | ✅ very active                                      | ⚠️ maintenance mode                          | ✅ very active                    | ✅ very active                                  | ✅ very active                             | ✅ active                   |
| **Authoring model**                                                                                             | Pure TS interfaces                                  | Pure TS interfaces                           | Pure TS interfaces                | Schema-first (`Type.*`)                         | Schema-first (`z.*`)                       | Schema-first (`v.*`)        |
| **Matches WO-003 §Functional #2** ("one TS file per contract", "pure interfaces and discriminated unions only") | ✅                                                  | ✅                                           | ✅                                | ❌ inverts model                                | ❌ inverts model                           | ❌ inverts model            |
| **JSON Schema version**                                                                                         | Draft 7 (forward-compat 2020-12)                    | Draft 7                                      | Draft 7 / 2020-12                 | **Native 2020-12**                              | Native 2020-12                             | Native 2020-12              |
| **Discriminator on `v: 1` + `kind`**                                                                            | `anyOf` + `const` (correct)                         | `anyOf` + `const` (correct, occasional bugs) | Preserved 1:1                     | `anyOf` + `const` (correct)                     | `oneOf` for `discriminatedUnion` (correct) | `anyOf` + `const` (correct) |
| **`$ref` for shared types**                                                                                     | ✅                                                  | ✅                                           | ✅                                | ✅                                              | ✅                                         | ✅                          |
| **Vite/tsc build integration**                                                                                  | Plain Node script                                   | Plain Node script                            | ⚠️ `ts-patch` compiler plugin     | Plain runtime code                              | Plain runtime code                         | Plain runtime code          |
| **Plugin runtime bundle impact**                                                                                | **0 bytes**                                         | **0 bytes**                                  | ⚠️ if validators imported         | If imported: ~50 KB                             | If imported: ~12 KB gz                     | If imported: ~5 KB          |
| **Handles `TokensV1` 3-shape union**                                                                            | ✅ (3 separate types + union type → 4 schema files) | ✅                                           | ✅                                | ✅                                              | ✅                                         | ✅                          |
| **Node engine**                                                                                                 | ≥22                                                 | any                                          | tied to TS toolchain              | any (ESM)                                       | any                                        | any                         |
| **Recommendation**                                                                                              | **PRIMARY**                                         | Reject (deprecated by maintainer)            | Reject (compiler plugin friction) | Defer to Sprint 7+ if runtime validation needed | Defer (model inversion)                    | Defer (model inversion)     |

---

## Recommendation

**Use `ts-json-schema-generator@~2.9.0` invoked from `packages/contracts/scripts/build-schemas.mjs`.**

### Rationale (two paragraphs)

FigHub's contract package has two non-negotiable shape constraints that drive the decision: (1) every contract is a pure-data TS interface authored by hand (PRD §7.4, ticket §Functional #2) — there's no scenario where we want to learn or import a DSL — and (2) the plugin runtime ships **zero** validation code (PRD §10.3, ticket §Out of scope). Both constraints point away from runtime-validator stacks (TypeBox, Zod, Valibot, typia) and toward a build-time TS-AST → JSON Schema generator. Between the two real candidates in that category, `ts-json-schema-generator` decisively wins: it's actively developed (last release ~2 months ago, TS 6 support landed Mar 30 2026), it has explicit successor status over `typescript-json-schema` per the latter's own README, it handles every type construct FigHub's contracts use (interfaces, generics, conditional types, `keyof`, literal unions), and its default output for our `v: 1 + kind: "<literal>"` discriminator is exactly the AJV-strict-compatible `anyOf` + `const` pattern that JSON Schema 2020-12 specifies. The build script is a ~50-line Node program; the output is six (well, seven counting the `TokensInput` union) `*.schema.json` files committed under `packages/contracts/dist/`. The only operational cost is bumping the contracts package's CI matrix to Node 22 (the v2.x line requires it), which aligns with the broader Node 20+ baseline already in memory.md and is a sensible 2026 default.

The trade-off worth naming: by picking a pure-generator path we are _not_ setting up a runtime validation harness for the plugin. If a future sprint discovers the plugin should validate ops programs at runtime (e.g. when the agent → canvas pluginData path opens in Phase 3 per PRD §10.1), the migration target is `@sinclair/typebox` 1.x — same authoring repo, same package, but `Type.Object` replaces the TS interface and `TypeCompiler.Compile` adds a 50 KB-ish validator into the plugin bundle. That is a future decision, not a Sprint 1 one, and crucially it does **not** invalidate any schema files we generate now: TypeBox's output is the same Draft 2020-12 shape. Postponing it is safe.

---

## Build-script outline (deliverable for `/plan`)

### File: `packages/contracts/scripts/build-schemas.mjs`

```js
#!/usr/bin/env node
import { createGenerator } from 'ts-json-schema-generator';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');
const distDir = join(pkgRoot, 'dist');

const CONTRACTS = [
  { file: 'src/opsProgram.v1.ts', type: 'OpsProgramV1', out: 'ops-program.v1.schema.json' },
  { file: 'src/tokens.v1.ts', type: 'TokensV1', out: 'tokens.v1.schema.json' },
  { file: 'src/tokens.v1.ts', type: 'TokensV1WC3DTCG', out: 'tokens.v1.w3c-dtcg.schema.json' },
  { file: 'src/tokens.v1.ts', type: 'TokensV1Legacy', out: 'tokens.v1.legacy.schema.json' },
  { file: 'src/tokens.v1.ts', type: 'TokensInput', out: 'tokens.v1.input.schema.json' },
  {
    file: 'src/componentSpec.v1.ts',
    type: 'ComponentSpecV1',
    out: 'component-spec.v1.schema.json',
  },
  { file: 'src/driftReport.v1.ts', type: 'DriftReportV1', out: 'drift-report.v1.schema.json' },
  {
    file: 'src/handoffContext.v1.ts',
    type: 'HandoffContextV1',
    out: 'handoff-context.v1.schema.json',
  },
  { file: 'src/registry.v1.ts', type: 'RegistryV1', out: 'registry.v1.schema.json' },
];

await mkdir(distDir, { recursive: true });

for (const { file, type, out } of CONTRACTS) {
  const generator = createGenerator({
    path: join(pkgRoot, file),
    tsconfig: join(pkgRoot, 'tsconfig.json'),
    type,
    skipTypeCheck: false,
    additionalProperties: false,
    expose: 'export',
    jsDoc: 'extended',
    sortProps: true,
    topRef: true,
  });
  const schema = generator.createSchema(type);
  schema.$schema = 'https://json-schema.org/draft/2020-12/schema';
  schema.$id = `https://fighub.detroitlabs.com/schemas/${out}`;
  await writeFile(join(distDir, out), JSON.stringify(schema, null, 2) + '\n', 'utf8');
  console.log(`✓ ${out}`);
}
```

### `package.json` scripts (added to `packages/contracts/package.json`)

```json
{
  "scripts": {
    "build:types": "tsc --emitDeclarationOnly",
    "build:schemas": "node scripts/build-schemas.mjs",
    "build": "npm run build:types && npm run build:schemas",
    "clean": "rimraf dist"
  },
  "devDependencies": {
    "ts-json-schema-generator": "~2.9.0",
    "rimraf": "^6.0.1",
    "typescript": "^5.x"
  },
  "engines": {
    "node": ">=22"
  }
}
```

### Output layout under `packages/contracts/dist/`

```
dist/
├── ops-program.v1.schema.json
├── tokens.v1.schema.json              # canonical TokensV1
├── tokens.v1.w3c-dtcg.schema.json     # input adapter shape
├── tokens.v1.legacy.schema.json       # input adapter shape
├── tokens.v1.input.schema.json        # union of all three
├── component-spec.v1.schema.json
├── drift-report.v1.schema.json
├── handoff-context.v1.schema.json
├── registry.v1.schema.json
├── index.d.ts
├── opsProgram.v1.d.ts
├── tokens.v1.d.ts
├── componentSpec.v1.d.ts
├── driftReport.v1.d.ts
├── handoffContext.v1.d.ts
└── registry.v1.d.ts
```

### Discriminated-union serialization

For `OpsProgramV1`, where `ops` is `Array<PushTokensOp | BuildStyleGuideOp | …>`, the emitted JSON Schema renders each op as a branch of an `anyOf` array, with each branch carrying:

```json
{
  "type": "object",
  "properties": {
    "type": { "const": "push-tokens" },
    "source": { "$ref": "#/$defs/TokenSource" }
  },
  "required": ["type", "source"],
  "additionalProperties": false
}
```

AJV in strict mode (`{ strict: true, discriminator: true }`) discriminates these branches in O(1) via the `const` on `type`. For `DriftReportV1.drifts[*]` discriminating on `direction: "push" | "pull" | "conflict"`, the same pattern applies. For the top-level `v: 1` envelope present on every contract, `v` is just a `const: 1` on the root object — never a multi-branch union — so no special handling is needed.

If a future external consumer (e.g. an OpenAPI 3.1 codegen) prefers the `discriminator` keyword, we can either (a) add `@discriminator type` JSDoc tags to the union type declarations and set `discriminatorType: "open-api"` in the generator config, or (b) keep the default `anyOf` output and post-process. Either is easy to revisit.

### Three-shape `tokens.v1.ts` handling

```ts
// canonical internal — informed by CTX-002 (Sprint 2)
export interface TokensV1 {
  v: 1;
  kind: 'tokens';
  // canonical collections per PRD §6.1 FR-BOOT-3 + DesignOps-plugin/conventions/01-collections.md
  primitives: {
    /* … */
  };
  theme: {
    /* Light/Dark modes */
  };
  typography: {
    /* … */
  };
  layout: {
    /* … */
  };
  effects: {
    /* … */
  };
}

// W3C DTCG input adapter — detected by $value/$type keys
export interface TokensV1WC3DTCG {
  $schema?: string;
  // recursive groups of leaves with $value + $type
  [group: string]: TokensV1WC3DTCGNode;
}

// Detroit Labs Foundations legacy input adapter
export interface TokensV1Legacy {
  // shape carried forward from DesignOps-plugin's tokens model
  // (lift from skills/create-design-system/data/theme-aliases.json shape + conventions)
  collections: {
    /* … */
  };
  aliases: {
    /* … */
  };
}

// Discriminated union for the normalizer's entry point
export type TokensInput = TokensV1 | TokensV1WC3DTCG | TokensV1Legacy;
```

The generator emits one schema per type and a fourth for the union; the normalizer (Sprint 2) reads `TokensInput` and produces `TokensV1`. Detection rules per PRD §8.2: `$value`/`$type` keys → W3C DTCG; legacy shape → legacy adapter; explicit `v: 1, kind: "tokens"` → already canonical.

---

## Pinned version

```
ts-json-schema-generator@~2.9.0
```

`~2.9.x` pins to the current minor (`2.9.x` patch updates only) — appropriate while we settle on the build-script shape. Once `/build` lands and CI is green, we can move to `^2.x.x` for minor updates.

Cross-package: also pin `rimraf@^6.0.1` (already a FigHub dev-dep candidate via WO-002) and reuse FigHub's root `typescript@^5.x` for the `tsc --emitDeclarationOnly` step.

---

## Open questions (for `/plan` to lock)

1. **Plugin runtime validation — confirm out of scope?** PRD §10.3 says JSON Schema is for _external_ consumers and the plugin trusts its inputs. WO-003 §Out-of-scope agrees ("JSON Schema runtime validation library wiring in consumers"). `/plan` should explicitly confirm this — if anyone wants the plugin to AJV-validate incoming ops programs in the dispatcher, switch to TypeBox 1.x now rather than after WO-003 ships.
2. **Node 22 CI bump.** `ts-json-schema-generator@2.x` requires Node ≥22. memory.md says "Node 20+." Either:
   - Bump the workspace baseline to Node 22 (preferred — 2026 default, aligns with TypeScript 6 trajectory), or
   - Pin to the older `ts-json-schema-generator@1.x` line (last release: late 2024). **Recommended: bump to Node 22.**
3. **JSON Schema `$schema` URI.** The default emit is Draft 7. Build script overrides to `https://json-schema.org/draft/2020-12/schema`. Is the small Draft 7 → 2020-12 difference acceptable for our consumers? (Yes — AJV 8 handles both; the only practical difference is `definitions` vs `$defs`, which we can post-process.)
4. **`TokensV1` canonical — full or stub?** Ticket §"Ready for /plan" says: "if CTX-002 hasn't landed, leave `TokensV1` as a `TODO` interface that `tokens.v1.ts` exports but Sprint 2 fills." Confirm with `/plan` whether to:
   - Land `TokensV1` as `interface TokensV1 { v: 1; kind: "tokens"; /* TODO Sprint 2 */ }` (passes generator, emits a placeholder schema), OR
   - Block WO-003 on CTX-002 promotion first.
   - Recommended: stub now, fill in Sprint 2 — keeps the contracts package shippable.
5. **Discriminator strategy for external OpenAPI consumers.** Default is `anyOf` + `const`. If any consumer (e.g. a future spec-driven SDK gen) needs the OpenAPI `discriminator` object, switch the relevant unions to `@discriminator <prop>` tags + `discriminatorType: "open-api"` config. Defer until a real consumer asks.
6. **Single bundled schema vs per-type files.** PRD §7.3 implies per-file under `packages/contracts/dist/`. Recommended: per-file (matrix above). A bundled `schemas.json` index can be added trivially (sum of `Object.fromEntries(CONTRACTS.map(c => [c.type, generator.createSchema(c.type)]))`) if a consumer asks.
7. **Migration trigger to TypeBox.** Decision: revisit if PRD §10.1 Phase 3 (`Frame pluginData` source) lands and ops programs start crossing trust boundaries inside the plugin. Track in plan.md "Open questions."

---

## Sources

### Tool-specific (primary, all cited 2026-05-27)

- `ts-json-schema-generator` npm: <https://www.npmjs.com/package/ts-json-schema-generator> (v2.9.0, published ~2 months ago)
- `ts-json-schema-generator` GitHub: <https://github.com/vega/ts-json-schema-generator> (last push 2026-04-02, 1.7k stars, 141 releases)
- TS 6 support PR (Mar 30 2026): <https://github.com/vega/ts-json-schema-generator/commit/d01ab940e0e29ccec95b2bf6665ebfc8d18e6828>
- `typescript-json-schema` npm: <https://registry.npmjs.org/typescript-json-schema> (v0.67.2, maintenance mode)
- `typescript-json-schema` README ("more or less in maintenance mode"): <https://github.com/YousefED/typescript-json-schema/blob/master/README.md>
- `typia` GitHub: <https://github.com/samchon/typia> (v12.0.2, last push 2026-04-01)
- `typia` setup guide (Vite + ts-patch requirements): <https://typia.io/docs/setup/>
- `typebox` 1.x npm: <https://registry.npmjs.org/typebox> (v1.1.38, May 2026, native 2020-12)
- `@sinclair/typebox` 0.x npm: <https://registry.npmjs.org/@sinclair/typebox> (v0.34.49, Mar 2026, LTS)
- `typebox` GitHub: <https://github.com/sinclairzx81/typebox>
- `zod-to-json-schema` npm: <https://registry.npmjs.org/zod-to-json-schema> (v3.25.2, deprecated in favor of native Zod 4)
- Zod 4 native JSON Schema docs: <https://zod.dev/json-schema>
- Zod `discriminatedUnion` → `oneOf` fix: <https://github.com/colinhacks/zod/issues/4089>
- `@valibot/to-json-schema` npm: <https://registry.npmjs.org/@valibot/to-json-schema> (v1.7.0, May 2026)
- Valibot JSON Schema guide: <https://valibot.dev/guides/json-schema/>

### JSON Schema discriminator pattern reference

- Discriminator with `oneOf` + `const` (canonical 2020-12 approach): <https://jsonic.io/guides/json-schema-discriminator>
- OpenAPI `discriminator` keyword in ts-json-schema-generator (PR #1572): <https://github.com/vega/ts-json-schema-generator/pull/1572>
- ts-json-schema-generator programmatic API: <https://www.npmjs.com/package/ts-json-schema-generator#programmatic-usage>

### FigHub internal references (read in scope of this research)

- `Docs/PRD.md` §7.3 (repo layout), §7.4 (cross-repo contract package), §8 (5 data contracts), §10.3 (dual-format serialization)
- `Docs/lift-sources.md` §5 (schemas to lift)
- `DesignOps-plugin/skills/create-component/registry.schema.json` (~33 lines, Draft 2020-12, baseline for `RegistryV1`)
- `DesignOps-plugin/skills/create-component/shadcn-props.schema.json` (~148 lines, Draft 2020-12, `$defs`, `oneOf`, `if/then`, `patternProperties` — baseline for `ComponentSpecV1`)
- `.github/Sprint 1/WO-003-…/ticket.md` (Functional reqs + Out of scope)
- `memory.md` Quick reference (stack, Node baseline, sprint state)
