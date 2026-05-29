# Platform codeSyntax Mapping — Research (WO-009)

> **Status:** LOCKED — ready for `/plan`
> **Date:** 2026-05-27
> **Owner:** WO-009
> **PRD anchors:** §6.1 FR-BOOT-5
> **Upstream:** WO-055 §4 (flat `codeSyntax` on token), WO-008 push engine (integration point), WO-005 spike (Plugin API call order + per-call rates)

---

## Summary

FigHub attaches per-platform `codeSyntax` to every pushed variable via `figma.variables.setVariableCodeSyntax` (Plugin API only — no REST hop). The canonical `TokensV1` token carries an optional `codeSyntax?: Partial<Record<'WEB' | 'ANDROID' | 'iOS', string>>` field (WO-055 §4). **Source-of-truth is hybrid:** use stored values when present; derive from collection-specific rules when absent. Theme semantic tokens **must never** be path-derived — they come from explicit row data (legacy `theme-aliases.json`) or a role table. Primitives, Typography, Layout, and Effects use deterministic derivation algorithms documented below.

The ticket spot-check (`Theme/Primary` → `--theme-primary` / `R.color.theme_primary` / `Color.themePrimary`) **does not match legacy Detroit Labs Foundations.** Correct legacy values for `color/primary/default` are `var(--color-primary)` / `primary` / `.Primary.default`. Acceptance criteria updated accordingly.

**Module API:** `mapCodeSyntax` (pure, Vitest-targeted) + `applyCodeSyntax` (thin Plugin API wrapper) both live in `src/core/variables/codeSyntax.ts`. WO-008 `push.ts` calls `applyCodeSyntax` after all `setValueForMode` calls for each variable.

---

## Key Findings

### 1. Source of truth — LOCKED: hybrid (C)

| Source                        | When used                                             | Rationale                                                                                                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stored `token.codeSyntax`** | Always preferred when any platform key is present     | Legacy Theme rows (`theme-aliases.json`) carry explicit triples independent of Figma path. WO-055 locked flat-on-token storage for round-trip. WO-007 legacy adapter must populate stored values from JSON data files.                                           |
| **Derived at push/map time**  | Fallback when `token.codeSyntax` is absent or partial | Primitives in `primitives-baseline.json` document derivation rules but do not embed per-row triples in the baseline file. Typography/Layout/Effects follow collection-specific algorithms in `02-codesyntax.md` + data JSON `codeSyntaxRules`.                   |
| **Never derive**              | `collection === 'theme'`                              | `02-codesyntax.md` + `theme-aliases.json` schema: "codeSyntax is set explicitly per row (NOT derived from the path)." Missing stored Theme codeSyntax → **skip platform** (do not invent from path). Audit (WO-010) should flag Theme tokens missing codeSyntax. |

**Alias tokens:** codeSyntax lives on the **alias row**, not inherited from the alias target. Example: Theme `color/primary/default` aliases Primitives `color/primary/500` but carries `{ WEB: "var(--color-primary)", ANDROID: "primary", iOS: ".Primary.default" }` — not the primitive's `var(--color-primary-500)` / `color-primary-500` / `.Palette.primary.500`.

**Partial stored triples:** If `token.codeSyntax.WEB` is set but `ANDROID`/`iOS` absent, map only WEB from stored; derive missing platforms via collection rules (except Theme — no derivation for missing platforms).

---

### 2. Per-platform transformation rules

Platform key casing is **exact:** `'WEB' | 'ANDROID' | 'iOS'` — never `IOS`, `ios`, or `Ios` ([Figma `CodeSyntaxPlatform`](https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/)).

#### WEB — CSS custom properties

**Algorithm (Primitives / Layout / Effects / Typography fallback):**

1. Take Figma variable `name` (slash-separated path, e.g. `color/primary/500`, `Headline/LG/font-size`, `space/md`).
2. Lowercase entire path.
3. Replace `/` with `-`.
4. Wrap as `var(--{result})`.

**Theme exception:** use stored WEB string verbatim (role table). Path `color/background/content-muted` → `var(--color-content-muted)`, not `var(--color-background-content-muted)`.

**Examples:**

| Step       | Input                   | Output                         |
| ---------- | ----------------------- | ------------------------------ |
| Primitives | `color/primary/500`     | `var(--color-primary-500)`     |
| Layout     | `space/md`              | `var(--space-md)`              |
| Typography | `Headline/LG/font-size` | `var(--headline-lg-font-size)` |

