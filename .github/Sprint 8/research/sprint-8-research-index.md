# Sprint 8 research index — Code Connect + Import (Phase 4a)

> **Status:** ✅ Research **expanded for `/plan`** (2026-05-29)
> **PRD:** §6.3 FR-IMP-*, §6.7 FR-CC-*, §6.9 FR-CONF-*, §12 Phase 4a
> **All tickets:** In Research on Project #9

---

## Build order (locked)

```
WO-039 (interfaces)
    ├── WO-042 (token resolver) ──┐
    └── WO-043 (dependency scan) ─┼── WO-041 (React parser)
                                  │
WO-040 (CC stub generator) ───────┴── WO-044 (UI: import + CC)
WO-056 (catalog + batch) ────────────── WO-044 (UI layout)
```

**Parallel windows:**

- After WO-039 merges: WO-042 + WO-043 in parallel
- After WO-042/043: WO-041 + WO-040 in parallel
- WO-056 UI can start after `catalog/discover` message spec; full E2E after WO-022 scaffold stable
- WO-044 integrates last (depends on 040-043 + catalog section slot)

---

## Cross-ticket matrix

| Ticket | Produces | Consumes | Blocks |
| ------ | -------- | -------- | ------ |
| **WO-039** | Types, registries, shared stubs | WO-003 contracts | All others |
| **WO-042** | `createTokenResolver`, Settings override | WO-039, WO-016 | WO-041 bindings |
| **WO-043** | `scanDependencies`, `tsAst.ts` | WO-039, WO-026 | WO-041, WO-044 |
| **WO-040** | Stub generator, detect, emit PR | WO-039, WO-018 | WO-044 CC |
| **WO-041** | React `ImportTemplate` | WO-039, 042, 043 | WO-044 import |
| **WO-056** | Catalog discovery + batch | WO-016, WO-027, WO-022 | — |
| **WO-044** | Import + CC UI, message layer | WO-040..043, WO-056 layout | Phase 4a GA |

---

## Shared infrastructure (plan once, reference everywhere)

| Concern | Owner ticket | Path |
| ------- | ------------ | ---- |
| Message guards | WO-044 / WO-056 | `src/io/messages/import.ts`, `catalog.ts`, `codeconnect.ts` |
| GitHub tree cache | WO-056 (extract later WO-040) | `src/io/github/catalogDiscovery.ts` |
| TS AST helpers | WO-043 | `src/core/import/shared/tsAst.ts` |
| Token resolver | WO-042 | `src/core/import/shared/tokenResolver/` |
| Org flags | all UI | `src/config/flags.ts` |
| Scaffold entry | all | `scaffold/run` unchanged |

---

## Research artifacts (expanded)

| Ticket | File | Lines | Plan-ready |
| ------ | ---- | ----- | ---------- |
| WO-039 | [mapping-template-and-import-template-interfaces](../WO-039-mapping-template-and-import-template-interfaces/research/mapping-template-and-import-template-interfaces.md) | ~280 | ✅ module tree + interfaces |
| WO-040 | [react-code-connect-stub-generator](../WO-040-react-code-connect-stub-generator/research/react-code-connect-stub-generator.md) | ~240 | ✅ detect + PR flow |
| WO-041 | [react-importfromcode-parser-ts-ast](../WO-041-react-importfromcode-parser-ts-ast/research/react-importfromcode-parser-ts-ast.md) | ~250 | ✅ parse pipeline |
| WO-042 | [token-resolver-tailwind-css-vars](../WO-042-token-resolver-tailwind-css-vars/research/token-resolver-tailwind-css-vars.md) | ~250 | ✅ SPK-042-3 resolved (§6) |
| WO-043 | [dependency-scanner-subcomponent-handling](../WO-043-dependency-scanner-subcomponent-handling/research/dependency-scanner-subcomponent-handling.md) | ~210 | ✅ |
| WO-044 | [components-tab-ui-import-cc-pr-flows](../WO-044-components-tab-ui-import-cc-pr-flows/research/components-tab-ui-import-cc-pr-flows.md) | ~280 | ✅ message protocol |
| WO-056 | [component-catalog-discovery-batch-scaffold](../WO-056-component-catalog-discovery-batch-scaffold/research/component-catalog-discovery-batch-scaffold.md) | ~247 | ✅ batch protocol |

**Total:** ~1,837 lines research (2026-05-29)

---

## Pre-plan spikes (sprint-wide)

| Spike | Ticket | Blocks plan? |
| ----- | ------ | ------------ |
| SPK-042-3 Binding path convention | WO-042 | ✅ Resolved in research §6 |
| SPK-044-2 Figma VQA node ids | WO-044 | WO-044 plan only |
| SPK-040-1 `figma connect validate` | WO-040 | WO-040 build |
| SPK-056-3 Tree API latency | WO-056 | Optional |

---

## Locked product decisions

1. Phase 4a **React only** — framework picker visible, others disabled.
2. Plugin **opens PR**; CI **publishes** Code Connect (FR-CC-4).
3. **Never silent-apply** — preview required (FR-IMP-7).
4. Components tab section order: Paste → **Browse (056)** → **Import (044)** → **CC (044)** → Sync → Preview.
5. Catalog = specs on disk; Import = TSX → new spec; Sync registry = canvas-linked only.

---

## `/plan` entry checklist

For each ticket plan.md:

- [ ] AC traceability table (requirement → step → test)
- [ ] **Build Agents** phases with file paths
- [ ] Message protocol section (WO-044, WO-056)
- [ ] Dependencies explicit (merge order)
- [ ] Pre-plan spikes assigned to steps
- [ ] Figma VQA scope (WO-044 only)
- [ ] `wc -l plan.md` ≥ plan-quality-bar threshold

**Start with WO-039** — unblocks all other plans.

---

## Open questions (sprint level)

| Q | Owner | Status |
| - | ----- | ------ |
| Binding `variable` path convention | WO-042 | ✅ Resolved — canonical slash paths (research §6) |
| Add `componentsPath` to fighub.json | WO-044 plan | OPEN |
| Figma VQA design nodes | WO-044 plan | OPEN |

---

## References

- PRD §12 Phase 4a (`Docs/PRD.md` lines 763–788)
- [component-catalog-roadmap](../Sprint%205/research/component-catalog-roadmap.md)
- Research quality bar: `.github/templates/research-quality-bar.md`
