# Variable Push Engine — Design Research

> **Status:** ✅ LOCKED — module boundaries, idempotency algorithm, mode table, alias build order, value shapes, EVC gate, performance budget, push result type, lift map, and sandbox notes decided 2026-05-27. Ready for `/plan`.
> **Date:** 2026-05-27
> **Owner:** Sprint 2 (WO-008)
> **PRD anchors:** §6.1 FR-BOOT-3..6, §8.2 (`tokens` contract), §14 G1 (<30 s bootstrap)
> **Upstream:** WO-055 `canonical-token-model.md` §6 (EVC projector); WO-005 `latency-benchmark.md` + `extended-collections.md`

---

## Summary

WO-008 implements the deterministic **5-collection variable push engine** that consumes canonical `TokensV1` and writes Figma local variable collections via the Plugin API only (no MCP wrapper, no REST `codeSyntax` split). The engine splits into three modules under `src/core/variables/` — `collections.ts`, `modes.ts`, and `push.ts` — with **`codeSyntax.ts` (WO-009) supplying triples and `push.ts` owning every `setVariableCodeSyntax` call site**.

Push runs **five sequential collection passes** in dependency order (Primitives → Theme → Typography → Layout → Effects), building runtime lookup maps (`primMap`, `varMap`) so structured `{ aliasOf: { collection, name } }` refs become `{ type: 'VARIABLE_ALIAS', id }` at apply time. Idempotency is keyed on `(collection display name, variable name)` against a single snapshot from `getLocalVariableCollectionsAsync()` + `getLocalVariablesAsync()` at push start; a second identical run yields **skipped** counts only.

WO-005 measured **606 ms** for 400 single-collection variables; extrapolated full 5-collection push is **~904 ms** — well under the ticket's **<2 s** bench target and ~3% of PRD G1's 30 s budget. EVC projection is **opt-in behind a feature flag** and runs only when `isEnterprise()` passes the WO-005 plan-gate probe; Pro/Org sandbox testing stays on the base five collections.

---

## Key Findings

### 1. Push pipeline architecture — module boundaries (LOCKED)

| Module           | Responsibility                                                                                                                                                                                                     | Does NOT                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `collections.ts` | Idempotent **find-or-create** the five collections by **display name** (`Primitives`, `Theme`, `Typography`, `Layout`, `Effects`). Returns `Map<CollectionId, VariableCollection>` keyed by canonical id.          | Create modes, create variables, set values      |
| `modes.ts`       | **Reconcile modes** per collection: rename default `"Mode 1"` → first expected mode; `addMode` for remaining names; build `Map<ModeName, modeId>` per collection.                                                  | Touch variables or codeSyntax                   |
| `push.ts`        | **Orchestrator**: snapshot → collections → modes → five passes → optional EVC Phase 2 → `PushResult` → **`runAudit('variables', …)`** hook. Owns `createVariable`, `setValueForMode`, **`setVariableCodeSyntax`**. | Derive codeSyntax strings (delegates to WO-009) |

**Supporting modules (same folder, WO-008 scope unless noted):**

| Module                                     | Responsibility                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `resolveAlias.ts` (or inline in `push.ts`) | Walk `TokenAliasRef` → runtime `VariableAlias` via `varMap` / `primMap` |
| `detectPlan.ts`                            | `isEnterprise(): Promise<boolean>` — `extend()` probe per WO-005        |
| `compare.ts`                               | Value + alias + codeSyntax equality for idempotent skip                 |
| `types.ts`                                 | `PushResult`, `PushError`, `CollectionPassResult`                       |

**Relationship to `codeSyntax.ts` (WO-009):**

- **WO-009 owns derivation rules** (`deriveCodeSyntax(token): Partial<Record<CodeSyntaxPlatform, string>>`).
- **WO-008 owns the Plugin API call** — `push.ts` resolves the triple then calls `setVariableCodeSyntax` inline in the variable loop:

