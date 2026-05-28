---
type: work-order
github_issue: 6
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt4BeI
---

## Goal

Set up a minimal CI pipeline that protects `main` from broken builds, lint regressions, or type errors. Runs on every PR — lint → typecheck → build:community → build:org. Cheap to add now, valuable from the Phase 0 spike (WO-005) forward.

PRD anchors: `Docs/PRD.md` §11.5 (Compatibility / Node 20+ / TS strict).

---

## Problem story

As a FigHub developer working on parallel feature branches, I want PRs to fail before merge if they don't build, lint, or typecheck, so we never regress the foundation while Sprint 2+ work lands in parallel.

## Hypothesis (optional)

A lightweight ESLint + Prettier + `tsc --noEmit` + dual `npm run build` workflow catches >90% of foundation regressions at zero ongoing maintenance cost.

---

## User stories

- [ ] As a developer, every PR to `main` triggers the workflow automatically.
- [ ] As a developer, a TS error in a PR fails the workflow and blocks merge.
- [ ] As a developer, a `prettier --check` failure fails the workflow.
- [ ] As a reviewer, the CI status badge tells me at-a-glance whether to start review.

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (CI / infra ticket).**

---

## Requirements

### Functional

1. **Flat ESLint config (`eslint.config.mjs`)** covers `src/` and `packages/`. Uses `defineConfig()` from `eslint/config` with `@eslint/js` recommended, `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` (typed linting via `projectService: true`), `eslint-plugin-react-hooks` flat `recommended` for `src/ui/**`, `eslint-plugin-import-x` for module hygiene, and `eslint-config-prettier/flat` last. Legacy `.eslintrc.*` is **not** an option — ESLint 10 (Feb 2026) removed legacy config support and ESLint 9 EOL is 2026-08-06. See [research/eslint-and-ci-config.md](research/eslint-and-ci-config.md).
2. Prettier config (`.prettierrc.json`) defines formatting: `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`, `semi: true`, `arrowParens: "always"`, `endOfLine: "lf"`. Companion `.prettierignore` covers `dist`, `build`, `node_modules`, `coverage`, `*.min.js`, `manifest.*.json`. Exact final values may be reconfirmed during `/plan`.
3. `.github/workflows/ci.yml` runs on `pull_request` and `push` against `main` with these steps (paste-ready skeleton in [research/eslint-and-ci-config.md](research/eslint-and-ci-config.md)):
   - `actions/checkout@v6`
   - `actions/setup-node@v6` with `node-version: '24'` and `cache: 'npm'`
   - `npm ci --no-audit --no-fund`
   - `npm run lint`
   - `npm run prettier:check`
   - `npm run typecheck` (`tsc --noEmit`)
   - `npm run build:community`
   - `npm run build:org`
4. Workflow uses GitHub-hosted `ubuntu-latest` runner.
5. `package.json` exposes the scripts: `lint`, `lint:fix`, `prettier:check`, `prettier:write`, `typecheck`. (`build:community`, `build:org`, `dev` remain WO-002's responsibility.) Also adds top-level `"packageManager": "npm@<pin>"` so `setup-node@v6` auto-caches `~/.npm`.
6. Workflow declares `concurrency.group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}` with `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` — PR pushes cancel stale runs; `main` runs are never cancelled.

### Visual / UX

- N/A.

### Technical / architectural

- **Lift reference (steal patterns):**
  - `DesignOps-plugin/package.json` colon-namespaced script convention (e.g. `build:docs:check`, `qa:assembled-size`) — adopt the colon style for FigHub scripts where QA / verify variants emerge in Sprint 2+.
  - ~~`DesignOps-plugin` existing ESLint/Prettier rules~~ — **none exist in the legacy repo** (confirmed by research 2026-05-27). Toolchain is designed fresh on 2026-current versions.
- Workflow concurrency: cancel in-progress runs on the same branch when a new push lands (pattern locked in research doc).
- Cache `~/.npm` between runs for faster CI — accomplished by setting `packageManager` in `package.json` so `setup-node@v6` auto-caches (no explicit `actions/cache@v4` step needed).

---

## Acceptance criteria _(definition of done)_

- [ ] `.github/workflows/ci.yml` exists and is syntactically valid (`gh workflow view` returns it).
- [ ] A trivial PR runs the workflow end-to-end and goes green.
- [ ] A PR that introduces a TS error fails the workflow (verified by an intentional break + revert during testing).
- [ ] A PR that introduces a Prettier formatting drift fails the workflow.
- [ ] Build artifacts (community + org) are produced as part of the workflow (verified locally; CI does not need to upload them).
- [ ] CI badge link added to `README.md`.

## Out of scope

- Vitest / Jest test runner integration (deferred until Sprint 2 has actual tests to run).
- Code coverage reporting.
- Automatic version bumping / changelog generation.
- Deployment / publish workflows (manual until v1 ships).
- Security scanning (e.g. CodeQL) — add later if needed.

---

## Testing & verification

### Functional QA

- Open a draft PR with a known-good change → workflow goes green.
- Open a draft PR with `const x: number = "string"` somewhere → workflow goes red at typecheck step.
- Open a draft PR with unformatted code → workflow goes red at lint step.

### Visual / design QA

- N/A.

### Accessibility

- N/A.

### Telemetry / observability

- N/A.

---

## Figma VQA Checklist

**N/A — no Figma artifact (CI / infra ticket).**

---

## 🔍 Ready for `/research`

- [x] ESLint flat config + GHA workflow patterns locked — see [eslint-and-ci-config.md](research/eslint-and-ci-config.md).

## 📋 Ready for `/plan`

- Dependencies: WO-002 (needs `npm run build:community` / `build:org` scripts to exist + `package.json` / `tsconfig.json` foundations), WO-003 (typecheck must include the contracts workspace; lint resolver must find `packages/*/tsconfig.json`).
- `plan.md` should:
  - Lock the project-specific rule overrides (no-LLM-import block, no-default-export Y/N, type-import enforcement Y/N — see Open Questions in research doc).
  - Resolve the **Node 20 EOL issue** flagged in research: bump `engines.node` to `>=22` (or `>=24`) and align with PRD §11.5 + WO-002 Functional #1 (currently both say "Node 20+"). Node 20 reached EOL on 2026-04-30.
  - Pin exact `packageManager` version (e.g. `npm@10.9.0`) once the dev machine's Node 24 LTS image is confirmed.
  - Decide whether `npm run lint` aggregates ESLint + Prettier or stays ESLint-only with `prettier:check` as a separate CI step.
  - Decide whether to add a follow-up note about enabling `Require status checks` branch protection on `main` (CI alone does not block merges).

## 🛠️ Ready for `/build`

- After WO-002 + WO-003 lands: `/script-build` (workflow + config files) — single domain.

## References

- PRD: `Docs/PRD.md` §11.5 (Compatibility / Node 20+ / TS strict) — **flag:** Node 20 EOL 2026-04-30; research recommends bumping to Node 22+ (LTS maintenance) or Node 24 (LTS active).
- Research: [`research/eslint-and-ci-config.md`](research/eslint-and-ci-config.md) — paste-ready `eslint.config.mjs`, `.prettierrc.json`, and `.github/workflows/ci.yml` skeletons + pinned-versions table (May 2026).
- Lift reference: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/package.json` (script naming convention — colon-namespaced like `build:docs:check`, `qa:assembled-size`; **no ESLint / Prettier / TS / CI configs present in legacy repo** — toolchain is designed fresh).
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
