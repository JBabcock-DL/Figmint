# Plan — WO-009: codeSyntax mapping per platform (Web / Android / iOS)

## Approach

Implement a **pure hybrid** codeSyntax layer under `src/core/variables/` that maps each canonical token to per-platform export strings (`WEB`, `ANDROID`, `iOS` — exact Figma API casing), then applies them via a thin Plugin API wrapper. **`mapCodeSyntax`** shallow-copies stored `token.codeSyntax`, returns stored-only for `collection === 'theme'`, and fills missing platforms via collection-specific **`deriveCodeSyntax`** helpers for Primitives / Typography / Layout / Effects. **`applyCodeSyntax`** calls `mapCodeSyntax` then `variable.setVariableCodeSyntax` for each non-empty platform — the **only** module that touches the Plugin API for codeSyntax; WO-008 `push.ts` imports it as a one-liner after all `setValueForMode` calls per variable. Vitest covers the full research matrix (6+ worked tokens + edge cases) without a Figma sandbox; `applyCodeSyntax` tests use a minimal `Variable` mock. Format with Prettier; leave changes uncommitted on `main` per repo git strategy.

## Steps

- [x] Step 1 — **Pre-flight:** Read `research/platform-codesyntax-mapping.md` (LOCKED). Confirm `packages/contracts/src/tokens.v1.ts` exports `CanonicalToken` (or `Token` union alias), `CodeSyntaxPlatform`, and `CollectionId` from WO-055 — if still stub, use the sketched types from `.github/Sprint 1/WO-055-…/research/canonical-token-model.md` for test fixtures only and re-export imports once WO-055 lands. Create `src/core/variables/` (replace `.gitkeep`). Add Vitest if absent: `vitest` + `@vitest/coverage-v8` devDependencies, `vitest.config.ts` targeting `src/core/**/*.test.ts`, `npm run test` script; ensure `tsc --noEmit` still includes `src/core/**`.
- [x] Step 2 — **Shared derivation helpers** in `src/core/variables/deriveCodeSyntax/shared.ts`: `toKebabPath(name: string): string` (lowercase, `/` → `-`); `isPresent(s: string | undefined): boolean` (non-empty after trim); `splitIosSegments(segment: string): string[]` (lowercase + split on `-` into dot segments). No Figma imports in `deriveCodeSyntax/**`.
- [x] Step 3 — **`deriveCodeSyntax/primitives.ts`:** Implement WEB (`var(--{kebab})`), ANDROID (kebab basename only), iOS with domain map per research §2: `color/*` → `.Palette.*`, `Space/*` → `.Space.*`, `Corner/*` → `.Corner.*`, `elevation/*` → `.Elevation.*`, `typeface/*` → `.Typeface.*`, `font/weight/*` → `.Font.weight.*`; remaining segments lowercased with hyphen→dot split (`Extra-small` → `extra.small`).
- [x] Step 4 — **`deriveCodeSyntax/typography.ts`:** Always prefix `.Typography.`; path `Category/Size/property` → `.Typography.{category}.{size}.{property-with-dots}` (e.g. `Headline/LG/font-size` → `.Typography.headline.lg.font.size`). WEB/ANDROID use full-path kebab (`headline-lg-font-size`).
- [x] Step 5 — **`deriveCodeSyntax/layout.ts`:** WEB/ANDROID from kebab path; iOS `.Layout.{group}.{token}` (e.g. `space/md` → `.Layout.space.md`, `radius/xs` → `.Layout.radius.xs`).
- [x] Step 6 — **`deriveCodeSyntax/effects.ts`:** WEB/ANDROID from kebab path; iOS `.Effect.{segments}` (e.g. `shadow/md/blur` → `.Effect.shadow.md.blur`; `shadow/color` → `.Effect.shadow.color` with ANDROID basename `shadow` per research edge table).
- [x] Step 7 — **`deriveCodeSyntax/index.ts`:** Export `deriveCodeSyntax(token: CanonicalToken, platform: CodeSyntaxPlatform): string | undefined` — dispatch on `token.collection`; return `undefined` for `theme` (never derive). Reject unknown collections at type level via `CollectionId` exhaustiveness.
- [x] Step 8 — **`codeSyntax.ts` — `mapCodeSyntax`:** Start from shallow copy of `token.codeSyntax` (treat `''` as absent). If `token.collection === 'theme'`, return stored partial only. Else for each platform in `['WEB','ANDROID','iOS']`, use stored value when present, else `deriveCodeSyntax(token, platform)`. Omit keys whose value is absent/empty. Export types from `@detroitlabs/fighub-contracts`.
- [x] Step 9 — **Vitest — `mapCodeSyntax` matrix** in `src/core/variables/codeSyntax.test.ts` using minimal `CanonicalToken` factory helpers (no Figma):
  - **Stored wins:** Theme `color/primary/default` full triple; Primitives `color/primary/500` with partial stored WEB only → WEB stored, ANDROID/iOS derived.
  - **Six worked tokens (research §3):** (1) primitives `color/primary/500`; (2) theme `color/primary/default` stored; (3) typography `Headline/LG/font-size`; (4) layout `space/md`; (5) effects `shadow/md/blur`; (6) theme `color/background/content-muted` stored (`var(--color-content-muted)` / `on-surface-variant` / `.Foreground.secondary`).
  - **Derivation extras:** primitives `Space/400`, `Corner/Extra-small`, `font/weight/medium`; typography `Body/MD/font-weight`; layout `radius/xs`; effects `shadow/color`.
  - **Theme no derivation:** theme token with no `codeSyntax` → `{}`; theme with WEB only → `{ WEB }` only.
  - **Edge:** empty string stored WEB → derive on non-Theme; alias row uses its own stored triple (fixture with alias target primitive — assert mapper reads alias row, not target).
