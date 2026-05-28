# Registry update emission — WO-026 research

> **Status:** ✅ Research complete — merge semantics, read path, export integration, and contract boundaries locked for `/plan`.
> **Date:** 2026-05-28
> **Owner:** WO-026 (Sprint 5)
> **Topic slug:** `registry-update-emission`
> **PRD anchors:** §5.2 UC-2, §6.2 FR-SCAF-6, §8.6 `registry.v1`, §10 (I/O sinks)
> **Primary lift:** `DesignOps-plugin/skills/create-component/resolver/merge-registry.mjs` + `registry.schema.json`

---

## Summary

WO-026 implements **registry upsert + staged export** after a successful forward-path scaffold (WO-022). When `scaffold()` returns a `ComponentSetNode`, the plugin must produce an updated **`RegistryV1`** document that records the ComponentSet's **`nodeId`**, Figma **`key`**, hosting **`pageName`**, monotonic **`version`**, and optional composite metadata — then surface it through the **WO-020 ExportSheet** so the designer emits `.figmint-registry.json` via download (Community) or GitHub PR (Org).

**Locked recommendation:** add **`src/core/components/registry.ts`** as a pure, testable module with four public functions — `normalizeRegistryInput`, `loadRegistryFromGitHub`, `buildRegistryEntry`, `mergeRegistryEntry`, `createRegistryDocument` — porting upsert semantics from legacy **`merge-registry.mjs`** and wrapping results in the **`RegistryV1`** envelope (`v: 1`, `kind: 'registry'`). **Do not** auto-commit to GitHub silently; always stage the merged document and open ExportSheet (FR-SCAF-6 + PRD §11.4 preview-first). **Default sinks:** Org build → `defaultSinks: ['github-pr']`; Community → `defaultSinks: ['download']` (intersected with `availableSinks()` per WO-020). Registry map keys use **`spec.name`** (e.g. `"Button"`) to match ticket acceptance criteria; legacy kebab keys (e.g. `"button"`) are normalized on read only when unambiguous.

**Contract boundary:** `RegistryComponentEntry` stores **Figma identity + version metadata**, not full component-spec fields (archetype, variant matrix, props). Those live in separate `component-spec.v1.json` artifacts (WO-019 export paths). The ticket's mention of "name, archetype, variant matrix, props" applies to the **scaffold input**, not persisted registry rows — refine Requirements accordingly. **Code Connect URL** is **not** in `RegistryV1` (`additionalProperties: false` on entry); resolution uses stored Figma **`key`** + repo Code Connect files (Sprint 8).

---

## Key Findings

### 1. `RegistryV1` contract is shipped — lift target is merge logic, not schema design

**Evidence:** `packages/contracts/src/registry.v1.ts` defines the canonical shape:

```1:18:packages/contracts/src/registry.v1.ts
export interface RegistryComponentEntry {
  nodeId: string;
  key: string;
  pageName: string;
  publishedAt: string;
  /** @minimum 1 */
  version: number;
  cvaHash?: string | null;
  /** Present on composites: maps composed child kebab-name → registry version captured at last composite draw — Axis B stale detection. */
  composedChildVersions?: Record<string, number | null>;
}

export interface RegistryV1 {
  v: 1;
  kind: 'registry';
  fileKey: string;
  components: Record<string, RegistryComponentEntry>;
}
```

JSON Schema at `packages/contracts/dist/registry.v1.schema.json` (retrieved 2026-05-28) requires envelope fields `v`, `kind`, `fileKey`, `components` and forbids extra top-level or entry-level properties. Legacy `.designops-registry.json` lacked `v`/`kind` — Figmint adds the envelope on **write** and accepts legacy bodies on **read** via normalization (see §3).

**Requirement trace:** AC "Registry document validates against `RegistryV1` schema (WO-003)" — satisfied by emitting contract-typed objects; validate in unit tests with AJV against `dist/registry.v1.schema.json`.

### 2. Legacy merge semantics — port `merge-registry.mjs` verbatim for upsert rules

**Evidence:** `DesignOps-plugin/skills/create-component/resolver/merge-registry.mjs` (94 lines) is the authoritative upsert implementation:

| Rule | Behavior |
| ---- | -------- |
| Missing registry file | Create `{ fileKey, components: {} }` then merge |
| `fileKey` mismatch | **Refuse** merge — exit 1 / throw `REGISTRY_FILE_KEY_MISMATCH` |
| Component key | Upsert `registry.components[component] = record` — **replace**, never append duplicate |
| Required entry fields | `nodeId`, `key`, `pageName`, `publishedAt`, `version` (integer ≥ 1) |
| Optional fields | `cvaHash` (default `null`), `composedChildVersions` (object, composites only) |
| Serialization | `JSON.stringify(registry, null, 2)` + trailing newline |

