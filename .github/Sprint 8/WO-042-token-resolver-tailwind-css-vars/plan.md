# Plan — WO-042: Token resolver (Tailwind + CSS vars)

## Approach

Implement **`createTokenResolver(repoUrl, options)`** in `src/core/import/shared/tokenResolver.ts`, returning a **`TokenResolver`** (interface owned by WO-039) that maps Tailwind utility **class fragments** (e.g. `bg-primary`, `text-muted-foreground`) to **canonical FigHub variable slash paths** for `ComponentSpecV1.bindings[].variable`.

**Strategy (locked from research):**

1. **Detection (FR-CONF-2)** — fetch repo files via `loadFromGitHub` / `postContentsFetch` in priority order: Tailwind JS config → CSS `@theme` / `tokens.css` → Style Dictionary config (detect-only stub) → Tokens Studio JSON (detect-only stub). First successful parse wins.
2. **Resolution** — normalize class fragment (strip `sm:`, `hover:`, `dark:` prefixes for MVP), map utility prefix (`bg-`, `text-`, `border-`) + semantic token name to a CSS custom property, then through **`tailwindToCanonicalPath`** to a path like `color/primary/default` (see AC traceability — not `Theme/Primary` literal).
3. **Manual override (FR-CONF-3/4)** — per-repo JSON map in Settings merged **before** auto-detect lookup; persisted in **`figma.clientStorage`** via `tokenResolverStorage.ts` (separate key — no `fighub.json` schema bump).
4. **Cache** — parsed detection result + class→variable map in clientStorage keyed `fighub:token-resolver:{normalizedRepoUrl}`; invalidate when source file SHA changes or user saves override (D3).

**Hard dependency:** WO-039 must land `TokenResolver`, `TokenResolveResult`, and `createTokenResolver` signature in `src/core/import/shared/types.ts` (or re-export from `tokenResolver.ts`) before WO-042 `/build` starts.

**In scope (ticket Requirements):**

- `src/core/import/shared/tokenResolver.ts` + `tokenResolver/` submodule tree
- Tailwind v3 `theme.extend` reader + v4 `@theme inline` CSS reader (MVP: solid color utilities only)
- Settings Connected Repo section: override textarea + detection status label
- Vitest unit + integration tests for all ticket AC
- `createTokenResolverForSession(repoUrl)` helper for main-thread / import pipeline (WO-041)

**Out of scope (do not implement):**

- Native platform asset catalogs (Sprint 10 / WO-050)
- Reverse mapping (Figma variable → className)
- Style Dictionary / Tokens Studio full parsers (stubs return `{ detected: false }`)
- Opacity modifiers (`bg-primary/50`), arbitrary values (`bg-[#fff]`), gradient utilities
- `fighub.json` / `ResolvedFigHubConfig` schema changes for resolver fields

**Lift reference:** None — greenfield per PRD §6.9.

---

## Acceptance criteria traceability

| Ticket AC / requirement | Canonical output / behavior | Plan steps |
| ----------------------- | ----------------------------- | ---------- |
| `resolve('bg-primary')` → variable for Theme Primary | `{ ok: true, variable: 'color/primary/default' }` — satisfies AC **intent**; ticket example `Theme/Primary` is human shorthand; `normalizeVariablePath` strips `Theme/` prefix at scaffold apply | 4–6, 9, 14, 16 |
| `resolve('bg-mystery')` → unresolved | `{ ok: false, reason: 'unresolved' }` | 9, 14 |
| Auto-detect Tailwind v3/v4 configs | `detectSources` tries known paths; label in Settings | 3, 7, 11, 15 |
| Manual override beats detection | Merge order: manual → cached map → auto-detect | 10–12, 14 |
| FR-CONF-2 detection priority | Ordered probe list in `detectSources.ts` | 3, 7 |
| FR-CONF-3/4 Settings + per-repo storage | `tokenResolverStorage.ts` + Settings UI | 11–12 |
| FR-CONF-4 clientStorage cache | `tokenResolver/cache.ts` + SHA invalidation | 8, 12 |
| Req: `tokenResolver.ts` + WO-039 interface | `createTokenResolver` implements `TokenResolver` | 1–2, 9 |
| Testing: Vitest covers AC | `tests/unit/core/import/shared/tokenResolver/` | 13–16 |
| Console.debug major events (UI thread only) | `console.debug` in UI hooks; main uses `pluginLog` if touched | 11, Notes |

