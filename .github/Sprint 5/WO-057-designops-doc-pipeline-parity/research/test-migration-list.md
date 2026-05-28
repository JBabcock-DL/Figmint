# Test migration list — Phase 0 Step 1

Grep target: `tests/unit/core/components/scaffold/**` for legacy variant keys (`primary`, `secondary`, `outline`, `disabled` as variant axis/key).

## Summary

| Legacy pattern | Shadcn replacement |
| --- | --- |
| `variant=primary` | `variant=default` |
| `variant=secondary` | `variant=secondary` (unchanged) |
| `variant=outline` | `variant=outline` (unchanged — still a shadcn variant) |
| `disabled` variant matrix axis | **Removed** — `disabled` is a boolean prop / matrix opacity state only |
| `size=md` | `size=default` |
| 12-variant canonical (3×2×2) | 24-variant (6×4, no disabled axis) |

## Files requiring migration (Step 5)

| File | Legacy hits | Migration action |
| --- | --- | --- |
| `auditRows.test.ts` | `variant=primary` (×3) | Rename mock variant names to `variant=default` |
| `resolveVariantComponent.test.ts` | `disabled=false, size=sm, variant=primary` | Drop disabled axis; use `size=sm, variant=default` |
| `specAdapter.test.ts` | `{ variant: 'primary' }`, `styleByVariantKey.primary` | Use `default` (update `chip-button-minimal.v1.json` variant axis) |
| `archetypes/chip.test.ts` | `{ variant: 'primary' }`, `variant=primary` | Use `default` |
| `fixture.smoke.test.ts` | expects `['default', 'outline', 'destructive']` | Assert full shadcn 6-variant axis + 4-size axis |

## Files with hits — no migration needed

| File | Reason |
| --- | --- |
| `applyBindings.test.ts` | `color/primary/default` is a **variable path**, not a variant key |
| `applyProperties.test.ts` | No legacy variant keys |
| `applyPropertiesPreCombine.test.ts` | `outline` is a valid shadcn variant; inline matrix is generic |
| `idempotency.test.ts` | Uses `chip-button-3x2x2.v1.json` (generic 3×2×2 test matrix, not canonical Button) |
| `usageFrameAudit.test.ts` | No legacy variant key hits |
| `scaffold.integration.test.ts` | Uses `chip-button-3x2x2.v1.json` (generic matrix fixture) |
| `variantMatrix.test.ts` | Generic matrix helpers tested via `chip-button-3x2x2.v1.json` |
| `variantPropsValidate.test.ts` | `outline` valid; `disabled` axis tests generic validation |
| `usageFrameHelpers.test.ts` | Generic combo formatting (disabled axis still valid for non-Button specs) |
| `selectorParse.test.ts` | `Theme/color/primary/default` is a variable path |
| `curateVariantCombos.test.ts` | Uses `tests/fixtures/component-spec-button.json` (separate legacy 3×3 fixture; out of Step 2–4 scope) |

## Fixture replacements (Steps 2–4)

| Path | Action |
| --- | --- |
| `tests/fixtures/component-spec-button-canonical.json` | Replace with shadcn 6×4 = 24 variants |
| `src/io/formats/__fixtures__/component-spec-button.json` | Same shadcn shape + regenerate `.md` sidecar |
| `src/core/components/scaffold/__fixtures__/component-spec-button-chip.v1.json` | Same shadcn shape |

## Related fixture (supporting Step 5)

| Path | Action |
| --- | --- |
| `tests/fixtures/component-spec/chip-button-minimal.v1.json` | `variant: ["primary"]` → `["default"]` |