Legacy CLI entry shape wraps component name outside the record: `{ fileKey, component, nodeId, key, … }`. Figmint **`buildRegistryEntry`** accepts scaffold output + spec and returns `{ componentKey, entry }` for **`mergeRegistryEntry`**.

**Version increment (locked):** legacy script does **not** auto-increment — the caller supplies `version`. Figmint locks: on upsert, `version = (existing?.version ?? 0) + 1`; on first insert, `version = 1`. Always set `publishedAt = new Date().toISOString()` on every successful scaffold merge (fresh publish timestamp).

**Requirement trace:** AC "Re-scaffolding the same Button updates (not duplicates) the entry" — upsert by stable component map key + version bump proves replace semantics.

### 3. Read path — reuse `loadFromGitHub` + `detectContract('registry')`

**Evidence:** `src/io/sources/github.ts` — `loadFromGitHub(repoUrl, path, ref?)` fetches via `postContentsFetch`, parses with `parseTextToDocument`, returns `LoadedDocument` with `GitHubSourceMeta` (`sha`, `path`, `repoUrl`).

| Concern | Locked behavior |
| ------- | ---------------- |
| Default path | `.figmint-registry.json` (basename `.figmint-registry` from WO-020 + `.json` extension) |
| Configurable path | Defer full FR-CONF-5 settings UI; accept `registryPath` parameter defaulting to `.figmint-registry.json` |
| Missing file (404) | Treat as **greenfield** — return `null` / empty components, do not fail scaffold |
| Invalid JSON | Surface `ValidationError` to UI; scaffold may still complete with in-memory-only registry |
| Legacy filename | Accept read of `.designops-registry.json` when designer's repo still uses legacy name (normalization only) |
| Legacy body (no `v`/`kind`) | `normalizeRegistryInput(parsed)` → wrap as `RegistryV1` if `fileKey` + `components` present |

**Detection:** `src/io/sources/detect.ts` recognizes `v === 1 && kind === 'registry'`. Legacy bodies without envelope fall through to `unknown-contract` — **`normalizeRegistryInput`** runs **before** detect when path ends with `registry.json` or caller hints registry.

**Requirement trace:** Req 1 "read existing registry (if any from connected repo)" — `loadRegistryFromGitHub` wraps `loadFromGitHub` + normalization + typed cast to `RegistryV1`.

### 4. Entry construction from scaffold — map `ScaffoldResult` + live Figma nodes

**Evidence:** WO-022 research defines `ScaffoldResult` with `componentSet`, `variantCount`, `replacedExisting` (`component-scaffold-engine.md` §Decision D8). WO-026 consumes:

| `RegistryComponentEntry` field | Source |
| ------------------------------ | ------ |
| `nodeId` | `componentSet.id` (ComponentSet node — ticket AC) |
| `key` | `componentSet.key` (Figma stable component key for Code Connect / drift) |
| `pageName` | `targetPage.name` from scaffold call |
| `publishedAt` | ISO-8601 UTC at merge time |
| `version` | `(existing.components[spec.name]?.version ?? 0) + 1` |
| `cvaHash` | Optional — FNV-1a of canonical `variantMatrix` JSON if spec provides no precomputed hash; `null` when absent |
| `composedChildVersions` | When `spec.composes?.length`: map each child kebab name → `existingRegistry.components[child]?.version ?? null` at merge time (Axis B snapshot per legacy drift §3B.1) |

**Component map key:** **`spec.name`** (PascalCase display name, e.g. `"Button"`). Legacy repos keyed by kebab (`button`) — **`loadRegistryFromGitHub`** may optionally alias-read kebab key when PascalCase miss and exactly one case-variant exists; do not dual-write.

**Out of scope per ticket:** name/archetype/variant matrix/props are **not** stored in registry rows — they remain in `ComponentSpecV1` export (separate WO-027 flow). Refine ticket Requirements to avoid implying registry carries spec payload.

### 5. Export integration — WO-020 ExportSheet is the emission surface

**Evidence:** WO-020 shipped components:

| Module | Role |
| ------ | ---- |
| `src/ui/components/ExportSheet.tsx` | Format/sink UI; registry hides MD checkbox |
| `src/ui/export/exportSheetReducer.ts` | Registry → `{ json: true, md: false }` initial formats |
| `src/ui/export/defaultPaths.ts` | Registry basename → `.figmint-registry` |
| `src/ui/export/serializeForExport.ts` | Registry → single `{basename}.json` via `stableStringify` |
| `src/ui/export/runExport.ts` | Parallel sinks; GitHub PR payload builder |
| `src/ui/export/availableSinks.ts` | `github-pr` when `flags.githubOAuth && flags.githubPRSink` |

