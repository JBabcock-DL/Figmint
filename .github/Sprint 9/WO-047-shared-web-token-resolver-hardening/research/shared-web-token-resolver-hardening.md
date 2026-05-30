# Shared web token resolver hardening (WO-047)

> **Status:** ✅ Research expanded for `/plan` (2026-05-30)
> **PRD:** §6.9 FR-CONF-*, §6.3 FR-IMP-5 (bindings), §12 Phase 4b shared resolver
> **Dependencies:** WO-042 (Completed), WO-045, WO-046 (define CSS edge cases)

---

## Summary

WO-047 generalizes the **WO-042 Tailwind class → variable path resolver** into a **web-family facade** at `src/core/import/shared/webTokenResolver.ts` that serves React (unchanged behavior), Vue (`<style scoped>` blocks), and Web Components (Shadow DOM / `:host` CSS). React continues using **class fragment** resolution; Vue and WC add **CSS custom property** and **scoped selector** extraction paths feeding the same `ComponentSpecV1.bindings[]` output.

**Locked recommendation:** Keep **`createTokenResolver`** / **`tokenResolver/`** directory as the Tailwind implementation — do not rename. Add **`createWebTokenResolver(options)`** that composes:

1. **Class resolver** — delegates to existing `createTokenResolver` (React + Vue template classes)
2. **Stylesheet resolver** — parses CSS text for `var(--*)`, `:host`, `[data-v-xxx]` scoped rules, and CEM `cssProperties`

Single **`TokenResolver` interface** unchanged (WO-039). Framework hint selects which strategies run during binding extraction.

**Build order:** After WO-045 and WO-046 land (need fixtures for scoped/shadow CSS).

---

## Requirement traceability

| Req / AC | Research finding | Plan target |
| -------- | ---------------- | ----------- |
| R1 Extract to `webTokenResolver.ts` | Facade over existing module | New file + re-exports |
| R2 Vue `<style scoped>` | Parse scoped CSS + data-v attribute correlation | `parseScopedVueStyles.ts` |
| R3 WC Shadow DOM CSS | `:host`, `::part`, custom properties | `parseShadowStyles.ts` |
| R4 Per-framework override | `WebTokenResolverOptions.framework` | Config hook |
| AC Vue scoped resolves tokens | Unit test with scoped block | `vue-scoped-resolver.test.ts` |
| AC WC shadow resolves tokens | Unit test with `:host` vars | `wc-shadow-resolver.test.ts` |
| AC React regression | Existing WO-041/042 tests green | CI gate |

---

## Key findings

### 1. Current state (WO-042 — validated in repo)

| Path | Role |
| ---- | ---- |
| `src/core/import/shared/tokenResolver.ts` | Public API: `createTokenResolver`, async variants |
| `src/core/import/shared/tokenResolver/*` | Tailwind v3/v4, CSS theme, detection, cache |
| `src/core/import/templates/react/extractBindings.ts` | Class tokens → bindings (React-only location today) |
| `src/core/import/templates/react/tokenToSelector.ts` | Selector mapping for utilities |

**React path today:** collect Tailwind classes from JSX → `tokenResolver.resolve('bg-primary')` → binding `{ selector: 'root.fill', variable: 'theme/color/primary/default' }`.

### 2. Gap analysis by framework

| Framework | Token surface | WO-042 coverage | WO-047 addition |
| --------- | ------------- | --------------- | --------------- |
| React | Tailwind `className` | ✅ Full MVP | None (regression only) |
| Vue | Template `class` + `:class` | ✅ Same class resolver | Scoped `<style>` `var(--x)` + `.class[data-v-id]` |
| WC | `:host` CSS, `cssProperties` in CEM | ⚠️ partial | Shadow stylesheet `var(--*)` → variable paths |

### 3. Proposed module layout

