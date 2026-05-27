# Research — ESLint, Prettier & GitHub Actions config for WO-004

**Ticket:** WO-004 — Minimal CI pipeline (lint + typecheck + build)
**Date:** 2026-05-27
**Status:** Research complete. Ready for `/plan` lock.

---

## Summary

WO-004 should commit to **flat ESLint config** (`eslint.config.mjs`) — the legacy `.eslintrc.*` format is no longer an option on ESLint 10 (released Feb 2026), and ESLint 9 EOL is **2026-08-06** so a new project should target v10 directly.

**Recommended stack (all pinned to 2026-current minors at time of writing):**

| Tool                                    | Pin       | Why                                                                                              |
| --------------------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| **ESLint**                              | `^10.3.0` | Flat config only; legacy escape hatches removed in v10.                                          |
| **`@eslint/js`**                        | `^10.3.0` | Matches ESLint major. Provides `js.configs.recommended`.                                         |
| **`typescript-eslint`**                 | `^8.58.0` | Merged package — single import for parser + plugin + configs. v8+ required for ESLint 10 compat. |
| **`prettier`**                          | `^3.8.3`  | Apr 2026 stable. Format-agnostic (works with flat config).                                       |
| **`eslint-config-prettier`**            | `^10.1.8` | Use `eslint-config-prettier/flat` entry.                                                         |
| **`eslint-plugin-react-hooks`**         | `^7.1.1`  | Catches real bugs (rules-of-hooks, exhaustive-deps). Has native flat-config preset.              |
| **`eslint-plugin-import-x`**            | `^4.16.0` | Maintained fork of abandoned `eslint-plugin-import`; faster TS resolver.                         |
| **`eslint-import-resolver-typescript`** | `^4.4.0`  | Required by `import-x` for the contracts workspace.                                              |

**Preset recommendation (PRD §11.2 determinism):** `tseslint.configs.strictTypeChecked` + `tseslint.configs.stylisticTypeChecked` — the "strict" presets refuse implicit-any, unsafe-member-access, and other "silent guess" patterns that would violate the no-randomness / no-silent-apply constraints. Pair with **`projectService: true`** for incremental type analysis.

**GitHub Actions stack:** `actions/checkout@v6.0.2` + `actions/setup-node@v6` + auto-caching via `"packageManager": "npm@10"` in `package.json`. Concurrency group `${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}` with `cancel-in-progress: true` for cancel-on-push.

**Node version (open question — see §Open Questions):** WO-002 + PRD §11.5 say "Node 20+" but **Node 20 reached EOL on 2026-04-30** and GitHub Actions defaulted runners to Node 24 on **2026-03-04**. Recommend `engines.node: ">=22"` and CI `node-version: '24'`. `/plan` should patch the PRD anchor.

---

## Key findings

### 1. ESLint config style — flat config is the only forward path

| Fact                                                                                                                                                                                                                                                         | Source                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| ESLint 9.0.0 (Apr 2024) made flat config the default; legacy `.eslintrc.*` requires `ESLINT_USE_FLAT_CONFIG=false` escape hatch.                                                                                                                             | [ESLint migration guide][eslint-mig]                        |
| ESLint 10.0.0 (Feb 2026) **removed the escape hatch entirely** — `.eslintrc.*` files are ignored.                                                                                                                                                            | [PkgPulse — ESLint 10 migration][pkgpulse-eslint-10]        |
| ESLint 9.x EOL is **2026-08-06**.                                                                                                                                                                                                                            | [ESLint blog — defineConfig & extends][eslint-extends-blog] |
| Current stable: ESLint 10.3.0 (May 2026 per ESLint blog "Differences" post).                                                                                                                                                                                 | [ESLint blog 2025-01 (banner)][eslint-differences]          |
| Latest config helpers: `defineConfig()` + `globalIgnores()` from `eslint/config` (or `@eslint/config-helpers` for ESLint 9 back-compat) — re-introduces `extends` and explicit global ignores.                                                               | [ESLint blog — defineConfig][eslint-extends-blog]           |
| Config file precedence: `eslint.config.js` → `.mjs` → `.cjs` → `.ts` → `.mts` → `.cts`. `.mjs` is the safe default for new projects (avoids needing `"type": "module"` decisions for the rest of the project; TS variants require additional bootstrapping). | [ESLint docs — configuration-files][eslint-config-files]    |

