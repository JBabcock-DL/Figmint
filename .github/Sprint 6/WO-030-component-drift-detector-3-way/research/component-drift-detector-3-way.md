# WO-030 — Component drift detector (3-way)

---

## Summary

Implement **`detectComponentDrift(repoSpecs, figmaComponents, snapshot)`** in `src/core/drift/components.ts` applying the same 3-way classification as WO-029 for **component specs ↔ Figma ComponentSets**, with **granular deltas** for variant matrix changes, binding changes, and prop additions/removals (PRD FR-DRIFT-6, ticket requirements).

**Locked recommendation:** Drift unit = **registry component key** (spec `name`, e.g. `Button`). Compare three facets: (1) **variant matrix hash** (`cvaHash` via `hashVariantMatrix`), (2) **props** deep-equal, (3) **bindings** deep-equal. Figma side introspects live ComponentSet via scaffold helpers; repo side reads `ComponentSpecV1` from paths in snapshot registry or `fighub.json` defaults. Emit granular diff object in each drift entry's `figma`/`repo`/`lastSynced` fields.

**Critical dependency:** WO-058 deletes `.fighub-registry.json` — component drift reads **`snapshot.registry.components`** not repo registry file.

---

## Key Findings

### 1. What to compare (granularity)

| Facet          | Figma source                                   | Repo source                     | Drift signal                              |
| -------------- | ---------------------------------------------- | ------------------------------- | ----------------------------------------- |
| Variant matrix | `ComponentSetNode` children variant properties | `ComponentSpecV1.variantMatrix` | New/removed variant combos; hash mismatch |
| Props          | `componentPropertyDefinitions`                 | `ComponentSpecV1.props`         | Added/removed/changed prop                |
| Bindings       | Layer scan + bound variables (WO-023 patterns) | `ComponentSpecV1.bindings`      | Selector/variable mismatch                |
| Registry meta  | nodeId, pageName, version                      | snapshot registry entry         | nodeId change = push (Figma moved)        |

**Ticket AC examples:**

- `loading` variant added in Figma → **push** with delta `{ variantMatrix: { added: ['loading=true'] } }`
- New prop in repo spec → **pull** with delta `{ props: { added: [{ name: 'loading', type: 'boolean' }] } }`
- Both changed disagree → **conflict**

### 2. Figma introspection (existing code)

| Helper                  | Path                                                    | Use                        |
| ----------------------- | ------------------------------------------------------- | -------------------------- |
| `listVariantComponents` | `src/core/components/scaffold/listVariantComponents.ts` | Enumerate variant children |
| `hashVariantMatrix`     | `src/core/components/scaffold/variantMatrix.ts:62-70`   | cvaHash                    |
| `expandVariantMatrix`   | same file:33-59                                         | Full combo list for delta  |
| `buildRegistryEntry`    | `src/core/components/registry.ts`                       | Entry shape for snapshot   |

**New helper needed:** `figmaComponentSetToComparable(set: ComponentSetNode): ComponentComparable` extracting matrix from `componentPropertyDefinitions` VARIANT axes + prop defs + binding scan.

### 3. Repo spec loading

Today: `src/ui/components/scaffold/resolveComponentSpec.ts` fetches from GitHub by conventional path.

For drift detect on main thread:

1. Read `snapshot.registry.components` for key list + `version`/`cvaHash` baseline
2. UI or main fetches spec JSON via existing `loadFromGitHub(repoUrl, specsPath + name + '.json')`
3. Parse as `ComponentSpecV1`

**WO-058 `fighub.json`:** `specsPath` default `components/` — drift uses same paths.

### 4. Classification (shared with WO-029)

Use shared `classifyThreeWay<ComponentComparable>(figma, repo, snapshot, componentEqual)`.

`componentEqual` returns false if **any facet** differs; attach `ComponentDiff` detail:

```typescript
interface ComponentDiff {
  variantMatrix?: { added: string[]; removed: string[]; hashFigma: string; hashRepo: string };
  props?: { added: ComponentSpecProp[]; removed: string[]; changed: string[] };
  bindings?: { added: ComponentSpecBinding[]; removed: ComponentSpecBinding[]; changed: string[] };
}
```

### 5. Keys and IDs

- Snapshot/registry key: `Button` (spec name)
- Drift report id: `cmp/button` (kebab-case slug from spec name)
- Snapshot value stores full `ComponentComparable` JSON at key `cmp/{name}`

