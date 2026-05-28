# Plan — WO-026: Registry update emission

## Approach

Implement **registry upsert + staged export** after a successful forward-path scaffold (WO-022). A pure core module **`src/core/components/registry.ts`** ports DesignOps **`merge-registry.mjs`** upsert semantics into TypeScript, wraps bodies in the **`RegistryV1`** envelope (`v: 1`, `kind: 'registry'`), and upserts by **`spec.name`** (PascalCase map key, e.g. `"Button"`). **`upsertRegistryEntry(registry, input)`** is the single merge entry point: it calls **`buildRegistryEntry`** from `ScaffoldResult` + live `ComponentSetNode` + target page, then **`mergeRegistryEntry`** with version auto-increment and fresh `publishedAt`.

The UI layer adds **`loadRegistryFromGitHub`** (wraps WO-016 **`loadFromGitHub`**) and **`prepareRegistryExport`** (builds `ContractDocument { kind: 'registry', payload: RegistryV1 }` + default sinks + ExportSheet title). Post-scaffold flow: merge in memory → open **WO-020 ExportSheet** — **no silent PR** (FR-SCAF-6). Default sinks: **`['download', 'github-pr']`** when GitHub connected + `flags.githubOAuth && flags.githubPRSink`, else **`['download']`** only. Serialize via existing **`stableStringify`** path in **`serializeForExport.ts`** → `.figmint-registry.json`.

**In scope:** `registry.ts`, `registry.types.ts`, `registryAuditRows.ts`, UI bridge `src/ui/components/registryExport.ts`, golden fixtures, Vitest unit + AJV schema gate, fix invalid UI export fixture, optional thin demo hook in `App.tsx` for manual VQA (WO-027 replaces with Components tab).

**Out of scope (ticket verbatim):** removing entries on delete; multi-file registry; Code Connect URL in registry row; configurable registry path UI (FR-CONF-5 — API param only); auto-commit without ExportSheet confirmation; storing archetype / variant matrix / props in registry rows.

**Drift guard:** Port **`merge-registry.mjs`** upsert rules only — **not** the Node CLI script, **not** legacy `registry.schema.json` as source of truth (superseded by **`packages/contracts/src/registry.v1.ts`**). Do **not** stringify in `registry.ts` (ExportSheet owns serialization). Do **not** extend `RegistryComponentEntry` with spec fields (`additionalProperties: false` on schema).

---

## Acceptance criteria traceability

| Ticket AC / requirement | Plan step(s) | Verification |
| ----------------------- | ------------ | -------------- |
| AC: New Button → registry entry with ComponentSet `nodeId` | Steps 4, 5, 8, 14 | `registry.test.ts` + integration fixture |
| AC: Re-scaffold updates entry; `version` increments | Steps 3, 6, 14 | upsert test SPK-026-1 |
| AC: Document validates `RegistryV1` | Steps 7, 15 | AJV against `dist/registry.v1.schema.json` |
| AC: Unit tests: merge, fileKey guard, version bump, legacy normalize | Steps 6–7, 14–15 | `registry.test.ts` |
| Req 1: `registry.ts` four functions + load wrapper | Steps 2–5, 9 | typecheck + tests |
| Req 2: `RegistryComponentEntry` fields only | Steps 4, Notes | schema AJV + no extra keys in fixtures |
| Req 3: ExportSheet staging, default sinks | Steps 10–12, 16 | component tests + manual VQA |
| Req 3 UX: title "Update registry"; JSON only | Steps 11–12 | ExportSheet test / grep |
| Testing: Vitest merge suite | Steps 14–15 | CI |
| Testing: ExportSheet integration | Step 16 | `registryExport.test.tsx` |
| Telemetry: `console.debug` UI on merge + export | Step 12 | grep gate |

---

## Wrong vs correct lift

