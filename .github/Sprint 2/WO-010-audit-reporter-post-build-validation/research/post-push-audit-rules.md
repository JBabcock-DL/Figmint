# Post-push audit rules — WO-010 research

> **Status:** ✅ Research complete — contract shape, rule catalog, API, and integration locked for `/plan`.
> **Date:** 2026-05-27
> **Owner:** WO-010 (Sprint 2)
> **PRD anchors:** §6.1 FR-BOOT-8 (audit after each build), §8.4 (`drift-report.v1` — contrast only), §9.3 (ops audit log typed results)
> **Primary lift:** `DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` (Variables & codeSyntax bullets only for Sprint 2)
> **Upstream:** WO-055 canonical model (`research/canonical-token-model.md`), WO-008 push engine hook

---

## Summary

Seven decisions unblock WO-010 `/plan`:

1. **Ship `auditReport.v1.ts` in `@detroitlabs/figmint-contracts`** — not an internal-only type. Post-push audit is an **output document** (like `drift-report.v1` / `handoff-context.v1`), consumed by WO-015 UI, ops audit log entries, agents (PRD G6), and WO-019 markdown rendering in Sprint 4. Implementation lives in `src/core/audit/`; the contract is the wire shape.

2. **`AuditReportV1` ≠ `DriftReportV1`.** Drift is a **3-way Figma ↔ repo diff** with snapshot baseline (Phase 3). Audit is **post-operation validation** that the just-written Figma state matches canonical input + deterministic rules. They may reference the same token IDs but serve different lifecycles; do not merge types.

3. **Sprint 2 scope = `variables` only.** From `14-audit.md`, only the **Variables & codeSyntax** section (+ canonical-model checks from WO-055) apply post-variable-push. Canvas geometry / table / text-style rules defer to Sprint 3 (`scope: 'canvas'`). Component rules defer to Sprint 5 (`scope: 'component'`).

4. **`runAudit()` is synchronous in the plugin main thread** after `push.ts` commits. Input includes canonical `TokensV1`, `PushResult` counters, and a **pre-read snapshot** of local collections/variables (Plugin API only — no REST).

5. **`resolveTokens()` is used for value-equality rules only.** Alias existence / mode-key coverage compare structural canonical fields. Literal value comparison resolves aliases once via shared `src/core/variables/resolveTokens.ts` (WO-008 owns implementation; WO-010 imports).

6. **Push integration:** `push.ts` always attaches `audit: AuditReportV1`. Push operational `errors[]` stays push-only; audit failures bubble via `audit.passed === false` + failed rule diagnostics (WO-008 AC: "failures bubble up" — caller checks `audit.passed`, not rollback).

7. **Sprint 2 output = JSON object only.** WO-019 adds the GFM markdown renderer as a 6th contract formatter. Ticket AC #3 is satisfied in Sprint 2 by serializing `AuditReportV1` to JSON; markdown is an explicit WO-019 dependency.

---

## Key Findings

### 1. AuditReport type — new contract (locked)

**Decision:** Add `packages/contracts/src/auditReport.v1.ts` and export from `index.ts`.

**Rationale.**

| Factor                   | Internal type only       | Contract (`auditReport.v1`)                       |
| ------------------------ | ------------------------ | ------------------------------------------------- |
| PRD §8 output docs       | N/A                      | Matches `drift-report`, `handoff-context` pattern |
| WO-015 Bootstrap UI      | Would re-define shape    | Imports typed contract                            |
| WO-019 formatter         | Cannot register renderer | Adds 6th renderer cleanly                         |
| Ops audit log (§9)       | Untyped blob             | Typed op result                                   |
| Versioning (`memory.md`) | Ad-hoc                   | `v: 1` + `kind: 'audit-report'` discriminator     |

**Locked shape:**

