# WO-029 — Variable drift detector (3-way)

---

## Summary

Implement **`detectVariableDrift(repoTokens, figmaVars, snapshot)`** in `src/core/drift/variables.ts` classifying each token key as **push**, **pull**, **conflict**, or **synced** using 3-way merge semantics against the snapshot common ancestor (PRD FR-DRIFT-2..3).

**Locked recommendation:** Normalize both sides to a flat map keyed by `{collectionName}/{variableName}` (Figma slash paths). Reuse `valuesEqual` and `codeSyntaxEqual` from `src/core/variables/compare.ts` for equality. Union all keys from repo, Figma, and snapshot; classify with the standard 3-way table. Target **<2s for 400 variables** (ticket AC) — pure in-memory compare, no Plugin API in detector itself.

Depends on **WO-058 Phase 1** snapshot store (absorbed WO-028) and **WO-008** push engine for pull-apply integration later.

---

## Key Findings

### 1. Classification algorithm (locked)

For each key `K`:

| Figma (F) | Repo (R) | Snapshot (S) | Direction |
| --------- | -------- | ------------ | --------- |
| F ≠ S | R = S | * | **push** |
| F = S | R ≠ S | * | **pull** |
| F ≠ S | R ≠ S | F ≠ R | **conflict** |
| F = S | R = S | * | **synced** |
| F ≠ S | R ≠ S | F = R | **synced** (both moved same way) |

Where `≠` and `=` use canonical equality (values + codeSyntax per mode).

**Edge — missing snapshot entry:** Treat `S` as `R` (PRD risk row ~851). Equivalently: if no snapshot, `S := R` so only Figma-only changes surface as push; repo-only as synced until first push establishes snapshot.

**Edge — key only on one side:**

| Present in | Classification |
| ---------- | -------------- |
| Figma only, not repo | push (if S missing) or compare F vs S |
| Repo only, not Figma | pull |
| Snapshot only (deleted both sides) | conflict or push/pull depending on which side deleted — **recommend: push if Figma null, pull if repo null, conflict if both claim deletion** |

### 2. Canonical value shape for compare

From `readFigmaVariableState.ts` (lines 48–56), Figma side:

```typescript
interface VariableComparable {
  valuesByMode: Record<string, VariableValue>;
  codeSyntax: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>;
  resolvedType: VariableResolvedDataType;
}
```

Repo side: adapt wire JSON via `src/io/sources/adapters/adapt()` → `TokensV1` → flatten to same shape using collection/mode mapping from `src/core/variables/collections.ts` (5-collection model).

**Key format:** `primitives/color/blue-500` — collection name + `/` + variable name (Figma uses slashes, memory.md: never dots).

### 3. Existing compare utilities

`src/core/variables/compare.ts`:

- `valuesEqual(current, desired, epsilon?)` — lines 31–52; COLOR_EPSILON = 1e-4
- `codeSyntaxEqual(variable, desiredTriple)` — lines 54–69
- `resolveTokenValueForCompare` — alias resolution for repo tokens

**Finding:** Extract a **`variableStatesEqual(a: VariableComparable, b: VariableComparable): boolean`** wrapper for drift (no live `Variable` handle required on repo/snapshot sides).

### 4. Performance budget

WO-005 measured push at 606ms for 400 vars. Drift detect is compare-only:

- 400 keys × 3 reads × ~2 mode compares ≈ 2400 equality ops
- Expected **<50ms** in Vitest; **<500ms** with Figma snapshot read async
- Ticket AC **<2s** includes GitHub fetch + adapt — budget: fetch 1s, detect 0.5s, UI 0.5s

### 5. Output shape

Each drift entry maps to `VariableDriftEntry` in `packages/contracts/src/driftReport.v1.ts`:

```typescript
{
  id: 'var/primitives/color/blue-500',  // prefixed for report
  kind: 'variable',
  direction: 'push' | 'pull' | 'conflict',
  figma: { valuesByMode: {...}, codeSyntax: {...} },
  repo: { ... },
  lastSynced: { ... } | null,
}
```

Only emit rows where `direction !== 'synced'` **or** include synced in summary count only — **recommend: omit synced from `drifts[]`** (matches AC fixture: 7 drifts + 410 synced in summary only).

### 6. Integration points

| Consumer | Usage |
| -------- | ----- |
| WO-031 | Passes `VariableDrift[]` to report aggregator |
| WO-032 | Pull resolution invokes WO-008 push with repo canonical values |
| WO-033/WO-058 | On-open lightweight detect calls detector with cached repo fetch |
| `opsProgram.v1` | Future `detect-drift` op handler in `main.ts` |

---

## Validated evidence

### Repo inventory