```ts
// push.ts — call site (ES2017-safe; no ?.)
var triple = token.codeSyntax;
if (!triple || !triple.WEB) {
  triple = deriveCodeSyntax(token); // from codeSyntax.ts (WO-009)
}
if (triple.WEB) {
  variable.setVariableCodeSyntax('WEB', triple.WEB);
}
if (triple.ANDROID) {
  variable.setVariableCodeSyntax('ANDROID', triple.ANDROID);
}
if (triple.iOS) {
  variable.setVariableCodeSyntax('iOS', triple.iOS);
}
```

**Locked rule:** `codeSyntax.ts` is a **pure mapper** (no Figma API). `push.ts` is the **only** module that invokes `setVariableCodeSyntax`. WO-009 does not import `push.ts`. When WO-009 is not yet merged, WO-008 may stub `deriveCodeSyntax` to return `{}` and still push values — audit (WO-010) will flag missing codeSyntax until WO-009 lands.

**Orchestration sequence (high level):**

```
pushTokens(tokens, options?)
  1. snapshot = loadLocalVariableState()     // one async read
  2. collections = ensureCollections(tokens) // collections.ts
  3. modeMaps = ensureModes(collections, tokens) // modes.ts
  4. varMaps = { primitives: {}, theme: {}, ... }
  5. for collectionId in CANONICAL_ORDER:
       passResult = pushCollectionPass(...)
       merge into PushResult
  6. if options.evcEnabled && tokens.themes && await isEnterprise():
       pushEvcProjections(tokens.themes, varMaps)
  7. audit = runAudit('variables', { pushResult, tokens }) // WO-010; stub until WO-010 lands
  8. return { ...pushResult, audit }
```

Single `figma.commitUndo()` at end of push (or rely on Figma auto-checkpoint — match spike pattern: one commit at end).

---

### 2. Idempotency algorithm (LOCKED)

**Step-by-step:**

1. **Snapshot once** at push start (never inside the per-variable loop):
   - `const collections = await figma.variables.getLocalVariableCollectionsAsync()`
   - `const variables = await figma.variables.getLocalVariablesAsync()`
   - Build indexes:
     - `collectionByName: Map<string, VariableCollection>` — key = `collection.name` (display name)
     - `variableByKey: Map<string, Variable>` — key = `${collectionId}:${variable.name}`

2. **Find existing collection by name** (`collections.ts`):
   - Expected display names (Title Case): `Primitives`, `Theme`, `Typography`, `Layout`, `Effects`
   - If `collectionByName.has('Primitives')` → reuse; else `figma.variables.createVariableCollection('Primitives')`
   - Record `created` vs `reused` on collection pass metadata

3. **Match existing variable by `(collection, name)`** without creating duplicates:
   - Key: `${collection.id}:${token.name}` where `token.name` is slash path (e.g. `color/primary/500`)
   - If key exists in `variableByKey` → candidate for **update** or **skip**
   - Else → `figma.variables.createVariable(token.name, collection, token.type)` → increment `created`, register in `variableByKey` and `varMap`

4. **Detect no-op second run** — for each mode in `token.valuesByMode`:
   - Resolve desired value (literal or alias via `varMap`)
   - Read current: `variable.valuesByMode[modeId]` (parent collection modes only in Phase 1)
   - Compare with `valuesEqual(current, desired)`:
     - **COLOR:** compare `r,g,b,a` with epsilon `1e-4`
     - **FLOAT / STRING / BOOLEAN:** strict equality
     - **Alias:** compare resolved `id` strings
   - Compare codeSyntax per platform (`variable.getVariableCodeSyntax('WEB'|'ANDROID'|'iOS')` vs desired triple)
   - If **all modes + all present codeSyntax platforms match** → increment `skipped`, do not write
   - If any mismatch → apply writes, increment `updated`

5. **`getLocalVariableCollectionsAsync()` usage:**
   - Call **once** at start for idempotency index
   - Re-call only after EVC `extend()` creates new collections (Phase 2), not per variable

6. **When to update vs skip vs error:**