### 6. Performance

Ticket AC: **20 components <2s**. Hash + props compare is O(components × props). Variant expand worst case 96 combos (WO-057 matrix) — hash only, don't expand unless drift detected.

Expected: **<200ms** compare-only for 20 components.

### 7. Out of scope (confirmed)

- Code-side spec validation (assume well-formed)
- Auto-resolution suggestions
- Composed child recursive drift (defer; `composedChildVersions` in registry is Phase 4)

---

## Validated evidence

### Repo inventory

| Exists | Path                                            | Role               |
| ------ | ----------------------------------------------- | ------------------ |
| ✅     | `packages/contracts/src/componentSpec.v1.ts`    | Spec schema        |
| ✅     | `packages/contracts/src/registry.v1.ts`         | Registry entry     |
| ✅     | `src/core/components/registry.ts:102-235`       | Upsert, cvaHash    |
| ✅     | `src/core/components/scaffold/variantMatrix.ts` | Matrix hash/expand |
| ✅     | `tests/fixtures/component-spec/*.v1.json`       | Test specs         |
| ❌     | `src/core/drift/components.ts`                  | Greenfield         |
| ❌     | Figma→Comparable extractor                      | Greenfield         |

### Cross-ticket matrix

| Ticket        | Relationship             |
| ------------- | ------------------------ | ------------ |
| WO-022        | Variant matrix semantics | **depends**  |
| WO-028/WO-058 | snapshot.registry        | **depends**  |
| WO-029        | Shared classify.ts       | **shares**   |
| WO-031        | ComponentDriftEntry[]    | **produces** |

---

## Decision log

| ID      | Decision                              | Rationale                              | Rejected                     |
| ------- | ------------------------------------- | -------------------------------------- | ---------------------------- |
| D-030-1 | Registry key = spec.name              | Matches scaffold + Components tab      | Figma node name (unstable)   |
| D-030-2 | cvaHash as fast path                  | O(1) matrix compare                    | Full combo diff always       |
| D-030-3 | Lazy spec fetch per component         | Avoid loading 50 specs on badge detect | Bulk fetch all specs upfront |
| D-030-4 | Bindings compare by selector+variable | Matches WO-023 apply                   | Visual-only compare          |
| D-030-5 | Skip components not in registry       | No baseline → treat repo as snapshot   | Drift everything             |

---

## Pre-plan spikes

| Spike ID  | Procedure                                            | Pass criteria         | Status    |
| --------- | ---------------------------------------------------- | --------------------- | --------- |
| SPK-030-1 | Fixture: Button + loading variant in Figma mock tree | push + granular delta | ☐ pending |
| SPK-030-2 | Fixture: repo spec new prop                          | pull detected         | ☐ pending |
| SPK-030-3 | Both sides changed                                   | conflict              | ☐ pending |
| SPK-030-4 | 20-component bench                                   | < 200ms               | ☐ pending |

---

## Risk register

| Risk                                      | Sev | Lik | Mitigation                                                      |
| ----------------------------------------- | --- | --- | --------------------------------------------------------------- |
| ComponentSet not found for registry entry | Med | Med | Classify as pull (spec exists, Figma missing) or push (inverse) |
| Binding scan expensive                    | Med | Low | Cache scan per detect; only on hash/props match failure         |
| Spec path convention drift                | Med | Med | Centralize in fighub.json parser (WO-058)                       |
| Renamed component in Figma                | Low | Med | nodeId mismatch → push with meta delta                          |

---

## Recommendations

1. Add `src/core/drift/figmaComponent.ts` for ComponentSet introspection (keeps `components.ts` pure).
2. Share `classifyThreeWay` with WO-029 in `src/core/drift/classify.ts`.
3. Fixture: `tests/fixtures/drift/component-button-loading-push.v1.json`.
4. Integration test with `tests/helpers/scaffold/mockVariantTree.ts`.
5. Update ticket requirement: repo source = **spec files + snapshot registry**, not `.fighub-registry.json`.

---

## Open questions

| ID       | Question                      | Status                                                                    |
| -------- | ----------------------------- | ------------------------------------------------------------------------- |
| OQ-030-1 | Compare layout block in spec? | **RESOLVED:** Phase 3 — variant/props/bindings only; layout drift Phase 4 |
| OQ-030-2 | Instance swap prop drift?     | **RESOLVED:** include in props facet                                      |