**Post-scaffold flow (locked):**

```text
scaffold(spec, page) → ScaffoldResult
  → loadRegistryFromGitHub(repoUrl, registryPath)  // optional
  → mergeRegistryEntry(existing, buildRegistryEntry(...))
  → ContractDocument { kind: 'registry', payload: RegistryV1 }
  → <ExportSheet document={...} defaultSinks={org ? ['github-pr'] : ['download']} title="Update registry" />
```

**GitHub PR branch:** `buildDefaultHeadBranch('registry', date)` → `figmint/registry-YYYY-MM-DD` (`src/io/github/branchName.ts`). Commit message: `figmint: update registry — {spec.name}`.

**Flags:** root `src/config/flags.ts` currently has all features `true` (single build). Community vs Org default sink selection uses `flags.githubOAuth && flags.githubPRSink` — when false, fall back to `download` only.

**Requirement trace:** Req 3 "Output via WO-020 unified export sheet — defaulting to GitHub PR for Org builds, download for Community."

### 6. `stableStringify` ensures deterministic PR diffs

**Evidence:** `src/io/formats/stableStringify.ts` — deep-sorts object keys before `JSON.stringify`. Export path uses this for registry (`serializeForExport.ts` L17). Merge module should return plain objects; ExportSheet handles serialization — **registry.ts does not stringify**.

### 7. Downstream consumers depend on registry write timing

**Evidence:** Cross-ticket matrix:

| Ticket | Needs from WO-026 |
| ------ | ----------------- |
| WO-022 composed archetype | **Read** registry (optional param) — child `nodeId` before composite draw |
| WO-030 / WO-031 (Sprint 6) | Repo `.figmint-registry.json` as drift baseline |
| WO-043 dependency scanner | Registry lookup for sub-component refs |
| WO-037 handoff emission | May bundle registry snapshot in handoff context (separate ticket) |

WO-026 **write** path unblocks designer-driven repo sync; WO-022 **read** path can use in-memory merge result before export completes.

### 8. Ticket requirement gap — Code Connect URL not in contract

**Evidence:** Ticket Req 2 lists "optional Code Connect mapping URL." `RegistryComponentEntry` has no URL field; schema `additionalProperties: false`. Legacy Code Connect skill resolves URL via `components[kebab].nodeId` in registry, not a stored mapping URL.

**Locked:** omit URL from WO-026; document in Open Questions as **RESOLVED — deferred to Sprint 8 Code Connect PR emission**. Registry stores `key` + `nodeId` sufficient for mapping.

### 9. Test fixture drift — UI export registry fixture is invalid

**Evidence:** `tests/fixtures/ui/export/registry.json` contains `{ "name": "Button" }` inside components — **not** valid `RegistryComponentEntry`. IO fixture `tests/fixtures/io/sources/registry.json` is valid empty envelope.

**Recommendation:** `/plan` adds golden fixture `tests/fixtures/registry/button-upsert.v1.json` with full entry fields; fix UI export fixture during WO-026 build or WO-027 integration.

### 10. Greenfield module — `src/core/components/registry.ts` does not exist

**Evidence:** `Glob **/src/core/components/**` → 0 files. WO-022 creates `src/core/components/scaffold/**`. WO-026 adds sibling `registry.ts` (+ `registry.types.ts` optional).

---

## Validated evidence

### Repo inventory

| Path | Role | Status |
| ---- | ---- | ------ |
| `packages/contracts/src/registry.v1.ts` | Type definitions | ✅ Exists |
| `packages/contracts/dist/registry.v1.schema.json` | AJV validation | ✅ Exists |
| `src/io/sources/github.ts` | `loadFromGitHub` | ✅ Exists |
| `src/io/sources/detect.ts` | `kind === 'registry'` detection | ✅ Exists |
| `src/io/sources/parseText.ts` | JSON parse + detect | ✅ Exists |
| `src/ui/components/ExportSheet.tsx` | Export UI | ✅ WO-020 |
| `src/ui/export/*` | Reducer, paths, serialize, runExport | ✅ WO-020 |
| `src/io/formats/stableStringify.ts` | Deterministic JSON | ✅ Exists |
| `src/config/flags.ts` | OAuth / PR sink flags | ✅ Exists |
| `src/ui/github/useGitHubConnect.ts` | Repo URL + OAuth state | ✅ WO-016 |
| `src/ui/tabs/Settings.tsx` | `loadFromGitHub` smoke test (tokens only today) | ✅ Exists |
| `src/core/components/registry.ts` | Merge + load module | ❌ Greenfield |
| `tests/unit/core/components/registry.test.ts` | Merge unit tests | ❌ Greenfield |