| Situation                                                 | Action                                                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Collection missing                                        | Create                                                                                                                                  |
| Collection exists, modes mismatch                         | `modes.ts` adds/renames — **update** (mode reconciliation is not skip)                                                                  |
| Variable missing                                          | Create + set all mode values + codeSyntax → **created**                                                                                 |
| Variable exists, all values + codeSyntax match            | **skipped**                                                                                                                             |
| Variable exists, value or codeSyntax differs              | **updated**                                                                                                                             |
| Alias target `(collection, name)` not in `varMap` yet     | **error** — push order violation or bad input                                                                                           |
| `createVariable` throws (invalid name, duplicate in race) | **error** — append to `errors[]`, continue or abort pass per collection (default: abort pass, continue to next collection with warning) |
| Type mismatch (existing FLOAT, desired COLOR)             | **error** — do not silently recreate; surface diagnostic                                                                                |

**Mode reconciliation note:** Figma does not support deleting modes safely in bulk. Algorithm: ensure expected mode **names** exist; do not remove extra modes on idempotent re-run (audit flags orphans). Rename default mode first, then `addMode` for missing names — matches `04-step11-push.md`.

---

### 3. Per-collection mode strategy (LOCKED)

Canonical `CollectionId` → Figma display name → mode names (exact strings, case-sensitive):

| Collection   | Figma display name | Modes (in `addMode` order)                            | Mode setup                                                                               |
| ------------ | ------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `primitives` | `Primitives`       | `Default`                                             | Rename default `"Mode 1"` → `Default`                                                    |
| `theme`      | `Theme`            | `Light`, `Dark`                                       | Rename default → `Light`; `addMode('Dark')`                                              |
| `typography` | `Typography`       | `85`, `100`, `110`, `120`, `130`, `150`, `175`, `200` | Rename default → `100`; add `85`, `110`, `120`, `130`, `150`, `175`, `200` (seven calls) |
| `layout`     | `Layout`           | `Default`                                             | Rename default → `Default`                                                               |
| `effects`    | `Effects`          | `Light`, `Dark`                                       | Rename default → `Light`; `addMode('Dark')`                                              |

**TokensV1 mode keys** must use these exact names in `valuesByMode` and `collections[].modes[]` (WO-055 locked). Theme uses **`Light` / `Dark`** (Title Case), not `light` / `dark` from legacy JSON — WO-007 adapter normalizes legacy lowercase keys on ingest.

Typography **never** uses EVC for scale modes — eight ordinary modes on the base collection (WO-005 §2.2).

---

### 4. Alias resolution at push time (LOCKED)

**Build order (non-negotiable):** Primitives → Theme → Typography → Layout → Effects.

**Runtime maps:**

```ts
// After each collection pass completes:
varMap: Record<CollectionId, Record<string, string>>; // name → VariableId

// Convenience alias used by Theme/Layout/Effects:
primMap = varMap.primitives;
```

**Resolution algorithm** for `TokenAliasRef`:

```ts
function resolveAlias(ref: TokenAliasRef, varMap: VarMaps): VariableAlias {
  var bucket = varMap[ref.aliasOf.collection];
  if (!bucket) {
    throw new PushError('alias', 'Unknown collection: ' + ref.aliasOf.collection);
  }
  var id = bucket[ref.aliasOf.name];
  if (!id) {
    throw new PushError(
      'alias',
      'Unresolved alias: ' + ref.aliasOf.collection + ':' + ref.aliasOf.name,
    );
  }
  return { type: 'VARIABLE_ALIAS', id: id };
}
```

**Cross-collection directions in legacy data:**

| From       | To                 | Example                                       |
| ---------- | ------------------ | --------------------------------------------- |
| Theme      | Primitives         | `color/background/dim` → `color/neutral/100`  |
| Typography | Primitives         | `Display/LG/font-family` → `typeface/display` |
| Typography | Typography (intra) | Body variant slots → base Body size slots     |
| Layout     | Primitives         | `space/md` → `Space/200`                      |
| Effects    | Primitives         | `shadow/md/blur` → `elevation/md`             |

Intra-collection aliases (Typography body variants) resolve via `varMap.typography` populated **during** the Typography pass as variables are created — creation order within the pass must topologically sort alias dependencies (WO-007 fixture responsibility; push engine assumes valid DAG or surfaces cycle errors).

---

### 5. Value setting per Plugin API type (LOCKED)