**Conclusion:** Write `eslint.config.mjs` at repo root. Do not write `.eslintrc.cjs`. Use `defineConfig()` + `globalIgnores()` from `eslint/config`. Drop the "or `.eslintrc.cjs`" half of WO-004's Functional req #1.

### 2. TypeScript ESLint — single merged package, typed linting matters for determinism

- **`typescript-eslint`** (the merged meta-package; v8.58.0 latest as of March 2026) replaces installing `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` separately. ([typescript-eslint shared configs][tseslint-configs])
- **Preset hierarchy:**
  - `recommended` — code correctness; no type info needed
  - `recommended-type-checked` — `recommended` + rules that require `tsc` type info
  - `strict` — `recommended` + opinionated bug-catchers
  - `strict-type-checked` — `strict` + type-info bug-catchers
  - `stylistic`, `stylistic-type-checked` — code style (paired with whichever recommended/strict)
- **Caveat (typescript-eslint docs):** `strict-type-checked` is **not stable under semver** — rules may be added/removed in minor versions. Accept this for a project that values strictness above churn-free upgrades.
- **PRD §11.2 maps directly to `strict-type-checked`:** "no randomness" / "no silent guesses" / "same input → same output" are exactly the failure modes that unsafe-assignment, unsafe-member-access, no-floating-promises, no-misused-promises, prefer-readonly catch.
- **Enable typed linting via `projectService: true`** in `languageOptions.parserOptions` — uses TypeScript's project service for per-file type info; faster than the old `project: ['./tsconfig.json']` approach. ([typescript-eslint typed linting][tseslint-typed-linting])

```js
// excerpt
languageOptions: {
  parserOptions: {
    projectService: true,
    tsconfigRootDir: import.meta.dirname,
  },
},
```

### 3. Prettier integration — `eslint-config-prettier/flat`

- Prettier 3.8.3 (Apr 2026) is current; Prettier 4.0 is still in alpha. ([npm registry — prettier][npm-prettier])
- Prettier 3.x is config-format-agnostic — `.prettierrc.json` works identically with flat or legacy ESLint configs.
- For flat ESLint configs, import from the **`/flat` subpath** to get the named export that `config-inspector` understands. ([eslint-config-prettier README][ecp-readme])
  ```js
  import eslintConfigPrettier from 'eslint-config-prettier/flat';
  export default defineConfig([, /*…*/ eslintConfigPrettier]);
  ```
- Place `eslintConfigPrettier` **last** in the config array so it disables any conflicting style rules from earlier presets (Prettier owns formatting; ESLint owns correctness).

**Recommended `.prettierrc.json` for Figmint:**