### Patterns to mirror

| Pattern | Source | Figmint target |
| ------- | ------ | -------------- |
| Upsert by component key | `merge-registry.mjs` L67–87 | `mergeRegistryEntry()` |
| fileKey guard | `merge-registry.mjs` L74–78 | throw typed error |
| GitHub read via postMessage | `Settings.tsx` L35–42 | `loadRegistryFromGitHub()` |
| Export default basename | `defaultPaths.ts` L33–34 | reuse, append `.json` only in serialize |
| Registry JSON-only export | `serializeForExport.ts` L13–21 | consume from ExportSheet |
| Org vs Community sinks | `availableSinks.ts` L6–11 | `defaultSinks` selection helper |

### Official API / platform facts

| API / limit | Usage | Reference (retrieved 2026-05-28) |
| ----------- | ----- | -------------------------------- |
| `ComponentSetNode.id` / `.key` | Registry entry identity | [ComponentSetNode](https://developers.figma.com/docs/plugins/api/componentsetnode/) |
| `figma.fileKey` | Registry `fileKey` top-level | [figma.fileKey](https://developers.figma.com/docs/plugins/api/figma/#filekey) |
| GitHub Contents API | Read registry JSON | [GET repository contents](https://docs.github.com/en/rest/repos/contents#get-repository-content) — via WO-016 relay |
| pluginData 100 kB/key | Not used for registry file (repo is SoT) | [setPluginData](https://developers.figma.com/docs/plugins/api/node-properties/#setplugindata) |

### Cross-ticket matrix

| Ticket | Interface / artifact | WO-026 consumes or produces |
| ------ | -------------------- | --------------------------- |
| WO-003 | `RegistryV1`, JSON Schema | **Produces** validated documents |
| WO-016 | `loadFromGitHub`, OAuth | **Consumes** read path |
| WO-020 | ExportSheet, default paths, sinks | **Consumes** emission UI |
| WO-022 | `ScaffoldResult`, `ComponentSpecV1` | **Consumes** scaffold output |
| WO-027 | Components tab orchestration | **Produces** API called post-scaffold |
| WO-030 / WO-031 | Drift detector | **Produces** repo registry file (via export) |
| Sprint 8 Code Connect | Mapping URLs | **Out of scope** — uses `key` from registry |

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D1 | Pure module `src/core/components/registry.ts` | Testable; no UI in core | Inline merge in Components tab |
| D2 | Port `merge-registry.mjs` upsert semantics | Proven legacy behavior; drift tooling expects it | Custom merge with duplicate rows |
| D3 | Map key = `spec.name` (PascalCase) | Ticket AC "Button"; matches ComponentSpec | Legacy kebab-only keys |
| D4 | Auto-increment `version` on upsert | Enables Sprint 6 stale detection | Caller-supplied version only |
| D5 | Always refresh `publishedAt` on upsert | Matches legacy drift timestamps | Preserve original publishedAt |
| D6 | 404 → empty registry (greenfield) | Scaffold must not block on missing file | Fail closed on missing registry |
| D7 | fileKey mismatch → error | Prevent cross-file pollution (legacy L74–78) | Silent overwrite |
| D8 | Stage + ExportSheet; no silent PR | FR-SCAF-6 + preview-first PRD §11.4 | Auto-open PR without confirmation |
| D9 | Default sinks: Org `github-pr`, Community `download` | Ticket Req 3 + WO-021 gating | Always download |
| D10 | Normalize legacy `.designops-registry.json` on read | Migration from DesignOps repos | Reject non-v1 bodies |
| D11 | No spec fields in registry entry | Contract `additionalProperties: false` | Extend entry with archetype/props (needs v2) |
| D12 | No Code Connect URL in registry | Not in schema; `key` suffices | Add v2 field for mapping URL |
| D13 | `composedChildVersions` snapshot at composite merge | Legacy Axis B drift (`sync-design-system` §3B.1) | Omit until Sprint 6 |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-026-1 | Unit: merge into empty registry, then upsert same key | Second merge replaces entry; `version` 1→2; other keys untouched | ☐ pending — `/build` Phase 1 |
| SPK-026-2 | Unit: `fileKey` mismatch throws | Error code `REGISTRY_FILE_KEY_MISMATCH`; no mutation | ☐ pending |
| SPK-026-3 | Unit: normalize legacy body `{ fileKey, components }` without `v`/`kind` | Output validates against AJV schema | ☐ pending |
| SPK-026-4 | Integration: scaffold Button in sandbox → ExportSheet → download `.figmint-registry.json` | File contains `Button` entry with ComponentSet `nodeId` | ☐ pending — VQA / WO-027 |
| SPK-026-5 | Org build: ExportSheet with `github-pr` selected → PR contains registry JSON | PR file path `.figmint-registry.json`; valid JSON | ☐ deferred — requires OAuth + connected repo (WO-016 PASS) |

**Research-complete gate:** SPK-026-1..3 are unit-test gates before `/build`; SPK-026-4..5 run at VQA with WO-027.

---

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| PascalCase vs kebab registry keys break legacy repos | Medium | Medium | Normalization read alias; document migration in plan |
| Designer skips ExportSheet — repo stale | Medium | High | WO-027 UI copy: "Export registry to sync repo"; badge in Sync tab (Sprint 6) |
| `loadFromGitHub` fails (OAuth/network) | Medium | Medium | Allow in-memory registry + export to download sink without read |
| Invalid existing registry blocks merge | Low | Low | Parse errors surface; offer "Replace registry" with greenfield |
| Ticket Req 2 implies spec fields in registry | Low | High | Refine ticket Requirements (done in research pass) |
| UI fixture invalid shape misleads tests | Low | Medium | Fix `tests/fixtures/ui/export/registry.json` in build |
| Composed `composedChildVersions` wrong if child not in registry | Medium | Medium | Set null for missing children; composed archetype already errors (WO-022) |

---

## Recommendations

1. **`/plan` module API:**

```ts
// src/core/components/registry.ts (proposed)
export function normalizeRegistryInput(raw: unknown): RegistryV1 | ValidationError;
export function mergeRegistryEntry(
  registry: RegistryV1,
  componentKey: string,
  entry: RegistryComponentEntry,
): RegistryV1;
export function buildRegistryEntry(input: BuildRegistryEntryInput): RegistryComponentEntry;
export function createEmptyRegistry(fileKey: string): RegistryV1;
// UI layer:
export async function loadRegistryFromGitHub(
  repoUrl: string,
  path?: string,
): Promise<RegistryV1 | null | ValidationError>;
```

2. **Phased build:** Phase 1 — `registry.ts` + unit tests (SPK-026-1..3); Phase 2 — wire post-scaffold ExportSheet hook in WO-027 (or thin bridge in WO-026 if Components tab stub exists).

3. **Golden fixtures** under `tests/fixtures/registry/` — empty, single-button, upsert-v2, fileKey-mismatch input, legacy-designops body.

4. **AJV validation test** — round-trip every fixture against `packages/contracts/dist/registry.v1.schema.json`.

5. **Do not port** `merge-registry.mjs` as a Node script — inline TypeScript only.

6. **Console logging** — use `console.debug` in UI iframe only; main-thread registry reads go through existing GitHub message handlers (no new main-thread code unless cache needed).

7. **Fix** `tests/fixtures/ui/export/registry.json` to valid `RegistryComponentEntry` during build.

---

## Open questions

| # | Question | Owner | Status |
| - | -------- | ----- | ------ |
| OQ-1 | Configurable registry path (FR-CONF-5) in Settings? | WO-027 / Settings ticket | **OPEN** — default `.figmint-registry.json` for WO-026; path param on API |
| OQ-2 | Store Code Connect URL in registry? | Sprint 8 | **RESOLVED — no**; use Figma `key` |
| OQ-3 | Registry map key casing for legacy repos? | `/plan` | **RESOLVED** — write PascalCase (`spec.name`); read alias kebab when safe |
| OQ-4 | Auto-open ExportSheet vs banner? | WO-027 UX | **OPEN** — lean auto-open modal after scaffold success |

---

## References

- PRD: `Docs/PRD.md` §5.2, §6.2 FR-SCAF-6, §8.6, §11.4
- Lift: `DesignOps-plugin/skills/create-component/resolver/merge-registry.mjs`
- Lift schema: `DesignOps-plugin/skills/create-component/registry.schema.json`
- Contract: `packages/contracts/src/registry.v1.ts`
- WO-020 plan: `.github/Sprint 4/WO-020-unified-export-sheet-ui/plan.md`
- WO-022 research: `.github/Sprint 5/WO-022-componentset-variant-matrix-scaffolder/research/component-scaffold-engine.md`
- Figma ComponentSetNode: https://developers.figma.com/docs/plugins/api/componentsetnode/ (2026-05-28)
- GitHub Contents API: https://docs.github.com/en/rest/repos/contents (2026-05-28)