#### ANDROID — M3 resource basename (kebab-case)

**Algorithm (non-Theme collections):**

1. Same kebab path as WEB step 1–3.
2. **Do not** prefix with `R.color.`, `R.dimen.`, or `R.string.` — Figma stores the resource **basename** only (legacy convention). Consumer codegen maps by variable type:

| Figma `VariableResolvedDataType` | Codegen prefix (consumer-side, not in codeSyntax) |
| -------------------------------- | ------------------------------------------------- |
| `COLOR`                          | `R.color.{basename}`                              |
| `FLOAT`                          | `R.dimen.{basename}`                              |
| `STRING`                         | `R.string.{basename}` or font resource pattern    |
| `BOOLEAN`                        | app-specific                                      |

3. **Never** Compose camelCase (`surfaceContainerHigh` is wrong). Always kebab-case M3 roles for Theme.

**Theme exception:** stored M3 role name only — e.g. `primary`, `surface-container-high`, `on-surface-variant` — not path-derived.

#### iOS — dot-separated path

**Algorithm (non-Theme collections):**

1. Split `name` on `/`.
2. First segment → domain with leading `.` and **PascalCase** first letter only: `color` → `.Palette`, `Space` → `.Space`, `Headline` → `.Typography` (Typography collection uses `.Typography.{category}.{size}.{property}` — see below).
3. Remaining segments: lowercase; split embedded kebab hyphens into additional dot segments (`Extra-small` → `extra.small`).
4. Join with `.` — **never camelCase** mid-segment.

**Collection-specific domain defaults (Primitives):**

| Path prefix     | iOS domain       |
| --------------- | ---------------- |
| `color/*`       | `.Palette.*`     |
| `Space/*`       | `.Space.*`       |
| `Corner/*`      | `.Corner.*`      |
| `elevation/*`   | `.Elevation.*`   |
| `typeface/*`    | `.Typeface.*`    |
| `font/weight/*` | `.Font.weight.*` |

**Typography collection:** `.Typography.{category}.{size}.{property-with-dots}` — e.g. `Headline/LG/font-size` → `.Typography.headline.lg.font.size`.

**Layout collection:** `.Layout.{group}.{token}` — e.g. `space/md` → `.Layout.space.md`.

**Effects collection:** `.Effect.{group}.{...}` — e.g. `shadow/md/blur` → `.Effect.shadow.md.blur`.

**Theme exception:** stored semantic dot path — e.g. `.Primary.default`, `.Foreground.secondary`, `.Status.on.error.fixed.muted`.

---

### 3. Worked example table (6 tokens)

| #   | Collection | Figma path                       | Type  | Source     | WEB                            | ANDROID                 | iOS                                 |
| --- | ---------- | -------------------------------- | ----- | ---------- | ------------------------------ | ----------------------- | ----------------------------------- |
| 1   | primitives | `color/primary/500`              | COLOR | derive     | `var(--color-primary-500)`     | `color-primary-500`     | `.Palette.primary.500`              |
| 2   | theme      | `color/primary/default`          | COLOR | **stored** | `var(--color-primary)`         | `primary`               | `.Primary.default`                  |
| 3   | typography | `Headline/LG/font-size`          | FLOAT | derive     | `var(--headline-lg-font-size)` | `headline-lg-font-size` | `.Typography.headline.lg.font.size` |
| 4   | layout     | `space/md`                       | FLOAT | stored†    | `var(--space-md)`              | `space-md`              | `.Layout.space.md`                  |
| 5   | effects    | `shadow/md/blur`                 | FLOAT | stored†    | `var(--shadow-md-blur)`        | `shadow-md-blur`        | `.Effect.shadow.md.blur`            |
| 6   | theme      | `color/background/content-muted` | COLOR | **stored** | `var(--color-content-muted)`   | `on-surface-variant`    | `.Foreground.secondary`             |

† Layout/Effects rows in legacy JSON carry explicit triples; derivation rules produce identical output — stored preferred when present.

**Spot-check correction (ticket vs legacy):**

| Ticket draft (incorrect) | Legacy authoritative (`theme-aliases.json`) |
| ------------------------ | ------------------------------------------- |
| `--theme-primary`        | `var(--color-primary)`                      |
| `R.color.theme_primary`  | `primary` (no `R.color.` prefix)            |
| `Color.themePrimary`     | `.Primary.default`                          |

