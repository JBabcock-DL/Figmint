# WO-023 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

_Research decisions (2026-05-28) — see [research/variable-bindings-application.md](./research/variable-bindings-application.md)._

- **Selector grammar locked:** `{nodePath}.{kind}` — slash layer paths from variant root; kinds: `fill`, `stroke`, `radius`, `padding`, `gap`, `text-style`.
- **Variable paths:** Figma `variable.name` only (`color/primary/default`, …); optional `{Collection}/` prefix strip; **no hex fallback**.
- **WO-022 contract:** must name layers for selectors (`text/label`, `icon-slot/*`, …) — cross-ref research §Key Findings #4.
- **Reuse:** `bindPaintToVar` / `bindStrokeToVar`, `ensureLocalVariableMap`, `resolvePath`; TextStyle apply pattern from `typographyStyleBinding.ts`.
- **Audit:** extend `runAudit` `scope: 'component'` with `comp/binding-*` rules; input = `ApplyBindingsResult`.
- **Order:** `scaffold()` → `applyBindings()` → `applyProperties()` (WO-024).
- **SPK-023-3** (live sandbox bind) deferred until WO-022 scaffold lands.
- **Locked API:** `applyBindings(spec, componentSet, options?) → ApplyBindingsResult` — full signature in research §Recommendations.

## References

- Ticket: `./ticket.md`
- Research: `./research/variable-bindings-application.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