```ts
export type AuditScope = 'variables' | 'canvas' | 'component';
export type AuditSeverity = 'error' | 'warn';

export interface AuditRuleResult {
  ruleId: string;
  pass: boolean;
  diagnostic: string;
  severity?: AuditSeverity;
}

export interface AuditReportSummary {
  /** From PushResult — variables scope only in Sprint 2 */
  variablesCreated: number;
  variablesUpdated: number;
  variablesSkipped: number;
  /** Rule rollups */
  rulesPassed: number;
  rulesFailed: number;
  rulesWarned: number;
  /** Per-collection mode coverage: modes expected vs modes with ≥1 value on every token */
  modeCoverage: Record<string, { expected: string[]; missing: string[] }>;
  /** Per-platform codeSyntax: tokens missing platform string on Figma variable */
  codeSyntaxCoverage: Record<'WEB' | 'ANDROID' | 'iOS', { expected: number; missing: number }>;
}

export interface AuditReportMeta {
  generatedAt: string;
  scope: AuditScope;
  figmaFileKey?: string;
  operation: 'push-variables'; // extend for canvas/component later
}

export interface AuditReportV1 {
  v: 1;
  kind: 'audit-report';
  meta: AuditReportMeta;
  passed: boolean;
  summary: AuditReportSummary;
  results: AuditRuleResult[];
}
```

**Notes.**

- `passed === true` iff every `results[]` entry with `severity !== 'warn'` (default `error`) has `pass: true`.
- `summary` fields satisfy ticket AC counts without re-parsing `results[]`.
- Regenerate JSON Schema via WO-003 wiring when `/build` lands the file.

### 2. AuditReport vs DriftReport — relationship (clarified)

|                   | `DriftReportV1`                               | `AuditReportV1`                                   |
| ----------------- | --------------------------------------------- | ------------------------------------------------- |
| **When**          | On-demand drift detection (Phase 3)           | Immediately after push / build / scaffold         |
| **Baseline**      | Snapshot in canvas pluginData + repo checkout | Canonical input document + push result            |
| **Question**      | "What changed since last sync?"               | "Did this operation succeed correctly?"           |
| **Directions**    | push / pull / conflict                        | pass / fail per rule                              |
| **Figma reads**   | Variables + components vs repo                | Post-write local variables (+ canvas nodes later) |
| **Contract file** | `driftReport.v1.ts` (exists)                  | `auditReport.v1.ts` (new)                         |

Audit failures may **correlate** with future drift entries (e.g. missing mode value → repo has value, Figma does not) but the contracts stay separate. Do not embed drift entries inside `AuditReportV1`.

### 3. Variable-scope rule catalog (Sprint 2)

Port source mapping:

| Source                                               | Sprint 2 applicability                                 |
| ---------------------------------------------------- | ------------------------------------------------------ |
| `14-audit.md` → **Variables & codeSyntax** (L20–23)  | ✅ All three bullets → rules below                     |
| `14-audit.md` → Canvas / Tables / Text / Pages / TOC | ❌ Sprint 3 `scope: 'canvas'`                          |
| `14-audit.md` → Optional machine gate                | ❌ Canvas node probes                                  |
| `06-audit-checklist.md`                              | ❌ Sprint 5 `scope: 'component'`                       |
| `validate-tokens.mjs`                                | ❌ Component CONFIG path validation — different domain |
| WO-055 §Recommendations #4                           | ✅ Canonical integrity rules                           |

#### Rule table (Sprint 2 — `scope: 'variables'`)

