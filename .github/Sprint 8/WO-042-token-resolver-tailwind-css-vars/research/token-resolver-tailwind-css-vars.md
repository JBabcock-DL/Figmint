# Token resolver — Tailwind + CSS vars (WO-042)

> **Status:** ✅ Research expanded for `/plan` (2026-05-29)
> **PRD:** §6.9 FR-CONF-1..5, §6.3 FR-IMP-5
> **Dependencies:** WO-016, WO-039 `TokenResolver` interface

---

## Summary

WO-042 implements **`createTokenResolver(repoUrl, options)`** returning a **`TokenResolver`** that maps Tailwind utility fragments (e.g. `bg-primary`, `text-muted-foreground`) to **FigHub variable slash paths** for `ComponentSpecV1.bindings[].variable`. Detection follows FR-CONF-2 priority; Settings stores **manual override map** per repo (FR-CONF-3/4).

**Locked recommendation:** MVP ships **Tailwind v3 `theme.extend` reader** + **Tailwind v4 `@theme inline` CSS reader** via GitHub file fetch; Style Dictionary / Tokens Studio detectors return `{ detected: false }` until file found. Cache parsed config in **`figma.clientStorage`** under key `fighub:token-resolver:{normalizedRepoUrl}` with `{ configSha, map }`.

---

## Requirement traceability

| AC / FR | Test / implementation |
| ------- | --------------------- |
| AC `bg-primary` → Theme variable | `tailwind.v4.theme.test.ts` |
| AC `bg-mystery` → unresolved | `resolver.unresolved.test.ts` |
| AC v3/v4 auto-detect | `detectSources.test.ts` with fixture configs |
| AC manual override wins | Settings JSON merge test |
| FR-CONF-4 per-repo cache | `storage.ts` pattern mirror |

---

## Key findings

### 1. Resolver public API (WO-039 interface)

```typescript
export interface TokenResolverOptions {
  repoUrl: string;
  /** Merged from Settings — class fragment → variable path */
  manualMap?: Record<string, string>;
  /** Pre-loaded design tokens for semantic alias (optional) */
  designTokensPath?: string;
}

export function createTokenResolver(options: TokenResolverOptions): TokenResolver;

// TokenResolver.resolve('bg-primary') →
// { ok: true, variable: 'theme/color/primary/default' }
// or { ok: false, reason: 'unresolved' }
```

**Class fragment normalization:** strip responsive/state prefixes for MVP (`sm:`, `hover:`, `dark:`) — resolve base token only; document limitation.

### 2. Detection priority (FR-CONF-2)

| Priority | File patterns | Parser module |
| -------- | ------------- | ------------- |
| 1 | `tailwind.config.{js,ts,mjs,cjs}`, `tailwind.config.*` | `tailwindConfigReader.ts` |
| 2 | `**/tokens.css`, `**/globals.css`, `src/app/globals.css` | `cssThemeReader.ts` |
| 3 | `style-dictionary.config.{js,json}` | `styleDictionaryReader.ts` (stub → not detected) |
| 4 | `tokens.json`, `design/tokens.json` (Tokens Studio export) | `tokensStudioReader.ts` (stub) |

**Fetch path:** reuse `loadFromGitHub(repoUrl, path)` (`src/io/sources/github.ts`) + `isSafeRepoPath`.

**Discovery:** try known paths in order; first successful parse wins unless manual override disables auto.

### 3. Tailwind v4 `@theme` example

Consumer CSS (common in shadcn v4):

```css
@theme inline {
  --color-primary: var(--theme-primary);
  --theme-primary: oklch(...);
}
```

**Mapping logic:**

1. Parse `--color-{name}` entries from `@theme` block.
2. `bg-primary` → lookup `--color-primary` → trace to semantic name `primary`.
3. Map semantic color to FigHub path via table:

| Tailwind semantic | Default FigHub binding variable |
| ----------------- | ------------------------------- |
| `primary` | `theme/color/primary/default` |
| `muted` | `theme/color/muted/default` |
| `destructive` | `theme/color/destructive/default` |

