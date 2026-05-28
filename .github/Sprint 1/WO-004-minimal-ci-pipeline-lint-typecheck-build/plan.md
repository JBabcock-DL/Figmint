# Plan — WO-004: Minimal CI pipeline (lint + typecheck + build)

> Authoritative plan. Toolchain + GHA recipe locked by [`research/eslint-and-ci-config.md`](research/eslint-and-ci-config.md); cross-ticket reconciliation decisions in `memory.md` (2026-05-27 — Node 22 LTS baseline, no LLM-SDK lint ban, git strategy `main`). Build agents work on `main` and leave changes uncommitted for the user to review.

## Approach

Stand up the FigHub CI toolchain in three files: a **flat `eslint.config.mjs`** at the root (the only forward path — ESLint 10 shipped Feb 2026 and removed legacy `.eslintrc.*` support; ESLint 9 EOL is 2026-08-06), a `.prettierrc.json` + `.prettierignore` pair, and a single-job `.github/workflows/ci.yml`. The lint stack is intentionally small (`@eslint/js` recommended + `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` with typed linting via `projectService: true` + `eslint-plugin-import-x` for module hygiene + `eslint-plugin-react-hooks` scoped to `src/ui/**` + `eslint-config-prettier/flat` last). The workflow runs **sequentially** on `ubuntu-latest` Node 24 (forward-testing the workspace `engines.node: ">=22"` floor locked in WO-002) and goes red on any of: lint, format drift, typecheck, community build, org build. Verification is live: a trivial PR proves the happy path, then a deliberately broken PR proves typecheck and Prettier negatives, both reverted. CI alone does not block merges — enabling `Require status checks` branch protection on `main` is captured as a Sprint 2 admin follow-up, not part of this WO.

## Steps

- [ ] **Step 1** — Add the seven pinned dev deps to root `package.json` at the May-2026 versions locked by research §Pinned versions table: `eslint@^10.3.0`, `@eslint/js@^10.3.0`, `typescript-eslint@^8.58.0`, `prettier@^3.8.3`, `eslint-config-prettier@^10.1.8`, `eslint-plugin-react-hooks@^7.1.1`, `eslint-plugin-import-x@^4.16.0`, `eslint-import-resolver-typescript@^4.4.0`. Add the top-level `"packageManager": "npm@10.9.0"` field (exact pin re-confirmed during BUILD by running `node --version && npm --version` on the dev machine — must match whatever ships with the Node 24 LTS image). Verify `npm install` reports zero peer-dep warnings.
- [ ] **Step 2** — Add five npm scripts to root `package.json`:
  - `"lint": "eslint ."`
  - `"lint:fix": "eslint . --fix"`
  - `"format": "prettier . --write"`
  - `"format:check": "prettier . --check"`
  - `"typecheck": "tsc --noEmit -p ."` (root `tsconfig.json` covers `src/` + `packages/*` via `include`; WO-003 does not introduce TypeScript project references, so `tsc -b` is not needed).
  - `build:community`, `build:org`, and `dev` remain WO-002's responsibility — do not redefine.