```
src/core/import/shared/
  tokenResolver.ts          # unchanged public Tailwind API
  tokenResolver/              # unchanged implementation
  webTokenResolver.ts         # NEW facade
  webTokenResolver/
    types.ts
    composeResolver.ts        # merges class + CSS strategies
    parseScopedVueStyles.ts   # scoped block → rules
    parseShadowStyles.ts      # :host, ::part, var()
    cssVarToVariablePath.ts   # --color-primary → theme/color/primary/default
    extractWebBindings.ts     # unified binding extraction (moved from react/)
```

### 4. Vue scoped styles — mechanics

Vue SFC compiler adds **`data-v-{hash}`** attribute to template elements when `<style scoped>` present.

Example:

```vue
<template>
  <button class="btn primary">Click</button>
</template>
<style scoped>
.btn { background: var(--color-primary); }
.primary { color: var(--color-primary-foreground); }
</style>
```

**Research-validated approach:**

1. **Class tokens from template** — still resolved via Tailwind resolver (unchanged WO-045 path).
2. **Scoped CSS block** — parse with lightweight CSS parser (no PostCSS in plugin — use regex + brace scanner MVP, or **`css-tree`** if bundle acceptable).
3. Map `.btn` rule → selector `root.fill` when rule contains `background` + `var(--color-primary)`.
4. **`cssVarToVariablePath`** traces `--color-primary` through repo `tokens.css` / Tailwind theme (reuse `cssThemeReader.ts`).

**data-v hash:** not needed for binding **variable** identity — only for disambiguating scoped selectors when multiple classes collide across components (same as Vue runtime).

### 5. Web Components Shadow DOM CSS

Typical Lit pattern:

```css
:host {
  display: inline-flex;
  background: var(--ds-button-bg, var(--color-primary));
}
:host([disabled]) {
  opacity: 0.5;
}
```

**Mapping:**

| CSS construct | Binding selector | Notes |
| ------------- | ---------------- | ----- |
| `:host { background: var(--x) }` | `root.fill` | Primary surface |
| `:host { border-radius: var(--x) }` | `root.radius` | |
| `:host { padding: var(--x) }` | `root.padding` | |
| `:host { gap: var(--x) }` | `root.gap` | |
| `::part(label) { color: var(--x) }` | `text/label.fill` | If part name matches |
| CEM `cssProperties[].name` | direct map | `--ds-button-bg` → lookup table |

**CEM integration (WO-046):** pass `cssProperties[]` into resolver as **manualMap** entries (`--ds-button-bg` → variable path).

### 6. Unified `extractWebBindings` API

```typescript
export interface ExtractWebBindingsInput {
  framework: 'react' | 'vue' | 'wc';
  classTokens: string[];
  stylesheetText?: string;      // Vue scoped or WC shadow CSS
  cssCustomProperties?: string[]; // from CEM
  tokenResolver: TokenResolver;   // Tailwind class resolver
  cssVarResolver?: CssVarResolver; // optional trace through theme
}

export function extractWebBindings(input: ExtractWebBindingsInput): ExtractBindingsResult;
```

Move **`extractBindings`** from `react/extractBindings.ts` → shared; React template calls with `framework: 'react'`, classes only.

### 7. `createWebTokenResolver` facade

```typescript
export interface WebTokenResolverOptions extends TokenResolverOptions {
  framework?: 'react' | 'vue' | 'wc';
  /** Extra CSS custom property → variable path (CEM, manual) */
  cssVarMap?: Record<string, string>;
}

export function createWebTokenResolver(options: WebTokenResolverOptions): TokenResolver {
  const classResolver = createTokenResolver(options);
  // TokenResolver.resolve for bare class tokens delegates to classResolver
  // CSS var tokens (--foo) checked in cssVarMap first
  return composeResolver(classResolver, options.cssVarMap);
}
```

**React import path:** swap `createTokenResolver` → `createWebTokenResolver({ framework: 'react' })` — behavior identical when no stylesheet passed.

### 8. Per-framework configuration override (R4)

Settings override (FR-CONF-3) already stores **class → variable** manual map. Extend storage schema (separate key — avoid breaking WO-042 cache):

