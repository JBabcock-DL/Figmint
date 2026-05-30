# Tokens used + auto-layout metadata extraction (WO-036)

> **Status:** Research complete — ready for `/plan`  
> **Date:** 2026-05-29  
> **Ticket:** WO-036 (GitHub #39)  
> **PRD anchors:** §6.6 FR-HAND-3..4, §8.5 `tokensUsed[]`, `autoLayout`

---

## Summary

WO-036 adds **`src/core/handoff/tokens.ts`** exporting `enumerateTokensAndLayout(node: SceneNode)` returning `{ tokens: string[], autoLayout: HandoffAutoLayout }`. Token names are collected by walking the subtree and reading **`boundVariables`** on each node (fills, strokes, layout gaps, typography, etc.), resolving variable IDs to **`{CollectionDisplayName}/{variableName}`** strings (e.g. `Theme/color/primary/default`, `Layout/space/md`).

Auto-layout metadata is read from the **root handoff frame** (the node passed in): direction, gap, padding, and primary axis sizing modes. Gap/padding values prefer **bound variable names** when the property is variable-bound; otherwise serialize numeric px/rem strings for handoff readability (contract `gap` and `padding` are `string` fields — not resolved token values).

**Out of scope confirmed:** alias resolution and literal token values — names only per ticket.

---

## Key findings

### 1. boundVariables walk (reuse drift patterns)

Existing scanner in `src/core/drift/figmaComponent.ts` (`scanBindings`) collects `{ selector, variable: id }`. Handoff needs **human token paths**, not raw IDs:

```text
variable = await figma.variables.getVariableByIdAsync(id)
collection = figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId)
displayName = DISPLAY_NAME inverse or collection.name
tokenPath = collection.name + '/' + variable.name   // e.g. Primitives/color/primary/50
```

Use `DISPLAY_NAME` map from `src/core/variables/collections.ts` for canonical **Pascal** collection prefix (`Primitives`, `Theme`, …) to match PRD §8.5 examples (`Theme/Primary` style — normalize to actual variable path `Theme/color/primary/default`).

### 2. Which properties to scan

| Node mixin | boundVariables fields to inspect |
|------------|----------------------------------|
| Solid paints | `fills`, `strokes` → `.color` |
| Layout | `layoutGap`, `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight` (Plugin API names — verify typings at plan time) |
| Typography | `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` |
| Effects | `effects` bindings where present |

Use a single `collectBoundVariableIds(node)` recursive function; dedupe with `Set<string>`; sort output lexicographically for deterministic handoff docs.

### 3. Auto-layout metadata

From root frame with `layoutMode !== 'NONE'`:

| Contract field | Figma source |
|----------------|--------------|
| `direction` | `layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical'` |
| `gap` | bound variable name for item spacing, else `` `${itemSpacing}px` `` |
| `padding` | combine four paddings — prefer bound names if all bound to same token, else `` `T:${top} R:${right} B:${bottom} L:${left}` `` px |

When root has **no auto-layout**, emit `{ direction: 'vertical', gap: '0', padding: '0' }` as neutral default (document in plan — alternative: omit autoLayout in v2; v1 contract requires object).

### 4. Ticket AC vs naming

AC mentions `Theme/Primary`, `Layout/spacing/3`, `Typography/Body/medium` — these are **illustrative**. Implementation must emit **actual Figma variable names** from the file (`Theme/color/primary/default`, `Layout/space/md`, typography slot paths). Tests should use **bootstrap-complete** or sandbox variable names, not legacy slash shortcuts.

---

## Validated evidence

### Repo inventory

- `src/core/drift/figmaComponent.ts` — `scanBindings` pattern (variable id extraction)
- `src/core/audit/rules/componentBindings.ts` — boundVariables on fills
- `src/core/variables/collections.ts` — `DISPLAY_NAME` for collection prefix
- `packages/contracts/src/handoffContext.v1.ts` — `HandoffAutoLayout`, `tokensUsed: string[]`
- **Greenfield:** `src/core/handoff/tokens.ts`

### Cross-ticket matrix

| Ticket | Relationship |
|--------|--------------|
| WO-034 | Supplies root `SceneNode` per captured frame |
| WO-037 | Merges token lists across frames (union + sort) |
| Drift alias resolution | **Not used** — handoff lists bound variable names, not resolved literals |

---

## Decision log

| ID | Decision | Rationale | Rejected |
|----|----------|-----------|----------|
| D-036-1 | Token strings = `Collection/name/path` | Matches drift keys + designer panel | Raw variable ids |
| D-036-2 | Dedupe + sort tokens | Deterministic markdown | Insertion order |
| D-036-3 | Auto-layout from root only | FR-HAND-4 “root frame” | Per-child layout dump |
| D-036-4 | No value resolution | Ticket out of scope | `resolveTokens()` |

---

## Pre-plan spikes

| Spike | Pass criteria |
|-------|---------------|
| SPK-036-1 | Frame with 3 bound colors → `tokens.length >= 3` includes known sandbox paths |
| SPK-036-2 | Vertical auto-layout frame → `direction: 'vertical'`, gap matches bound `Layout/space/*` or px fallback |

---

## Risk register

| Risk | Mitigation |
|------|------------|
| `getVariableByIdAsync` on deleted var | Skip silently |
| Mixed bound/unbound padding | String fallback with px |
| Performance on deep trees | Same 10-frame cap as WO-034 selection policy |

---

## Recommendations

1. Split pure functions: `collectTokenPaths(node)`, `readAutoLayoutMeta(frame)`.
2. Unit tests with mock nodes carrying `boundVariables` stubs + mock variable registry.
3. Share tree-walk helper with WO-035 (`walkSceneTree(node, visit)`) in `src/core/handoff/walk.ts` to avoid duplication.

---

## Open questions

- **RESOLVED:** Token value resolution out of scope.
- **RESOLVED:** Use canonical collection display names from `DISPLAY_NAME`.
