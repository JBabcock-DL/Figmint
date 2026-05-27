# Plan — WO-010: Audit reporter (post-build validation)

## Approach

Ship a **variables-scope** post-push audit engine: a versioned `AuditReportV1` contract in `@detroitlabs/figmint-contracts`, sixteen pure rule modules under `src/core/audit/rules/`, a snapshot reader (`readFigmaVariableState`) and orchestrator (`runAudit`) in `src/core/audit/`, and Vitest coverage with JSON fixtures (no live Figma in CI). Audit answers “did this push succeed correctly?” against canonical `TokensV1` + normalized Figma snapshots — distinct from `DriftReportV1` (3-way repo sync). WO-008 owns the push hook and returns `PushResult & { audit: AuditReportV1 }`; WO-010 owns the audit implementation and the contract. Sprint 2 output is **JSON only** (`AuditReportV1` serialization); GFM markdown is WO-019. Build in three sequential phases: contract + test harness → rules → orchestrator + integration tests.

## Steps

### Contract & tooling (Phase 1)

- [x] Step 1 — Author `packages/contracts/src/auditReport.v1.ts` per research locked shape: `AuditScope`, `AuditSeverity`, `AuditRuleResult`, `AuditReportSummary` (with `variablesCreated/Updated/Skipped`, `rulesPassed/Failed/Warned`, `modeCoverage`, `codeSyntaxCoverage`), `AuditReportMeta` (`generatedAt`, `scope`, `figmaFileKey?`, `operation: 'push-variables'`), `AuditReportV1` (`v: 1`, `kind: 'audit-report'`, `meta`, `passed`, `summary`, `results[]`). Document `passed` semantics: `true` iff every result with `severity !== 'warn'` (default `error`) has `pass: true`.
- [x] Step 2 — Re-export all audit types from `packages/contracts/src/index.ts` (mirror `driftReport.v1.ts` export style).
- [x] Step 3 — Add `{ file: 'src/auditReport.v1.ts', type: 'AuditReportV1', out: 'audit-report.v1.schema.json' }` to `packages/contracts/scripts/build-schemas.mjs` `CONTRACTS` array (after `driftReport.v1.ts` entry). Run `npm run build -w @detroitlabs/figmint-contracts` and confirm `dist/audit-report.v1.schema.json` emits with `$id: https://figmint.detroitlabs.com/schemas/audit-report.v1.schema.json`.
- [x] Step 4 — Add Vitest to repo root: `vitest@~3.2` (and `@vitest/coverage-v8` optional — skip unless needed) as root `devDependencies`; add scripts `"test": "vitest run"`, `"test:watch": "vitest"`.
- [x] Step 5 — Add `vitest.config.ts` at repo root: `test.include: ['tests/unit/**/*.test.ts']`, `resolve.alias` matching `tsconfig.json` paths (`@/*` → `./src/*`), `environment: 'node'`, enable `resolveJsonModule` for fixture imports. Extend root `tsconfig.json` `include` with `tests/**/*` if needed for `tsc --noEmit`.
- [x] Step 6 — Scaffold `tests/fixtures/audit/` and `tests/unit/audit/` directories with `.gitkeep` or placeholder README (one line: fixture purpose).

### Plugin audit types & shared helpers (Phase 1)

- [x] Step 7 — Create `src/core/audit/types.ts`: re-export `AuditReportV1`, `AuditRuleResult`, `AuditReportSummary`, `AuditScope` from `@detroitlabs/figmint-contracts`; define plugin-only `FigmaVariableSnapshot`, `FigmaCollectionSnapshot` (per research §4 — mode names as keys in `valuesByMode`, `codeSyntax` partial triple); define `PushResult` interface `{ created, updated, skipped, errors: string[] }` (matches WO-008; stays plugin-local until ops-program needs it); export `PushResultWithAudit = PushResult & { audit: AuditReportV1 }` for WO-008 integration contract.
- [x] Step 8 — Create `src/core/audit/constants.ts`: `COLLECTION_DISPLAY_NAMES` map (`primitives`→`Primitives`, `theme`→`Theme`, `typography`→`Typography`, `layout`→`Layout`, `effects`→`Effects`); `ALL_COLLECTION_IDS` ordered array; `CODE_SYNTAX_PLATFORMS: readonly ['WEB','ANDROID','iOS']`; `COLOR_EPSILON = 1/255` for RGBA compare in value-equality rule.

