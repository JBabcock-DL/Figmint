# Extended Variable Collections (EVC) — Research

> **Status:** ✅ Test 1 (plan gate) PASSED on Pro/Org sandbox 2026-05-27 — `extend()` threw `"Cannot create extended collections outside of enterprise plan."` exactly as documented. **Tests 2–4 marked UNTESTED-ON-PLAN** (require Enterprise seat; deferred to a future follow-up ticket per the locked decision 2026-05-27).
> **Date:** 2026-05-27 (research pass); 2026-05-27 (Test 1 verification on Pro/Org).
> **Owner:** Sprint 2 leads (Bootstrap engine architecture); consumed by **CTX-002** (canonical token model).
> **Author:** Research sub-agent for WO-005 (initial); BUILD agent (verification pass).
> **PRD anchors:** §6.1 FR-BOOT-6, §11.5 (Compatibility), §15 (EVC semantics risk row), §16 OQ-1 / OQ-2.

---

## Summary

EVC (Figma's **Extended Variable Collections**, Plugin API v1 Update 121, 2025-11-20; GA in the Figma editor January 2026) **is Enterprise-only at every layer of the surface** — `VariableCollection.extend()` throws on Professional/Organization/Starter files, and the Figma help docs confirm extended collections are gated to the Enterprise plan. This single gating fact dominates every downstream decision:

- EVC **cannot** be the default storage shape for the 5-collection model. Detroit Labs' sandbox / Professional / Organization customers would silently lose the bootstrap if we made EVC mandatory.
- EVC **can** be an opt-in _render-time projection_ layer for Enterprise customers who want multi-brand inheritance. The canonical internal token model (CTX-002) must therefore stay plan-agnostic — it does not need an `extended-from` relationship at the schema level.
- The three Plugin API behaviors WO-005 spikes (mode inheritance, single-value override, override removal) match what the docs document, so the live verification (§7) is a confirmation pass, not a discovery pass. If any of the three fails in the live test, that is a platform regression worth filing back to Figma — not a model-design problem on our side.
- The Theme + Effects + Typography 5-collection model survives as-is. EVC does **not** unlock anything we cannot already do with vanilla `addMode` / `setValueForMode` on the Professional / Organization tiers (those tiers have 10 / 20 modes per collection respectively — comfortably above the 8 Typography modes the Detroit Labs scale needs).

The PRD's §6.1 FR-BOOT-6 ("optionally use EVC") and §15 EVC-semantics risk row both anticipated this conditional outcome. No requirement changes; this research confirms FR-BOOT-6 stays "optional", and adds the **"Enterprise gate"** as the hard constraint to surface in any future EVC code path.

---

## 1. Key Findings

### 1.1 What EVC is

An **Extended Variable Collection (EVC)** is a `VariableCollection` whose modes and variables are _inherited_ from a parent local or library `VariableCollection`. The extension cannot add modes or variables of its own — it can only _override the value of an inherited variable on an inherited mode_. The variable itself only exists in the parent; the extension stores a sparse `variableOverrides` map.

| Concept                        | EVC behavior                                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where variables live           | Only in the parent (root) collection. `variable.variableCollectionId` always points at the root.                                                                                                                                          |
| Mode set on the extension      | **Inherited 1:1** from parent. The extension cannot `addMode`; modes are added on the parent and the extension picks them up automatically.                                                                                               |
| Mode IDs on the extension      | Per-extension, prefixed with the extension's collection ID (e.g. `"VariableCollectionId:1:3/0:1"`). Each carries a `parentModeId` field pointing back at the parent's mode ID.                                                            |
| How to override a value        | `variable.setValueForMode(extendedModeId, value)`. Same call as a regular variable write; the _extension's_ mode ID is what marks it as an override.                                                                                      |
| How to read the resolved value | `variable.valuesByModeForCollectionAsync(extension)` — returns the inherited _or_ overridden value per mode. `variable.valuesByMode` alone only sees parent values.                                                                       |
| How to drop an override        | `variable.removeOverrideForMode(extendedModeId)` (single mode) or `extension.removeOverridesForVariable(variable.id)` (all modes). Reverts to inherited value.                                                                            |
| Plan gate                      | **Enterprise only.** Lower tiers throw on `collection.extend(...)`.                                                                                                                                                                       |
| Chained extension              | Documented as supported via `extendedVariableCollection.rootVariableCollectionId` (described as "node ID of the top-most ancestor"). Listed as part of Update 121 follow-ups. Behavior of nested chains is **PENDING** live verification. |

> **Ticket-language correction:** the WO-005 ticket and the PRD §15 risk row refer to a `removeVariableValueOverride` API. The actual Plugin API names are **`Variable.removeOverrideForMode(extendedModeId)`** and **`ExtendedVariableCollection.removeOverridesForVariable(variableId)`**. Update the WO-005 build agent's notes if it lifts this name from prose.

### 1.2 Full API surface relevant to WO-005

From the Figma Plugin API reference, Update 121 (2025-11-20) and the _Working with Variables_ guide:

```ts
// --- creation ---
const parent: VariableCollection = figma.variables.createVariableCollection('Primitives');

// Local extension (Enterprise only — throws otherwise):
const extended: ExtendedVariableCollection = parent.extend('Brand A');

// Library extension (Enterprise only):
const extended2: ExtendedVariableCollection =
  await figma.variables.extendLibraryCollectionByKeyAsync(libraryCollection.key, 'Brand B');

// --- read inheritance ---
extended.isExtension; // true (readonly)
extended.parentVariableCollectionId; // ID of immediate parent (readonly)
extended.rootVariableCollectionId; // ID of top-most ancestor — supports chained extension
extended.variableIds; // includes inherited variables
extended.modes; // [{ modeId, name, parentModeId }] — inherited
extended.variableOverrides; // { [variableId]: { [extendedModeId]: VariableValue } }

// --- override a single mode's value on an inherited variable ---
const v = await figma.variables.getVariableByIdAsync(extended.variableIds[0]);
v.setValueForMode(extended.modes[0].modeId, { r: 1, g: 0, b: 0, a: 1 });

// --- read the override-aware value map for the extension ---
const values = await v.valuesByModeForCollectionAsync(extended);
//   { 'VariableCollectionId:1:3/0:1': { r: 1, g: 0, b: 0, a: 1 } }

// --- revert overrides ---
v.removeOverrideForMode(extended.modes[0].modeId); // single mode
extended.removeOverridesForVariable(v.id); // all modes for this variable
```

### 1.3 Plan gating (the headline constraint)

| Plan         | Modes per collection    | Extended Variable Collections | Variables overall      |
| ------------ | ----------------------- | ----------------------------- | ---------------------- |
| Starter      | n/a                     | n/a                           | Variables not eligible |
| Professional | up to 10                | ❌ Not available              | ✅                     |
| Organization | up to 20                | ❌ Not available              | ✅                     |
| Enterprise   | Unlimited via extension | ✅ Available                  | ✅                     |

Source: Figma plans & pricing page (2026); Figma Help Center _Modes for variables_; Figma Help Center _Extend a variable collection_.

The Enterprise gating is **enforced at the API**: `VariableCollection.extend()` throws with the exact message `"in extend: Cannot create extended collections outside of enterprise plan."` on lower tiers. This is what the Phase 0 spike must observe in practice.

### 1.4 What EVC does NOT change

- **`createVariableCollection` / `createVariable` / `addMode` / `setValueForMode` / `setVariableCodeSyntax`** all behave exactly as in the legacy `phases/04-step11-push.md` flow — the EVC additions sit on top of the existing surface, they do not replace it.
- **`codeSyntax`** stays per-variable (not per-collection, not per-mode). An EVC does not introduce a per-platform mapping layer. The Theme codeSyntax table still drives WEB / ANDROID / iOS strings for each semantic alias.
- The five-collection structure (Primitives, Theme, Typography, Layout, Effects) is orthogonal to EVC. EVC could express a _multi-brand variant_ of any one collection, but it doesn't replace the collection model.

---

## 2. Mapping EVC onto the 5-collection model

The Detroit Labs 5-collection model (see `DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`) is:

| Collection | Modes               | Contents                                                                   |
| ---------- | ------------------- | -------------------------------------------------------------------------- |
| Primitives | 1 (`Default`)       | Raw color ramps, spacing, radius, elevation, typeface strings, font-weight |
| Theme      | 2 (`Light`, `Dark`) | 54 semantic color aliases into Primitives                                  |
| Typography | 8 (`85` … `200`)    | 15 M3 slots × 4 properties                                                 |
| Layout     | 1 (`Default`)       | spacing + radius aliases into Primitives                                   |
| Effects    | 2 (`Light`, `Dark`) | shadow color + blur aliases into Primitives                                |

The interesting mapping questions:

### 2.1 Theme + Effects as EVC chains (multi-brand)

**Yes, plausible — and the most natural fit for EVC.**

- Build a Primitives **base** collection (Default mode), no extension.
- Build a Theme **base** collection with `Light` and `Dark` modes; aliases point into Primitives by id.
- For a multi-brand Enterprise customer, `theme.extend('Brand A')`, `theme.extend('Brand B')`. The extension inherits both `Light` and `Dark` modes; brand-specific overrides land via `setValueForMode` on the extended mode IDs.
- Same pattern for Effects (Light/Dark base + extension if brand wants different shadow colors).

**Implication:** this is a _render-time projection_ on top of the canonical token model — not a different storage shape. The canonical model still has Theme = 1 collection with 2 modes; the EVC projector reads the canonical model and emits N extensions when the file plan supports it.

### 2.2 Typography's 8 Android-scale modes as base + 7 extensions

**Possible but explicitly the wrong pattern.**

- The 8 Typography modes (`85`/`100`/`110`/`120`/`130`/`150`/`175`/`200`) are mathematically derived from the base (`100`) per the Android-curve formula in `phases/02-steps5-9.md` (`scaleFactor = mode/100`, with a `sqrt(scaleFactor)` damping above 1.3× for large slots). They are **not** seven independent themes the designer maintains by hand.
- EVC is designed for _human-curated overrides_ across themes (per the Figma help docs — "design system authors create a parent collection, then extend it to create an instance for each brand"). Treating computed scale ramps as overrides would (a) lose semantics (these are accessibility scale steps, not brands), (b) make programmatic regeneration awkward (every scale change requires re-overriding seven extensions), and (c) bind us to Enterprise-only for a use case that already works on Professional (10 modes/collection) and Organization (20 modes/collection).
- **Verdict:** Typography stays a single collection with 8 modes. Do _not_ model scale modes as EVC extensions.

### 2.3 Should the 5-collection structure change?

**No.** Even on Enterprise files, EVC does not motivate a structural change. The cleanest mental model is:

> "Five canonical collections + an _optional_ EVC projector that, when the file plan supports it, emits per-brand extensions of Theme and/or Effects."

This keeps:

- Plan-agnostic semantics for the canonical token model (CTX-002).
- One code path for the bootstrap engine — EVC support is a switch on the push engine, not a fork of it.
- The audit checklist (`conventions/14-audit.md`) unchanged for non-Enterprise files; an additional "is `isExtension === true`?" branch is added only when EVC is active.

### 2.4 EVC implication for the canonical token model (for CTX-002 to cite)

> **EVC implication for the canonical internal token model (CTX-002):** The canonical model does **not** need an `extended-from` relationship. EVC is render-time only — a projector that, on Enterprise files, walks the canonical 5-collection model and emits one parent `VariableCollection` plus N `ExtendedVariableCollection`s per brand for Theme and Effects. The canonical model continues to store Theme as a single collection with `Light` and `Dark` modes, plus an optional `themes[]` array of brand identifiers consumed by the projector. Typography's 8 scale modes never become EVC extensions — they are computed from mode `100` per the Android-curve formula and modeled as ordinary modes. Locking EVC into the schema would gate the entire plugin behind Enterprise; keeping EVC as a projection layer preserves Community + Org distribution targets per PRD §13.

---

## 3. Verification plan (PENDING — fill during spike execution)

The spike will run the three live tests below against an Enterprise-tier Figma sandbox file (see §7 risks for plan gating). Each is structured as **the exact Plugin API sequence** the spike will execute, followed by the **expected** outcome and a **PASS/FAIL** slot for the spike runner to populate.

### Test 1 — Inheritance: extended collection inherits modes from parent

**Goal:** confirm that when the parent has multiple modes, the extension reports the same set with distinct mode IDs that map back via `parentModeId`.

**Plugin API sequence:**

```ts
const parent = figma.variables.createVariableCollection('Spike Theme Parent');
parent.renameMode(parent.modes[0].modeId, 'Light');
const darkParentModeId = parent.addMode('Dark');

const extension = parent.extend('Spike Theme Brand A');

const expectedModeNames = new Set(['Light', 'Dark']);
const actualModeNames = new Set(extension.modes.map((m) => m.name));
const parentModeIds = new Set(parent.modes.map((m) => m.modeId));
const allMapBackToParent = extension.modes.every(
  (m) => typeof m.parentModeId === 'string' && parentModeIds.has(m.parentModeId),
);

return {
  test: 'EVC inheritance',
  modesInheritedCount: extension.modes.length, // expected: 2
  modeNamesMatch: [...actualModeNames].every((n) => expectedModeNames.has(n)),
  allParentModeIdsResolve: allMapBackToParent,
  isExtension: extension.isExtension, // expected: true
  parentId: extension.parentVariableCollectionId,
};
```

**Expected:** `modesInheritedCount === 2`, `modeNamesMatch === true`, `allParentModeIdsResolve === true`, `isExtension === true`, `parentId === parent.id`.

**Result (2026-05-27, Pro/Org sandbox `file_key=cVdPraIafWFBRZnzMPhtrW`):**

The full test sequence above could not run end-to-end on this plan tier because the very first call (`parent.extend('Spike Theme Brand A')`) threw before any of the inheritance-checking code paths could execute. The plugin's `runEvcPlanGateTest()` (see `src/spike/pushPrimitives.ts`) wraps the `extend()` call in try/catch and returned:

```
PASS: extend() threw as expected — in extend: Cannot create extended collections outside of enterprise plan.
```

The thrown message matches the §1.3 documented gate string character-for-character. This **confirms the Enterprise-plan gate behaves exactly as the developer docs describe** — which is what Phase 0 needed to lock in for CTX-002. The downstream PASS criteria for this test (inheritance count, mode-name matching, parentId resolution) cannot be verified on a Pro/Org seat and are deferred to a future Enterprise follow-up (see §"Enterprise follow-up — UNTESTED-ON-PLAN parking lot" in `spike-execution-log.md` §7).

**PASS criterion (revised for Pro/Org tier):** `extend()` threw with the documented `"enterprise plan"` substring → **PASS.**

**PASS criterion (Enterprise tier, deferred):** all four booleans `true`, count exactly 2, `parentId` equals the parent's id. **UNTESTED-ON-PLAN.**

---

### Test 2 — Override: extended collection can override a single variable value without breaking the inheritance link

**Goal:** confirm that `setValueForMode` against an _extension's_ mode ID writes only the override (not the parent value).

**Plugin API sequence (assumes Test 1's `parent` + `extension` are in scope):**

```ts
const v = figma.variables.createVariable('spike/color/primary/500', parent, 'COLOR');
const lightParentModeId = parent.modes.find((m) => m.name === 'Light')!.modeId;
const darkParentModeId = parent.modes.find((m) => m.name === 'Dark')!.modeId;
v.setValueForMode(lightParentModeId, { r: 0.2, g: 0.4, b: 0.8, a: 1 });
v.setValueForMode(darkParentModeId, { r: 0.1, g: 0.2, b: 0.4, a: 1 });

const lightExtModeId = extension.modes.find((m) => m.parentModeId === lightParentModeId)!.modeId;
v.setValueForMode(lightExtModeId, { r: 1, g: 0, b: 0, a: 1 });

const parentLight = v.valuesByMode[lightParentModeId];
const extValues = await v.valuesByModeForCollectionAsync(extension);
const overrides = extension.variableOverrides;

return {
  test: 'EVC override',
  parentLightUnchanged:
    parentLight && parentLight.r === 0.2 && parentLight.g === 0.4 && parentLight.b === 0.8,
  extLightIsOverride:
    extValues[lightExtModeId] &&
    extValues[lightExtModeId].r === 1 &&
    extValues[lightExtModeId].g === 0 &&
    extValues[lightExtModeId].b === 0,
  extDarkStillInherited:
    extValues[extension.modes.find((m) => m.parentModeId === darkParentModeId)!.modeId]?.r === 0.1,
  overridesMapHasOnlyLight:
    overrides[v.id] &&
    Object.keys(overrides[v.id]).length === 1 &&
    lightExtModeId in overrides[v.id],
};
```

**Expected:** parent Light value stays `(0.20, 0.40, 0.80)`, extension Light reads `(1, 0, 0)`, extension Dark still inherits `(0.10, 0.20, 0.40)`, `variableOverrides[v.id]` contains exactly one key (the light extension mode ID).

**Result:** **UNTESTED-ON-PLAN** — Pro/Org sandbox blocks `parent.extend()` at the gate (see Test 1 result above). Pre-composed Plugin API sequence preserved here for the future Enterprise-tier follow-up.

**PASS criterion:** all four booleans `true`. **Deferred.**

---

### Test 3 — Revert: `removeOverrideForMode` restores the inherited value

**Goal:** confirm that the override can be removed and the variable falls back to the parent value.

**Plugin API sequence (continues from Test 2):**

```ts
v.removeOverrideForMode(lightExtModeId);
const afterRemoveValues = await v.valuesByModeForCollectionAsync(extension);
const afterRemoveOverrides = extension.variableOverrides;

return {
  test: 'EVC override removal',
  extLightRestored:
    afterRemoveValues[lightExtModeId] &&
    afterRemoveValues[lightExtModeId].r === 0.2 &&
    afterRemoveValues[lightExtModeId].g === 0.4 &&
    afterRemoveValues[lightExtModeId].b === 0.8,
  variableOverridesEmptied:
    !afterRemoveOverrides[v.id] || Object.keys(afterRemoveOverrides[v.id]).length === 0,
};
```

**Expected:** `extLightRestored === true`, and the variable no longer appears in `variableOverrides` (or appears with zero remaining mode entries).

**Result:** **UNTESTED-ON-PLAN** — same plan-gate reason as Tests 1–2. Sequence preserved for the future Enterprise follow-up.

**PASS criterion:** both booleans `true`. **Deferred.**

---

### Test 4 (bonus, low cost) — chained extension via `rootVariableCollectionId`

**Goal:** confirm whether an EVC can itself be extended (Update 121 docs imply yes via `rootVariableCollectionId` describing the "top-most ancestor"; live behavior is undocumented in the Working with Variables guide).

**Plugin API sequence:**

```ts
let chainedOk = false;
let chainedError: string | undefined;
try {
  // extension was created from `parent` in Test 1
  const chained = extension.extend('Spike Theme Brand A — Sub');
  chainedOk =
    chained.isExtension === true &&
    chained.parentVariableCollectionId === extension.id &&
    chained.rootVariableCollectionId === parent.id;
} catch (e: any) {
  chainedError = String(e?.message ?? e);
}

return {
  test: 'EVC chained extension',
  chainedOk,
  chainedError,
};
```

**Expected (provisional):** `chainedOk === true` — supports an extension-of-an-extension chain, with `rootVariableCollectionId` pointing back at the original `parent`. If the API throws, document the message verbatim (it answers an open platform question).

**Result:** **UNTESTED-ON-PLAN** — Pro/Org sandbox blocks `parent.extend()` at the gate; the chain can never be constructed. Sequence preserved for the future Enterprise follow-up. Also tracked as OQ-2 (open platform question) in `plan.md`.

**PASS criterion:** either `chainedOk === true` OR a clean documented error. **Deferred.**

---

## 4. Risks / open platform questions

### 4.1 Enterprise gating is the dominant constraint

The plugin's distribution strategy (PRD §13) targets a Community build (free public listing) and an Org build (private Detroit Labs install). Neither implies the _consuming_ file is on an Enterprise plan. If we wire EVC into the default bootstrap, we silently break the plugin for every non-Enterprise customer. The mitigation is plan detection at runtime — `try { collection.extend('probe'); } catch { /* non-Enterprise */ }` is the only reliable signal; Figma does not expose `figma.plan` or similar.

**Open question:** is there a cleaner plan-detection API than catching the thrown error from `extend()`? **PENDING — verify during spike or via Figma developer support.**

### 4.2 Variables only exist in the parent

`variable.variableCollectionId` always points at the root. This means snapshot-based drift detection (PRD §6.4 FR-DRIFT-1) keyed by `(collectionId, variableName)` still works on EVC files — but the snapshot also has to record per-extension override values separately. The drift model in CTX-002 should anticipate this (one snapshot row per `(extensionId, modeId)` slot in the `variableOverrides` map).

### 4.3 Library-extension flow is more complex than local

`extendLibraryCollectionByKeyAsync(key, name)` requires the parent collection to be a _library_ collection in another file (imported into the current file via team library). This is a different surface than `localCollection.extend(name)`. The WO-005 spike covers the local-extension path; the library-extension path is left as a follow-up — flag it in `spike-runbook.md` §5 as out-of-scope for the spike.

### 4.4 Multi-collection-EVC ordering

If Theme is extended for two brands, and Effects is extended for two brands, and the file also has aliasing across collections (Theme aliases into Primitives by id), do extension overrides still resolve correctly when read by another collection's `valuesByModeForCollectionAsync`? **PENDING** — this is a cross-collection inheritance question the live tests should at least check by setting up one Primitive → one Theme alias → extending Theme.

### 4.5 Performance of `valuesByModeForCollectionAsync`

It is async, suggesting a non-trivial resolve cost. If the audit phase needs to read inherited+overridden values for every variable in an EVC file, that is `400 vars × N extensions × M modes` async calls. Mitigation: read `variableOverrides` as the bulk-read path; only fall back to `valuesByModeForCollectionAsync` when an explicit per-variable resolve is needed. **PENDING** confirmation in the latency benchmark when EVC is enabled.

### 4.6 Mode-limit hard ceilings on lower tiers

| Plan         | Mode ceiling        | Does Detroit Labs Foundations 5-collection model fit?                          |
| ------------ | ------------------- | ------------------------------------------------------------------------------ |
| Professional | 10 modes/collection | ✅ Typography (8) fits; Theme/Effects (2) easy; Primitives/Layout (1) trivial. |
| Organization | 20 modes/collection | ✅ All fit with headroom.                                                      |
| Enterprise   | Unlimited           | ✅                                                                             |

No plan gates _the rest_ of the 5-collection model (only EVC is gated). So a non-Enterprise customer gets the canonical 5-collection bootstrap minus the EVC projection layer — exactly the design.

### 4.7 PRD date drift (minor)

PRD §6.1 FR-BOOT-6 and §11.5 say EVC shipped "Jan 2026". The actual Plugin API ship was **Update 121 on 2025-11-20** (sources: §6 below). The editor-side GA may have happened January 2026 — that's plausible for the help-center docs. This is a cosmetic drift in PRD wording, not a requirement change.

---

## 5. Decision (recommendation for CTX-002 and Sprint 2)

1. **Keep the canonical token model plan-agnostic.** No `extended-from` relationships in the schema.
2. **Treat EVC as a render-time projector**, opt-in via a `themes: string[]` field on the input or a plugin-side feature flag. When the file is Enterprise (detected by probing `extend()`), the projector emits one parent + N `ExtendedVariableCollection`s for Theme and (optionally) Effects.
3. **Wire EVC into the audit checklist** as a new section: "If `extension.isExtension === true`, assert `parentVariableCollectionId` resolves and `variableOverrides` shape matches snapshot."
4. **Defer library-extension support to Sprint 4+**, after the in-file local-extension path is proven and audited.
5. **Add a "plan detector" helper** (`src/core/variables/detectPlan.ts`) — wraps the `extend()` probe and exposes `isEnterprise(): Promise<boolean>` for the bootstrap engine. Until that helper lands, the engine assumes non-Enterprise and skips the EVC path.

---

## 6. Sources

- Figma Developer Docs — **Working with Variables** (full guide), https://developers.figma.com/docs/plugins/working-with-variables/ (fetched 2026-05-27)
- Figma Developer Docs — **ExtendedVariableCollection**, https://developers.figma.com/docs/plugins/api/ExtendedVariableCollection/ (fetched 2026-05-27)
- Figma Developer Docs — **VariableCollection**, https://developers.figma.com/docs/plugins/api/VariableCollection/ (fetched 2026-05-27)
- Figma Developer Docs — **Variable**, https://developers.figma.com/docs/plugins/api/Variable/ (fetched 2026-05-27)
- Figma Developer Docs — **figma.variables (namespace)**, https://developers.figma.com/docs/plugins/api/figma-variables/ (fetched 2026-05-27)
- Figma Developer Docs — **Version 1, Update 121** (2025-11-20 changelog introducing EVC), https://developers.figma.com/docs/plugins/updates/2025/11/20/version-1-update-121/ (fetched 2026-05-27)
- Figma Developer Docs — **setVariableCodeSyntax**, https://developers.figma.com/docs/plugins/api/properties/Variable-setvariablecodesyntax/ (fetched 2026-05-27)
- Figma Developer Docs — **CodeSyntaxPlatform**, https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/ (fetched 2026-05-27)
- Figma Help Center — **Extend a variable collection**, https://help.figma.com/hc/en-us/articles/36346281624471-Extend-a-variable-collection (fetched 2026-05-27)
- Figma Help Center — **Modes for variables** (per-plan mode limits), https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables (fetched 2026-05-27)
- Figma Help Center — **Figma plans and features**, https://help.figma.com/hc/en-us/articles/360040328273-Figma-plans-and-features (fetched 2026-05-27)
- Figma — **Plans & Pricing** (mode caps + EVC tier gating), https://www.figma.com/pricing/ (fetched 2026-05-27)
- UX Collective / Allie Paschal — **What do Figma's updates mean for Design Systems?** (third-party summary of the Nov 2025 mode-limit + EVC changes), https://uxdesign.cc/what-do-figmas-updates-mean-for-design-systems-323fb0cc8495 (fetched 2026-05-27)
- Internal: `Docs/PRD.md` §6.1, §11.5, §13, §15, §16
- Internal: `Docs/lift-sources.md` §0 (drift corrections), §3 (bundle sizes)
- Internal: `DesignOps-plugin/skills/create-design-system/conventions/01-collections.md` (5-collection structure)
- Internal: `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` (legacy MCP+REST push sequence)
- Internal: `DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md` (per-collection variable lists)