| ruleId                             | Pass condition                                                                                                                       | Diagnostic template                                                                                          | Data needed                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `var/push-counts-present`          | `pushResult.created + pushResult.updated + pushResult.skipped` defined; `pushResult.errors.length === 0`                             | `Push reported {created} created, {updated} updated, {skipped} skipped` / `Push errors: {errors.join('; ')}` | `PushResult` only                                                            |
| `var/collections-exist`            | All 5 canonical collection IDs exist as local Figma collections (by name map: `primitives`→`Primitives`, etc.)                       | `Missing collection: {displayName}`                                                                          | Figma `getLocalVariableCollections()` + canonical `TokensV1.collections[]`   |
| `var/collection-modes-match`       | Each collection's Figma mode **names** match canonical `modes[]` (order-independent)                                                 | `{collection}: expected modes [{expected}], found [{found}]`                                                 | Figma collection `.modes` + canonical                                        |
| `var/token-count-match`            | Per collection, Figma variable count === canonical token count                                                                       | `{collection}: expected {n} variables, found {m}`                                                            | Figma `variableIds` + canonical `tokens[]` filter                            |
| `var/token-names-match`            | Every canonical `(collection, name)` exists in Figma                                                                                 | `Missing variable: {collection}/{name}`                                                                      | Figma variable `.name` + canonical                                           |
| `var/mode-value-present`           | Every canonical token has a non-empty value for every mode in its collection's `modes[]` on the Figma variable                       | `{collection}/{name}: missing value for mode {modeName}`                                                     | Figma `valuesByMode` (modeId→name map) + canonical `valuesByMode` keys       |
| `var/alias-target-exists`          | Every `{ aliasOf }` in canonical resolves to an existing token in `(collection, name)` index                                         | `{collection}/{name} mode {mode}: alias target {targetCollection}/{targetName} not found`                    | Canonical only (structural)                                                  |
| `var/alias-resolves`               | After `resolveTokens()`, no alias cycle or broken chain                                                                              | `Unresolved alias at {collection}/{name} mode {mode}`                                                        | `resolveTokens(canonical)`                                                   |
| `var/value-matches-canonical`      | For each token/mode, Figma resolved value equals canonical resolved literal (COLOR RGBA within ε, FLOAT exact, STRING/BOOLEAN exact) | `{collection}/{name} mode {mode}: expected {expected}, got {actual}`                                         | `resolveTokens(canonical)` + Figma `resolveForConsumer()` / alias resolution |
| `var/codesyntax-all-platforms`     | Every Figma variable has non-empty `codeSyntax.WEB`, `.ANDROID`, `.iOS`                                                              | `{collection}/{name}: missing codeSyntax.{platform}`                                                         | Figma `variable.codeSyntax` + canonical expectation (all tokens)             |
| `var/codesyntax-matches-canonical` | Figma `codeSyntax` equals canonical `token.codeSyntax` per platform (after WO-009 derivation for tokens without explicit triple)     | `{collection}/{name} {platform}: expected "{expected}", got "{actual}"`                                      | Figma + canonical (+ WO-009 derived view)                                    |
| `var/codesyntax-ios-format`        | Every iOS string matches dot-segment lowercase rule (no camelCase tail segments) — port `02-codesyntax.md`                           | `{collection}/{name}: iOS codeSyntax "{value}" contains camelCase segment`                                   | Figma or canonical iOS strings                                               |
| `var/codesyntax-theme-not-derived` | Theme tokens: codeSyntax must match canonical explicit triple (not path-derived) — encodes `14-audit.md` L23                         | `{collection}/{name}: Theme codeSyntax must come from Step 6 table, not path`                                | Canonical `collection === 'theme'` + explicit `codeSyntax`                   |
| `var/canonical-unique-keys`        | No duplicate `(collection, name)` in `TokensV1.tokens[]`                                                                             | `Duplicate token key: {collection}/{name}`                                                                   | Canonical only                                                               |
| `var/evc-typography-parent`        | If `tokens.themes[]` present, no entry has `parentCollection === 'typography'`                                                       | `themes[{i}].parentCollection must not be typography`                                                        | Canonical only                                                               |
| `var/push-no-errors`               | `pushResult.errors.length === 0`                                                                                                     | Same as push-counts                                                                                          | `PushResult`                                                                 |

**Minimum ticket AC coverage.**

- **Counts:** `var/push-counts-present` + `summary.variablesCreated/Updated/Skipped`.
- **Mode coverage:** `var/mode-value-present` + `var/collection-modes-match` → `summary.modeCoverage`.
- **codeSyntax coverage:** `var/codesyntax-all-platforms` → `summary.codeSyntaxCoverage`.
- **Simulated failure:** unit test fixture with canonical token missing `Dark` in `valuesByMode` → `var/mode-value-present` FAIL with diagnostic containing mode name.

**Severity defaults.**

- All rules above: `severity: 'error'` unless noted.
- Future: `var/codesyntax-ios-format` could downgrade to `warn` during migration — keep `error` for Sprint 2 strictness.

### 4. `runAudit.ts` API (locked)

```ts
// src/core/audit/types.ts — re-exports AuditReportV1 from contracts; plugin-only helpers below

export interface FigmaVariableSnapshot {
  id: string;
  name: string;
  collectionId: string;
  collectionName: string;
  resolvedType: VariableResolvedDataType;
  valuesByMode: Record<string, VariableValue>; // keyed by mode NAME
  codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>;
}

export interface FigmaCollectionSnapshot {
  id: string;
  name: string;
  modes: Array<{ modeId: string; name: string }>;
  variables: FigmaVariableSnapshot[];
}

export interface PushResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function readFigmaVariableState(): Promise<FigmaCollectionSnapshot[]> {
  // Main-thread Plugin API reads — see §5
}

export async function runAudit(
  scope: 'variables',
  input: {
    canonical: TokensV1;
    pushResult: PushResult;
    figmaCollections: FigmaCollectionSnapshot[];
  },
): Promise<AuditReportV1> {
  // Dispatch to rules/*.ts; aggregate results + summary
}
```