### Rule modules (Phase 2)

Implement each rule as a **pure function** `(input: RuleInput) => AuditRuleResult` where `RuleInput = { canonical: TokensV1; figmaCollections: FigmaCollectionSnapshot[]; pushResult: PushResult }`. File naming: `src/core/audit/rules/<ruleId-with-slashes-as-dashes>.ts` (e.g. `var-mode-value-present.ts`). Shared helpers in `src/core/audit/rules/_helpers.ts` (index canonical tokens by `(collection,name)`, find Figma variable by collection display name + slash name, build mode coverage rollup).

- [x] Step 9 — `var-push-counts-present.ts` — verify `pushResult.created/updated/skipped` are numbers; diagnostic includes counts; passes when `pushResult.errors.length === 0`.
- [x] Step 10 — `var-push-no-errors.ts` — `pushResult.errors.length === 0` (duplicate concern with Step 9 is intentional per research table; keep separate `ruleId`s for granular UI).
- [x] Step 11 — `var-collections-exist.ts` — all five canonical `collections[].id` exist in Figma snapshot (match `FigmaCollectionSnapshot.name` via display-name map).
- [x] Step 12 — `var-collection-modes-match.ts` — per collection, Figma mode **names** set equals canonical `modes[]` (order-independent); diagnostic lists expected vs found.
- [x] Step 13 — `var-token-count-match.ts` — per collection, Figma variable count === canonical token count for that `collection` id.
- [x] Step 14 — `var-token-names-match.ts` — every canonical `(collection, name)` exists in Figma snapshot.
- [x] Step 15 — `var-mode-value-present.ts` — every canonical token has non-empty Figma value for each mode in its collection's `modes[]`; diagnostic: `{collection}/{name}: missing value for mode {modeName}`. **Ticket AC simulated failure** targets this rule.
- [x] Step 16 — `var-alias-target-exists.ts` — structural check: every `{ aliasOf: { collection, name } }` in canonical resolves to an existing token key (no `resolveTokens` needed).
- [x] Step 17 — `var-alias-resolves.ts` — import `resolveTokens` from `src/core/variables/resolveTokens.ts` (WO-008); fail on cycle or broken chain; diagnostic names unresolved path.
- [x] Step 18 — `var-value-matches-canonical.ts` — import `resolveTokens`; compare resolved canonical literal to Figma value per token/mode (COLOR within ε, FLOAT/STRING/BOOLEAN exact); resolve Figma alias chains via variable lookup when needed.
- [x] Step 19 — `var-codesyntax-all-platforms.ts` — every Figma variable has non-empty `codeSyntax.WEB`, `.ANDROID`, `.iOS`; feeds `summary.codeSyntaxCoverage`.
- [x] Step 20 — `var-codesyntax-matches-canonical.ts` — compare Figma `codeSyntax` to expected canonical value per platform; when canonical `token.codeSyntax` absent, call shared `deriveCodeSyntax(token)` from `src/core/variables/codeSyntax.ts` (WO-009) — **same function push uses**; fail on mismatch.
- [x] Step 21 — `var-codesyntax-ios-format.ts` — port `02-codesyntax.md` rule: iOS strings must be dot-segment lowercase (no camelCase tail segments); check Figma iOS strings (and canonical when present).
- [x] Step 22 — `var-codesyntax-theme-not-derived.ts` — for `collection === 'theme'`, codeSyntax must match canonical explicit triple only (reject path-derived values on Theme tokens per `14-audit.md` L23).
- [x] Step 23 — `var-canonical-unique-keys.ts` — no duplicate `(collection, name)` in `TokensV1.tokens[]`.
- [x] Step 24 — `var-evc-typography-parent.ts` — if `tokens.themes?` present, no entry has `parentCollection === 'typography'`.
- [x] Step 25 — Create `src/core/audit/rules/index.ts` — export ordered `VARIABLE_RULES` array (16 entries, dependency-friendly order: push → structural → aliases → values → codeSyntax → canonical integrity); export `runVariableRules(input): AuditRuleResult[]`.

