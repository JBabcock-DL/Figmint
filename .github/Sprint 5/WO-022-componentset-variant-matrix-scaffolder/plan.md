# WO-022 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

_Research decisions (2026-05-28 — see `research/component-scaffold-engine.md`):_

- **Scope boundary:** WO-022 = ComponentSet + variant cross-product only. Do **not** port doc pipeline (`buildPropertiesTable`, matrix specimen grid, usage cards) — WO-024..025.
- **Single call:** Collapse legacy five MCP Step 6 bundles into one `scaffold()`; shared preamble → `context.ts` + `specAdapter.ts`.
- **Variant naming:** Alphabetical axis sort → `disabled=false, size=md, variant=primary` style names.
- **`composed`:** Dispatch via `composes[]`, not an eighth layout enum. Requires optional `RegistryV1` read — beta until registry I/O lands (WO-026).
- **Bindings / properties:** Hex fallbacks in builders; WO-023 binds, WO-024 adds `addComponentProperty`.
- **Idempotency:** Replace existing ComponentSet matched by `pluginData('figmint.scaffoldId')` + matrix hash.
- **Audit:** WO-022 returns scaffold audit rows (`variant-count`, `naming`, `one-px-master`); full `runAudit('component')` extension may split with WO-023.
- **Pre-plan spikes:** SPK-022-1 (3×2×2 combineAsVariants), SPK-022-2 (chip minimal), SPK-022-3 (composed + registry — deferrable).

## References

- Ticket: `./ticket.md`
- Research: `./research/component-scaffold-engine.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