**Refinements vs draft API.**

- **`figmaCollections` is a snapshot, not raw `VariableCollection[]`.** Main thread reads Plugin API once in `readFigmaVariableState()`, normalizes mode IDs → names, then passes plain objects. Keeps rule functions pure + Vitest-friendly.
- **`runAudit` is `async` for signature stability** (future canvas scope may need async reads) but variables scope has no awaits internally.
- **Canvas / component scopes:** export overload or union input types in `/plan`; Sprint 2 implements `'variables'` branch only — other scopes throw `unsupported scope` until later sprints.

### 5. Plugin API reads (main thread)

Readable after push (no REST):

```ts
const collections = await figma.variables.getLocalVariableCollectionsAsync();
for (const col of collections) {
  const modeIdToName = Object.fromEntries(col.modes.map((m) => [m.modeId, m.name]));
  for (const varId of col.variableIds) {
    const variable = await figma.variables.getVariableByIdAsync(varId);
    // variable.name, variable.resolvedType, variable.codeSyntax
    // variable.valuesByMode[modeId] → map to modeName via modeIdToName
  }
}
```

**Not available / not needed Sprint 2.**

- REST-only codeSyntax PUT (legacy DesignOps split) — plugin uses `variable.codeSyntax` property directly per `memory.md`.
- Cross-file library variables — audit local collections only (bootstrap creates local collections).
- Resolved alias walk on Figma side — use `figma.variables.getVariableById` for alias targets when comparing; prefer canonical `resolveTokens()` as source of truth for expected literals.

### 6. Integration with `push.ts` (locked)

```ts
// src/core/variables/push.ts (WO-008)
export async function pushTokens(canonical: TokensV1): Promise<PushResult & { audit: AuditReportV1 }> {
  const pushResult = await /* create/update collections + variables */;
  const figmaCollections = await readFigmaVariableState();
  const audit = await runAudit('variables', { canonical, pushResult, figmaCollections });
  return { ...pushResult, audit };
}
```

**Failure bubbling (WO-008 AC).**