### Orchestrator, reader & tests (Phase 3)

- [x] Step 26 — Implement `src/core/audit/readFigmaVariableState.ts` (main-thread only): `getLocalVariableCollectionsAsync()` → for each collection build `modeId→name` map → for each `variableId` load variable → normalize to `FigmaCollectionSnapshot[]` with `valuesByMode` keyed by **mode name** (not modeId). Use `figma.fileKey` optionally in audit meta. No REST. Guard: only local collections (bootstrap scope).
- [x] Step 27 — Implement `src/core/audit/summary.ts` — pure `buildAuditSummary(results, pushResult, canonical, figmaCollections): AuditReportSummary` computing `variablesCreated/Updated/Skipped` from `pushResult`, rule rollups (`rulesPassed/Failed/Warned`), `modeCoverage` from `var-mode-value-present` + collection mode lists, `codeSyntaxCoverage` per platform from `var-codesyntax-all-platforms` scan.
- [x] Step 28 — Implement `src/core/audit/runAudit.ts` — `runAudit(scope, input)` with Sprint 2 overload for `scope: 'variables'` only; `'canvas' | 'component'` throw `Error: unsupported audit scope: {scope}`; dispatch `runVariableRules`, compute `passed`, assemble `AuditReportV1` with `meta.generatedAt = new Date().toISOString()`, `meta.scope`, `meta.operation = 'push-variables'`, optional `meta.figmaFileKey` from `figma.fileKey` when called on main thread (omit in Vitest). Signature stable as `async` but variables branch has no internal awaits.
- [x] Step 29 — Add `src/core/audit/index.ts` barrel exporting `runAudit`, `readFigmaVariableState`, `PushResultWithAudit`, plugin types.
- [x] Step 30 — Author fixture `tests/fixtures/audit/tokens-minimal.v1.json` — minimal valid `TokensV1` (2+ collections, Theme with `Light`/`Dark`, ≥2 tokens) aligned with WO-055 shape (use stub fields if WO-055 not merged; update when WO-055 lands).
- [x] Step 31 — Author `tests/fixtures/audit/figma-snapshots/pass-all.json` — `FigmaCollectionSnapshot[]` matching `tokens-minimal` with all modes and codeSyntax populated.
- [x] Step 32 — Author `tests/fixtures/audit/figma-snapshots/missing-dark-mode.json` — same as pass-all but one Theme token missing `Dark` in `valuesByMode` (triggers `var/mode-value-present` FAIL).
- [x] Step 33 — `tests/unit/audit/rules/mode-value-present.test.ts` — load `missing-dark-mode.json` + canonical fixture; assert `pass: false`, diagnostic contains `Dark`, `ruleId === 'var/mode-value-present'`.
- [x] Step 34 — `tests/unit/audit/rules/codesyntax-coverage.test.ts` — assert `buildAuditSummary` / rule output populates `codeSyntaxCoverage` counts for WEB/ANDROID/iOS.
- [x] Step 35 — `tests/unit/audit/runAudit.test.ts` — end-to-end `runAudit('variables', { canonical, pushResult: { created:1, updated:0, skipped:0, errors:[] }, figmaCollections })` for pass-all (expect `passed: true`, summary counts) and missing-dark (expect `passed: false`, failed rule present). Mock no Figma globals — pass snapshots directly.
- [x] Step 36 — Document WO-008 integration in `src/core/audit/README.md` (short): after push commit, `const figmaCollections = await readFigmaVariableState(); const audit = await runAudit('variables', { canonical, pushResult, figmaCollections }); return { ...pushResult, audit };` — caller checks `audit.passed`, does **not** merge audit diagnostics into `pushResult.errors[]`.
- [x] Step 37 — Run quality gates: `npm run typecheck`, `npm run lint`, `npm run format:check` (or `prettier . --write` then check), `npm test`, `npm run build -w @detroitlabs/figmint-contracts`. Fix any issues. **Do not commit** (per user instruction).