**Path convention (SPK-042-3 — locked):** Resolver emits slash paths **without** collection prefix, matching `tests/fixtures/component-spec-button-canonical.json` and `normalizeVariablePath` in `src/core/components/scaffold/selector.ts:97-104`. Optional `Theme/color/primary/default` in manual override is normalized on read.

---

## Steps

- [x] **Step 1** — Confirm WO-039 interface surface (blocking gate):

  - File: `src/core/import/shared/types.ts` (from WO-039)
  - Locked types:

```typescript
export type TokenResolveResult =
  | { ok: true; variable: string }
  | { ok: false; reason: 'unresolved' | 'ambiguous' };

export interface TokenResolver {
  resolve(token: string): TokenResolveResult;
}

export interface TokenResolverOptions {
  repoUrl: string;
  manualMap?: Record<string, string>;
  designTokensPath?: string;
  /** Injected fetch for tests */
  fetchText?: (path: string) => Promise<{ text: string; sha?: string } | null>;
}

export function createTokenResolver(options: TokenResolverOptions): TokenResolver;
```

  - **Done when:** WO-039 merged OR stub types committed on `main` with Vitest import path stable; `npm run typecheck` passes.

- [x] **Step 2** — Scaffold module tree:

```
src/core/import/shared/
  tokenResolver.ts              # createTokenResolver + barrel re-exports
  tokenResolver/
    types.ts                    # DetectedSource, ResolverCachePayload, ClassFragment
    detectSources.ts
    tailwindConfigReader.ts
    cssThemeReader.ts
    tailwindToCanonicalPath.ts
    semanticColorMap.ts         # thin wrapper → tailwindToCanonicalPath
    styleDictionaryReader.ts    # stub
    tokensStudioReader.ts       # stub
    cache.ts
    normalizeClassFragment.ts
src/io/github/
  tokenResolverStorage.ts
```

  - **Done when:** empty exports compile; `@/core/import/shared/tokenResolver` resolves.

- [x] **Step 3** — Implement `src/core/import/shared/tokenResolver/detectSources.ts`:

```typescript
export type DetectedSourceKind =
  | 'tailwind-v3-config'
  | 'tailwind-v4-css'
  | 'style-dictionary'
  | 'tokens-studio'
  | 'none';

export interface DetectedSource {
  kind: DetectedSourceKind;
  path: string;
  configSha?: string;
}

export async function detectTokenSource(
  repoUrl: string,
  fetchText: TokenResolverOptions['fetchText'],
): Promise<{ source: DetectedSource; rawMap: Record<string, string> } | null>;
```

  | Priority | Paths to try (first `fetchText` success wins) |
  | -------- | --------------------------------------------- |
  | 1 | `tailwind.config.js`, `tailwind.config.ts`, `tailwind.config.mjs`, `tailwind.config.cjs` |
  | 2 | `src/app/globals.css`, `app/globals.css`, `src/styles/globals.css`, `tokens.css`, `design/tokens.css` |
  | 3 | `style-dictionary.config.js`, `style-dictionary.config.json` → reader returns not detected |
  | 4 | `tokens.json`, `design/tokens.json` (Tokens Studio shape) → stub not detected unless explicit `tokens.studio` marker |

  - Each path: `isSafeRepoPath` guard before fetch.
  - **Done when:** `tests/unit/core/import/shared/tokenResolver/detectSources.test.ts` — v3 fixture path wins over CSS when both exist; v4-only repo detects `tailwind-v4-css`.

- [x] **Step 4** — Implement `src/core/import/shared/tokenResolver/cssThemeReader.ts`:

  - Parse `@theme` and `@theme inline` blocks via regex (no full CSS parser).
  - Extract `--color-{semantic}` entries; trace `var(--theme-*)` chains one level deep.
  - Build map: class fragment key → CSS var name, e.g. `bg-primary` → `--color-primary` → `--theme-primary` (store intermediate semantic `primary`).
  - **Done when:** `tests/fixtures/token-resolver/tailwind.v4.globals.css` parses; `tests/unit/core/import/shared/tokenResolver/cssThemeReader.test.ts` asserts `--color-primary` linkage.