```json
{
  "$schema": "https://json.schemastore.org/prettierrc",
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Rationale per option:

- `singleQuote: true` — matches DesignOps-plugin convention (single quotes throughout `*.mcp.js`).
- `trailingComma: "all"` — catches one-line diffs when adding items; standard since ES2017.
- `printWidth: 100` — matches what the TS files in the lift sources comfortably break at; 80 is too tight for typed function signatures, 120 is too wide for two-up review on a laptop.
- `endOfLine: "lf"` — Windows dev machine + Linux CI; lock to LF to avoid `.gitattributes` whack-a-mole.

### 4. Plugin-specific lint — keep the surface small

Figmint's source surface is small (`src/{core,ops,io,contracts,ui,config}` per PRD §7.3 + WO-002). Each plugin is a maintenance cost — pick only ones that catch real bugs.

| Plugin                                                                          | Verdict                 | Why                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@eslint/js` `recommended`                                                      | **YES**                 | Baseline. Free.                                                                                                                                                                                                                            |
| `typescript-eslint` `strict-type-checked` + `stylistic-type-checked`            | **YES**                 | PRD §11.2 alignment.                                                                                                                                                                                                                       |
| `eslint-plugin-react-hooks` v7+ (`flat.recommended`)                            | **YES** for `src/ui/**` | Bug catcher. `rules-of-hooks` + `exhaustive-deps` prevent the "stale closure" determinism failure.                                                                                                                                         |
| `eslint-plugin-react`                                                           | **DEFER**               | Mostly stylistic. UI shell is small. Revisit when Bootstrap tab (Sprint 4) lands.                                                                                                                                                          |
| `eslint-plugin-import-x` (`flatConfigs.recommended` + `flatConfigs.typescript`) | **YES** (light touch)   | Module hygiene matters once `@detroitlabs/figmint-contracts` workspace lands in WO-003. Picks up unresolved imports, circular deps, missing extensions. Maintained fork of abandoned `eslint-plugin-import` per [e18e replacements][e18e]. |
| `eslint-plugin-prettier`                                                        | **NO**                  | Anti-pattern in 2026 — running Prettier as an ESLint rule slows the linter and noise-floods the editor. Run Prettier separately (`prettier --check` in CI, `prettier --write` in editor).                                                  |
| `eslint-plugin-promise`, `eslint-plugin-node`, `eslint-plugin-jsdoc`            | **NO**                  | Not needed for Figmint scope.                                                                                                                                                                                                              |

### 5. GitHub Actions — 2026-current patterns

| Pattern                           | Current best practice                                                                                                                                                                                                             | Source                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Repo checkout                     | `actions/checkout@v6.0.2` (released 2026-01-09; node24 runtime; credentials persisted to `$RUNNER_TEMP`)                                                                                                                          | [actions/checkout README][gha-checkout]                                                          |
| Node setup                        | `actions/setup-node@v6` with `node-version: '24'` and `cache: 'npm'`                                                                                                                                                              | [actions/setup-node README][gha-setup-node]                                                      |
| **Auto-cache via packageManager** | When `package.json` has `"packageManager": "npm@10.x"` (or `devEngines.packageManager`), `setup-node@v6` auto-caches `~/.npm` without an explicit `cache:` input. ([release notes][gha-setup-node])                               |                                                                                                  |
| Install                           | `npm ci` (not `npm install`) — uses lockfile, no resolution step, 2–3× faster than `install`.                                                                                                                                     | [dev.to GHA pipeline guide 2026][gha-pipeline-2026]                                              |
| Concurrency / cancel-on-push      | `concurrency.group = ${{ github.workflow }}-${{ github.event.pull_request.number \|\| github.ref }}` + `cancel-in-progress: true`                                                                                                 | [GitHub docs — concurrency][gha-concurrency], [Stack Overflow — cancel previous][so-cancel-prev] |
| Runner                            | `ubuntu-latest` (currently `ubuntu-24.04`). Pinning to `ubuntu-24.04` makes "no surprises" upgrades explicit; `ubuntu-latest` makes upgrades free but unannounced. WO-004 picks `ubuntu-latest` (the ticket already declares it). |                                                                                                  |
| Matrix vs sequential              | **Sequential** for Figmint — two manifests (community + org) is too few to justify matrix overhead. A single job runs `build:community` then `build:org` after lint + typecheck.                                                  | (Judgment — not a sourced recommendation.)                                                       |

**Step ordering (cheapest → most expensive, fail fast):**

1. `actions/checkout@v6`
2. `actions/setup-node@v6` (cache restored here)
3. `npm ci` (or `npm ci --no-audit --no-fund` for less noise)
4. `npm run lint` — pure JS, fastest
5. `npm run typecheck` — slower (typed lint will already have run a tsc-equivalent pass via `projectService`)
6. `npm run prettier:check` — quick; only fails on formatting drift
7. `npm run build:community`
8. `npm run build:org`

Lint and prettier could merge into a single `npm run lint` script that runs both — see "Open Questions".