| Wrong (do not copy) | Why | Correct lift |
| ------------------- | --- | ------------ |
| Run `merge-registry.mjs` as subprocess | MCP/CLI artifact | Inline TS in `registry.ts` |
| Legacy `registry.schema.json` fields | Missing `v`/`kind`; extra keys | `RegistryV1` + `RegistryComponentEntry` from WO-003 |
| Kebab-case write keys (`button`) | Ticket AC uses `Button` | Write **`spec.name`**; read-alias kebab only on load |
| Store `archetype`, `variantMatrix`, `props` in registry | Schema forbids | Keep in `component-spec.v1.json` export (WO-027) |
| Auto-open GitHub PR without ExportSheet | FR-SCAF-6 / PRD §11.4 | Stage document; designer confirms |
| `JSON.stringify` in merge module | Non-deterministic key order in PRs | Return objects; `stableStringify` at export |
| `console.debug` on main thread | Project convention | UI iframe only; GitHub via existing bridge logs |
| Caller-supplied `version` without bump | Sprint 6 stale detection needs monotonic version | `version = (existing ?? 0) + 1` on every upsert |
| Silent overwrite on `fileKey` mismatch | Cross-file pollution | Throw `REGISTRY_FILE_KEY_MISMATCH` |

---

## Lift map

| Legacy (DesignOps-plugin) | Figmint target | Notes |
| ------------------------- | -------------- | ----- |
| `skills/create-component/resolver/merge-registry.mjs` L67–87 upsert | `mergeRegistryEntry()` | Replace, never duplicate row |
| `merge-registry.mjs` L74–78 fileKey guard | `assertRegistryFileKey()` → throw | Error code `REGISTRY_FILE_KEY_MISMATCH` |
| `merge-registry.mjs` greenfield create | `createEmptyRegistry(fileKey)` | `{ v:1, kind:'registry', fileKey, components:{} }` |
| `registry.schema.json` entry fields | `RegistryComponentEntry` | Optional `cvaHash`, `composedChildVersions` |
| CLI `{ fileKey, component, nodeId, … }` wrapper | `buildRegistryEntry()` input struct | Component key separate from entry |
| GitHub read (implicit in resolver flow) | `loadRegistryFromGitHub()` | Wraps `loadFromGitHub` from `src/io/sources/github.ts` |
| `JSON.stringify(registry, null, 2)` | `serializeForExport` + `stableStringify` | WO-020 path |

---

## Steps

### Foundation — types, errors, empty registry

- [x] **Step 1** — Create module tree and barrel:

  ```
  src/core/components/
    registry.ts
    registry.types.ts
    registryAuditRows.ts
  src/ui/components/
    registryExport.ts
  tests/unit/core/components/
    registry.test.ts
    registryAuditRows.test.ts
  tests/unit/ui/components/
    registryExport.test.tsx
  tests/fixtures/registry/
    empty.v1.json
    button-first-insert.v1.json
    button-upsert-v2.v1.json
    legacy-no-envelope.json
    filekey-mismatch-existing.json
  ```

  Add re-exports in `src/core/components/index.ts`: `upsertRegistryEntry`, `mergeRegistryEntry`, `buildRegistryEntry`, `normalizeRegistryInput`, `createEmptyRegistry`, `buildRegistryAuditRows`.

  **Done when:** `npm run typecheck` passes with stub exports.

- [x] **Step 2** — Implement `src/core/components/registry.types.ts`:

  ```ts
  import type {
    ComponentSpecV1,
    RegistryComponentEntry,
    RegistryV1,
  } from '@detroitlabs/figmint-contracts';
  import type { ScaffoldResult } from '@/core/components/scaffold/types';

  export const REGISTRY_FILE_KEY_MISMATCH = 'REGISTRY_FILE_KEY_MISMATCH';
  export const DEFAULT_REGISTRY_PATH = '.figmint-registry.json';
  export const LEGACY_REGISTRY_PATH = '.designops-registry.json';

  export class RegistryMergeError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
  }

  export interface BuildRegistryEntryInput {
    spec: ComponentSpecV1;
    scaffold: ScaffoldResult;
    targetPage: PageNode;
    fileKey: string;
    existingRegistry: RegistryV1 | null;
    now?: Date; // test seam
  }

  export interface UpsertRegistryEntryInput extends BuildRegistryEntryInput {
    /** When null, treated as greenfield for this fileKey. */
    registry: RegistryV1 | null;
  }

  export interface NormalizeRegistryResult {
    ok: true;
    registry: RegistryV1;
  }

  export interface NormalizeRegistryFailure {
    ok: false;
    message: string;
  }
  ```

  **Done when:** types compile; no `?.` / `??` under `src/core/components/` (ES2017).