From `04-step11-push.md` §"Plugin API — values and aliases" (Plugin API path only; REST omitted):

| `token.type` | `setValueForMode(modeId, value)` shape           | Notes                                 |
| ------------ | ------------------------------------------------ | ------------------------------------- |
| `COLOR`      | `{ r: number, g: number, b: number, a: number }` | Channels **0–1** (not 0–255)          |
| `FLOAT`      | `number`                                         | e.g. spacing, elevation               |
| `STRING`     | `string`                                         | e.g. `typeface/display`               |
| `BOOLEAN`    | `boolean`                                        | Rare in Foundations set               |
| Alias        | `{ type: 'VARIABLE_ALIAS', id: string }`         | `id` from `varMap`, never string path |

**ES2017-safe patterns** (Figma sandbox — `memory.md`):

- No optional chaining (`?.`), nullish coalescing (`??`), or `replaceAll`
- Use explicit guards: `if (triple && triple.WEB) { ... }`
- Timing: `Date.now()` not `performance.now()` on main thread

**Scopes:** Legacy Step 11 sets explicit `variable.scopes` where needed. WO-008 default: honor `token.scopes` when present; else `'ALL_SCOPES'` (spike-validated acceptable).

---

### 6. EVC feature flag (LOCKED)

| Control                      | Behavior                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| **Default**                  | `evcEnabled: false` — Pro/Org/Community files push base five collections only                    |
| **Flag on + non-Enterprise** | Skip Phase 2 silently; `isEnterprise()` false (probe throws `"enterprise plan"`)                 |
| **Flag on + Enterprise**     | Run Phase 2: `themes[]` → `parent.extend(name)` for `parentCollection ∈ { theme, effects }` only |

**Plan gate** (`detectPlan.ts`):

```ts
async function isEnterprise(): Promise<boolean> {
  var probe = figma.variables.createVariableCollection('__fighub_evc_probe__');
  try {
    probe.extend('__probe__');
    return true;
  } catch (e) {
    var msg = String(e && e.message ? e.message : e);
    return msg.indexOf('enterprise plan') !== -1 ? false : false; // any throw → non-Enterprise for safety
  } finally {
    // remove probe collection if created
  }
}
```

Exact gate string from WO-005: `"Cannot create extended collections outside of enterprise plan."`

**Projection algorithm** (from WO-055 §6 — high level):

1. Complete Phase 1 (all five base collections + variables).
2. For each `ThemeExtension` in `tokens.themes`:
   - Resolve parent collection (`theme` or `effects`).
   - `const ext = parent.extend(themeExt.name)`.
   - For each override in `themeExt.overrides`:
     - Lookup variable in parent by `name`.
     - For each `[modeName, value]` in override: map parent mode name → extended `modeId` via `parentModeId`; `setValueForMode(extModeId, resolvedValue)`.
3. **Never** extend Typography.
4. Push result adds `evc: { extensionsCreated, overridesApplied, skipped }` sub-object (optional extension to `PushResult` for `/plan`).

Tests 2–4 from WO-005 remain **UNTESTED-ON-PLAN** on sandbox `cVdPraIafWFBRZnzMPhtrW`.

---

### 7. Performance budget (LOCKED)

**WO-005 measured rates** (Pro/Org sandbox, n=400, Primitives-only, 2026-05-27):

| Call                    | Per-call (ms) | Share |
| ----------------------- | ------------- | ----- |
| `createVariable`        | 0.50          | 33%   |
| `setValueForMode`       | 0.30          | 20%   |
| `setVariableCodeSyntax` | 0.23          | 47%   |

**Extrapolation — full 5-collection push (~400 vars, ~2960 API calls per `latency-benchmark.md` §3.1):**

| Estimate             | Value                                        |
| -------------------- | -------------------------------------------- |
| Linear extrapolation | **~904 ms**                                  |
| % of PRD G1 (30 s)   | ~3%                                          |
| WO-008 ticket bench  | **<2 s** for 400 vars                        |
| Headroom             | ~904 ms vs 2000 ms target → **~2.2× margin** |