```typescript
interface WebResolverOverride {
  classMap?: Record<string, string>;
  cssVarMap?: Record<string, string>; // "--color-primary" → "theme/color/primary/default"
}
```

Persist at `fighub:web-token-resolver:{normalizedRepoUrl}` in clientStorage.

### 9. Regression guard for React (AC)

**Mandatory test suite:** run full existing suite:

- `tests/unit/core/import/templates/react/*`
- `tests/unit/core/import/shared/tokenResolver/*`

No changes to Tailwind detection priority (FR-CONF-2).

---

## Validated evidence

### Repo citations

- `createTokenResolver` — `src/core/import/shared/tokenResolver.ts` lines 103–123
- `extractBindings` — `src/core/import/templates/react/extractBindings.ts`
- `cssThemeReader` — `src/core/import/shared/tokenResolver/cssThemeReader.ts` (reuse for var tracing)
- `normalizeResolverVariablePath` — shared slash-path normalization

### Cross-ticket matrix

| Ticket | Produces for WO-047 | Consumes from WO-047 |
| ------ | ------------------- | -------------------- |
| WO-045 | Vue SFC with scoped style fixture | `extractWebBindings` in Vue parse |
| WO-046 | CEM cssProperties + inline CSS text | `cssVarMap` seeding |
| WO-041 | React parse pipeline | Shared extractWebBindings |
| WO-042 | Tailwind resolver core | Unchanged delegation |

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D1 | Facade file `webTokenResolver.ts` | Ticket requirement; keeps WO-042 intact | Rename tokenResolver.ts |
| D2 | Regex CSS parser MVP | No PostCSS dependency / bundle cost | Full PostCSS |
| D3 | React uses same extractWebBindings | Single code path | Keep react-only extractBindings |
| D4 | cssVarMap separate from classMap | Different key namespaces | Single flat map |
| D5 | Build after WO-045/046 | Need real fixtures | Parallel build (risky interface drift) |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-047-1 | Vue fixture: scoped style → binding | `root.fill` variable resolved | ☐ after WO-045 fixture |
| SPK-047-2 | WC fixture: `:host` var → binding | Same | ☐ after WO-046 fixture |
| SPK-047-3 | React regression | All existing import tests green | ☐ build |

---

## Risk register

| Risk | Sev | Likelihood | Mitigation |
| ---- | --- | ---------- | ---------- |
| CSS parser false positives | M | M | Conservative regex; unit tests per fixture |
| Bundle size if css-tree added | M | L | Start regex-only; spike css-tree only if needed |
| Duplicate bindings class + CSS | L | M | Dedupe by selector+variable key (existing pattern) |
| Interface churn with parallel 045/046 | M | M | Lock `extractWebBindings` signature in WO-045 plan |

---

## Recommendations

1. **Plan WO-047 last** — after WO-045/046 plans lock fixture shapes.
2. WO-045 plan should **define `extractWebBindings` signature** even if implementation lands in WO-047 Phase 1.
3. Reuse **`cssThemeReader`** for tracing `var(--color-primary)` chains.
4. Add **integration test** that runs React button import before/after refactor with identical spec snapshot.
5. Document **limitations** in parse issues: `@apply`, nested selectors, `:deep()` deferred.

---

## Open questions

| Q | Status | Owner |
| - | ------ | ----- |
| Add `css-tree` dependency? | **RESOLVED** — regex MVP first; spike if insufficient | Build |
| Merge web override storage with WO-042 cache? | **RESOLVED** — separate storage key | WO-047 |
| Who moves extractBindings to shared/? | **RESOLVED** — WO-047 owns move; WO-045 calls shared stub or duplicate thin wrapper | Planner |

---

## References

- WO-042 research — `.github/Sprint 8/WO-042-…/research/token-resolver-tailwind-css-vars.md`
- PRD §6.9 FR-CONF — `Docs/PRD.md`
- Vue scoped CSS — https://vuejs.org/api/sfc-css-features.html#scoped-css
- Sprint 9 index — [sprint-9-research-index.md](../../research/sprint-9-research-index.md)
