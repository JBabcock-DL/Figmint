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

As a Figmint developer working on parallel feature branches, I want PRs to fail before merge if they don't build, lint, or typecheck, so we never regress the foundation while Sprint 2+ work lands in parallel.

## Hypothesis (optional)

A lightweight ESLint + Prettier + `tsc --noEmit` + dual `npm run build` workflow catches >90% of foundation regressions at zero ongoing maintenance cost.

---

## User stories

- [ ] As a developer, every PR to `main` triggers the workflow automatically.
- [ ] As a developer, a TS error in a PR fails the workflow and blocks merge.
- [ ] As a developer, a `prettier --check` failure fails the workflow.
- [ ] As a reviewer, the CI status badge tells me at-a-glance whether to start review.

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (CI / infra ticket).**

---

## Requirements

### Functional

1. ESLint config (`.eslintrc.cjs` or flat config `eslint.config.mjs`) covers `src/` and `packages/`.
2. Prettier config (`.prettierrc`) defines formatting (2-space indent, single-quote, trailing comma, etc. — confirm exact rules during `/plan`).
3. `.github/workflows/ci.yml` runs on `pull_request` against `main` with these steps:
   - Checkout
   - Setup Node 20+
   - `npm ci`
   - `npm run lint`
   - `npm run typecheck` (`tsc --noEmit`)
   - `npm run build:community`
   - `npm run build:org`
4. Workflow uses GitHub-hosted ubuntu-latest runner.
5. `package.json` exposes the four scripts above (`lint`, `typecheck`, `build:community`, `build:org`).

### Visual / UX

- N/A.

### Technical / architectural

- **Lift reference (steal patterns):**
  - `DesignOps-plugin/package.json` `verify` / `qa:*` script naming pattern (e.g. `qa:assemble-component-code`) — adapt naming for figmint contexts where similar QA scripts emerge in Sprint 2+
  - `DesignOps-plugin` existing ESLint/Prettier rules — port what survives, drop MCP-specific lint patterns (no more `use_figma` payload checks)
- Workflow concurrency: cancel in-progress runs on the same branch when a new push lands.
- Cache `~/.npm` between runs for faster CI.

---

## Acceptance criteria *(definition of done)*

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

- Optional: flat ESLint config (`eslint.config.mjs`) vs legacy `.eslintrc.cjs` — pick during `/plan`.

## 📋 Ready for `/plan`

- Dependencies: WO-002 (needs `npm run build:community` / `build:org` scripts to exist), WO-003 (typecheck must include the contracts workspace).
- `plan.md` should lock the exact lint rule set and workflow.yml structure.

## 🛠️ Ready for `/build`

- After WO-002 + WO-003 lands: `/script-build` (workflow + config files) — single domain.

## References

- PRD: `Docs/PRD.md` §11.5
- Lift reference: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/package.json` (scripts), repo-root ESLint/Prettier configs
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
