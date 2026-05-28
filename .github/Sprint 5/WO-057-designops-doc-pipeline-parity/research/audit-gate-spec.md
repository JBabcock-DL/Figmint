# WO-057 — Pre-flight audit gate spec (`doc-pipeline/required-tokens`)

> **Status:** Research-complete · 2026-05-28
> **Quality bar:** `.github/templates/research-quality-bar.md`
> **Sibling:** [`doc-pipeline-lift-map.md`](./doc-pipeline-lift-map.md), [`section-contract-trace.md`](./section-contract-trace.md), [`bootstrap-text-styles-spec.md`](./bootstrap-text-styles-spec.md)

## Summary

The doc pipeline pre-flight audit gate enforces that the **4 required color tokens** plus the **4 required `_Doc/*` text styles** plus the **3 required `Label/*` font-family variables** exist in the file before any scaffold or doc-pipeline drawing runs. If any prerequisite is missing the gate sets `audit.passed = false`, emits a P0 row with copy "Run design-system bootstrap first", and the orchestrator emits **zero frames**.

**Contract bump:** none. `auditReport.v1.ts` stays at v1. The new gate produces ordinary `AuditRuleResult` rows under a new file `src/core/audit/rules/doc-required-tokens.ts`. Severity defaults to `error` (per the v1 contract, `severity` undefined = treated as `error` per `auditReport.v1.ts:8`). The orchestrator decides "blocks scaffold" by inspecting `passed` — no new `severity` value needed.

**Pre-flight position:** the gate runs **before** `scaffold-geometry` step in `runScaffoldComponent` — earlier than any current audit. New scaffold step ID: `doc-preflight`. If the gate fails, the orchestrator skips `scaffold-geometry`, `apply-bindings`, `apply-properties`, `build-usage-frame`, `update-registry` entirely and posts `scaffold/result` with `ok: false`.

## Key findings

### F1 — `auditReport.v1.ts` does not need to bump

Current contract (`packages/contracts/src/auditReport.v1.ts` lines 1-42):

```ts
export type AuditSeverity = 'error' | 'warn';

export interface AuditRuleResult {
  ruleId: string;            // new ruleId is a string — no breaking change
  pass: boolean;
  diagnostic: string;        // remediation copy goes here
  severity?: AuditSeverity;
}
```

Adding a new entry to the `results` array with `ruleId: 'doc-pipeline/required-tokens'`, `pass: false`, `diagnostic: 'Run design-system bootstrap first — missing tokens: ...'`, `severity: 'error'` is **not a contract break**. Per `memory.md` "Contracts are versioned literals — bump = add v2 alongside v1, never breaking change", a new ruleId on an existing array shape is additive. **Decision (locked):** no v2 bump.

### F2 — Required prerequisites (3 categories)

The gate checks 3 categories. **Any** missing item fails the gate.

#### F2.a — Color tokens (4 required)

Per [`section-contract-trace.md`](./section-contract-trace.md) §11 chrome table:

| Token name | Used by |
| ---------- | ------- |
| `color/border/subtle` | Section 3 (set-group stroke), Section 4 (matrix outer + header bottoms + size-bracket + variant-row bottoms) |
| `color/background/variant` | Section 3 (set-group fill), Section 5 (Do/Don't card fill) |
| `color/background/content` | Section 1 (title text), Section 2 (description text), Section 4 (size label), Section 5 (card text) |
| `color/background/content-muted` | Section 1 (summary), Section 2 (caption), Section 4 (header group + state header + variant row label) |

These are Theme collection variables. The gate looks up via `figma.variables.getLocalVariableCollectionsAsync()` → find `Theme` → enumerate variables — or via the existing FigHub helper `ensureLocalVariableMap` (`src/core/canvas/lib/variables.ts`).

#### F2.b — Text styles (4 required) — already published by bootstrap

| Style name | Used by |
| ---------- | ------- |
| `_Doc/Section` | Section 1 title, Section 3 title, Section 4 grid title |
| `_Doc/TokenName` | Section 2 property names, Section 4 size labels, Section 5 card titles |
| `_Doc/Code` | Section 2 type + default columns |
| `_Doc/Caption` | Section 1 summary, Section 2 description, Section 3 caption, Section 4 state labels + variant labels, Section 5 bullets |

These are published by `src/core/canvas/publishTypographyStyles.ts` line 19 (`DOC_STYLE_NAMES`). The gate looks up via `figma.getLocalTextStylesAsync()` and asserts all 4 exist.

#### F2.c — Label font-family variables (3 required) — already pushed by bootstrap

| Variable name | Collection | Mode used |
| ------------- | ---------- | --------- |
| `Label/SM/font-family` | Typography | mode-100 |
| `Label/MD/font-family` | Typography | mode-100 |
| `Label/LG/font-family` | Typography | mode-100 |

Used by Section 4 cell instances (font-family inheritance through the ComponentSet). The gate looks up via the Typography collection. **Note:** these are STRING variables (mode-100 typeface name) per `memory.md` 5-collection convention.

### F3 — Audit row shape (verbatim TS contract)

```ts
import type { AuditRuleResult } from '@detroitlabs/fighub-contracts';

export function buildDocRequiredTokensRow(missing: {
  tokens: string[];        // color tokens
  textStyles: string[];    // text style names
  fontFamilyVars: string[]; // typography font-family variables
}): AuditRuleResult {
  const hasMisses =
    missing.tokens.length > 0 ||
    missing.textStyles.length > 0 ||
    missing.fontFamilyVars.length > 0;

  if (!hasMisses) {
    return {
      ruleId: 'doc-pipeline/required-tokens',
      pass: true,
      diagnostic: 'All required tokens, text styles, and font-family variables present.',
      severity: 'error',
    };
  }

  const lines: string[] = ['Run design-system bootstrap first.'];
  if (missing.tokens.length > 0) {
    lines.push('Missing color tokens: ' + missing.tokens.join(', '));
  }
  if (missing.textStyles.length > 0) {
    lines.push('Missing text styles: ' + missing.textStyles.join(', '));
  }
  if (missing.fontFamilyVars.length > 0) {
    lines.push('Missing font-family variables: ' + missing.fontFamilyVars.join(', '));
  }

  return {
    ruleId: 'doc-pipeline/required-tokens',
    pass: false,
    diagnostic: lines.join(' '),
    severity: 'error',
  };
}
```

**Diagnostic copy contract:**

- Starts with the literal string `"Run design-system bootstrap first."` (per ticket Requirement 8).
- Followed by space-separated breakdown lines, each prefixed with the category (`"Missing color tokens:"`, `"Missing text styles:"`, `"Missing font-family variables:"`).
- One row per gate run (not one row per missing item) so the audit panel renders one P0 entry.

**Severity is `error`** (the default per `auditReport.v1.ts:8` "treated as error"). The orchestrator can short-circuit on `audit.passed === false` without inspecting severity.

### F4 — Where the gate plugs in (orchestrator integration)

Current flow (`src/core/components/scaffold/runScaffold.ts` lines 175-269):

```
runScaffoldComponent(spec, options)
  → ensureComponentScaffoldTarget(spec.name)              ← creates _PageContent + docRoot
  → scaffold-geometry: scaffold(spec, scaffoldTarget)     ← creates ComponentSet
  → apply-bindings: applyBindings()
  → apply-properties: applyProperties()
  → build-usage-frame: buildUsageFrame()
  → update-registry: upsertRegistryEntry()
  → audit-component
  → complete
```

**New flow (with preflight gate):**

```
runScaffoldComponent(spec, options)
  → ensureComponentScaffoldTarget(spec.name)              ← UNCHANGED
  → NEW: doc-preflight: runDocPipelinePreflight()          ← runs the gate
    if (!preflight.passed) {
      postProgress('doc-preflight', 'error', { detail: preflight.diagnostic, audit: preflightAudit })
      postScaffoldError(preflight.diagnostic, 'doc-preflight')
      return                                                ← exit early; NO frames emitted
    }
  → scaffold-geometry: scaffold()                         ← UNCHANGED if gate passed
  → apply-bindings: applyBindings()
  → apply-properties: applyProperties()
  → doc-pipeline: buildDocPipeline()                       ← REPLACES build-usage-frame
  → update-registry: upsertRegistryEntry()
  → audit-component
  → complete
```

**New ScaffoldStepId** in `src/io/messages/scaffold.ts`: add `'doc-preflight'` to the union. Add a step label "Pre-flight doc-pipeline check" or similar.

### F5 — Implementation surface (small)

| File | New / modify | Lines added | Role |
| ---- | ------------ | ----------- | ---- |
| `src/core/audit/rules/doc-required-tokens.ts` | NEW | ~80 | The gate rule. Exports `runDocPipelinePreflightRules({ themeCollection, fontFamilyCollection, textStyles }) → AuditRuleResult[]`. |
| `src/core/audit/runAudit.ts` | MODIFY | ~30 | Add a new scope branch `'doc-preflight'` OR (simpler) add a new entry point function `runDocPipelinePreflightAudit(): Promise<AuditReportV1>`. |
| `src/core/audit/rules/index.ts` | MODIFY | 1 | Export `runDocPipelinePreflightRules`. |
| `src/core/audit/types.ts` | MODIFY | ~10 | Add `DocPipelinePreflightAuditInput` interface (or none if function takes no input — see F6). |
| `src/io/messages/scaffold.ts` | MODIFY | ~5 | Add `'doc-preflight'` to `ScaffoldStepId`. |
| `src/core/components/scaffold/runScaffold.ts` | MODIFY | ~30 | Call preflight before scaffold-geometry; early-exit on fail. |
| `src/core/components/scaffold/runScaffold.test.ts` (new test) | NEW | ~60 | Unit tests for preflight pass / fail / partial misses. |

**Total LOC addition:** ~215 lines + tests.

### F6 — Gate inputs (no caller state needed)

The gate reads only Figma state (variables + text styles), not caller-supplied data. Pseudo-implementation:

```ts
export async function runDocPipelinePreflightAudit(): Promise<AuditReportV1> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const themeCollection = collections.find(c => c.name === 'Theme');
  const typoCollection = collections.find(c => c.name === 'Typography');

  const themeVars = themeCollection
    ? (await figma.variables.getLocalVariablesAsync()).filter(v => v.variableCollectionId === themeCollection.id)
    : [];
  const typoVars = typoCollection
    ? (await figma.variables.getLocalVariablesAsync()).filter(v => v.variableCollectionId === typoCollection.id)
    : [];

  const requiredColorTokens = [
    'color/border/subtle',
    'color/background/variant',
    'color/background/content',
    'color/background/content-muted',
  ];
  const missingTokens = requiredColorTokens.filter(name => !themeVars.find(v => v.name === name));

  const requiredFontFamilyVars = [
    'Label/SM/font-family',
    'Label/MD/font-family',
    'Label/LG/font-family',
  ];
  const missingFontFamilyVars = requiredFontFamilyVars.filter(name => !typoVars.find(v => v.name === name));

  const textStyles = await figma.getLocalTextStylesAsync();
  const requiredTextStyles = ['_Doc/Section', '_Doc/TokenName', '_Doc/Code', '_Doc/Caption'];
  const missingTextStyles = requiredTextStyles.filter(name => !textStyles.find(s => s.name === name));

  const row = buildDocRequiredTokensRow({
    tokens: missingTokens,
    textStyles: missingTextStyles,
    fontFamilyVars: missingFontFamilyVars,
  });

  return {
    v: 1,
    kind: 'audit-report',
    meta: {
      generatedAt: new Date().toISOString(),
      scope: 'component',
      operation: 'scaffold-component',
    },
    passed: row.pass,
    summary: buildPreflightSummary(row),
    results: [row],
  };
}
```

**Note on `AuditReportMeta.operation`:** the v1 contract restricts `operation` to `'push-variables' | 'apply-bindings' | 'scaffold-component'`. Preflight aligns to `'scaffold-component'` (it's part of the scaffold flow). No contract change needed.

### F7 — Audit panel UX (already wired)

The existing `src/ui/components/AuditPanel.tsx` consumes `AuditReportV1` and renders each `results[i]` row. New row IDs land automatically. The orchestrator passes the preflight audit via `postProgress('doc-preflight', 'error', { audit: preflightAudit })` to the UI; the audit panel renders it as a single P0 row with the multi-line diagnostic.

**Remediation link:** the diagnostic copy "Run design-system bootstrap first" can be reinforced by the UI with a `<button onClick={onBootstrapTabSwitch}>Open Bootstrap tab</button>` if WO-027 wants that affordance. **Decision (locked):** UI affordance is out of scope for WO-057; copy alone is sufficient per the diagnostic contract.

## Validated evidence

### Existing audit pattern to mirror

`src/core/audit/runAudit.ts` lines 64-100 (variables scope) is the simplest existing pattern:

```ts
if (scope === 'variables') {
  const variableInput = input as VariablesAuditInput;
  const results = runVariableRules(variableInput);
  const passed = computePassed(results);
  // ... meta + return AuditReportV1
}
```

**Pattern to copy:** define `runDocPipelinePreflightRules(input): AuditRuleResult[]`, wire into a new top-level `runDocPipelinePreflightAudit()` entry point, return a complete `AuditReportV1`.

### Existing miss-detection patterns (mirror, do not copy)

| Pattern | File | Lines |
| ------- | ---- | ----- |
| Missing variable | `src/core/audit/rules/componentBindings.ts:116` (`failure.reason === 'missing-variable'`) | already present |
| Audit row exit | `src/core/audit/rules/var-collections-exist.ts` | already present |
| Diagnostic copy convention | `src/core/audit/summary.ts` | look up |

### Cross-ticket matrix

| Ticket | Consumes preflight gate |
| ------ | ----------------------- |
| WO-022 | NO — scaffold-geometry runs after preflight passes |
| WO-023 | NO — bindings run after preflight passes |
| WO-024 | NO — properties run after preflight passes |
| WO-025 | DELETED — replaced by Section 5 (`buildUsageNotes`) |
| WO-026 | NO — registry runs after preflight passes |
| WO-027 | YES — Components tab UI must display the preflight error if it fires; coordinate with WO-027's tab error handling |
| WO-008 (bootstrap-complete fixture) | indirectly — if fixture is missing any of the 4 color tokens, preflight will always fail; OQ-2 |

### Pre-existing assertions that flag the gate's prerequisites elsewhere

- `verifySlotTextStyles()` in `publishTypographyStyles.ts:115` already verifies the 27 slot styles exist; the preflight gate adds the 4 `_Doc/*` styles + 3 `Label/*/font-family` variables on top.
- `assertNoCollapsedAxis` in `helpers/autoLayout.ts:153` (BUG-S5-002) catches width=1 frames AT RUNTIME — the preflight gate catches the cause one step earlier.

## Decision log

| # | Decision | Rationale |
| --- | -------- | --------- |
| D1 | No `auditReport.v1.ts` bump; reuse existing `AuditRuleResult` shape | New ruleId is additive; not a contract break |
| D2 | New ruleId = `'doc-pipeline/required-tokens'` | Namespace `doc-pipeline/` reserves room for future doc-pipeline audit rules (`section-count`, `width-not-collapsed`, etc.) |
| D3 | Severity = `'error'` (default) | Errors block; per F1 + `auditReport.v1.ts:8` semantics |
| D4 | One row per gate run, multi-line `diagnostic` | One UI entry to act on; less noise than per-missing-item rows |
| D5 | Diagnostic starts with `"Run design-system bootstrap first."` exactly | Per ticket Requirement 8 verbatim |
| D6 | Gate checks 3 categories (color tokens + text styles + font-family vars), not just color tokens | Match section contract — Section 1 needs `_Doc/Section`; Section 4 needs `Label/*/font-family`. Without these, scaffold half-runs and leaves broken output (no fallback) |
| D7 | Gate runs as a new step `doc-preflight` BEFORE `scaffold-geometry` | Halt before any Figma mutation; "Always preview, never silent-apply" (PRD §11.4) |
| D8 | Gate function signature takes no input — reads Figma state directly | Mirror of how bootstrap audits read state; no caller-side wiring |
| D9 | No new severity value (`'p0-blocks-scaffold'`) — `error` + early-exit in orchestrator is sufficient | Avoids a contract bump; severity stays `error | warn` |
| D10 | UI affordance (button to open Bootstrap tab) is out of scope | Per Requirement 8 — surface the audit row; no new UI |
| D11 | `meta.operation = 'scaffold-component'` for the preflight audit | Already in the v1 enum; semantically correct |
| D12 | Add `'doc-preflight'` to `ScaffoldStepId` union | Required for `postProgress` typing |
| D13 | On gate fail, orchestrator skips ALL downstream steps (scaffold, bindings, properties, doc pipeline, registry) | Avoids partial scaffold + half-broken canvas. Frame count = 0, registry unchanged. |
| D14 | Preflight audit is **not** added to the `audits[]` array at end; it's emitted via `postProgress` only | Avoids confusing "audit summary" UI where preflight + post-scaffold audits mix; preflight is gate state, not result |
| D15 | If `figma.variables.getLocalVariableCollectionsAsync` is unavailable in the test sandbox, fall back to the sync `getLocalVariableCollections()` with same shape | Mirror the existing audit-rule patterns; tests use FigHub's Figma mock |

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-AUDIT-1 | Unit test: empty Figma — assert gate returns 4+4+3 = 11 misses, `pass: false`, diagnostic = "Run design-system bootstrap first. Missing color tokens: ... Missing text styles: ... Missing font-family variables: ..." | All misses listed; copy starts verbatim | ☐ pending (build) |
| SPK-AUDIT-2 | Unit test: only color tokens present, no text styles — assert gate returns 0+4+3 = 7 misses, `pass: false`, diagnostic mentions text styles + font-family vars only | Categories with 0 misses are omitted from diagnostic | ☐ pending (build) |
| SPK-AUDIT-3 | Unit test: all prerequisites present — assert `pass: true`, diagnostic = "All required tokens, text styles, and font-family variables present." | Single positive row | ☐ pending (build) |
| SPK-AUDIT-4 | Integration test: `runScaffoldComponent` on file with missing tokens — assert no `doc/component/*` frame created; `scaffold/result` posted with `ok: false`; one P0 audit row in `audits[0]` | Frame count zero; result ok=false | ☐ pending (build) |
| SPK-AUDIT-5 | Verify `bootstrap-complete.v1.json` fixture includes all 4 color tokens — grep for each | All 4 present | ✅ RESOLVED (Phase 0 Step 6 — grep lines 997, 1021, 1045, 1093) |

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| R1 — `bootstrap-complete.v1.json` may be missing one of the 4 color tokens; would block scaffold on every bootstrap+scaffold run | High | Medium | SPK-AUDIT-5 pre-flight grep; **RESOLVED Phase 0 Step 6** — all 4 tokens present (lines 997, 1021, 1045, 1093). |
| R2 — Figma `getLocalVariableCollectionsAsync` may not be available in all FigHub test mocks | Low | Low | Use sync variant — already in legacy code (`properties.mcp.js:20`); both APIs exist in the Plugin types. |
| R3 — Audit panel may not surface multi-line diagnostic well (line breaks may be stripped) | Low | Medium | Use space separator instead of `\n`; tested against `AuditPanel.tsx` rendering. |
| R4 — Variable lookup by `name` is O(n); 167 tokens × 11 names = 1837 string compares per scaffold | Low | Low | Negligible. Could build a Set once if perf is ever a concern. |
| R5 — `getLocalTextStylesAsync` returns styles from the entire file, not scoped to local — may match a style imported from a library | Low | Low | Name match by `style.name`; same logic as `publishTypographyStyles.ts:21`. |
| R6 — User runs scaffold on a fresh Untitled file with `figma.fileKey === ''` — preflight may try to inspect file key | Low | Low | Gate does not read `figma.fileKey`; only inspects collections and styles. Per `memory.md` 2026-05-28 "do not repeat". |
| R7 — Gate runs every scaffold; latency adds up in batch scaffold flows | Low | Low | Variable lookup ≈ 5-10ms; one-shot per scaffold; tolerable. Could cache per Figma session if needed. |
| R8 — Severity `error` + `passed: false` may not short-circuit `runScaffoldComponent` correctly if orchestrator forgets to check | Medium | Medium | Explicit `if (!preflightAudit.passed) { postScaffoldError(...); return; }` block; unit-tested via SPK-AUDIT-4. |

## Recommendations

1. **Build agent:** create `src/core/audit/rules/doc-required-tokens.ts` first (smallest unit; testable in isolation).
2. **Build agent:** integrate into `runScaffold.ts` as new step `doc-preflight` with explicit early-exit on `!passed`.
3. **Build agent:** verify `bootstrap-complete.v1.json` contains all 4 color tokens BEFORE running SPK-AUDIT-4 — see OQ-2 in lift-map.
4. **Plan agent:** if WO-027 is currently In Build with active changes to `AuditPanel.tsx`, coordinate so the preflight row renders correctly (multi-line diagnostic).
5. **Plan agent:** add a "Phase 0" milestone for fixture verification before any emitter code.

## Open questions

- **OQ-AUDIT-A (RESOLVED)** — Does the new gate need a v2 contract bump? **NO** (D1).
- **OQ-AUDIT-B (RESOLVED)** — Does the gate need a new `severity` value like `'p0-blocks-scaffold'`? **NO** (D9) — `error` + `passed: false` is enough.
- **OQ-AUDIT-C (RESOLVED 2026-05-28 Phase 0 Step 6)** — Does `bootstrap-complete.v1.json` already include all 4 required color tokens? **YES** — grep confirmed `color/border/subtle`, `color/background/variant`, `color/background/content`, `color/background/content-muted` all present. No fixture-fix WO needed.
- **OQ-AUDIT-D (DEFERRED)** — Should the audit panel render a "Run bootstrap" CTA button next to the row? Out of scope; revisit in WO-027 if the plain-text diagnostic feels insufficient.

## References

- `FigHub/packages/contracts/src/auditReport.v1.ts` (42 lines) — v1 contract for `AuditRuleResult` and `AuditReportV1`.
- `FigHub/src/core/audit/runAudit.ts` (190 lines) — current audit dispatcher; pattern to mirror.
- `FigHub/src/core/audit/rules/index.ts` — current rule exports.
- `FigHub/src/core/audit/rules/componentBindings.ts:116` — `'missing-variable'` reason pattern.
- `FigHub/src/core/canvas/publishTypographyStyles.ts:19` — proves `_Doc/*` styles published by bootstrap.
- `FigHub/src/core/canvas/data/typography-slots.json` — proves Label/SM/MD/LG slot definitions.
- `FigHub/src/core/components/scaffold/runScaffold.ts` (333 lines) — orchestrator integration point.
- `FigHub/src/io/messages/scaffold.ts` — `ScaffoldStepId` union to extend.
- `FigHub/src/ui/components/AuditPanel.tsx` — UI consumer.
- `FigHub/memory.md` 2026-05-28 — "do not repeat" rule on empty `figma.fileKey`.
- [`doc-pipeline-lift-map.md`](./doc-pipeline-lift-map.md) — broader lift map.
- [`section-contract-trace.md`](./section-contract-trace.md) — section emitter contracts (Sections 1-5).