Use **`color/primary/default`** as the canonical spot-check token (not abstract `Theme/Primary`).

---

### 4. Module API — LOCKED

Both functions in `src/core/variables/codeSyntax.ts`:

```ts
import type { CanonicalToken, CodeSyntaxPlatform } from '@detroitlabs/fighub-contracts';

/** Pure mapper — all Vitest coverage targets this. */
export function mapCodeSyntax(token: CanonicalToken): Partial<Record<CodeSyntaxPlatform, string>>;

/** Plugin API side-effect — calls mapCodeSyntax then setVariableCodeSyntax per present platform. */
export function applyCodeSyntax(variable: Variable, token: CanonicalToken): void;
```

**Rationale:** Pure `mapCodeSyntax` keeps derivation testable without Figma mocks. `applyCodeSyntax` centralizes platform-key iteration + skip-empty logic so `push.ts` stays one line per variable. WO-008 does **not** duplicate `setVariableCodeSyntax` loops.

**`mapCodeSyntax` resolution order:**

1. Start from `{ ...token.codeSyntax }` (shallow copy of stored partial).
2. If `token.collection === 'theme'`: return stored only (no derivation fill-in).
3. Else for each platform in `['WEB', 'ANDROID', 'iOS']`: if missing, compute via `deriveCodeSyntax(token, platform)`.
4. Return merged partial (omit empty strings).

**`applyCodeSyntax` behavior:**

```ts
const syntax = mapCodeSyntax(token);
for (const platform of ['WEB', 'ANDROID', 'iOS'] as const) {
  const value = syntax[platform];
  if (value) variable.setVariableCodeSyntax(platform, value);
}
```

Skip absent/empty platforms — WO-005 confirmed this is valid (0.23 ms/call).

---

### 5. Integration with WO-008 push — LOCKED call order

Per variable, inside each collection pass:

```
createVariable(name, collection, type)
  → setValueForMode(modeId, value)  // all modes for this variable
  → applyCodeSyntax(variable, token)  // all platforms
// after all variables in collection:
figma.commitUndo()  // once per push batch, not per variable
```

**Collection pass order (unchanged from WO-008):** Primitives → Theme → Typography → Layout → Effects.

**FigHub vs legacy transport:** Legacy Step 11 split Plugin API (structure) + REST PUT (codeSyntax) due to MCP 50 kB cap. FigHub uses Plugin API for both — `setVariableCodeSyntax` immediately after values per variable (WO-005 spike validated).

**Performance note:** `setVariableCodeSyntax` is ~47% of push time at n=400 but only ~281 ms absolute. Keep as contiguous per-variable loop; do not interleave with `setValueForMode` across variables.

---

### 6. Unit test matrix (Vitest)

File: `src/core/variables/codeSyntax.test.ts` (or colocated).

#### `mapCodeSyntax` — stored wins

| Input token                                                                                                                                        | Expected                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `{ collection: 'theme', name: 'color/primary/default', codeSyntax: { WEB: 'var(--color-primary)', ANDROID: 'primary', iOS: '.Primary.default' } }` | Exact stored triple             |
| `{ collection: 'primitives', name: 'color/primary/500', codeSyntax: { WEB: 'var(--custom)' } }`                                                    | WEB stored; ANDROID/iOS derived |

#### Derivation — primitives

| name                 | WEB                         | ANDROID              | iOS                    |
| -------------------- | --------------------------- | -------------------- | ---------------------- |
| `color/primary/500`  | `var(--color-primary-500)`  | `color-primary-500`  | `.Palette.primary.500` |
| `Space/400`          | `var(--space-400)`          | `space-400`          | `.Space.400`           |
| `Corner/Extra-small` | `var(--corner-extra-small)` | `corner-extra-small` | `.Corner.extra.small`  |
| `font/weight/medium` | `var(--font-weight-medium)` | `font-weight-medium` | `.Font.weight.medium`  |

#### Derivation — typography

| name                    | WEB                            | ANDROID                 | iOS                                 |
| ----------------------- | ------------------------------ | ----------------------- | ----------------------------------- |
| `Headline/LG/font-size` | `var(--headline-lg-font-size)` | `headline-lg-font-size` | `.Typography.headline.lg.font.size` |
| `Body/MD/font-weight`   | `var(--body-md-font-weight)`   | `body-md-font-weight`   | `.Typography.body.md.font.weight`   |