## Build Agents

### Phase 1 (parallel)

- `code-build` — Steps 1–3: `auditReport.v1.ts`, `index.ts` re-exports, `build-schemas.mjs` entry, contracts package build verify.
- `code-build` — Steps 4–6: Vitest bootstrap (`package.json` scripts, `vitest.config.ts`, test directory scaffold).
- `code-build` — Steps 7–8: `src/core/audit/types.ts`, `constants.ts` (plugin types + collection map).

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 9–14: Push + structural rules (`var-push-counts-present` through `var-token-names-match`) + `_helpers.ts` foundation.
- `code-build` — Steps 15–18: Mode/alias/value rules (`var-mode-value-present` through `var-value-matches-canonical`).
- `code-build` — Steps 19–25: codeSyntax + canonical integrity rules + `rules/index.ts` aggregator.

### Phase 3 (sequential, after Phase 2)

- `code-build` — Steps 26–29: `readFigmaVariableState.ts`, `summary.ts`, `runAudit.ts`, `index.ts` barrel.
- `code-build` — Steps 30–35: JSON fixtures + Vitest unit tests (rule-level + `runAudit` integration).
- `code-build` — Steps 36–37: WO-008 integration README + full CI-quality gate pass (Prettier, no commit).

## Dependencies & Tools

| Dependency            | Role                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WO-055**            | Canonical `TokensV1` interface in `packages/contracts/src/tokens.v1.ts` — audit rules type against this shape. Build may proceed with research-sketched types in fixtures; re-sync fixtures when WO-055 merges. |
| **WO-008**            | `resolveTokens()` in `src/core/variables/resolveTokens.ts`; `push.ts` hook returning `PushResultWithAudit`. WO-010 ships audit impl; WO-008 wires call site (can land after WO-010 if stub was used).           |
| **WO-009**            | `deriveCodeSyntax(token)` / `mapCodeSyntax` in `src/core/variables/codeSyntax.ts` — required for `var/codesyntax-matches-canonical` when canonical omits explicit triple.                                       |
| **WO-003**            | `build-schemas.mjs` + `ts-json-schema-generator` pipeline (already shipped).                                                                                                                                    |
| **WO-019** (Sprint 4) | GFM markdown formatter for `kind: 'audit-report'` — out of scope; add `depends_on: WO-010` when planning WO-019.                                                                                                |

**MCP / external:** None for build. Manual sandbox verification optional post-build: [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) (`file_key=cVdPraIafWFBRZnzMPhtrW`).

**Imports:** `@detroitlabs/figmint-contracts` for output types; `@figma/plugin-typings` for `VariableResolvedDataType` / `VariableValue` in snapshot types only.

## Open Questions

1. **WO-055 merge order** — If `tokens.v1.ts` is still stub at build time, use inline fixture types matching research sketch; no blocker for Vitest. Re-run schema + fixtures after WO-055 `/build`.
2. **`resolveTokens` stub** — If WO-008 has not landed `resolveTokens.ts`, add minimal implementation in WO-010 Phase 2 (alias walk + cycle detect only) with comment `// WO-008: relocate when push engine merges` — prefer importing WO-008's version when available.
3. **WO-008 `PushResult` extensions** — WO-008 research adds `passes[]` and `totalDurationMs`; audit summary only needs `created/updated/skipped`. Extra fields are ignored by audit — no contract change required.

