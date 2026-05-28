# WO-027 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

_Research (2026-05-28) — `research/components-tab-forward-flow.md`_

### Locked from research

- **Tab shell:** Extend `App.tsx` with `'components'` tab; create `src/ui/tabs/Components.tsx`.
- **Message contract:** `scaffold/run` (UI→main), `scaffold/progress`, `scaffold/result`, `scaffold/error` (main→UI) — full TypeScript in research §Orchestration message contract.
- **Main orchestrator:** `src/core/components/scaffold/runScaffold.ts` sequences WO-022 → WO-023 → WO-024 → WO-025 → WO-026 on target page `Components`.
- **Ingest:** WO-006 ports; filter `component-spec` | `registry` only; registry path default `.figmint-registry.json`.
- **Spec resolution (registry pick):** Try `design/components/{key}.component-spec.v1.json`, then `design/component-specs/{key}.v1.json`; bundled canonical fixture for VQA only.
- **Preview gate:** Editable `variantMatrix`, `props`, `bindings`; schema validate before Scaffold CTA.
- **Post-success:** Inline `ExportSheet` with `RegistryV1`; no silent PR.
- **Canonical fixture:** Add `tests/fixtures/component-spec-button-canonical.json` (do not use `src/io/formats/__fixtures__/component-spec-button.json` for scaffold — invalid selectors).

### Blockers / dependencies

- **Build gate:** WO-022, WO-023, WO-024, WO-025, WO-026 must have non-stub `plan.md` and landed APIs before WO-027 `/build`.
- **VQA:** Plugin Sandbox `file_key=cVdPraIafWFBRZnzMPhtrW`; bootstrap-complete precondition; SPK-027-1 G2 bench at `/vqa`.

### Open for `/plan`

- Design mock `node_id` when Figma file linked.
- Optional `registryPath` field in Settings / `StoredGitHubConfig`.
- Structured vs JSON editors for spec draft (default: JSON textareas).

## References

- Ticket: `./ticket.md`
- Research: `./research/components-tab-forward-flow.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