**Reconciliation:** Ticket `<2s` is **stricter than G1** but **looser than spike extrapolation** — both are achievable. Lock bench target at **<2000 ms p50** for 400-token Foundations fixture on fresh sandbox file; aspirational internal target **<1000 ms** based on extrapolation.

**Bench hygiene** (from WO-005):

- Fresh file or clean variables between runs
- Single snapshot at start; no per-variable async reads
- ≤5 progress postMessages to UI
- One `commitUndo()` at end
- Use `Date.now()` for bench records on main thread

**Dominant risk is NOT variable push** — canvas builders + font loading dominate full bootstrap (WO-005 §6.5 verdict).

---

### 8. Push result type + audit hook (LOCKED)

**Return type** (`src/core/variables/types.ts` — also export from contracts if ops layer needs it):

```ts
export interface PushError {
  collection: CollectionId;
  name: string; // variable name or '' for collection-level
  phase: 'collection' | 'mode' | 'variable' | 'value' | 'alias' | 'codeSyntax' | 'evc';
  message: string;
}

export interface CollectionPassResult {
  collection: CollectionId;
  created: number;
  updated: number;
  skipped: number;
  errors: PushError[];
  durationMs: number;
}

export interface PushResult {
  created: number; // sum of variables created
  updated: number; // sum of variables updated
  skipped: number; // sum of variables skipped (no-op re-run)
  errors: PushError[];
  passes: CollectionPassResult[];
  evc?: {
    extensionsCreated: number;
    overridesApplied: number;
    skipped: number;
  };
  totalDurationMs: number;
}
```

**Audit hook call site** — end of `pushTokens()` in `push.ts`:

```ts
import { runAudit } from '../audit/runAudit'; // WO-010

var result = pushAllPasses(...);
var auditReport = await runAudit('variables', {
  tokens: tokens,
  pushResult: result,
  // post-operation Figma state read inside runAudit
});
if (auditReport.failures.length > 0) {
  // Failures bubble: attach to result; caller decides abort vs warn
  result.errors = result.errors.concat(mapAuditToPushErrors(auditReport));
}
return result;
```

WO-010 implements `runAudit`; WO-008 **must invoke it** and treat audit FAIL as non-fatal for partial pushes only when `options.continueOnAuditFail === true` (default **false** for bootstrap ops). Until WO-010 lands, stub returns `{ status: 'pass', failures: [] }`.

---

### 9. Lift map — port vs rewrite (LOCKED)

**Primary lift:** `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` — **NOT** `step-15a-primitives.mcp.js` (`lift-sources.md` §0).

| Legacy artifact                                           | Disposition                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Five sequential collection passes + dependency order      | **Port** → `push.ts` orchestration                                                             |
| Mode setup table (§"Plugin API — mode setup")             | **Port** → `modes.ts`                                                                          |
| `primMap` alias embedding pattern                         | **Rewrite** → runtime `varMap` lookup (no JSON literal embedding)                              |
| Plugin API value/alias rules (§"values and aliases")      | **Port** → `compare.ts` + value writer                                                         |
| REST `PUT` codeSyntax batch (§"REST — codeSyntax UPDATE") | **Drop** — replace with `setVariableCodeSyntax` in Plugin API loop                             |
| MCP `use_figma` wrapper + atomic failure UX               | **Drop** — native try/catch + `PushError[]`                                                    |
| Live checklist / AskUserQuestion prose                    | **Drop** — plugin UI tab (later ticket) shows progress                                         |
| Step 11 close (Doc/\* text styles + Effect styles)        | **Out of scope** WO-008 — Sprint 3 canvas/style tickets                                        |
| Per-collection variable lists                             | **Data only** — consumed via `TokensV1` from WO-007, not parsed from markdown                  |
| `conventions/01-collections.md`                           | **Port** → `collections.ts` constants                                                          |
| `phases/02-steps5-9.md` mode lists + scaling rules        | **Port** → WO-007 adapter + Typography token generation; push engine reads finished `TokensV1` |
| WO-005 spike `src/spike/**`                               | **Do NOT lift** — re-derive from `04-step11-push.md`; use spike **rates** only                 |

---

### 10. Figma sandbox testing notes (LOCKED)

