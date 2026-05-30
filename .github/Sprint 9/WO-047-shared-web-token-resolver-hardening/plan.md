# Plan — WO-047: Shared web token resolver hardening

## Approach

Generalize WO-042's **Tailwind class → variable** resolver into a **web-family binding pipeline** without breaking React. Add **`createWebTokenResolver`** facade in `src/core/import/shared/webTokenResolver.ts` that delegates class fragments to existing **`createTokenResolver`**, and implement **`extractWebBindings`** in shared code (moved from React) with optional **stylesheet** and **CEM cssProperties** inputs for Vue scoped CSS and WC `:host` rules.

Settings gains a separate **`cssVarMap`** override in clientStorage (distinct from WO-042 class manual map). React import path switches to shared extractor with **zero behavior change** — enforced by existing golden tests.

**Build after WO-045 and WO-046** — requires Vue scoped fixture and WC CEM cssProperties fixture from those tickets.

**In scope:** `webTokenResolver.ts`, shared `extractWebBindings`, scoped/shadow CSS MVP parser, Settings storage extension, regression tests.

**Out of scope (ticket verbatim):** native platform resolvers (Sprint 10); PostCSS; `@apply` / `:deep()` full support.

---

## Acceptance criteria traceability

| Ticket AC / requirement | Plan steps |
| ----------------------- | ---------- |
| R1 `webTokenResolver.ts` facade | Steps 1–3 |
| R2 shared `extractWebBindings` | Steps 4–6 |
| R3 Vue scoped styles | Steps 7–9, 15 |
| R4 WC shadow / CEM cssProperties | Steps 10–12, 16 |
| R5 cssVarMap Settings override | Steps 13–14 |
| R6 React regression | Steps 17–18 |
| AC Vue scoped resolves tokens | Step 15 |
| AC WC shadow resolves tokens | Step 16 |
| AC React still passes | Step 17 |

---

## Module tree

```
src/core/import/shared/
  webTokenResolver.ts
  webTokenResolver/
    types.ts
    composeResolver.ts
    parseCssVarDeclarations.ts      # regex MVP
    parseScopedVueStyles.ts
    parseShadowHostStyles.ts
    cssVarToVariablePath.ts
  extractWebBindings.ts             # canonical (react/ forwarder removed)

src/io/github/
  webTokenResolverStorage.ts

src/ui/tabs/Settings.tsx            # cssVarMap JSON textarea (extend Connected Repo)

tests/fixtures/vue/
  Button-scoped.vue                 # extends WO-045 fixture with scoped var(--)

tests/fixtures/wc/
  ds-button-shadow.css              # :host { background: var(--color-primary) }

tests/unit/core/import/shared/
  extractWebBindings.test.ts
  parseScopedVueStyles.test.ts
  parseShadowHostStyles.test.ts
  webTokenResolver.test.ts
  cssVarToVariablePath.test.ts

tests/unit/core/import/templates/
  react.parseButton.test.ts         # must stay green (regression)
```

---

## Steps

- [ ] **Step 1** — Create `src/core/import/shared/webTokenResolver/types.ts`:

```typescript
export type WebFramework = 'react' | 'vue' | 'wc';

export interface WebTokenResolverOptions {
  repoUrl: string;
  framework?: WebFramework;
  manualMap?: Record<string, string>;
  cssVarMap?: Record<string, string>;
  classToVariable?: Record<string, string>;
  fetchText?: TokenResolverFetchText;
  designTokensPath?: string;
  repoPaths?: readonly string[];
  disableCache?: boolean;
}

export interface ExtractWebBindingsInput {
  framework: WebFramework;
  classTokens: string[];
  stylesheetText?: string;
  cssCustomPropertyNames?: string[];
  tokenResolver: TokenResolver;
  cssVarMap?: Record<string, string>;
}
```

**Done when:** types compile.

- [ ] **Step 2** — Implement `src/core/import/shared/webTokenResolver/composeResolver.ts`:

```typescript
export function createWebTokenResolver(options: WebTokenResolverOptions): TokenResolver;
```

Behavior:

- `resolve('bg-primary')` → delegate to inner `createTokenResolver`
- `resolve('--color-primary')` → lookup `cssVarMap` then theme trace

**Done when:** unit test — class token unchanged vs WO-042; css var maps correctly.

- [ ] **Step 3** — Export from `src/core/import/shared/webTokenResolver.ts` re-exporting WO-042 public API unchanged + new factory.

**Done when:** `import { createTokenResolver, createWebTokenResolver } from '@/core/import/shared/webTokenResolver'` works OR keep `tokenResolver.ts` as re-export barrel (document chosen layout in Notes).

- [ ] **Step 4** — If WO-045 did not land Step 7, move `extractBindings` from `react/extractBindings.ts` to `src/core/import/shared/extractWebBindings.ts`. If already moved, extend in place.

Rename export to `extractWebBindings(input: ExtractWebBindingsInput)`.

**Done when:** React path calls with `{ framework: 'react', classTokens, tokenResolver }` only.

- [ ] **Step 5** — Implement `src/core/import/shared/webTokenResolver/cssVarToVariablePath.ts`:

```typescript
export function cssVarToVariablePath(
  varName: string,
  themeVars: Record<string, string>,
): string | null;
```

Trace `--color-primary` → `theme/color/primary/default` using same semantic table as WO-042 `semanticColorMap.ts`.

**Done when:** unit test maps primary token.

- [ ] **Step 6** — Implement `src/core/import/shared/webTokenResolver/parseCssVarDeclarations.ts`:

Regex/brace scanner extracting `{ property: value }` pairs from CSS text; detect `var(--name)` in values.

**Done when:** parses `:host { background: var(--color-primary); }`.

- [ ] **Step 7** — Implement `src/core/import/shared/webTokenResolver/parseScopedVueStyles.ts`:

```typescript
export function extractBindingsFromScopedVueStyles(input: {
  cssText: string;
  cssVarMap: Record<string, string>;
  cssVarToPath: typeof cssVarToVariablePath;
}): ComponentSpecBinding[];
```

Map `background` → `root.fill`, `color` on `.label` → `text/label.fill` (heuristic table mirrors `tokenToSelector.ts`).

**Done when:** scoped fixture produces `root.fill` binding.

- [ ] **Step 8** — Implement `src/core/import/shared/webTokenResolver/parseShadowHostStyles.ts`:

Same as Step 7 but targets `:host` and `:host([disabled])` selectors.

**Done when:** WC shadow fixture binding extracted.

- [ ] **Step 9** — Wire stylesheet branch inside `extractWebBindings`:

After class-token loop, if `stylesheetText` provided:

- `framework === 'vue'` → `parseScopedVueStyles`
- `framework === 'wc'` → `parseShadowHostStyles`

Dedupe bindings by `selector + variable` key (existing pattern).

**Done when:** combined class + CSS bindings in one result.

- [ ] **Step 10** — CEM `cssProperties` path: when `cssCustomPropertyNames` provided, for each `--ds-*` lookup `cssVarMap` / theme trace → binding.

**Done when:** test with `--ds-button-bg` maps when manual map present.

- [ ] **Step 11** — Integrate `cssThemeReader` for var tracing when `fetchText` available (optional async helper `buildCssVarMapFromTheme`).

**Done when:** unit test with fixture `globals.css` `@theme` block.

- [ ] **Step 12** — Update `parseWebComponent.ts` (WO-046) to pass `cssCustomPropertyNames` from CEM into `extractWebBindings`.

**Done when:** WC parse uses shared extractor (coordinate merge with WO-046).

- [ ] **Step 13** — Implement `src/io/github/webTokenResolverStorage.ts`:

```typescript
export interface StoredWebResolverOverride {
  classMap?: Record<string, string>;
  cssVarMap?: Record<string, string>;
  updatedAt: string;
}

export function webTokenResolverOverrideKey(repoUrl: string): string;
// key: 'fighub:web-token-resolver-override:' + normalizeRepoUrl
```