#### Derivation — layout / effects

| collection | name             | WEB                     | ANDROID          | iOS                      |
| ---------- | ---------------- | ----------------------- | ---------------- | ------------------------ |
| layout     | `space/md`       | `var(--space-md)`       | `space-md`       | `.Layout.space.md`       |
| layout     | `radius/xs`      | `var(--radius-xs)`      | `radius-xs`      | `.Layout.radius.xs`      |
| effects    | `shadow/color`   | `var(--shadow-color)`   | `shadow`         | `.Effect.shadow.color`   |
| effects    | `shadow/md/blur` | `var(--shadow-md-blur)` | `shadow-md-blur` | `.Effect.shadow.md.blur` |

#### Theme — no derivation

| Input                                                                                   | Expected                                       |
| --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `{ collection: 'theme', name: 'color/background/content-muted' }` (no codeSyntax)       | `{}` — all platforms absent                    |
| `{ collection: 'theme', name: 'x', codeSyntax: { WEB: 'var(--color-content-muted)' } }` | `{ WEB: '...' }` only — no ANDROID/iOS fill-in |

#### Edge cases

| Case                                                     | Expected behavior                                              |
| -------------------------------------------------------- | -------------------------------------------------------------- |
| Empty string `codeSyntax.WEB: ''`                        | Treat as absent; derive if non-Theme                           |
| Platform key typo `IOS` in input adapter                 | Normalized/rejected at WO-007 ingest — mapper never sees `IOS` |
| Alias token with stored codeSyntax pointing to primitive | Uses alias row's codeSyntax, not target's                      |
| FLOAT layout token                                       | ANDROID basename only (consumer adds `R.dimen.`)               |
| COLOR theme token                                        | ANDROID M3 role (consumer adds `R.color.`)                     |

#### `applyCodeSyntax` — integration mock

Mock `Variable.setVariableCodeSyntax`; assert called 3× with exact platform literals `'WEB'`, `'ANDROID'`, `'iOS'` and mapped values; assert **not** called for Theme token with empty map.

---

## Recommendations

1. **Implement hybrid mapper** in `codeSyntax.ts` with collection-aware `deriveCodeSyntax` submodule (or private functions per collection).
2. **WO-007 legacy adapter** must copy explicit `codeSyntax` from `theme-aliases.json`, `layout-effects.json`, and typography data into canonical tokens at ingest — do not rely on derivation for Theme.
3. **Update ticket acceptance criteria** to legacy spot-check values (`color/primary/default` triple).
4. **WO-008 `push.ts`** imports `applyCodeSyntax` only — no inline derivation.
5. **Document ANDROID prefix rule** in module JSDoc: codeSyntax = basename; type→`R.color`/`R.dimen` is exporter concern (Sprint 3+ tokens.css / mobile exporters).

---

## Open Questions

| #   | Question                                                                       | Proposed resolution                                                       |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1   | Should WO-009 ship derivation for Theme when stored missing (dev/test tokens)? | **No** — skip + audit warning. Keeps production parity with legacy.       |
| 2   | Typography domain: always `.Typography.*` even when path uses `Display/LG`?    | **Yes** — per `typography-slots.json` codeSyntaxRules.                    |
| 3   | Partial codeSyntax on Primitives from DTCG `$extensions.fighub.codeSyntax`?    | Hybrid: stored platforms win; derive rest. Matches spike fixture pattern. |

---

## References

- `DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — primary lift
- `DesignOps-plugin/skills/create-design-system/data/theme-aliases.json` — Theme stored triples
- `DesignOps-plugin/skills/create-design-system/data/primitives-baseline.json` — `codeSyntaxRules`
- `DesignOps-plugin/skills/create-design-system/data/layout-effects.json` — Layout + Effects triples
- `DesignOps-plugin/skills/create-design-system/data/typography-slots.json` — Typography rules
- `DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` — push sequence (REST→Plugin API in FigHub)
- `.github/Sprint 1/WO-055-…/research/canonical-token-model.md` §4
- `.github/Sprint 1/WO-005-…/research/latency-benchmark.md` §3–§6
- Figma Plugin API — [`CodeSyntaxPlatform`](https://developers.figma.com/docs/plugins/api/CodeSyntaxPlatform/), [`Variable.setVariableCodeSyntax`](https://developers.figma.com/docs/plugins/api/properties/Variable-setvariablecodesyntax/)