- [x] Step 10 — **`codeSyntax.ts` — `applyCodeSyntax`:** Accept `variable: Variable` + `token: CanonicalToken`; `const syntax = mapCodeSyntax(token)`; loop `['WEB','ANDROID','iOS'] as const`, call `variable.setVariableCodeSyntax(platform, value)` when value present. Use `@figma/plugin-typings` `Variable` type only in this function (not in derive subtree).
- [x] Step 11 — **Vitest — `applyCodeSyntax`:** Mock object with `setVariableCodeSyntax = vi.fn()`; assert 3 calls with exact platform literals for primitives token with full derived triple; assert **zero** calls for Theme token with `{}` map; assert partial (WEB-only theme) calls once.
- [x] Step 12 — **WO-008 integration contract (doc + export):** Add module JSDoc on `applyCodeSyntax` documenting push order: `createVariable` → all `setValueForMode` → `applyCodeSyntax`. Add one-line integration note in this ticket's plan Notes for WO-008: `push.ts` must `import { applyCodeSyntax } from './codeSyntax'` and call after values — **no** inline `setVariableCodeSyntax` in `push.ts`. Do not edit WO-008 files in this WO unless user expands scope.
- [x] Step 13 — **Spot-check constants:** Add `codeSyntax.spotCheck.ts` (or test `describe` block) exporting expected triple for `color/primary/default`: WEB `var(--color-primary)`, ANDROID `primary`, iOS `.Primary.default` — referenced in VQA / manual checklist.
- [x] Step 14 — **CI hygiene:** Run `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check` (or `format` then recheck). Fix any issues. No git commit.

## Build Agents

### Phase 1 (parallel)

- `code-build` — Steps 1–9: Vitest wiring (if needed), `deriveCodeSyntax/**` submodule (shared + per-collection derivations + dispatcher), `mapCodeSyntax` in `codeSyntax.ts`, full Vitest matrix for pure mapper (6+ tokens + edge cases). **No** `applyCodeSyntax`, **no** `@figma/plugin-typings` in derive subtree.

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 10–14: `applyCodeSyntax` + mock-based Vitest, spot-check export, JSDoc/integration note, Prettier + `test` / `typecheck` / `lint` / `format:check` pass.

## Dependencies & Tools

| Dependency                     | Role                                                                                                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WO-055**                     | `TokensV1` / `CanonicalToken` + `CodeSyntaxPlatform` on `@detroitlabs/fighub-contracts` — **required** for production types; Phase 1 may use fixture objects matching research sketch until WO-055 merges.                             |
| **WO-008**                     | `push.ts` integration point — calls `applyCodeSyntax(variable, token)` after all mode values; WO-009 does not implement push. Build order: WO-009 Phase 1–2 can complete before WO-008 merges; E2E push verification waits for WO-008. |
| **WO-007**                     | Legacy/DTCG adapters must populate stored Theme triples from `theme-aliases.json` etc. — not WO-009 scope; mapper consumes whatever is on the token.                                                                                   |
| **@figma/plugin-typings**      | `Variable` type for `applyCodeSyntax` only (already in root `package.json`).                                                                                                                                                           |
| **Vitest**                     | Unit tests for pure mapper + mocked apply (add in Step 1 if missing).                                                                                                                                                                  |
| **Lift reference (read-only)** | `DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md`; `data/{theme-aliases,primitives-baseline,layout-effects,typography-slots}.json`; `phases/04-step11-push.md` (call order).                                 |
| **Figma MCP**                  | **Not required** — subsystem ticket; sandbox spot-check is manual optional VQA after WO-008 push lands.                                                                                                                                |

