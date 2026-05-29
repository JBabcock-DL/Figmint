---
type: work-order
github_issue: 28
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JNQ
blocked_by: WO-057
note: Instance-gallery emitter is replaced by WO-057 Step 19 (Do/Don't usage section per §6). FR-SCAF-5 intent is preserved but delivered via WO-057's `buildUsageNotes`, not this ticket's instance gallery. /vqa Ship gated on WO-057.
---

## Goal

Generate a **usage-examples frame** beside the scaffolded `ComponentSet` showing **curated `InstanceNode` examples** across variant combinations (FR-SCAF-5). This is an **instance gallery**, not the legacy DesignOps Do/Don't documentation row.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-5.

---

## Problem story

After forward scaffold (WO-022..024), designers need a compact, labeled preview of how the component reads across key variant combinations — without rendering the full cross-product (e.g. 12 Button instances) or the heavy Foundations doc matrix. The plugin should deterministically pick **4–6 representative combos** and place them in an auto-layout frame **next to** the live `ComponentSet`.

---

## User stories

- [ ] As a designer running forward scaffold, I see a small gallery of labeled instances beside the ComponentSet so I can sanity-check variant visuals quickly.
- [ ] As an agent, I get deterministic curation (same spec → same combos) for audit and registry workflows.

---

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).** Sandbox VQA uses Plugin Sandbox after WO-022 scaffold.

---

## Requirements

### Functional

1. **`src/core/components/scaffold/usageFrame.ts`** — exports `buildUsageFrame(componentSet, spec, ctx)` returning `UsageFrameResult` (`frame`, `instances`, `combos`, `auditRows`).
2. **`curateVariantCombos(variantMatrix, maxInstances?)`** — deterministic greedy **axis-value coverage** algorithm, default **`maxInstances = 6`**; if cross-product ≤ max, return **all** combos. Axis order **alphabetical** (must match WO-022 `expandVariantMatrix`).
3. **Instance pipeline** — for each curated combo: `componentSet.createInstance()` → `instance.setProperties(...)` with VARIANT keys (boolean axes as `"true"` / `"false"` strings) → append to cell frame → label TEXT with sorted `axis=value` tuple.
4. **Layout** — reparent `ComponentSet` into `{spec.name}/forward-scaffold` (HORIZONTAL, spacing 48); add `{spec.name}/usage-examples` column (VERTICAL) with `createHorizontalUsageRow` for the instance row.
5. **WO-014 helpers** — import from `src/core/canvas/helpers/autoLayout.ts` (`createHugFrame`, `reassertHug`, `assertNoOnePxMaster`) and `src/core/canvas/helpers/matrixSpecimen.ts` (`createHorizontalUsageRow`). Call `figma.loadFontAsync` before label text.
6. **Pipeline position** — run **after** `applyProperties()` (WO-024); **after** `applyBindings()` (WO-023); **after** `scaffold()` (WO-022).
7. **Idempotency** — on rescaffold, remove/rebuild `usage-examples` subtree (preserve ComponentSet id); optional `pluginData` key `fighub:usageFrame:v1:…`.

### Visual / UX

- Each cell: centered instance + caption label (Doc/Caption-sized text, 13px equivalent).
- Row hugs content height; no 1px-tall cell frames (FR-SCAF-7).

### Technical / architectural