- [ ] **Step 3** — Author `eslint.config.mjs` at repo root using the paste-ready skeleton in research §`eslint.config.mjs skeleton`:
  - Use `defineConfig()` + `globalIgnores()` from `eslint/config`.
  - `globalIgnores(['dist/**', 'build/**', 'node_modules/**', 'coverage/**', '**/*.min.js', 'packages/*/dist/**'])`.
  - Layer in this order: `js.configs.recommended` → `...tseslint.configs.strictTypeChecked` → `...tseslint.configs.stylisticTypeChecked` → typed-linting block scoped to `src/**/*.{ts,tsx}` + `packages/**/*.{ts,tsx}` with `languageOptions.parserOptions = { projectService: true, tsconfigRootDir: import.meta.dirname }` → `importX.flatConfigs.recommended` + `importX.flatConfigs.typescript` with `createTypeScriptImportResolver({ project: ['tsconfig.json', 'packages/*/tsconfig.json'], alwaysTryTypes: true })` → React Hooks block (`...reactHooks.configs.flat.recommended`) scoped to `src/ui/**/*.{ts,tsx}` → project-specific `@typescript-eslint/no-unused-vars` override with `argsIgnorePattern: '^_'` → `eslint-config-prettier/flat` **last**.
  - **Do NOT** add `eslint-plugin-react` (stylistic — deferred per research §4).
  - **Do NOT** add `eslint-plugin-prettier` (2026 anti-pattern per research §4).
  - **Do NOT** add `@typescript-eslint/no-restricted-imports` blocking LLM SDKs — locked per user decision (PRD G5 is a plugin-runtime goal, not a user-input constraint; designers may freely import LLM-generated data).