| Field             | Contents                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `errors[]`        | Push-time operational failures only (API throws, invalid input)                                                                       |
| `audit.passed`    | `false` when any error-severity rule fails                                                                                            |
| `audit.results[]` | Per-rule diagnostics for UI inline display                                                                                            |
| Caller contract   | Treat `!audit.passed` as operation failure for UX even though Figma state is already written (undo boundary is WO-008's `commitUndo`) |

Do **not** duplicate audit diagnostics into `errors[]` — keeps push vs validation concerns separate. WO-015 UI reads `audit` directly.

### 7. Sprint 4 formatter deferral (WO-019)

- Sprint 2: return `AuditReportV1` object; UI / tests use `JSON.stringify(audit, null, 2)` or structured React render.
- WO-019 adds `src/io/formats/markdown.ts` renderer #6 for `kind: 'audit-report'` (section headings: summary counts, failed rules table, mode coverage, codeSyntax coverage).
- Ticket AC "JSON+Markdown formatter" → **split:** JSON in WO-010 ✅; Markdown in WO-019 (add `depends_on: WO-010` to WO-019 plan when planning Sprint 4).

### 8. `resolveTokens()` relationship (locked)

| Rule category          | Uses `resolveTokens()`?                                          |
| ---------------------- | ---------------------------------------------------------------- |
| Mode key presence      | No — compare canonical `valuesByMode` keys vs Figma mode names   |
| Alias target exists    | No — structural `{ aliasOf: { collection, name } }`              |
| Alias graph valid      | Yes — detect cycles / broken refs                                |
| Literal value equality | Yes — compare resolved canonical literal to Figma resolved value |
| codeSyntax             | No — direct field compare (+ WO-009 derivation helper)           |

**Ownership:** `src/core/variables/resolveTokens.ts` ships with WO-008; WO-010 imports it. Signature per WO-055:

```ts
export function resolveTokens(tokens: TokensV1): ResolvedTokensV1;
// ResolvedTokensV1: same shape but valuesByMode values are literals only (no aliasOf)
```

Audit must **not** re-implement alias walking.

### 9. Vitest strategy

**Layout.**

```
tests/
  fixtures/
    audit/
      tokens-minimal.v1.json      # 2 collections, 2 modes on theme
      figma-snapshots/
        pass-all.json
        missing-dark-mode.json    # triggers var/mode-value-present FAIL
  unit/
    audit/
      rules/
        mode-value-present.test.ts
        codesyntax-coverage.test.ts
      runAudit.test.ts
```

**Approach.**

1. **Pure rule functions** in `src/core/audit/rules/<ruleId>.ts` — `(canonical, figmaSnapshot, pushResult) => AuditRuleResult`. No Figma globals in rule bodies.
2. **Fixtures** committed as JSON matching `FigmaCollectionSnapshot` / `TokensV1` shapes.
3. **`runAudit.test.ts`** loads fixture pairs, asserts `passed`, `summary`, and specific `ruleId` diagnostics.
4. **Simulated failure AC:** `missing-dark-mode.json` fixture → expect `var/mode-value-present` FAIL with `missing value for mode Dark`.
5. **No live Figma in CI** — Plugin API mocked at the snapshot reader boundary only.

**Blocker note:** Root `package.json` has no Vitest yet (tickets assume it). WO-010 `/plan` should either add `vitest` devDependency + `npm test` script or declare dependency on a CI test ticket. Recommend adding Vitest in WO-010 Phase 1 (minimal config, mirrors future `tests/` layout from PRD §7.3).

---

## Recommendations

### For `/plan`

1. Phase 1 `code-build` agent deliverables:
   - `packages/contracts/src/auditReport.v1.ts` + schema regen
   - `src/core/audit/{runAudit.ts, readFigmaVariableState.ts, rules/*.ts}`
   - `src/core/variables/resolveTokens.ts` stub or full impl if WO-008 not merged yet (interface lock only)
   - Vitest bootstrap + fixture tests
2. Coordinate with WO-008: `PushResult & { audit }` return type and hook placement after commit.
3. Coordinate with WO-009: `var/codesyntax-matches-canonical` calls shared `deriveCodeSyntax(token)` when canonical field absent.
4. Defer `scope: 'canvas'|'component'` to throw with clear message — engine extensibility without Sprint 2 scope creep.

### For `/build`

1. Implement rules in dependency order: structural (collections, names, aliases) → mode coverage → values → codeSyntax.
2. Export `readFigmaVariableState` for WO-008 integration tests against sandbox file (manual / future integration suite).

---

## Open Questions

1. **Exact `TokensV1` final interface** — still stub in `packages/contracts/src/tokens.v1.ts` until WO-055 `/build`. Audit rules assume WO-055 locked shape (`tokens[]`, `collections[]` with `modes[]`). WO-010 build blocked on WO-055 + WO-008 interface stability.
2. **WO-009 derivation vs audit** — if push applies derived codeSyntax but canonical omits field, `var/codesyntax-matches-canonical` must use the same derivation function. Lock shared import in `/plan`.
3. **Vitest introduction** — confirm whether WO-010 adds Vitest or waits for a CI ticket. Research recommends adding in WO-010 to satisfy AC unit tests.

---

## References

- `Docs/PRD.md` §6.1 FR-BOOT-8, §8.4, §9.3
- `packages/contracts/src/driftReport.v1.ts` — contrast only
- `.github/Sprint 1/WO-055-…/research/canonical-token-model.md` §3, §6, §Recommendations #4
- `.github/Sprint 2/WO-008-…/ticket.md` — audit hook AC
- `.github/Sprint 4/WO-019-…/ticket.md` — markdown formatter (5 renderers today; audit is 6th)
- `DesignOps-plugin/…/conventions/14-audit.md` — Variables & codeSyntax section
- `DesignOps-plugin/…/conventions/02-codesyntax.md` — iOS format rule
- `DesignOps-plugin/…/conventions/01-collections.md` — 5-collection mode matrix
- `Docs/lift-sources.md` — `14-audit.md` → `runAudit.ts`, `validate-tokens.mjs` disposition