| Field          | Value                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------ |
| File           | [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1) |
| `file_key`     | `cVdPraIafWFBRZnzMPhtrW`                                                                         |
| Root `node_id` | `0:1`                                                                                            |
| Plan tier      | **Pro/Org** (NOT Enterprise)                                                                     |
| EVC Tests 2–4  | UNTESTED-ON-PLAN — Test 1 plan-gate PASS verified                                                |
| Run hygiene    | Fresh file (⌘/Ctrl+N) or delete all local variable collections between bench runs                |
| Vitest         | Unit-test `compare.ts`, alias resolver, mode reconciliation with mocked Figma API                |
| Integration    | Manual plugin load against sandbox + WO-007 canonical fixture when available                     |

---

## Recommendations

### For `/plan`

1. Lock three build agents in Phase 1: `code-build` (`collections.ts`, `modes.ts`, `push.ts`, `types.ts`, `detectPlan.ts`, stubs for audit + codeSyntax); `code-build` tests; optional bench harness mirroring WO-005 fixture sizes.
2. Declare WO-007 (`TokensV1` input) and WO-009 (`deriveCodeSyntax`) as **interface dependencies** — push engine compiles against stubs until those land.
3. Fix ticket lift references: remove `step-15a-primitives.mcp.js`; cite `04-step11-push.md` only.
4. Add `PushResult` to `@detroitlabs/fighub-contracts` only if ops-program audit log requires it — otherwise keep in `src/core/variables/types.ts` until contract bump is justified.

### For `/build`

1. Implement snapshot-once idempotency before any write path.
2. Wire `deriveCodeSyntax` import with a local stub returning `{}` until WO-009 merges.
3. Wire `runAudit` import with no-op stub until WO-010 merges.
4. Bench gate in CI optional; manual `<2s` check on 400-var fixture documented in VQA.

### For downstream tickets

| Ticket | Handoff                                                                                |
| ------ | -------------------------------------------------------------------------------------- |
| WO-009 | Implement `deriveCodeSyntax`; push.ts already calls it                                 |
| WO-010 | Implement `runAudit('variables', …)`; validate against `PushResult` + live Figma state |
| WO-007 | Emit `TokensV1` with exact mode names from §3 table                                    |

---

## Open Questions

1. **Abort vs continue on collection pass failure** — recommend abort remaining passes if Primitives fails; continue for independent collections if Theme fails (Layout/Effects still usable). Lock in `/plan`.
2. **Extra modes on re-run** — leave orphan modes in place and audit-flag, or attempt removal? Recommend **leave + audit** (Figma API lacks safe bulk mode delete).
3. **`PushResult` in contracts package** — defer until ops-program schema needs typed push results (Sprint 4+).

---

## Sources

### Internal — FigHub

- `memory.md` — WO-005 headline (606 ms); EVC projector; no spike lift; ES2017 / no `performance.now()`
- `.github/Sprint 1/WO-055-…/research/canonical-token-model.md` — `TokensV1` shape; EVC §6 projection
- `.github/Sprint 1/WO-005-…/research/latency-benchmark.md` — per-call rates; §3.1 call budget; §6.5 G1 YES
- `.github/Sprint 1/WO-005-…/research/extended-collections.md` — plan-gate; render-time projector
- `Docs/lift-sources.md` §0 + variable creation row
- `Docs/PRD.md` §6.1 FR-BOOT-3..6, §14 G1
- `.github/Sprint 2/WO-010-…/ticket.md` — `runAudit` scope + call site

### Internal — DesignOps-plugin

- `skills/create-design-system/phases/04-step11-push.md` — primary lift (Plugin API sequence)
- `skills/create-design-system/conventions/01-collections.md` — five collections + modes
- `skills/create-design-system/phases/02-steps5-9.md` — per-collection mode lists + alias directions

### External

- Figma Plugin API — Variables: https://developers.figma.com/docs/plugins/working-with-variables/
- Figma Plugin API — `setVariableCodeSyntax`: https://developers.figma.com/docs/plugins/api/properties/Variable-setvariablecodesyntax/
- Figma Plugin API — `VariableAlias`: https://developers.figma.com/docs/plugins/api/VariableAlias/