## Open Questions

| #   | Question                                                           | Resolution in this plan                                                                                                                     |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Derive Theme when stored missing (dev tokens)?                     | **No** — `mapCodeSyntax` returns stored-only for theme; empty → skip all platforms (WO-010 audit flags later).                              |
| 2   | Typography iOS always `.Typography.*`?                             | **Yes** — per `typography-slots.json` / research §2.                                                                                        |
| 3   | Partial DTCG `$extensions.fighub.codeSyntax` on Primitives?        | **Yes** — hybrid: stored platform wins, derive the rest.                                                                                    |
| 4   | WO-008 research says `push.ts` owns `setVariableCodeSyntax` inline | **Superseded by WO-009 research lock:** `applyCodeSyntax` in `codeSyntax.ts` is the sole call site; update WO-008 plan at integration time. |

## Notes

### Module layout (locked)

```
src/core/variables/
  codeSyntax.ts                 # mapCodeSyntax, applyCodeSyntax (public API)
  codeSyntax.test.ts            # Vitest
  deriveCodeSyntax/
    index.ts                    # deriveCodeSyntax(token, platform)
    shared.ts                   # kebab + iOS segment helpers
    primitives.ts
    typography.ts
    layout.ts
    effects.ts                  # no theme.ts — Theme never derives
```

### Hybrid resolution (locked)

1. Shallow-copy `token.codeSyntax`; empty strings treated as absent.
2. `collection === 'theme'` → return copy as-is (no `deriveCodeSyntax` fill-in).
3. Other collections → per platform: stored wins, else derive.
4. Alias tokens: codeSyntax on the **alias row** only — mapper never walks `aliasOf` targets.

### Platform conventions (Detroit Labs Foundations)

- **WEB:** `var(--kebab-path)` for derivable collections; Theme uses stored role strings (not path-derived).
- **ANDROID:** kebab basename only — **no** `R.color.` / `R.dimen.` in codeSyntax (consumer codegen adds prefix by `VariableResolvedDataType`).
- **iOS:** dot paths; Theme stored semantics (e.g. `.Primary.default`); derivable collections use `.Palette.*`, `.Typography.*`, `.Layout.*`, `.Effect.*`.

### Spot-check (acceptance)

Canonical path **`color/primary/default`** (Theme, stored):

| Platform | Expected               |
| -------- | ---------------------- |
| WEB      | `var(--color-primary)` |
| ANDROID  | `primary`              |
| iOS      | `.Primary.default`     |

Ticket draft values (`--theme-primary`, `R.color.theme_primary`, `Color.themePrimary`) are **wrong** vs legacy — do not implement.

### WO-008 push integration (one line)

```ts
// push.ts — inside per-variable loop, after all setValueForMode calls:
applyCodeSyntax(variable, token);
```

Per-variable order: `createVariable` → `setValueForMode` (each mode) → `applyCodeSyntax` → next variable; `figma.commitUndo()` once per batch (WO-008). Performance: ~0.23 ms/call at n=400 (WO-005); keep contiguous per variable.

### Drift correction vs WO-008 research

`variable-push-engine-design.md` showed inline `setVariableCodeSyntax` in `push.ts` and a `deriveCodeSyntax` export without `applyCodeSyntax`. **WO-009 research lock wins:** `mapCodeSyntax` + `applyCodeSyntax` public API; `push.ts` imports `applyCodeSyntax` only.

### References

- Ticket: [`./ticket.md`](./ticket.md)
- Research: [`research/platform-codesyntax-mapping.md`](research/platform-codesyntax-mapping.md)
- Canonical token shape: [`.github/Sprint 1/WO-055-…/research/canonical-token-model.md`](../../Sprint%201/WO-055-define-canonical-internal-token-model/research/canonical-token-model.md) §4, §"Proposed TokensV1"
- WO-008 push design: [`.github/Sprint 2/WO-008-…/research/variable-push-engine-design.md`](../WO-008-variable-collection-push-engine-5-collections-modes/research/variable-push-engine-design.md) §1 (integrate via `applyCodeSyntax`)
- PRD: `Docs/PRD.md` §6.1 FR-BOOT-5
- Figma API: [`CodeSyntaxPlatform`](https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/), [`Variable.setVariableCodeSyntax`](https://developers.figma.com/docs/plugins/api/properties/Variable-setvariablecodesyntax/)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
