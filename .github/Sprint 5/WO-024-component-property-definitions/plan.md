# WO-024 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes (from research)

- **Pipeline order locked:** `scaffold()` (WO-022) → `applyBindings()` (WO-023) → `applyProperties()` (WO-024). Do not run properties before bindings.
- **VARIANT props:** created by WO-022 `combineAsVariants`; WO-024 validates matrix ↔ `componentPropertyDefinitions` only — do not call `addComponentProperty(..., 'VARIANT', ...)`.
- **Implementation pattern:** iterate each variant `ComponentNode` under the set (legacy `component-composed.mcp.js` L425–489), not a single set-root call without bindings.
- **Prop filter:** skip `props[]` when name matches `variantMatrix` key; skip doc-only names (`className`, `asChild`, `type`, …); skip `number` type v1.
- **Implicit props:** honor `componentProps` + `iconSlots` flags → `Label` TEXT, `Leading icon` / `Trailing icon` BOOLEAN (legacy §3.3.2 display names).
- **API return:** `ApplyPropertiesResult` with suffixed Figma keys (`"loading#id"`) for WO-025 usage frame + audit.
- **Spike deferred:** SPK-024-3 live sandbox proof blocked on WO-022 scaffold landing.
- **Fixture:** create `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json` — do not use CSS-selector `component-spec-button.json` for scaffold tests.

## References

- Ticket: `./ticket.md`
- Research: `./research/component-property-definitions.md`
- Upstream: `../WO-023-variable-bindings-application/research/variable-bindings-application.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