- **Lift reference (corrected):**
  - `DesignOps-plugin/skills/create-component/canvas-templates/bundles/matrix.mcp.js` — `createInstance` in matrix cells (L676–691)
  - `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md` §3 step 4 — `setProperties` on instances
  - **Do not port:** `bundles/usage.mcp.js`, `bundles/_usage-runner.fragment.js` (Do/Don't cards only)
- **Dependencies:** WO-022, WO-014; **soft:** WO-024 (`ApplyPropertiesResult` for future non-variant props)

---

## Acceptance criteria _(definition of done)_

- [ ] After scaffolding a Button with `variant × size × disabled` (12 combos), the usage frame shows **6** (or fewer if product caps at 4) **curated** instances — **not** all 12 — with labels matching `disabled=…, size=…, variant=…` grammar.
- [ ] `curateVariantCombos` unit tests snapshot deterministic picks for the AC matrix and for `tests/fixtures` Button 3×3 matrix.
- [ ] Frame passes inline audit (`comp/usage-instance-count`, `comp/usage-label-present`, `comp/usage-setproperties`, `comp/usage-one-px-cell`).

## Out of scope

- Designer-customizable usage examples beyond the default curation algorithm.
- Legacy Do/Don't cards (`usageDo` / `usageDont` / `buildUsageNotes`).
- Variant × **state** matrix (hover/pressed columns) — matrix doc pipeline deferred.
- Full `doc/component/{name}` Foundations page (1640px five-section frame).

---

## Testing & verification

### Functional QA

- Vitest: `curateVariantCombos.test.ts`, `usageFrame.test.ts` (label + `setProperties` map).
- Integration: mock Figma `createInstance` / `setProperties` call counts.

### Visual / design QA

- SPK-025-1 on Plugin Sandbox after WO-022+024 Button scaffold.

### Accessibility

- N/A — subsystem; labeled text is plain documentation strings.

### Telemetry / observability

- `pluginLog` per combo applied; aggregate miss if `setProperties` throws.

---

## Open bugs — VQA follow-up _(2026-05-28; BUG-S5-001/003/004 resolved in code WO-057)_

**Register:** [designops-canvas-parity-bug-register.md](../research/designops-canvas-parity-bug-register.md)

| Bug ID         | Owner                                                                             | Summary |
| -------------- | --------------------------------------------------------------------------------- | ------- |
| **BUG-S5-001** | **Resolved in code (WO-057)** — doc section STRETCH geometry + 5-section pipeline |
| **BUG-S5-003** | **Resolved in code (WO-057)** — `buildUsageNotes` Do/Don't; gallery deleted       |
| **BUG-S5-004** | **Resolved in code (WO-057)** — full doc pipeline in `src/core/canvas/doc/*`      |

**Evidence:** User file `Dw8NkEiG91NhjYqRPNTOOu` node `5:193` — usage cells `1×98`, instances at negative x inside cells.

**Research spike:** **SPK-S5-USG-1** — diff `usageFrame.ts` vs `DesignOps-plugin/.../usage.mcp.js` + `04-doc-pipeline-contract.md` §6.

**Note:** Full Do/Don't usage + 5-section doc pipeline shipped in **WO-057**. In-Figma `/vqa` sign-off still required before Closed.

---

## Figma VQA Checklist

| Field    | Value                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| file_key | `Dw8NkEiG91NhjYqRPNTOOu` (user repro) · `cVdPraIafWFBRZnzMPhtrW` (Plugin Sandbox)                                |
| node_id  | `5:193` (`_PageContent` / `doc/component/button`)                                                                |
| Notes    | Section frames must be **width ≥ 400** (target 1640), not 1px; 6 usage instances visible without horizontal clip |

---

## 🔍 Ready for `/research`

- ✅ Complete — see `research/usage-frame-generator.md`.

## 📋 Ready for `/plan`

- Dependencies: WO-022, WO-014 (WO-024 in pipeline before usage frame).
- Lock `curateVariantCombos` + `forward-scaffold` wrapper in `plan.md`.

## 🛠️ Ready for `/build`

- `/code-build` after plan ≥200 lines per quality bar.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-5
- Research: [Usage frame generator](research/usage-frame-generator.md)
- WO-022 research: `.github/Sprint 5/WO-022-componentset-variant-matrix-scaffolder/research/component-scaffold-engine.md`
- WO-024 research: `.github/Sprint 5/WO-024-component-property-definitions/research/component-property-definitions.md`
- Lift (instances): `DesignOps-plugin/skills/create-component/canvas-templates/bundles/matrix.mcp.js`
- Helpers: `src/core/canvas/helpers/autoLayout.ts`, `src/core/canvas/helpers/matrixSpecimen.ts`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
