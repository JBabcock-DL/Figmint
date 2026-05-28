# Scaffold canvas failure remediation — WO-027 research

> **2026-05-28 update:** Canonical bug list → **[designops-canvas-parity-bug-register.md](../../research/designops-canvas-parity-bug-register.md)**. Figma repro `Dw8NkEiG91NhjYqRPNTOOu` node `5:193`: doc sections **width=1px** (audit false pass). DesignOps target: v60 `433:335`.

> **Status:** ✅ Research complete — root causes for manual SPK-027-1 failures identified; fix plan spans WO-022, WO-024, WO-025, WO-027 with mandatory sandbox spikes before re-VQA.
> **Date:** 2026-05-28
> **Owner:** WO-027 (Sprint 5) — surfaced during manual Components tab sandbox VQA
> **Topic slug:** `scaffold-canvas-failure-remediation`
> **PRD anchors:** §6.2 FR-SCAF-1..7, §12 Phase 2 exit (G2), UC-2/UC-3
> **Sandbox evidence:** User manual VQA on file `Dw8NkEiG91NhjYqRPNTOOu` (Button node `3:5575` collapsed); reference target [v60 Foundations — Button doc](https://www.figma.com/design/uCpQaRsW4oiXW3DsC6cLZm/v60-updates-%E2%80%94-Foundations?node-id=433-335)

---

## Summary

Manual Components tab VQA (checklist items **C** and **D**) exposed **four independent failure classes** after tab persistence was fixed. The plugin **panel UI is healthy**; failures are on the **canvas output** of the forward-scaffold pipeline.

**C — Registry + property audit:** The message `No registry file at packages\contracts\dist\registry.v1.schema.json` is expected when the registry path points at a **JSON Schema contract file** (`registry.v1.schema.json`) instead of a **RegistryV1 instance document** (`.figmint-registry.json`). Scaffold correctly starts an empty registry. The audit block `2 passed · 4 failed` maps to **WO-024 component property rules** — specifically `comp/prop-label-text`, `comp/prop-leading-icon-boolean`, `comp/prop-trailing-icon-boolean`, and `comp/prop-add-zero-failures` with **48 failures = 12 variants × 4 properties** (`loading` + 3 implicit props). This arithmetic proves **`addComponentProperty` threw on every variant for every non-VARIANT property** — not a partial wiring miss.

**D — Canvas geometry + documentation:** The Button ComponentSet / variant masters collapsed to **1×1 px** on canvas. Usage/documentation output landed on the **Components** page in a minimal instance gallery (`Button/forward-scaffold`, `Button/usage-examples`) rather than the **Foundations documentation tree** the user expected (v60 reference). The broken gallery is largely a **downstream symptom** of 1×1 masters (instances inherit collapsed geometry).

**Locked recommendation:** treat this as a **pipeline remediation sprint** before re-running SPK-027-1:

1. **WO-024 (blocker):** Fix property application timing/API — move non-VARIANT property creation to **pre-`combineAsVariants`** on each variant `ComponentNode` (legacy-proven), or spike **`ComponentSetNode.addComponentProperty`** post-combine; stop iterating post-combine per-variant adds if Figma rejects them.
2. **WO-022 (blocker):** Add **post-combine variant master normalization** — `layoutSizingHorizontal/Vertical = 'HUG'`, `reassertHug`, minimum height floor — on chip (Button) archetype; mocks mask `combineAsVariants` sizing reset.
3. **WO-025 (follow-on):** Keep FR-SCAF-5 instance gallery on Components page for Phase 2, but **harden layout** after geometry fix; document that **Foundations-style doc pages** (properties table, matrix specimen, Do/Don't cards) remain **out of scope** until a doc-pipeline ticket — set user expectation in UI copy.
4. **WO-027 (UX):** Registry path validation — reject schema paths, suggest `.figmint-registry.json`; clarify audit panel scope (component audits show `variablesCreated: 0` — not a push failure).

---

## Key Findings

### 1. Registry path confusion (C — informational, not a pipeline bug)

**Symptom:** `No registry file at packages\contracts\dist\registry.v1.schema.json — scaffold will start a new registry.`

**Evidence:**

| Path | File role | Valid registry load? |
| ---- | --------- | -------------------- |
| `packages/contracts/dist/registry.v1.schema.json` | JSON Schema for `RegistryV1` contract | ❌ — no `kind: "registry"` instance |
| `.figmint-registry.json` (default) | Runtime registry document in consumer repo | ✅ when present on GitHub |
| `tests/fixtures/*.json` | Test RegistryV1 payloads | ✅ in tests only |

**Code:** `src/ui/components/scaffold/loadRegistryFromRepo.ts` L13–18 returns `registry: null` with that message when `loadRegistryFromGitHub` gets 404. `normalizeRegistryInput` in `src/core/components/registry.ts` validates `kind: 'registry'`, `v: 1` — a schema file fails validation if fetched.

**Implication:** User pointed registry path at the **contracts package schema artifact** (visible in IDE) instead of a repo-root `.figmint-registry.json`. Scaffold + export still work; registry starts empty and upserts after scaffold.

**Fix (WO-027):** When loaded JSON fails normalization, surface: *"Path exists but is not a RegistryV1 document (found JSON Schema?). Use `.figmint-registry.json` at repo root."* Add path hint in Settings/Components registry field placeholder.

---

### 2. Property audit failures — 48 add failures = post-combine `addComponentProperty` regression (C — blocker)

**Symptom:**

| Rule ID | Diagnostic |
| ------- | ---------- |
| `comp/prop-label-text` | Label TEXT property missing |
| `comp/prop-leading-icon-boolean` | Leading icon BOOLEAN property missing |
| `comp/prop-trailing-icon-boolean` | Trailing icon BOOLEAN property missing |
| `comp/prop-add-zero-failures` | 48 property add failure(s); all variants failed for at least one prop |

**Evidence — failure arithmetic:**

Canonical Button spec (`tests/fixtures/component-spec-button-canonical.json`):

- **12 variants** (3×2×2 matrix)
- **4 properties attempted per variant:**
  1. `loading` (explicit boolean from `props[]`)
  2. `Label` (implicit TEXT from `componentProps.label`)
  3. `Leading icon` (implicit BOOLEAN)
  4. `Trailing icon` (implicit BOOLEAN)
- `disabled` skipped (variant matrix axis — WO-022 VARIANT)

`48 = 12 × 4` → **every** `variant.addComponentProperty(...)` call threw.

**Code path:** `src/core/components/scaffold/applyProperties.ts` L77–112 iterates all variants **after** `figma.combineAsVariants` (`src/core/components/scaffold/index.ts` L210–213). Audit rules in `src/core/audit/rules/componentRules.ts` L55–169 check `propKeys` and `componentPropertyDefinitions` — all empty when adds fail.

**Research conflict (validated):** WO-024 research (`component-property-definitions.md` L115–117) documents legacy `component-composed.mcp.js` L425–489 adds properties **inside `buildVariant` before `combineAsVariants`**. WO-024 plan locked per-variant iteration but **did not lock post-combine timing**. Current implementation violates legacy timing.

**Official API (retrieved 2026-05-28):** Both `ComponentNode` and `ComponentSetNode` expose `addComponentProperty` ([ComponentSetNode docs](https://developers.figma.com/docs/plugins/api/ComponentSetNode/#addcomponentproperty)). Post-combine behavior on **variant children** vs **set root** is **not documented** — requires SPK-027-2 sandbox proof.

**Hypothesis ranking:**

| Rank | Hypothesis | Likelihood | Fix direction |
| ---- | ---------- | ---------- | ------------- |
| H1 | Post-combine per-variant `addComponentProperty` rejected by Figma | **High** | Move adds pre-combine (legacy) |
| H2 | Must use `componentSet.addComponentProperty` once post-combine | Medium | Spike set-root API; wire refs per variant |
| H3 | Display name / VARIANT name collision | Low | Names don't collide with axes |
| H4 | Read-only / remote ComponentSet | Low | User file is local Untitled draft |

**Vitest gap:** `tests/unit/core/components/scaffold/applyProperties.test.ts` mocks `addComponentProperty` on isolated components — never exercises post-`combineAsVariants` Figma behavior. Integration mock `combineAsVariants` (`figmaScaffold.ts` L83–99) does not simulate API restrictions.

---

### 3. Button 1×1 collapse — mock-green / Figma-red geometry gap (D — blocker)

**Symptom:** Button ComponentSet on canvas has **fixed width and height of 1** — visually a single pixel. [User file](https://www.figma.com/design/Dw8NkEiG91NhjYqRPNTOOu/Untitled?node-id=3-5575).

**Evidence — chip archetype uses legacy sizing modes only:**

`src/core/components/scaffold/archetypes/chip.ts` sets `primaryAxisSizingMode` / `counterAxisSizingMode` to `'AUTO'` but **does not** set `layoutSizingHorizontal` / `layoutSizingVertical` to `'HUG'`. Other archetypes do — e.g. `rowItem.ts` L112–113, `container.ts` L156–157.

**Post-combine finalize:** `finalizeComponentSet` (`index.ts` L107–110) calls `resizeThenApplySizing(componentSet, width, 1, { FIXED, AUTO })` — intentional 1px height + hug for the **set grid**, not variant masters. Real Figma may **propagate sizing collapse** to variant children when set is 1px tall.

**Recovery logic insufficient:**

- Chip recovery (`chip.ts` L74–78) runs **pre-combine** only: `if (component.height <= 2) resize(max(width,48), 32)`.
- `assertNoOnePxMaster` (`autoLayout.ts` L117–134) skips frames with `width > 40` — a **1×1** master has width 1, so it **should** flag — but audit runs on scaffold result **before** properties; user may still see 1×1 if collapse happens **after** `applyProperties` or on the **ComponentSet** itself, not children.

**Mock false confidence:**

| Layer | Default size after build | `combineAsVariants` mock |
| ----- | ------------------------ | ------------------------- |
| `MockFrame` | 100×100 (`figmaFrames.ts` L40–41) | Preserves child dimensions |
| Real Figma | Hug content | May reset variant bounds to 1×1 when parent set uses FIXED×AUTO grid |

**Vitest:** `chip.test.ts` + `scaffold.integration.test.ts` pass `comp/scaffold-one-px-master` on mocks — **does not prove sandbox geometry**.

**Fix direction (WO-022):**

1. After `combineAsVariants`, iterate variant `ComponentNode` children — `reassertHug`, set `layoutSizingHorizontal/Vertical = 'HUG'`, enforce `minHeight >= 32` for chip.
2. Add chip archetype parity with `rowItem` sizing properties at creation time.
3. Add `comp/scaffold-set-geometry` audit rule for ComponentSet min dimensions (optional).
4. SPK-027-3: prove fix on sandbox file with bootstrap-complete variables loaded.

---

### 4. Documentation / usage frame — scope vs expectation (D — product gap + layout bug)

**Symptom:** Documentation "drew on the wrong page and was broken"; should resemble [v60 Foundations Button doc frame](https://www.figma.com/design/uCpQaRsW4oiXW3DsC6cLZm/v60-updates-%E2%80%94-Foundations?node-id=433-335).

**Evidence — what Figmint builds today (WO-025):**

| Artifact | Page | Purpose |
| -------- | ---- | ------- |
| `{name} — ComponentSet` | **Components** (`ensureComponentsPage`) | Variant matrix output |
| `{name}/forward-scaffold` wrapper | Components | Horizontal wrapper around set + usage column |
| `{name}/usage-examples` | Components | FR-SCAF-5 **instance gallery** (max 6 curated combos) |

**Code:** `runScaffold.ts` L39–48 `ensureComponentsPage()`; `usageFrame.ts` L58–83 wrapper creation with `resize(1,1)` starter frame.

**What v60 Foundations reference shows:** Full **doc pipeline** — properties/types table, variant matrix specimen grid, Do/Don't usage cards on a **Documentation / Foundations** page hierarchy. Legacy: `usage.mcp.js`, `matrix.mcp.js`, `buildUsageNotes()` — explicitly **out of scope** for WO-025 per `usage-frame-generator.md` §1.

**Why it looks "broken":** Instance cells call `createUsageInstanceCell` → instances from 1×1 masters inherit collapsed size; `createHugFrame` cells with `height: 1` (`usageFrame.ts` L140–145) compound the sliver geometry. Wrong **page** is a **product expectation mismatch**, not a stray bug — but **layout broken** is fixable once masters have real dimensions.

**Fix direction:**

- **Phase 2 (WO-025):** After WO-022 geometry fix, re-run usage frame — gallery should render readable instances on Components page.
- **Phase 2+ (new ticket):** Port doc pipeline slices (properties table, matrix specimen, Do/Don't) to Foundations page — do not conflate with FR-SCAF-5 gallery.
- **WO-027 UI copy:** Label usage section "Variant examples (Components page)"; link to out-of-scope Foundations doc in tooltip.

---

### 5. Audit panel "Push stats: created 0" — cosmetic scope mix (C — non-blocker)

**Symptom:** `Push stats: created 0, updated 0, skipped 0` adjacent to component audit failures.

**Evidence:** `src/ui/components/AuditPanel.tsx` L110 always renders variable push summary from `audit-report.v1.summary`. Component-scope audits from `runScaffold.ts` hard-code variable counts to 0 (`runScaffold.ts` L98–102). This is **correct for component audits** but **misleading UX** when shown beside property failures.

**Fix (WO-027):** Hide push stats row when `meta.operation !== 'push-variables'` or `scope === 'component'`.

---

## Validated evidence

### Repo inventory

| Path | Role |
| ---- | ---- |
| `src/core/components/scaffold/index.ts` L210–213 | `combineAsVariants` then finalize — properties run later in `runScaffold.ts` |
| `src/core/components/scaffold/applyProperties.ts` L77–112 | Post-combine per-variant `addComponentProperty` |
| `src/core/components/scaffold/archetypes/chip.ts` | Button/chip geometry — missing `layoutSizing*` |
| `src/core/audit/rules/componentRules.ts` | Failed rule IDs from user report |
| `src/ui/components/scaffold/loadRegistryFromRepo.ts` | Registry 404 message |
| `tests/fixtures/component-spec-button-canonical.json` | 12-variant Button VQA fixture |
| `tests/unit/core/components/scaffold/__mocks__/figmaScaffold.ts` | Mock `combineAsVariants` — no sizing reset |

### Cross-ticket matrix

| Ticket | Failure class | Remediation owner |
| ------ | ------------- | ----------------- |
| WO-022 | 1×1 variant masters | Post-combine hug pass + chip `layoutSizing*` |
| WO-024 | 48 property add failures | Pre-combine property timing / set-root API spike |
| WO-025 | Broken usage gallery layout | Depends on WO-022; scope note for Foundations doc |
| WO-027 | Registry path UX, audit panel copy | Validation + hide irrelevant push stats |
| WO-026 | (none observed) | Registry upsert OK with empty start |

### Official API facts

- `ComponentSetNode.addComponentProperty` — returns suffixed key; supports BOOLEAN, TEXT, INSTANCE_SWAP, VARIANT, SLOT ([docs](https://developers.figma.com/docs/plugins/api/ComponentSetNode/#addcomponentproperty), 2026-05-28).
- Legacy DesignOps adds properties **before** `combineAsVariants` (`WO-024` research L115–117).

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | ---------------------- |
| D1 | **Block WO-027 re-VQA** until WO-022 + WO-024 sandbox fixes land | User confirmed panel OK; canvas failures are subsystem | Re-VQA panel-only (already PASS) |
| D2 | **Primary property fix: pre-combine adds** | Matches legacy; explains 100% add failure rate post-combine | Keep post-combine iteration (failed in sandbox) |
| D3 | **Foundations doc page deferred** | WO-025 FR-SCAF-5 is instance gallery only | Expand WO-025 scope mid-sprint (too large) |
| D4 | **Registry schema path → validation error** | Prevent confusing schema vs instance | Silent null registry (current) |
| D5 | **Add SPK-027-2/3 spikes** before `/plan` updates on WO-022/024 | Mocks don't model Figma combine/property API | Fix without spike (risk repeat failure) |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-027-2 | Sandbox: scaffold Button canonical; log each `addComponentProperty` error message pre- vs post-combine | Post-combine failure messages captured; pre-combine ≥1 prop succeeds | ☐ pending |
| SPK-027-3 | Sandbox: after scaffold, measure variant master width×height before/after post-combine hug pass | All 12 variants ≥ 48×32 px | ☐ pending |
| SPK-027-4 | Sandbox: try `componentSet.addComponentProperty('Label','TEXT','Button')` once post-combine | Property appears in `componentPropertyDefinitions` + panel | ☐ pending |
| SPK-027-1 (existing) | Full Components tab manual VQA | G2 <5s, canvas matches reference | ☐ blocked on SPK-027-2/3 |

---

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| Pre-combine props lost at combine | High | Low | Legacy proof; wire refs before combine |
| Set-root API can't bind per-variant layers | Med | Med | Hybrid: set-root define + per-variant reference pass |
| Font missing → zero-size text → 1×1 | Med | Med | `ensureScaffoldFonts` fallback to Inter Regular; audit font load |
| User expects Foundations doc in Phase 2 | Med | High | UI copy + future doc ticket; link v60 reference |
| Re-VQA without bootstrap variables | Med | Med | Checklist: bootstrap-complete first (ticket precondition) |

---

## Recommendations

### WO-024 — Property application (P0)

1. Refactor pipeline to **`applyPropertiesPreCombine(spec, variantComponents[])`** called in `scaffold()` loop **before** `combineAsVariants`, OR split `applyProperties` into define (pre) + validate (post).
2. Keep post-combine **`validateVariantProperties`** only.
3. Add integration test that simulates "second variant add throws if duplicate" to document Figma constraint.
4. Log first failure message to `pluginLog` with step `apply-properties` detail in UI.

### WO-022 — Geometry (P0)

1. Add `normalizeVariantMasterGeometry(component: ComponentNode)` after combine — chip + composed paths first.
2. Set `layoutSizingHorizontal = 'HUG'`, `layoutSizingVertical = 'HUG'` on chip archetype at build time.
3. Extend `buildScaffoldAuditRows` with optional set-level min-size check.

### WO-025 — Usage frame (P1, after WO-022)

1. Re-verify `buildUsageFrame` after master fix; add sandbox snapshot to VQA checklist row 11.
2. Do **not** port Foundations doc tree in this ticket.

### WO-027 — Integration UX (P1)

1. Registry path validator: detect `*.schema.json` / missing `kind: registry`.
2. `AuditPanel`: hide variable push stats for component-scope reports.
3. Update Figma VQA checklist row 11 with geometry + property pass criteria.
4. Re-run SPK-027-1 only after WO-022/024 fixes + `npm run build` re-import.

---

## Open questions

| # | Question | Status |
| - | -------- | ------ |
| OQ-1 | Exact Figma error string for post-combine `addComponentProperty` | **OPEN** — capture in SPK-027-2 |
| OQ-2 | Should registry default path in UI show monorepo `.figmint-registry.json` example for Figmint dev repo? | **OPEN** — product call |
| OQ-3 | Phase 2 GA requires Foundations doc page or only ComponentSet + gallery? | **RESOLVED** — Phase 2 = ComponentSet + FR-SCAF-5 gallery per PRD §12; Foundations doc = later phase (user expectation noted) |

---

## References

- Parent ticket: `.github/Sprint 5/WO-027-components-tab-ui-forward-flow/ticket.md`
- WO-024 research: `component-property-definitions.md` §3 (API timing)
- WO-025 research: `usage-frame-generator.md` §1 (naming collision)
- WO-022 research: `component-scaffold-engine.md` §4 (combine sequence)
- Canonical fixture: `tests/fixtures/component-spec-button-canonical.json`
- User canvas: `https://www.figma.com/design/Dw8NkEiG91NhjYqRPNTOOu/Untitled?node-id=3-5575`
- Reference doc: `https://www.figma.com/design/uCpQaRsW4oiXW3DsC6cLZm/v60-updates-%E2%80%94-Foundations?node-id=433-335`
- [ComponentSetNode.addComponentProperty](https://developers.figma.com/docs/plugins/api/ComponentSetNode/#addcomponentproperty) (2026-05-28)