- [x] **Step 5** — Implement `src/core/import/shared/tokenResolver/tailwindConfigReader.ts`:

  - Support CommonJS/ESM export shapes minimally: `module.exports = { theme: { extend: { colors: { primary: { DEFAULT: 'hsl(var(--primary))' } } } } }`.
  - Map `bg-{name}` / `text-{name}` / `border-{name}` to CSS var `--{name}` or `--color-{name}` per Tailwind v3 shadcn convention.
  - **Done when:** `tests/fixtures/token-resolver/tailwind.v3.config.js` → semantic `primary` extracted; `tailwindConfigReader.test.ts` passes.

- [x] **Step 6** — Implement `src/core/import/shared/tokenResolver/tailwindToCanonicalPath.ts`:

```typescript
export function buildCanonicalMapFromDesignTokens(
  tokensJson: unknown,
): Record<string, string>; // cssVarOrSemantic → canonical path

export function resolveCanonicalPath(
  semantic: string,
  slot: 'default' | 'content' | 'subtle',
  utility: 'bg' | 'text' | 'border',
  map: Record<string, string>,
): string | null;
```

  - Seed rules from repo `design/tokens.json` **`theme.color.*`** WEB `codeSyntax` (e.g. `var(--color-primary-default)` → `color/primary/default`).
  - Default table when tokens file missing (shadcn baseline):

| Tailwind semantic | Utility | Canonical path |
| ----------------- | ------- | -------------- |
| `primary` | `bg` | `color/primary/default` |
| `primary` | `text` | `color/primary/content` |
| `muted` | `bg` | `color/muted/default` |
| `muted-foreground` | `text` | `color/muted/content` |
| `destructive` | `bg` | `color/destructive/default` |

  - **Done when:** `tailwindToCanonicalPath.test.ts` maps `--color-primary-default` → `color/primary/default`; matches canonical fixture binding paths.

- [x] **Step 7** — Wire readers in `detectSources.ts`:

  - Dispatch: v3 config → `tailwindConfigReader`; v4 CSS → `cssThemeReader`; stubs → `{ kind: 'none' }`.
  - Merge reader output into `rawMap: Record<string, string>` keyed by **class fragment** (`bg-primary`, not full class string with variants).
  - **Done when:** integration fixture repo resolves `bg-primary` end-to-end in `detectSources.test.ts`.

- [x] **Step 8** — Implement `src/core/import/shared/tokenResolver/cache.ts`:

```typescript
export const TOKEN_RESOLVER_CACHE_KEY_PREFIX = 'fighub:token-resolver:';

export interface ResolverCachePayload {
  configSha: string;
  detectedKind: DetectedSourceKind;
  detectedPath: string;
  classToVariable: Record<string, string>;
  updatedAt: string;
}

export function tokenResolverCacheKey(repoUrl: string): string;

export async function readResolverCache(repoUrl: string): Promise<ResolverCachePayload | null>;
export async function writeResolverCache(repoUrl: string, payload: ResolverCachePayload): Promise<void>;
export async function clearResolverCache(repoUrl: string): Promise<void>;
```

  - Use `normalizeRepoUrl` from `@/io/github/repoUrl`.
  - **Done when:** `cache.test.ts` mocks `figma.clientStorage` get/set/delete; SHA mismatch returns null on read.

- [x] **Step 9** — Implement `src/core/import/shared/tokenResolver.ts` (`createTokenResolver`):

  - `normalizeClassFragment(token: string): string` in `normalizeClassFragment.ts` — strip leading variant prefixes (`sm:`, `md:`, `lg:`, `hover:`, `focus:`, `dark:`) once each from left; MVP documents single-pass only.
  - Resolve order:
    1. `options.manualMap[fragment]` → normalize path via `normalizeVariablePath` logic (duplicate minimal helper in tokenResolver to avoid circular import, or import from `@/core/components/scaffold/selector`)
    2. `readResolverCache` if `configSha` matches latest detection
    3. `detectTokenSource` → build map → `writeResolverCache`
  - `resolve(token)`:
    - Known fragment → `{ ok: true, variable: canonicalPath }`
    - Unknown → `{ ok: false, reason: 'unresolved' }`
    - Multiple canonical targets → `{ ok: false, reason: 'ambiguous' }` (reserve; no test required MVP)
  - **Done when:** `resolver.unresolved.test.ts` + `resolver.primary.test.ts` pass AC pair.