Table loaded from **`design/tokens.json`** theme section when available (this repo's `design/tokens.json` is reference).

### 4. Tailwind v3 `theme.extend`

```javascript
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: 'hsl(var(--primary))' },
    },
  },
}
```

Map `bg-primary` → `--primary` CSS var → same semantic table.

### 5. Settings UI extension (FR-CONF-3)

Extend **`src/ui/tabs/Settings.tsx`** Connected Repo section:

- **Token resolver override** — JSON textarea `{ "bg-primary": "theme/color/primary/default" }`
- **Detection status** — read-only label: "Detected: Tailwind v4 (@theme in globals.css)"

Persist in `clientStorage` via new helper `src/io/github/tokenResolverStorage.ts` keyed by `normalizeRepoUrl(repoUrl)`.

**Note:** `ResolvedFigHubConfig` today has no resolver field — store override in separate storage key (avoid `fighub.json` schema bump in WO-042).

### 6. AC variable path format

Ticket AC says `{ variable: 'Theme/Primary' }` — **normalize to slash paths** used in specs:

```json
{ "selector": "root.fill", "variable": "color/primary/default" }
```

(from `component-spec-button-canonical.json` — theme semantic without `theme/` prefix in binding storage; align with **`resolveBindingTarget.ts`** expectations — **plan step must read** `src/core/components/scaffold/resolveBindingTarget.ts` and lock one convention).

---

## Validated evidence

| Path | Role |
| ---- | ---- |
| `src/io/github/storage.ts` | clientStorage patterns, `normalizeRepoUrl` |
| `src/io/sources/github.ts:7-18` | `isSafeRepoPath` |
| `design/tokens.json` | Reference token paths |
| `src/ui/tabs/Settings.tsx` | Settings host for override UI |

**Docs:**

- Tailwind v4 theme: https://tailwindcss.com/docs/theme (2026-05-29)
- Tailwind v3 theme: https://v3.tailwindcss.com/docs/theme (2026-05-29)

---

## Module tree

```
src/core/import/shared/
  tokenResolver.ts           # createTokenResolver + interface
  tokenResolver/
    detectSources.ts
    tailwindConfigReader.ts
    cssThemeReader.ts
    semanticColorMap.ts
    cache.ts
src/io/github/
  tokenResolverStorage.ts

tests/fixtures/token-resolver/
  tailwind.v4.globals.css
  tailwind.v3.config.js
tests/unit/core/import/shared/tokenResolver/
  *.test.ts
```

---

## Decision log

| ID | Decision | Rationale |
| -- | -------- | --------- |
| D1 | Separate storage key for override | Avoid FigHubJsonV1 schema change |
| D2 | MVP: solid colors only | Skip `bg-primary/50` opacity syntax → unresolved |
| D3 | Invalidate cache on manual edit | Clear cache when override saves |
| D4 | Share tree walker with WO-056 later | Optional refactor post-MVP |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass | Status |
| -------- | --------- | ---- | ------ |
| SPK-042-1 | Fixture v4 CSS → resolve `bg-primary` | ok + correct variable | ☐ |
| SPK-042-2 | Override map beats auto-detect | manual wins | ☐ |
| SPK-042-3 | Lock variable path convention (see §6 below) | doc in plan | ✅ **resolved 2026-05-29** |

---

## 6. Binding variable path convention (SPK-042-3 — resolved)

**Correction:** `resolveBindingTarget.ts` resolves **node selectors** (`text/label.fill`), not token paths. Variable path convention lives in **`normalizeVariablePath`** (`src/core/components/scaffold/selector.ts:97-104`) and **`applyBindings.ts`**.

**Locked format for `ComponentSpecV1.bindings[].variable`:**

| Rule | Example |
| ---- | ------- |
| Slash-separated canonical path, **no** `var/` prefix | `color/primary/default` |
| Matches Figma local variable `.name` after bootstrap | same string as `VariablePathMap` key |
| Optional collection prefix stripped at apply | `Theme/color/primary/default` → `color/primary/default` |
| Collections recognized: Primitives, Theme, Typography, Layout, Effects | regex in `normalizeVariablePath` |

**Canonical fixture evidence** (`tests/fixtures/component-spec-button-canonical.json`):

```json
{ "selector": "root.fill", "variable": "color/primary/default" }
{ "selector": "root.radius", "variable": "radius/md" }
{ "selector": "root.padding", "variable": "space/md" }
```

**WO-042 resolver output contract:**

```typescript
// TokenResolver.resolve() must return paths in this shape:
{ ok: true, variable: 'color/primary/default' }  // NOT 'bg-primary', NOT 'var/Theme/...'
```

**Tailwind → canonical mapping strategy:**

1. Resolve class to CSS custom property (e.g. `--primary` from `@theme`).
2. Map CSS var name → design token key via `design/tokens.json` or fighub.json override table.
3. Emit canonical slash path used in bootstrap variable names (`color/primary/default`, `space/md`, etc.).

**Plan implication:** WO-042 ships a **`tailwindToCanonicalPath`** lookup table seeded from repo `design/tokens.json` + Theme collection naming from WO-016 bootstrap; Settings override merges on top.

---

## Risk register

| Risk | Mitigation |
| ---- | ---------- |
| Binding path convention mismatch | Resolved — emit canonical slash paths (§6); optional `Theme/` prefix stripped at apply |
| `@tailwindcss/vite` v4 no JS config | CSS `@theme` path sufficient |
| Large globals.css parse | Regex block extract, not full CSS parser |

---

## Recommendations for `/plan`

1. Implement **`cssThemeReader`** before v3 JS config (FigHub repo uses modern stack).
2. Settings UI can be minimal textarea MVP.
3. Export **`createTokenResolverForSession(repoUrl)`** helper for main thread.
4. Seed **`tailwindToCanonicalPath`** from `design/tokens.json` — output paths per §6.

---

## Open questions

| Q | Status |
| - | ------ |
| Exact binding variable prefix (`theme/` or not) | **RESOLVED** — no prefix; optional `Theme/` stripped at apply (§6) |

---

## References

- `src/core/components/scaffold/selector.ts` — `normalizeVariablePath`
- `tests/fixtures/component-spec-button-canonical.json` — binding examples
- WO-039 TokenResolver interface
- PRD §6.9 FR-CONF-*