Load/save separate from `tokenResolverOverrideKey`.

**Done when:** round-trip clientStorage test with mock figma.

- [ ] **Step 14** — Extend `src/ui/tabs/Settings.tsx` Connected Repo section:

- Label: **CSS variable overrides (optional)**
- Textarea JSON `{ "--color-primary": "theme/color/primary/default" }`
- Persist via `webTokenResolverStorage`
- Merge: class map continues using existing WO-042 override UI (do not break)

**Done when:** Settings unit test saves cssVarMap.

- [ ] **Step 15** — Update `parseVueComponent.ts` (WO-045):

Pass scoped style block content from SFC descriptor into `extractWebBindings({ framework: 'vue', stylesheetText: scopedCss })`.

Create `tests/fixtures/vue/Button-scoped.vue` with `var(--color-primary)` in scoped block.

**Done when:** AC Vue scoped resolves tokens — test `vue-scoped-bindings.test.ts`.

- [ ] **Step 16** — WC integration test with `:host` CSS + CEM cssProperties.

**Done when:** AC WC shadow resolves tokens.

- [ ] **Step 17** — React regression gate:

```bash
npm run test -- tests/unit/core/import/templates/react.parseButton.test.ts
npm run test -- tests/unit/core/import/shared/tokenResolver
```

Switch React `parseReactComponent` to `extractWebBindings({ framework: 'react', … })`.

**Done when:** golden test byte-identical bindings; AC React regression satisfied.

- [ ] **Step 18** — Full import shared suite:

```bash
npm run test -- tests/unit/core/import/shared tests/unit/core/import/templates
npm run build
```

**Done when:** CI green.

- [ ] **Step 19** — Document limitations in parse `issues`:

Codes: `css-nested-selector-unsupported`, `apply-directive-unsupported` when `@apply` or `:deep()` detected.

**Done when:** warning issues emitted, not errors.

---

## Build Agents

### Phase 1 (parallel — after WO-045 + WO-046 merged)

- `code-build` — **Steps 1–3:** webTokenResolver facade + composeResolver
- `code-build` — **Steps 5–6:** cssVarToVariablePath + CSS parser MVP

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 4, 7–9:** extractWebBindings + scoped/shadow parsers
- `code-build` — **Steps 13–14:** storage + Settings UI

### Phase 3 (parallel, after Phase 2)

- `code-build` — **Steps 10–12:** CEM cssProperties + theme trace + WC integration
- `code-build` — **Steps 15–16:** Vue/WC fixture binding tests

### Phase 4 (sequential, after Phase 3)

- `code-build` — **Steps 17–19:** React regression + CI + limitation warnings

---

## Dependencies & Tools

| Dependency | Status | Usage |
| ---------- | ------ | ----- |
| WO-042 tokenResolver | ✅ | Delegated class resolution |
| WO-045 Vue parse + scoped fixture | required | Step 15 |
| WO-046 WC parse + CEM cssProperties | required | Steps 12, 16 |
| WO-042 cssThemeReader | ✅ | Var tracing |
| figma.clientStorage | ✅ | Override persistence |

---

## Open Questions

| Q | Status |
| - | ------ |
| Single Settings textarea vs two? | **RESOLVED** — separate cssVarMap textarea |
| Replace createTokenResolver calls globally? | **RESOLVED** — React/Vue/WC parse use extractWebBindings; class resolver unchanged |
| css-tree dependency? | **RESOLVED** — regex MVP; spike css-tree only if regex fails SPK-047 |

---

## Notes

- Research: [shared-web-token-resolver-hardening.md](./research/shared-web-token-resolver-hardening.md)
- Do **not** modify Tailwind detection priority (FR-CONF-2)
- WO-042 `tokenResolver.ts` remains source of truth for class maps — facade only
- Ticket: `./ticket.md`