- [x] **Step 3** — Implement `createEmptyRegistry` + `assertRegistryFileKey` + `mergeRegistryEntry` in `registry.ts`:

  ```ts
  export function createEmptyRegistry(fileKey: string): RegistryV1;

  export function assertRegistryFileKey(
    registry: RegistryV1,
    fileKey: string,
  ): void; // throws RegistryMergeError REGISTRY_FILE_KEY_MISMATCH

  export function mergeRegistryEntry(
    registry: RegistryV1,
    componentKey: string,
    entry: RegistryComponentEntry,
  ): RegistryV1;
  ```

  **Behavior (`mergeRegistryEntry`):**
  | Rule | Implementation |
  | ---- | -------------- |
  | Upsert key | `registry.components[componentKey] = entry` — **replace**, never push duplicate |
  | Immutability | Return shallow-cloned registry + cloned `components` object (do not mutate caller's nested refs unexpectedly) |
  | Other keys untouched | Merging `Button` must not alter other component entries |

  **Done when:** Step 14 tests "other keys untouched" pass.

- [x] **Step 4** — Implement `buildRegistryEntry(input: BuildRegistryEntryInput): RegistryComponentEntry`:

  | Field | Source |
  | ----- | ------ |
  | `nodeId` | `input.scaffold.componentSet.id` |
  | `key` | `input.scaffold.componentSet.key` |
  | `pageName` | `input.targetPage.name` |
  | `publishedAt` | `input.now ?? new Date()` → `toISOString()` |
  | `version` | `(existing.components[spec.name]?.version ?? 0) + 1` where `existing = input.existingRegistry` |
  | `cvaHash` | When `spec.variantMatrix` present: FNV-1a of `stableStringify(spec.variantMatrix)` (reuse `@/io/formats/stableStringify`); else omit or `null` per schema |
  | `composedChildVersions` | When `spec.composes?.length`: for each child kebab ref, `existing.components[child]?.version ?? null` |

  **Do not** copy `spec.archetype`, `variantMatrix`, `props`, or `bindings` into the entry.

  **Done when:** fixture `button-first-insert` entry fields match test expectations.

- [x] **Step 5** — Implement **`upsertRegistryEntry(input: UpsertRegistryEntryInput): RegistryV1`** — primary API keyed by **`input.spec.name`**:

  ```ts
  export function upsertRegistryEntry(input: UpsertRegistryEntryInput): RegistryV1 {
    const base =
      input.registry !== null
        ? input.registry
        : createEmptyRegistry(input.fileKey);
    assertRegistryFileKey(base, input.fileKey);
    const entry = buildRegistryEntry({
      spec: input.spec,
      scaffold: input.scaffold,
      targetPage: input.targetPage,
      fileKey: input.fileKey,
      existingRegistry: base,
      now: input.now,
    });
    return mergeRegistryEntry(base, input.spec.name, entry);
  }
  ```

  Export alias `createRegistryDocument(registry: RegistryV1): ContractDocument` in UI module (Step 10), not core.

  **Done when:** calling twice with same `spec.name` yields `version` 1 then 2 (SPK-026-1).

- [x] **Step 6** — Implement `normalizeRegistryInput(raw: unknown): NormalizeRegistryResult | NormalizeRegistryFailure`:

  | Input shape | Output |
  | ----------- | ------ |
  | Valid `RegistryV1` (`v===1`, `kind==='registry'`, `fileKey`, `components`) | `{ ok: true, registry }` |
  | Legacy `{ fileKey, components }` without envelope | Wrap: `{ v:1, kind:'registry', fileKey, components }` |
  | Legacy kebab-only keys in `components` | Pass through on read (no rewrite); document in Notes |
  | Missing `fileKey` or non-object `components` | `{ ok: false, message }` |
  | Extra top-level keys on envelope | Strip or reject per AJV strictness — **reject** with message (safer for `additionalProperties: false`) |

  **Done when:** SPK-026-3 legacy fixture normalizes and validates (Step 15).

- [x] **Step 7** — Implement `resolveRegistryReadPath(path?: string, tryLegacy?: boolean): string` helper (in `registry.ts` or `registryExport.ts`):

  - Default `path = DEFAULT_REGISTRY_PATH` (`.figmint-registry.json`).
  - When `tryLegacy === true` and primary 404, caller may retry `LEGACY_REGISTRY_PATH` (UI layer only).

  **Done when:** unit test asserts default constant matches ticket.

### GitHub read path (UI layer)

- [x] **Step 8** — Implement `loadRegistryFromGitHub` in `src/ui/components/registryExport.ts`:

  ```ts
  export async function loadRegistryFromGitHub(
    repoUrl: string,
    path?: string,
    ref?: string,
  ): Promise<RegistryV1 | null | { error: string }>;
  ```

  **Behavior:**
  | Case | Return |
  | ---- | ------ |
  | `loadFromGitHub` 404 / "Not Found" in message | `null` (greenfield) |
  | Success + parse | `normalizeRegistryInput` → `RegistryV1` |
  | Validation failure | `{ error: message }` — do not throw; caller may still export in-memory merge |
  | `fileKey` on loaded doc ≠ `figma.fileKey` | Return registry as-is; **`upsertRegistryEntry`** throws on merge (SPK-026-2) |

  Use `figma.fileKey` from sandbox only inside functions called after scaffold (document in JSDoc). Tests mock `loadFromGitHub`.

  **Done when:** mocked 404 → `null`; mocked valid body → `RegistryV1`.

- [x] **Step 9** — Implement optional **read alias** `resolveComponentKey(registry, specName: string): string`:

  - Primary lookup `registry.components[specName]`.
  - If miss and exactly one key matches case-insensitive (`button` vs `Button`), use that key for **version read only** in `buildRegistryEntry`; **write** always uses `spec.name`.

  **Done when:** unit test: existing kebab `button` + upsert `Button` writes PascalCase key (does not dual-write).

### Audit — `comp/registry-*`

- [x] **Step 10** — Implement `src/core/components/registryAuditRows.ts`:

  ```ts
  import type { AuditRuleResult, RegistryV1 } from '@detroitlabs/figmint-contracts';

  export function buildRegistryAuditRows(
    registry: RegistryV1,
    componentKey: string,
    entry: RegistryComponentEntry,
  ): AuditRuleResult[];
  ```

  | ruleId | pass when |
  | ------ | --------- |
  | `comp/registry-envelope` | `registry.v === 1 && registry.kind === 'registry'` |
  | `comp/registry-entry-present` | `registry.components[componentKey]` defined |
  | `comp/registry-entry-nodeid` | `entry.nodeId.length > 0` |
  | `comp/registry-entry-key` | `entry.key.length > 0` |
  | `comp/registry-entry-version` | `entry.version >= 1` integer |
  | `comp/registry-filekey` | `registry.fileKey.length > 0` |

  Return rows inline (do **not** register in `runAudit('component')` yet — WO-027 orchestrator merges scaffold + registry rows).

  **Done when:** `registryAuditRows.test.ts` covers pass and deliberate fail paths.

### ExportSheet integration

- [x] **Step 11** — Implement `prepareRegistryExport` + `defaultRegistryExportSinks` in `registryExport.ts`:

  ```ts
  import type { ContractDocument } from '@/ui/export/types';
  import { flags } from '@/config/flags';
  import type { SinkId } from '@/io/sinks/types';

  export function defaultRegistryExportSinks(githubConnected?: boolean): SinkId[] {
    if (githubConnected && flags.githubOAuth && flags.githubPRSink) {
      return ['download', 'github-pr'];
    }
    return ['download'];
  }

  export function prepareRegistryExport(
    registry: RegistryV1,
    options?: { title?: string; defaultSinks?: SinkId[] },
  ): {
    document: ContractDocument;
    defaultSinks: SinkId[];
    title: string;
  };
  ```

  - `document = { kind: 'registry', payload: registry }`.
  - Default `title = 'Update registry'` (ticket allows "Export registry" — use **Update**).
  - `defaultSinks = options?.defaultSinks ?? defaultRegistryExportSinks()`.

  **Done when:** `registryExport.test.tsx` asserts `formats` init via `createInitialExportSheetState` → `{ json: true, md: false }`.

- [x] **Step 12** — Implement `runRegistryExportFlow` helper (UI only):

  ```ts
  export interface RegistryExportFlowInput {
    spec: ComponentSpecV1;
    scaffold: ScaffoldResult;
    targetPage: PageNode;
    repoUrl?: string;
    registryPath?: string;
  }

  export async function runRegistryExportFlow(
    input: RegistryExportFlowInput,
  ): Promise<{
    registry: RegistryV1;
    auditRows: AuditRuleResult[];
    exportProps: ReturnType<typeof prepareRegistryExport>;
    loadWarning?: string;
  }>;
  ```

  **Sequence:**
  1. `fileKey = figma.fileKey`
  2. If `repoUrl`: `loadRegistryFromGitHub` → base or greenfield; capture `loadWarning` on parse error
  3. `registry = upsertRegistryEntry({ registry: base, ... })`
  4. `auditRows = buildRegistryAuditRows(registry, spec.name, registry.components[spec.name])`
  5. `console.debug('[registry]', 'merge', spec.name, entry.version)` (UI iframe only)
  6. Return `prepareRegistryExport(registry)`

  **GitHub PR metadata** (when user exports): reuse `runExport.ts` — `buildDefaultHeadBranch('registry', date)` → `figmint/registry-YYYY-MM-DD`; commit message `figmint: update registry — {spec.name}` (extend `runExport` only if not already parameterized — add optional `commitMessage` in test seam).

  **Done when:** unit test mocks merge; debug log grep in implementation.

- [x] **Step 13** — Wire **manual VQA seam** in `src/ui/App.tsx` (minimal, behind dev-only flag or existing demo button):

  - After successful scaffold demo (or new "Registry export demo" button), render `<ExportSheet {...prepareRegistryExport(registry)} />`.
  - Document: **WO-027 removes** this seam and calls `runRegistryExportFlow` from Components tab.

  **Done when:** typecheck passes; ExportSheet renders `kind === 'registry'` without MD checkbox (grep `isRegistry` in ExportSheet).

### Fixtures + tests

- [x] **Step 14** — Implement `tests/unit/core/components/registry.test.ts`:

  | Test case | Assert |
  | --------- | ------ |
  | Greenfield upsert | `version === 1`; `nodeId`/`key` from mock ComponentSet |
  | Second upsert same `spec.name` | `version === 2`; single row |
  | Other keys preserved | Upsert `Button` leaves `Input` entry unchanged |
  | `fileKey` mismatch | `RegistryMergeError` code `REGISTRY_FILE_KEY_MISMATCH`; registry unchanged |
  | `mergeRegistryEntry` direct | Replace semantics |
  | `normalizeRegistryInput` legacy | SPK-026-3 |
  | `composedChildVersions` | Composite spec with two child refs — snapshot versions from fixture registry |

  Mock `ScaffoldResult` + `PageNode` + `ComponentSetNode` with `{ id: 'CS:1', key: 'abc123' }`.

  **Done when:** SPK-026-1, SPK-026-2, SPK-026-3 marked covered in test names.

- [x] **Step 15** — AJV validation gate `tests/unit/core/components/registry.schema.test.ts`:

  - Import `registry.v1.schema.json` from `packages/contracts/dist/`.
  - Every file in `tests/fixtures/registry/*.json` (after normalize) validates.
  - Upsert output from Step 14 tests validates.

  **Done when:** CI includes schema test file.

- [x] **Step 16** — `tests/unit/ui/components/registryExport.test.tsx`:

  - `defaultRegistryExportSinks(true)` returns `['download', 'github-pr']` when flags true (mock flags module).
  - `defaultRegistryExportSinks(false)` returns `['download']`.
  - `prepareRegistryExport` → ExportSheet initial state: json only, path default `.figmint-registry` from `defaultExportBasename`.
  - `loadRegistryFromGitHub` 404 → null.

  **Done when:** `@testing-library/react` smoke passes.

- [x] **Step 17** — Fix invalid fixture `tests/fixtures/ui/export/registry.json`:

  Replace invalid `{ "name": "Button" }` entry with full `RegistryComponentEntry`:

  ```json
  "Button": {
    "nodeId": "1:10",
    "key": "k_button",
    "pageName": "Components",
    "publishedAt": "2026-05-28T00:00:00.000Z",
    "version": 1
  }
  ```

  **Done when:** existing `defaultPaths.test.ts` / export tests still pass.

### CI gate + WO-027 contract

- [x] **Step 18** — Export public API contract for WO-027 `runScaffold.ts`:

  Document in `src/core/components/index.ts` JSDoc:

  ```ts
  // WO-027 integration (locked):
  // 1. UI loads registry via loadRegistryFromGitHub (Steps 17–18) → passes options.registry on scaffold/run
  // 2. Main thread merges via upsertRegistryEntry / mergeRegistryEntry (registry.ts) → scaffold/result.registry
  // 3. UI calls prepareRegistryExport(result.registry) — NOT runRegistryExportFlow (avoids double GitHub fetch)
  // Optional: runRegistryExportFlow when UI must reload registry from GitHub before merge (standalone demos)
  ```

  Grep gate: `rg "upsertRegistryEntry" src/` returns core + ui + tests only.

  **Done when:** `npm run lint && npm run typecheck && npm test -- tests/unit/core/components/registry tests/unit/ui/components/registryExport` pass.

- [x] **Step 19** — Pre-plan spike documentation in test descriptions:

  | Spike | Covered by |
  | ----- | ---------- |
  | SPK-026-1 | Step 14 version bump |
  | SPK-026-2 | Step 14 fileKey guard |
  | SPK-026-3 | Step 6 + 15 legacy normalize |
  | SPK-026-4 | Step 13 + WO-027 VQA |
  | SPK-026-5 | Deferred OAuth PR — skip `describe` with note |

  **Done when:** default CI green.

---

## Build Agents

### Phase 1 (sequential — core merge module)

- `code-build` — **Steps 1–7:** `registry.types.ts`, `registry.ts` (`createEmptyRegistry`, `assertRegistryFileKey`, `mergeRegistryEntry`, `buildRegistryEntry`, `upsertRegistryEntry`, `normalizeRegistryInput`), golden fixtures, barrel exports.

### Phase 2 (parallel — after Phase 1 green)

- `code-build` — **Steps 8–9, 14–15:** `loadRegistryFromGitHub`, read alias, `registry.test.ts`, AJV schema test.
- `code-build` — **Step 10:** `registryAuditRows.ts` + `registryAuditRows.test.ts`.

### Phase 3 (sequential — export UI + CI)

- `code-build` — **Steps 11–13, 16–19:** `registryExport.ts`, `runRegistryExportFlow`, App.tsx VQA seam, UI tests, fixture fix, CI gate, WO-027 API doc.

---

## Dependencies & Tools

| Dependency | Role in WO-026 |
| ---------- | -------------- |
| **WO-003** | `RegistryV1`, `RegistryComponentEntry`, `AuditRuleResult`; `dist/registry.v1.schema.json` |
| **WO-016** | `loadFromGitHub`, `postContentsFetch`, OAuth / `useGitHubConnect` repo URL |
| **WO-020** | `ExportSheet`, `createInitialExportSheetState`, `serializeForExport`, `runExport`, `defaultExportBasename` |
| **WO-022** | `ScaffoldResult`, `ComponentSpecV1` input — **must be merged before build** |
| **WO-027** | Consumes `runRegistryExportFlow`; owns auto-open ExportSheet UX (OQ-4) |
| **Lift** | `merge-registry.mjs`, `registry.schema.json` (field reference only) |
| **Vitest** | Unit + UI tests |
| **AJV** | Schema validation test (WO-003 dist artifact) |

**Tools:** `npm run lint`, `npm run typecheck`, `npm test`; `gh api graphql` for project status only; no Figma MCP in CI.

---

## Open Questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-1 | Configurable registry path in Settings (FR-CONF-5)? | **OPEN** — `registryPath` param on APIs; default `.figmint-registry.json` |
| OQ-2 | Code Connect URL in registry? | **RESOLVED — no** (Sprint 8); use `key` + `nodeId` |
| OQ-3 | Legacy kebab read alias? | **RESOLVED** — read alias in Step 9; write `spec.name` |
| OQ-4 | Auto-open ExportSheet vs banner? | **RESOLVED** — WO-027 auto-opens ExportSheet via `prepareRegistryExport(result.registry)` after `scaffold/result`; WO-026 `runRegistryExportFlow` is optional for standalone demos |
| OQ-5 | Invalid existing registry blocks scaffold? | **RESOLVED** — merge proceeds in-memory; `loadWarning` surfaced; export still offered via download |

---

## Notes

### `registry.v1` contract usage

- All writes produce objects satisfying `RegistryV1` before UI handoff.
- Validate in tests with AJV — not at runtime in plugin main thread unless WO-027 adds confirm gate.
- `figma.fileKey` must match `registry.fileKey` before merge; mismatch is a **hard error** (legacy parity).

### ES2017 / threading

- `src/core/components/registry.ts` runs on **main thread** (pure data, no `figma` except types) — keep ES2017-safe.
- `registryExport.ts` runs in **UI iframe** — may use `figma.fileKey`, `console.debug`, React.
- Do not add main-thread GitHub fetch — reuse `loadFromGitHub` UI bridge.

### Cross-ticket registry architecture (WO-027 contract)

- **UI thread:** `loadRegistryFromGitHub` in `registryExport.ts` — GitHub read only; never on main thread.
- **Main thread:** pure merge via `registry.ts` (`upsertRegistryEntry`, `buildRegistryEntry`, `mergeRegistryEntry`); input = `options.registry ?? createEmptyRegistry(figma.fileKey)`.
- **Export:** WO-027 calls `prepareRegistryExport(scaffold/result.registry)` — not `runRegistryExportFlow` (which re-fetches GitHub).
- **Default sinks:** `['download', 'github-pr']` when GitHub connected + PR sink enabled; else `['download']` only — matches WO-027 Step 26.

- WO-022: `comp/scaffold-*`
- WO-023: binding rules (planned)
- **WO-026:** `comp/registry-*` (this ticket)
- WO-027: concatenate rows in progress UI / `AuditPanel`

### Build notes (2026-05-28)

- Core merge in `src/core/components/registry.ts`; GitHub read + ExportSheet staging in `src/ui/components/registryExport.ts`.
- AJV schema gate lives in `registry.test.ts` (`registry schema fixtures` describe) — not a separate file.
- Kebab→PascalCase migration: `upsertRegistryEntry` removes case-insensitive alias key after writing `spec.name`.
- Export tab VQA seam: "Export sample registry" button in `App.tsx` (WO-027 replaces).

### Bibliography (not execution sources for sub-agents)

- Ticket: `./ticket.md`
- Research: `./research/registry-update-emission.md`
- PRD: `Docs/PRD.md` §6.2 FR-SCAF-6, §8.6
- WO-020 plan: `.github/Sprint 4/WO-020-unified-export-sheet-ui/plan.md`