- [ ] **Step 4** — Author `.prettierrc.json` at repo root with the values locked by research §`.prettierrc.json`:
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
  packages/*/dist
  packages/contracts/dist/*.schema.json
  ```
  The generated schema files (WO-003 `packages/contracts/dist/*.schema.json`) are excluded to avoid format thrash on regen.
- [ ] **Step 5** — Author `.github/workflows/ci.yml` using the paste-ready GHA recipe in research §`.github/workflows/ci.yml skeleton`:
  - Triggers: `pull_request: { branches: [main] }` and `push: { branches: [main] }`.
  - `concurrency: { group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}, cancel-in-progress: ${{ github.event_name == 'pull_request' }} }` — PR pushes cancel stale runs, `main` runs always finish.
  - `permissions: { contents: read }` (least-privilege baseline; no other scopes needed).
  - Single job `ci` on `ubuntu-latest`, `timeout-minutes: 10`.
  - Step ordering (fail-fast, cheapest → most expensive, **lint + format kept as two CI steps for clearer failure attribution**):
    1. `actions/checkout@v6`
    2. `actions/setup-node@v6` with `node-version: '24'` (auto-cache via `packageManager` field — no explicit `cache:` input needed, but pass `cache: 'npm'` defensively per research §5)
    3. `npm ci --no-audit --no-fund`
    4. `npm run lint`
    5. `npm run format:check`
    6. `npm run typecheck`
    7. `npm run build:community`
    8. `npm run build:org`
- [ ] **Step 6** — Add a CI status badge to `README.md` at the top of the file (immediately under the H1): `![CI](https://github.com/JBabcock-DL/FigHub/actions/workflows/ci.yml/badge.svg)`. If `README.md` does not yet exist or is empty, create/seed it with an H1 (`# FigHub`) + the badge line + a one-line description; WO-002's scaffold should produce one, but verify and add the badge regardless.
- [ ] **Step 7** — **Smoke test locally** on the working branch before pushing:
  - `npm install` completes with zero peer-dep warnings.
  - `npm run lint` exits 0.
  - `npm run format:check` exits 0.
  - `npm run typecheck` exits 0.
  - `npm run build:community` exits 0 and produces `dist/code.js` + `dist/ui.html` + `dist/manifest.json` (community variant).
  - `npm run build:org` exits 0 and produces a distinct `dist/manifest.json` (org variant — differs on `name` + `networkAccess.allowedDomains`).
  - Record any local Node/npm version mismatch versus the `packageManager` pin set in Step 1; reconcile before pushing.
- [ ] **Step 8** — **Positive CI run.** Push the branch and open a trivial PR (e.g. tiny README typo or a `.gitkeep` touch). Confirm the `CI` workflow auto-triggers, all eight steps go green, the badge in `README.md` flips to passing, and total runtime is well under the 10-minute timeout. Capture the run URL in the PR description for traceability.
- [ ] **Step 9** — **Negative test — TypeScript.** On a throwaway branch, introduce a deliberate type error (e.g. `const x: number = "string";` in a placeholder src file). Push, open a draft PR, confirm the workflow fails specifically at the **Typecheck** step (not lint, not format — fail-fast ordering proves it). Revert the change and close the draft PR. Record the failing run URL in the verification notes for this ticket.
- [ ] **Step 10** — **Negative test — Prettier.** On a throwaway branch, introduce deliberate format drift (e.g. flip a single-quote string to double quotes in any committed `.ts` file, or remove a trailing comma). Push, open a draft PR, confirm the workflow fails specifically at the **Format check** step. Revert the change and close the draft PR. Record the failing run URL in the verification notes. (Per ticket Acceptance Criteria, both negative tests must be evidenced — capture run URLs, not just "verified locally".)

## Build Agents

<!-- Every step assigned. Phases sequential, agents within a phase parallel. Git strategy: main (uncommitted; user reviews). Domains grouped by what each agent owns — package.json deps/scripts vs config files + GHA workflow + README badge vs CI verification runs. -->

### Phase 1 (parallel)

- **`code-build`** — Steps **1, 2**: Root `package.json` edits — add the seven pinned dev deps + `packageManager` field (Step 1), add the five npm scripts (`lint`, `lint:fix`, `format`, `format:check`, `typecheck`) (Step 2). Owns `package.json` exclusively in this phase. Coordinate version pins exactly to the research §Pinned versions table — do not let `npm install` resolve loose ranges into newer majors.
- **`script-build`** — Steps **3, 4, 5, 6**: `eslint.config.mjs` (flat config — Step 3), `.prettierrc.json` + `.prettierignore` (Step 4), `.github/workflows/ci.yml` (Step 5), `README.md` CI badge (Step 6). Owns all config + GHA workflow + README authoring. Use the paste-ready skeletons in research §`eslint.config.mjs skeleton`, §`.prettierrc.json`, §`.github/workflows/ci.yml skeleton` verbatim, applying the four config-level locks from §Notes (no `eslint-plugin-react`, no `eslint-plugin-prettier`, no LLM-SDK import block, two separate lint + format:check CI steps). Coordinate with `code-build` only on the script names from Step 2 (`lint`, `format:check`, `typecheck`) — both agents must reference the same names.

### Phase 2 (sequential, after Phase 1)

- **`code-build`** — Steps **7, 8, 9, 10**: Local smoke test (Step 7), positive CI run via trivial PR (Step 8), negative TS-error test (Step 9), negative Prettier-drift test (Step 10). Phase 1 must be complete because every step depends on the configs + workflow existing. **Pause before Step 8 if Step 7 surfaces any failure** — do not push a known-red branch to CI; fix locally first. Capture three run URLs (one green, two red) in the verification notes for VQA evidence. Negative-test branches stay throwaway — do **not** merge them; the deliberate-break commits are reverted before the draft PRs close.

## Dependencies & Tools

- **WO-002** — provides `npm run build:community` + `npm run build:org` scripts, `engines.node: ">=22.0.0"`, root `tsconfig.json`, `src/` tree, and the placeholder UI. WO-004 **must build after WO-002 is merged** — the workflow steps 7–8 (`npm run build:community`/`org`) and `npm run typecheck` both depend on WO-002's outputs existing. If WO-002 is mid-flight, pause WO-004 BUILD until WO-002 lands.
- **WO-003** — provides the `packages/contracts/` workspace package. Typecheck scope and ESLint resolver scope (`packages/*/tsconfig.json` in the `createTypeScriptImportResolver` `project` array) both depend on WO-003's directory shape. WO-004 **must build after WO-003 is merged** so the resolver does not point at a non-existent `tsconfig.json`. If WO-003 has not landed when WO-004 BUILD starts, drop `packages/*/tsconfig.json` from the resolver `project` list temporarily and TODO a follow-up to re-add it post-WO-003.
- **Node.js 22 LTS** locally (workspace baseline from WO-002 / `memory.md`); Node 24 LTS in CI (forward-test the floor). Verify with `node --version` before installing.
- **GitHub Actions** — no special permissions beyond the default `contents: read` declared in the workflow. No org-level secrets, no PAT tokens, no third-party Marketplace actions outside `actions/checkout@v6` + `actions/setup-node@v6`.
- **MCP servers** — none required for this ticket. GitHub backend is already wired per `workflow.md` for ticket-status moves; no Figma MCP usage.
- **External APIs** — none consumed by this ticket. CI calls only `https://github.com` (action downloads) + the npm registry (`npm ci`).

## Open Questions

- **OQ-1 (from research §Open Questions §2):** Accept `typescript-eslint` `strict-type-checked` semver churn? **Default: YES** (locked by research recommendation — FigHub is in early dev, every new bug rule pays dividends; flagged here for visibility only). If a minor `typescript-eslint` upgrade introduces churn-level rule changes during Sprint 2+, revisit by pinning a narrower range or dropping to `recommended-type-checked`.
- **OQ-2 (from research §Open Questions §4):** Ban default exports project-wide via `import-x/no-default-export`? **Default: NO** (less aggressive — FigHub's source surface is too small to be opinionated yet). Flagged as a Sprint 2+ future tightening; reconsider when `packages/contracts/` has multi-file barrel exports.
- **OQ-3 (from research §Open Questions §7):** `packageManager` exact version. Plan uses placeholder `npm@10.9.0`. **BUILD must re-pin** this to whatever `npm` actually ships with the dev machine's Node 24 LTS image at the time `code-build` runs — verify via `npm --version` and update the field before committing. If the image's npm is older than 10.9.0, prefer pinning to the image version (no surprises) over forcing a newer npm.
- **OQ-4 (out of scope — Sprint 2 admin follow-up ticket):** Enable `Require status checks to pass` branch protection on `main` so this CI workflow actually blocks merges. CI alone does not gate merges without that setting. **Create a separate Sprint 2 admin ticket** (small WO; repo settings only — no code) — explicitly out of scope for WO-004. Flag during VQA so it does not get lost.

## Notes

Captured from research (2026-05-27, see [`research/eslint-and-ci-config.md`](research/eslint-and-ci-config.md) for citations) and user planning-gate sign-off (`memory.md` Changelog 2026-05-27).

- **ESLint config style locked:** flat `eslint.config.mjs` only. ESLint 10 (Feb 2026) removed the legacy `.eslintrc.*` escape hatch entirely; ESLint 9.x EOL is 2026-08-06. Do not write `.eslintrc.cjs` / `.eslintrc.json` under any circumstances.
- **TS preset locked:** `tseslint.configs.strictTypeChecked` + `tseslint.configs.stylisticTypeChecked` with `projectService: true` for incremental typed linting. Aligns with PRD §11.2 determinism (no implicit any, no unsafe member access, no floating promises, no misused promises).
- **Plugin stack locked:** `@eslint/js` + `typescript-eslint` (merged meta-package — single import for parser + plugin + configs) + `eslint-plugin-react-hooks` scoped to `src/ui/**` only + `eslint-plugin-import-x` (**not** `eslint-plugin-import` — unmaintained per e18e replacements) + `eslint-config-prettier/flat` last. No `eslint-plugin-react` (stylistic, deferred until Bootstrap tab in Sprint 4). No `eslint-plugin-prettier` (2026 anti-pattern — runs Prettier as an ESLint rule, slows the linter, floods the editor with format-noise; Prettier runs as a separate CI step instead).
- **No LLM-SDK lint ban — locked per user decision (`memory.md` Changelog 2026-05-27):** PRD G5 "Zero LLM tokens consumed inside the plugin" is a **plugin-runtime architectural goal**, not a constraint on user input. Users may freely import LLM-derived data, paste in JSON/Markdown generated via Claude or any other LLM upstream, etc. The plugin itself never consumes LLM tokens on the user's behalf — but that is enforced by code-review + the plugin's own architecture, not by an ESLint `no-restricted-imports` rule blocking `@anthropic-ai/*` / `openai` / `langchain` / `@google/generative-ai`. **Do not add such a rule.** If a future Sprint surfaces real risk of accidental SDK imports, revisit then.
- **Pinned versions (May 2026, from research §Pinned versions table):** `eslint@^10.3.0`, `@eslint/js@^10.3.0`, `typescript-eslint@^8.58.0`, `prettier@^3.8.3`, `eslint-config-prettier@^10.1.8`, `eslint-plugin-react-hooks@^7.1.1`, `eslint-plugin-import-x@^4.16.0`, `eslint-import-resolver-typescript@^4.4.0`, `actions/checkout@v6` (= v6.0.2, 2026-01-09), `actions/setup-node@v6` (2026-Q1).
- **GHA workflow locked:** single sequential job (no matrix — two manifests is too few to justify the overhead per research §5), `ubuntu-latest`, `node-version: '24'`, auto-cache via `packageManager` field (`setup-node@v6` reads it without an explicit `cache:` input, but pass `cache: 'npm'` defensively), `concurrency.group = ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}` with `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` (PR pushes cancel stale runs; `main` runs are never cancelled).
- **Two CI steps for lint + format (NOT aggregated)** — clearer failure attribution. `npm run lint` runs ESLint only; `npm run format:check` runs `prettier --check .` as a separate step. Research §Open Questions §5 flagged the choice; this plan locks it.
- **Workspace Node baseline:** `engines.node: ">=22.0.0"` locked by WO-002 (`memory.md` Quick reference). CI runs on Node 24 to forward-test the floor without raising the floor — older contributors on Node 22 LTS maintenance still install cleanly.
- **`packageManager` field pinned to `npm@10.9.0`** as a placeholder — BUILD re-pins to the exact version `npm --version` reports on the dev machine before committing (OQ-3). Required for `setup-node@v6` auto-cache.
- **Workflow step order locked:** checkout → setup-node → `npm ci --no-audit --no-fund` → `npm run lint` → `npm run format:check` → `npm run typecheck` → `npm run build:community` → `npm run build:org`. Fail-fast ordering: cheapest fails first.
- **Dependency order:** WO-004 BUILD **after** WO-002 + WO-003 are merged. Typecheck depends on the workspace shape WO-003 introduces; build scripts depend on WO-002's outputs. Do not start WO-004 BUILD while either dependency is mid-flight.
- **Git strategy locked: `main` (uncommitted).** Build agents work on the current branch and leave changes uncommitted for the user to review and commit. No auto-PR. No per-agent branches. No worktrees (`memory.md` Build & git §).
- **Branch protection on `main` is OUT OF SCOPE** for this WO — CI alone does not block merges; "Require status checks to pass" must be enabled in repo settings to gate merges on the new workflow. Create a separate Sprint 2 admin ticket (small WO, settings-only, no code). Flag during VQA so it does not get lost (OQ-4).
- **Legacy lift outcome:** `DesignOps-plugin` has zero ESLint / Prettier / TypeScript / `.github/workflows/` configs. The only thing inherited from the legacy repo is the colon-namespaced script naming convention (`build:community`, `format:check`).

## References

- Ticket: [`./ticket.md`](./ticket.md)
- Research: [`./research/eslint-and-ci-config.md`](research/eslint-and-ci-config.md)
- PRD anchors: `Docs/PRD.md` §11.5 (Node 22 LTS, TS strict — patched 2026-05-27 per `memory.md` Changelog)
- Cross-ticket reconciliation: `memory.md` Quick reference + Changelog (Node 22 baseline, no LLM-SDK lint ban, git strategy `main`)
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