## Notes

### Research decisions (locked — do not re-litigate)

- `AuditReportV1` is a **published contract** (`auditReport.v1.ts`), not internal-only.
- **Drift ≠ audit:** keep separate from `driftReport.v1.ts`.
- Sprint 2 scope: `runAudit('variables')` only; other scopes throw.
- Push integration: `{ ...PushResult, audit }`; failures via `audit.passed`, not `errors[]` duplication.
- JSON output only in Sprint 2; markdown deferred to WO-019.
- Vitest introduced in this ticket (root `package.json` has no test runner today).

### Rule catalog (16 — `scope: 'variables'`)

| ruleId                             | Module file                           | Severity |
| ---------------------------------- | ------------------------------------- | -------- |
| `var/push-counts-present`          | `var-push-counts-present.ts`          | error    |
| `var/push-no-errors`               | `var-push-no-errors.ts`               | error    |
| `var/collections-exist`            | `var-collections-exist.ts`            | error    |
| `var/collection-modes-match`       | `var-collection-modes-match.ts`       | error    |
| `var/token-count-match`            | `var-token-count-match.ts`            | error    |
| `var/token-names-match`            | `var-token-names-match.ts`            | error    |
| `var/mode-value-present`           | `var-mode-value-present.ts`           | error    |
| `var/alias-target-exists`          | `var-alias-target-exists.ts`          | error    |
| `var/alias-resolves`               | `var-alias-resolves.ts`               | error    |
| `var/value-matches-canonical`      | `var-value-matches-canonical.ts`      | error    |
| `var/codesyntax-all-platforms`     | `var-codesyntax-all-platforms.ts`     | error    |
| `var/codesyntax-matches-canonical` | `var-codesyntax-matches-canonical.ts` | error    |
| `var/codesyntax-ios-format`        | `var-codesyntax-ios-format.ts`        | error    |
| `var/codesyntax-theme-not-derived` | `var-codesyntax-theme-not-derived.ts` | error    |
| `var/canonical-unique-keys`        | `var-canonical-unique-keys.ts`        | error    |
| `var/evc-typography-parent`        | `var-evc-typography-parent.ts`        | error    |

### Lift references

- `DesignOps-plugin/skills/create-design-system/conventions/14-audit.md` — Variables & codeSyntax section only.
- `DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — iOS dot-segment format (`var/codesyntax-ios-format`).
- Canvas / component audit deferred to Sprint 3 / Sprint 5.

### Main-thread constraints (`memory.md`)

`readFigmaVariableState.ts` runs in the Figma sandbox: avoid `?.`, `??`, `performance.now()` in any file bundled to `code.js` (esbuild `target: es2017`). Rule modules consumed by Vitest in Node may use modern syntax if not imported by main-thread entry — prefer ES2017-safe syntax in shared rule code to avoid dual targets.

### Acceptance criteria mapping

| AC                                      | Plan coverage                                           |
| --------------------------------------- | ------------------------------------------------------- |
| Summary counts after push               | Steps 27–28, `var-push-counts-present`, summary builder |
| Simulated `var/mode-value-present` FAIL | Steps 15, 32–33                                         |
| JSON only (no markdown)                 | Notes + out of scope WO-019                             |
| Vitest unit tests                       | Steps 4–6, 30–35                                        |
| `tsc --noEmit` clean                    | Step 37                                                 |

### References

- Ticket: `./ticket.md`
- Research: `./research/post-push-audit-rules.md`
- WO-055: `.github/Sprint 1/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md`
- WO-008: `.github/Sprint 2/WO-008-variable-collection-push-engine-5-collections-modes/research/variable-push-engine-design.md`
- PRD: `Docs/PRD.md` §6.1 FR-BOOT-8, §8.4 (contrast), §9.3