- [x] **Step 10** — Implement `src/io/github/tokenResolverStorage.ts`:

```typescript
export interface StoredTokenResolverOverride {
  manualMap: Record<string, string>;
  updatedAt: string;
}

export function tokenResolverOverrideKey(repoUrl: string): string; // 'fighub:token-resolver-override:' + normalizeRepoUrl

export async function loadTokenResolverOverride(repoUrl: string): Promise<StoredTokenResolverOverride | null>;
export async function saveTokenResolverOverride(repoUrl: string, manualMap: Record<string, string>): Promise<void>;
export async function clearTokenResolverOverride(repoUrl: string): Promise<void>;
```

  - Validate manual map keys: non-empty string fragments; values normalized to slash paths.
  - On save: call `clearResolverCache(repoUrl)` (D3).
  - **Done when:** `tokenResolverStorage.test.ts` round-trip + invalid JSON rejected.

- [x] **Step 11** — Settings UI override (`src/ui/tabs/Settings.tsx`):

  - In Connected Repo section (below `RepoSyncCard`):
    - Read-only **Detection status** label (e.g. `Detected: Tailwind v4 (@theme in src/app/globals.css)` or `Not detected — using defaults`)
    - **Token resolver override** — `<textarea>` JSON: `{ "bg-primary": "color/primary/default" }`
    - Save / Clear buttons → `saveTokenResolverOverride` / `clearTokenResolverOverride` via UI bridge message if main-thread storage required; otherwise direct hook calling storage helpers from UI thread per existing `clientStorage` pattern in `storage.ts`
  - Load override on `repoUrl` change; pass `manualMap` into resolver factory used by import preview (WO-044 later).
  - **Done when:** `tests/unit/ui/tabs/Settings.tokenResolver.test.tsx` — override save calls storage; detection label renders mocked status.

- [x] **Step 12** — Session helper `createTokenResolverForSession`:

  - File: `src/core/import/shared/tokenResolver.ts` (or `src/main/tokenResolverHandlers.ts` if message bridge needed)
  - Loads override from `loadTokenResolverOverride(repoUrl)` + cache; returns `TokenResolver`.
  - **Done when:** `createTokenResolverForSession.test.ts` — manual map wins over cached auto map.

- [x] **Step 13** — Commit fixtures `tests/fixtures/token-resolver/`:

  - `tailwind.v4.globals.css` — shadcn-style `@theme inline` with `--color-primary: var(--theme-primary)`
  - `tailwind.v3.config.js` — `theme.extend.colors.primary.DEFAULT`
  - `design-tokens-theme-slice.json` — minimal `theme.color.primary.default` WEB syntax excerpt
  - **Done when:** fixtures referenced by reader tests.

- [x] **Step 14** — AC integration tests:

  - `tests/unit/core/import/shared/tokenResolver/tailwind.v4.theme.test.ts` — `createTokenResolver` with mocked fetch of v4 CSS → `resolve('bg-primary')` → `{ ok: true, variable: 'color/primary/default' }`
  - `tests/unit/core/import/shared/tokenResolver/resolver.unresolved.test.ts` — `bg-mystery` → unresolved
  - `tests/unit/core/import/shared/tokenResolver/override-wins.test.ts` — manual `bg-primary` → custom path overrides auto
  - **Done when:** all three files green.

- [x] **Step 15** — Export surface `src/core/import/shared/index.ts` (if WO-039 barrel exists):

  - Re-export `createTokenResolver`, `createTokenResolverForSession`, types.
  - **Done when:** `WO-041` can import `TokenResolver` from `@/core/import/shared` without deep path.

- [x] **Step 16** — CI gate:

  - Run: `npm run typecheck && npm run test -- tests/unit/core/import/shared/tokenResolver tests/unit/io/github/tokenResolverStorage.test.ts`
  - **Done when:** zero failures; ticket AC table fully green.