| Exists | Path | Role |
| ------ | ---- | ---- |
| ✅ | `src/core/audit/readFigmaVariableState.ts:68-116` | Async Figma variable snapshot |
| ✅ | `src/core/variables/compare.ts` | Equality primitives |
| ✅ | `src/core/variables/push.ts:392+` | Push engine — post-push snapshot hook |
| ✅ | `src/io/sources/adapters/index.ts:30-59` | Wire → TokensV1 |
| ✅ | `packages/contracts/src/tokens.v1.ts` | Canonical token model |
| ✅ | `packages/contracts/src/driftReport.v1.ts:14-21` | VariableDriftEntry |
| ❌ | `src/core/drift/variables.ts` | Greenfield |
| ❌ | `src/core/drift/classify.ts` | Greenfield shared classifier |

### Cross-ticket matrix

| Ticket | Produces / Consumes |
| ------ | ------------------- |
| WO-058 | Snapshot read API | **consumes** |
| WO-008 | Push engine | pull-apply **consumes** |
| WO-031 | DriftReport | **produces** VariableDrift[] |
| WO-030 | Parallel component detector | independent |

---

## Decision log

| ID | Decision | Rationale | Rejected |
| -- | -------- | --------- | -------- |
| D-029-1 | Flat slash keys | Matches Figma variable.name | Dot paths (invalid in Figma API) |
| D-029-2 | Reuse compare.ts | Single equality definition | Duplicate compare in drift |
| D-029-3 | Missing snapshot → S:=R | PRD risk mitigation | Empty snapshot → all conflict |
| D-029-4 | Omit synced from drifts[] | Smaller reports; summary.synced count | List all 410 synced rows |
| D-029-5 | Pure function detector | Testable without Plugin API | Async detector mixed with fetch |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-029-1 | Vitest: 10-var fixture (3 push, 2 pull, 1 conflict, 4 synced) | All directions match ticket AC | ☐ pending in `/build` |
| SPK-029-2 | Bench 400-var synthetic compare loop | < 100ms detect-only | ☐ pending |
| SPK-029-3 | Integration: sandbox readFigma + fixture repo JSON | End-to-end classify | ☐ pending post WO-058 |

---

## Risk register

| Risk | Sev | Lik | Mitigation |
| ---- | --- | --- | ---------- |
| Mode name mismatch repo vs Figma | Med | Med | Normalize via collection mode map from push engine |
| Alias compare false conflicts | Med | Low | Use `resolveTokenValueForCompare` both sides |
| Extended collections (EVC) | Low | Low | Out of scope Phase 3; skip extended modes or Enterprise gate |
| Large token files exceed fetch timeout | Med | Low | Cache repo tokens in session after Fetch (WO-058) |

---

## Recommendations

1. Create `src/core/drift/classify.ts` with generic `classifyThreeWay<T>(figma, repo, snapshot, equal)` — shared with WO-030.
2. Create `src/core/drift/variables.ts` with `detectVariableDrift` + `flattenFigmaVariables` + `flattenRepoTokens`.
3. Fixture: `tests/fixtures/drift/variable-drift-10.v1.json` matching ticket AC counts.
4. Wire `readFigmaVariableState()` in main-thread handler `drift/detect-variables` message.
5. Document snapshot key prefix `var/` vs component `cmp/` for report IDs.

---

## Open questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-029-1 | Include codeSyntax in drift or values only? | **RESOLVED:** both — matches push skip logic |
| OQ-029-2 | Detect remote-only tokens not in 5-collection model? | **RESOLVED:** yes, any local Figma variable + repo token union |

---

## Appendix A — 10-variable AC fixture spec

| Key | Figma | Repo | Snapshot | Expected |
| --- | ----- | ---- | -------- | -------- |
| `primitives/a` | v1 | v0 | v0 | push |
| `primitives/b` | v1 | v0 | v0 | push |
| `primitives/c` | v1 | v0 | v0 | push |
| `theme/d` | v0 | v1 | v0 | pull |
| `theme/e` | v0 | v1 | v0 | pull |
| `layout/f` | v2 | v3 | v1 | conflict |
| `layout/g` | v5 | v5 | v5 | synced (summary only) |
| `layout/h` | v5 | v5 | v5 | synced |
| `layout/i` | v5 | v5 | v5 | synced |
| `layout/j` | v5 | v5 | v5 | synced |

Fixture file: `tests/fixtures/drift/variable-drift-ac-10.v1.json` (to create in `/build`).

---

## Appendix B — classifyThreeWay pseudocode

```typescript
function classifyThreeWay<T>(
  figma: T | null,
  repo: T | null,
  snapshot: T | null,
  equal: (a: T, b: T) => boolean,
): 'push' | 'pull' | 'conflict' | 'synced' {
  const S = snapshot ?? repo; // missing snapshot baseline
  const fEqS = figma !== null && S !== null && equal(figma, S);
  const rEqS = repo !== null && S !== null && equal(repo, S);
  const fEqR = figma !== null && repo !== null && equal(figma, repo);

  if (!fEqS && rEqS) return 'push';
  if (fEqS && !rEqS) return 'pull';
  if (!fEqS && !rEqS && !fEqR) return 'conflict';
  return 'synced';
}
```