### 6. WO-002 lock cross-check

WO-002 acceptance criteria already include:

- `npm run build:community` ✅ (WO-002 AC #2)
- `npm run build:org` ✅ (WO-002 AC #3)
- `tsc --noEmit passes` ✅ (WO-002 AC #5)
- TS strict mode (WO-002 Functional #2) ✅

WO-002 **explicitly defers** ESLint/Prettier rule definition to WO-004 (WO-002 "Out of scope" bullet). So WO-004 owns: adding `lint`, `typecheck`, `prettier:check` scripts to `package.json`, plus the configs themselves. Verified — WO-004 dependencies line up.

### 7. Legacy lift reference — `DesignOps-plugin/package.json`

Reviewed `c:\Users\jbabc\Documents\GitHub\DesignOps-plugin\package.json`. Findings:

- **No ESLint, Prettier, or TypeScript anywhere** — the legacy repo is a Claude Code skill pack that ships Markdown + raw JS bundles, not a TS application. Only `esbuild` and `terser` as devDependencies (for the now-deprecated bundling pipeline).
- **No `.eslintrc.*`, `.prettierrc.*`, or `eslint.config.*`** in the legacy repo (confirmed via Glob).
- **No `.github/workflows/`** in the legacy repo — there's no existing CI to port.
- **Script naming pattern:** colon-namespaced (e.g. `build:docs`, `build:docs:check`, `qa:assembled-size`, `qa:config-projection`). Adopt this convention for Figmint scripts (`build:community`, `build:org`, `lint:check`, etc.) — matches WO-004 ticket text.

**Net:** lift reference produces **zero portable code/config**. WO-004 designs the toolchain from scratch on 2026-current versions.

---

## `eslint.config.mjs` skeleton (paste-ready for `/plan` review)

```js
// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { importX } from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist/**', 'build/**', 'node_modules/**', 'coverage/**', '**/*.min.js']),

  // Base JS rules — applies everywhere
  js.configs.recommended,

  // TypeScript — typed linting on src/, packages/
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['src/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Import hygiene — flat config for ESM + TS workspaces
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: ['tsconfig.json', 'packages/*/tsconfig.json'],
          alwaysTryTypes: true,
        }),
      ],
    },
  },

  // React UI shell (src/ui/) — hooks rules catch stale closures (determinism)
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },

  // Project-specific tweaks — TBD: lock during /plan
  {
    files: ['src/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // TBD during /plan:
      // - '@typescript-eslint/consistent-type-imports'
      // - '@typescript-eslint/no-restricted-imports' (block any LLM SDK imports — PRD G5)
      // - 'import-x/no-default-export' (force named exports)
    },
  },

  // Prettier — MUST be last. Disables formatting rules that conflict with prettier --write.
  eslintConfigPrettier,
]);
```

**TBD for `/plan`:**

- Whether to forbid default exports project-wide.
- Whether to add `'@typescript-eslint/no-restricted-imports'` rule that blocks `@anthropic-ai/*`, `openai`, `langchain`, etc. (PRD G5 "Zero LLM tokens consumed inside the plugin"). Treat as Phase-1 follow-up if not blocking initial CI green.
- File-pattern overrides for config files (`*.config.{ts,mjs,cjs}`) and test files (TBD — no tests yet per ticket out-of-scope).

---

## `.prettierrc.json` (paste-ready)

```json
{
  "$schema": "https://json.schemastore.org/prettierrc",
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

Companion `.prettierignore`:

```
dist
build
node_modules
coverage
*.min.js
manifest.*.json
```

(Prettier handles JSON, but keeping the dual manifests untouched avoids merge noise if hand-edited.)

---

## `.github/workflows/ci.yml` skeleton (paste-ready)

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

permissions:
  contents: read

jobs:
  ci:
    name: lint • typecheck • build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --no-audit --no-fund

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run prettier:check

      - name: Typecheck
        run: npm run typecheck

      - name: Build (community)
        run: npm run build:community

      - name: Build (org)
        run: npm run build:org
```

**`package.json` scripts WO-004 will add (paste-ready for `/plan` review):**

```jsonc
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "prettier:check": "prettier --check .",
    "prettier:write": "prettier --write .",
    "typecheck": "tsc --noEmit",
    // build:community / build:org / dev are owned by WO-002
  },
}
```

**`packageManager` field (enables `setup-node@v6` auto-caching):**

```jsonc
{
  "packageManager": "npm@10.9.0",
  "engines": { "node": ">=22" },
}
```

`/plan` should pick the actual npm pin from whatever ships with the Node 24 LTS image (use `node --version && npm --version` on the dev machine before locking).

---

## Pinned versions table (May 2026)

| Package                             | Pin               | Latest as of | Notes                                              |
| ----------------------------------- | ----------------- | ------------ | -------------------------------------------------- |
| `eslint`                            | `^10.3.0`         | 2026-05      | Flat config only. v9 EOL 2026-08-06.               |
| `@eslint/js`                        | `^10.3.0`         | 2026-05      | Match ESLint major.                                |
| `typescript-eslint`                 | `^8.58.0`         | 2026-03-30   | Merged meta-package (parser + plugin + presets).   |
| `prettier`                          | `^3.8.3`          | 2026-04-15   | v4 still alpha — do not adopt yet.                 |
| `eslint-config-prettier`            | `^10.1.8`         | 2025-07-18   | Use `/flat` subpath.                               |
| `eslint-plugin-react-hooks`         | `^7.1.1`          | 2026-04      | React 19+ compatible.                              |
| `eslint-plugin-import-x`            | `^4.16.0`         | 2026-04      | Replaces unmaintained `eslint-plugin-import`.      |
| `eslint-import-resolver-typescript` | `^4.4.0`          | 2026         | Required by `import-x` for TS workspaces.          |
| `typescript`                        | (owned by WO-002) | —            | WO-002 acceptance criterion AC #5 / Functional #2. |
| `actions/checkout`                  | `v6` (= v6.0.2)   | 2026-01-09   | Node 24 runtime.                                   |
| `actions/setup-node`                | `v6`              | 2026-Q1      | Auto-cache when `packageManager` set.              |
| Node.js                             | `24` LTS (active) | 2025-10-28   | Node 20 EOL 2026-04-30.                            |

---

## Open Questions for `/plan`

1. **Node minimum version — PRD §11.5 conflict.** PRD says "Node 20+ for build tooling" and WO-002 Functional #1 says `engines.node ≥ 20`. **Node 20 reached EOL on 2026-04-30.** Recommend `/plan` to bump to `engines.node: ">=22"` (covers Maintenance LTS users) and CI to `node-version: '24'` (Active LTS). May require updating WO-002 ticket if WO-002 is not yet built. Also flag PRD §11.5 for a small follow-up patch.
2. **`strict-type-checked` semver caveat.** typescript-eslint docs explicitly note `strict-type-checked` rules can shift in minor releases. Is the team OK accepting that churn, or should we pin to `recommended-type-checked` instead? My recommendation: take `strict-type-checked` — Figmint is in early dev, every new bug rule pays dividends.
3. **No-LLM-import rule.** Should `eslint.config.mjs` add `'@typescript-eslint/no-restricted-imports'` rules that block `@anthropic-ai/*`, `openai`, `langchain`, `@google/generative-ai`, etc., to enforce PRD G5 ("Zero LLM tokens consumed inside the plugin") at lint time? Cheap insurance. Add during `/plan`.
4. **Default-export ban.** Add `'import-x/no-default-export'`? Aligns with the contracts-package import patterns. Defer to `/plan`.
5. **Lint script aggregation.** Should `npm run lint` cover both ESLint and Prettier (chained), or remain ESLint-only with a separate `npm run prettier:check`? The skeleton above keeps them separate so CI failure logs are immediately attributable. `/plan` decides.
6. **Vitest deferred (per ticket out-of-scope).** Confirms no test runner integration in WO-004. Sprint 2 will revisit.
7. **`packageManager` exact pin.** Set to `npm@10.9.0` placeholder above — `/plan` should lock to whatever `node:24-lts` images ship with (or the dev machine's resolved version).
8. **Repository ruleset / branch protection.** WO-004 ticket doesn't currently require enabling "Require status checks to pass" branch protection on `main`. Recommend a follow-up note or small follow-up ticket — the CI workflow alone doesn't block merges without that setting.

---

## Sources

- [ESLint — Configuration Files (latest docs)][eslint-config-files]
- [ESLint — Configuration Migration Guide][eslint-mig]
- [ESLint blog — Evolving flat config with extends (defineConfig + globalIgnores)][eslint-extends-blog]
- [ESLint blog — Differences between ESLint and TypeScript (Jan 2025, updated 2026)][eslint-differences]
- [PkgPulse — ESLint 10 Flat Config Migration Guide 2026][pkgpulse-eslint-10]
- [typescript-eslint — Shared Configs][tseslint-configs]
- [typescript-eslint — Linting with Type Information][tseslint-typed-linting]
- [Prettier — npm registry version history][npm-prettier]
- [Prettier — Release 3.8.3 commit][prettier-3.8.3]
- [eslint-config-prettier README (flat config section)][ecp-readme]
- [eslint-plugin-react-hooks v7.1.1 — npm flat-config docs][eph]
- [un-ts/eslint-plugin-import-x — README][import-x]
- [e18e — Replacements for eslint-plugin-import][e18e]
- [actions/checkout — README (v6.0.2)][gha-checkout]
- [actions/setup-node — README v6][gha-setup-node]
- [GitHub Docs — Control the concurrency of workflows and jobs][gha-concurrency]
- [Stack Overflow — Cancel previous runs in PR][so-cancel-prev]
- [dev.to — GitHub Actions CI/CD: Build a Complete Node.js Pipeline (2026)][gha-pipeline-2026]
- [Node.js Release schedule (nodejs/release)][nodejs-release]
- [Node.js 22.22.3 LTS release notes (2026-05-13)][nodejs-22]

[eslint-config-files]: https://eslint.org/docs/latest/use/configure/configuration-files
[eslint-mig]: https://eslint.org/docs/latest/use/configure/migration-guide
[eslint-extends-blog]: https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/
[eslint-differences]: https://eslint.org/blog/2025/01/differences-between-eslint-and-typescript/
[pkgpulse-eslint-10]: https://www.pkgpulse.com/guides/eslint-10-flat-config-migration-guide-2026
[tseslint-configs]: https://typescript-eslint.io/users/configs
[tseslint-typed-linting]: https://typescript-eslint.io/getting-started/typed-linting
[npm-prettier]: https://registry.npmjs.org/prettier
[prettier-3.8.3]: https://github.com/prettier/prettier/commit/d7108a79ec745c04292aabf22c4c1adbd690b191
[ecp-readme]: https://github.com/prettier/eslint-config-prettier/blob/master/README.md
[eph]: https://www.npmjs.com/package/eslint-plugin-react-hooks
[import-x]: https://github.com/un-ts/eslint-plugin-import-x
[e18e]: https://e18e.dev/docs/replacements/eslint-plugin-import/
[gha-checkout]: https://github.com/actions/checkout
[gha-setup-node]: https://github.com/actions/setup-node
[gha-concurrency]: https://docs.github.com/en/enterprise-cloud@latest/actions/using-jobs/using-concurrency
[so-cancel-prev]: https://stackoverflow.com/questions/66335225/how-to-cancel-previous-runs-in-the-pr-when-you-push-new-commitsupdate-the-curre
[gha-pipeline-2026]: https://dev.to/akaranjkar08/github-actions-cicd-build-a-complete-nodejs-pipeline-2026-150
[nodejs-release]: https://github.com/nodejs/release
[nodejs-22]: https://github.com/nodejs/node/releases/tag/v22.22.3