---

## Build Agents

### Phase 1 — Core resolver (sequential after WO-039 types exist)

- `code-build` — **Steps 1–10:** Module scaffold, detection, v3/v4 readers, `tailwindToCanonicalPath`, cache, `createTokenResolver`, `tokenResolverStorage.ts`, fixtures.

### Phase 2 — UI + session (parallel with Phase 1 tests if types stable)

- `code-build` — **Steps 11–12:** Settings override UI, `createTokenResolverForSession`, UI/storage tests.

### Phase 3 — Verification (after Phase 1–2)

- `code-build` — **Steps 13–16:** Fixtures finalization, AC integration tests, barrel export, CI gate.

**Hard deps:** Phase 1 Step 1 requires WO-039 `TokenResolver` types on branch. Phase 2 may start once Step 9 API is stable (interface-only mock). Phase 3 last.

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| **WO-039** | `TokenResolver`, `TokenResolveResult`, `ImportTemplateContext.tokenResolver` — interface gate |
| **WO-016** | GitHub OAuth + `postContentsFetch` / `loadFromGitHub` for repo file reads |
| **WO-041** (downstream) | Consumes resolver in `extractBindings` — no WO-042 code changes required in 041 for MVP |

| Tool / module | Use |
| ------------- | --- |
| `src/io/sources/github.ts` | `loadFromGitHub`, `isSafeRepoPath` |
| `src/io/github/githubUiBridge.ts` | `postContentsFetch` when UI triggers detection refresh |
| `src/io/github/repoUrl.ts` | `normalizeRepoUrl` |
| `src/io/github/storage.ts` | Pattern reference for `clientStorage` get/set |
| `src/core/components/scaffold/selector.ts` | `normalizeVariablePath` — path normalization contract |
| `design/tokens.json` | Seed `buildCanonicalMapFromDesignTokens` in FigHub dogfood repo |
| Vitest | Unit + integration tests per step |

---

## Open Questions

| ID | Question | Status |
| -- | -------- | ------ |
| Q1 | Binding variable prefix (`theme/` vs bare `color/`) | **RESOLVED** — emit `color/primary/default`; optional `Theme/` stripped at apply (research §6) |
| Q2 | Ticket AC literal `Theme/Primary` vs canonical path | **RESOLVED** — tests assert `color/primary/default`; documents AC intent |
| Q3 | Main-thread vs UI-thread for `clientStorage` writes from Settings | **RESOLVED** — follow `storage.ts`: UI may use `figma.clientStorage` directly; if bridge exists for secrets, mirror `githubUiBridge` only if sandbox blocks UI writes (verify during Step 11) |
| Q4 | Share AST tree walker with WO-056 | **DEFERRED** post-MVP (research D4) |

---

## Notes

- **ES2017:** No optional chaining reliance beyond existing codebase patterns; no `URL` in main sandbox paths touched by this ticket.
- **Logging:** `console.debug` for detection/resolve events in **UI** code only; main-thread paths use `pluginLog` per project memory — do not add `console.*` on main.
- **MVP limitations (document in resolver JSDoc):** variant prefixes stripped once; opacity/arbitrary utilities return unresolved; text colors use `content` slot when utility is `text-`.
- **Wrong vs correct (path output):**

| Wrong | Correct |
| ----- | ------- |
| `bg-primary` as `variable` value | `color/primary/default` |
| `Theme/Primary` PascalCase | `color/primary/default` |
| `var/Theme/color/primary/default` | `color/primary/default` |
| Returning `{ unresolved: true }` without WO-039 shape | `{ ok: false, reason: 'unresolved' }` |

- **Bibliography (agents do not re-derive scope from these):** [ticket.md](ticket.md), [research/token-resolver-tailwind-css-vars.md](research/token-resolver-tailwind-css-vars.md) §6, `Docs/PRD.md` §6.9 FR-CONF-*, §6.3 FR-IMP-5.
- **Manual smoke (post-build):** Connect FigHub repo URL in Settings → confirm detection label shows Tailwind v4 or v3 → add override `{"bg-test":"color/primary/default"}` → save → verify cache cleared and resolve uses override (debug log in UI).
