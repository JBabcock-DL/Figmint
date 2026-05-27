---
type: work-order
github_issue: 5
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt4BCg
---

## Goal

Stand up `@detroitlabs/figmint-contracts` as a workspace package inside the figmint monorepo, with versioned TypeScript types for all 5 contract documents defined in PRD §8 (`ops-program`, `tokens`, `component-spec`, `drift-report`, `handoff-context`, `registry`). Other Sprint 1+ tickets import from this package — it's the cross-runtime contract surface (PRD §7.4).

PRD anchors: `Docs/PRD.md` §7.4 (Cross-repo contract package), §8.1–§8.6 (the 5 contracts).

---

## Problem story

As a Figmint developer building any feature that emits or consumes a contract document (token push, drift report, handoff capture, component scaffold, ops program), I want a single typed source of truth I can import so no two features can ever disagree on schema.

## Hypothesis (optional)

A shared contracts package — published from figmint and consumed by both the plugin and any external CLI/CI tooling — eliminates the largest source of drift bugs we'd otherwise see when the same documents flow through multiple runtimes.

---

## User stories

- [ ] As a Figmint plugin developer, I can `import { OpsProgramV1 } from '@detroitlabs/figmint-contracts'` and TS resolves.
- [ ] As an external consumer (CLI / CI / agent), I can read a JSON Schema artifact and validate a document without TypeScript.
- [ ] As a maintainer, I can bump a contract's `v1` → `v2` by adding `v2` alongside `v1` (versions coexist; never breaking).

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (schema / library ticket).**

---

## Requirements

### Functional

1. New workspace package `packages/contracts/` with `package.json` name `@detroitlabs/figmint-contracts`.
2. One TS file per contract (PRD §7.3 layout):
   - `src/opsProgram.v1.ts`
   - `src/tokens.v1.ts` (must define the W3C DTCG shape AND the legacy `DesignOps-plugin` shape as discriminated input adapters, plus the canonical internal `TokensV1` shape — see CTX-002 for the canonical decision)
   - `src/componentSpec.v1.ts`
   - `src/driftReport.v1.ts` (`direction: "push" | "pull" | "conflict"`)
   - `src/handoffContext.v1.ts`
   - `src/registry.v1.ts`
3. `src/index.ts` re-exports every contract type.
4. Build script generates both `.d.ts` declaration files AND JSON Schema artifacts (e.g. via `ts-json-schema-generator` or equivalent) under `packages/contracts/dist/`.
5. Each contract type's required field set matches the PRD §8 example bodies (at minimum: every field shown in `Docs/PRD.md` §8 must be present in the type).
6. Package is configured for internal publish but NOT actually published yet (set `private: true` or `publishConfig` pointing at internal registry).

### Visual / UX

- N/A.

### Technical / architectural

- **Lift reference (port shapes, do not invent):**
  - `DesignOps-plugin/skills/create-component/registry.schema.json` → source for `registry.v1.ts` field set
  - `DesignOps-plugin/skills/create-component/shadcn-props.schema.json` → source for `componentSpec.v1.ts` prop shape
  - `DesignOps-plugin/skills/create-component/conventions/01-config-schema.md` → narrative of existing config shape
  - `DesignOps-plugin/skills/create-component/conventions/07-token-paths.md` → token path conventions for `tokens.v1.ts`
  - `DesignOps-plugin/skills/create-design-system/conventions/01-collections.md`, `02-codesyntax.md` → collection + codeSyntax shape that `tokens.v1.ts` must round-trip
- All types are pure data — no functions, no class instances. Pure interfaces and discriminated unions only.
- Version field naming: every contract type has a literal `v: 1` discriminator.

---

## Acceptance criteria *(definition of done)*

- [ ] WO-002 plugin can `import { OpsProgramV1, TokensV1, ComponentSpecV1, DriftReportV1, HandoffContextV1, RegistryV1 } from '@detroitlabs/figmint-contracts'` and TS resolves with strict mode.
- [ ] `npm run build` in `packages/contracts/` emits both `.d.ts` and `.schema.json` files for each contract under `packages/contracts/dist/`.
- [ ] Each contract type has every field shown in PRD §8 examples (verified by spot-check).
- [ ] `tokens.v1.ts` exports `TokensV1` (canonical internal) PLUS `TokensV1WC3DTCG` and `TokensV1Legacy` input adapter shapes.
- [ ] `driftReport.v1.ts` discriminated union on `direction` covers all three states.
- [ ] No TS errors under strict mode.

## Out of scope

- Implementing the adapters / normalizers that convert input shapes → canonical (that's Sprint 2).
- Publishing to a real registry (gated behind a manual `npm publish` later).
- JSON Schema runtime validation library wiring in consumers (consumers import the `.schema.json` themselves).
- Markdown serializers — those live in `src/io/formats/markdown.ts` (Sprint 3+).

---

## Testing & verification

### Functional QA

- `npm run build` in `packages/contracts/` succeeds.
- Build a minimal test file in the plugin that imports each type and uses each in an annotation; verify `tsc --noEmit` passes.
- Run the JSON Schema generator on a contract type and confirm output validates a sample document from PRD §8.

### Visual / design QA

- N/A.

### Accessibility

- N/A.

### Telemetry / observability

- N/A.

---

## Figma VQA Checklist

**N/A — no Figma artifact (schema / library ticket).**

---

## 🔍 Ready for `/research`

- Confirm choice of JSON Schema generation tool (`ts-json-schema-generator` vs `typescript-json-schema` vs `typia`) — pick within 1 day, document in `research/json-schema-generator.md`.

## 📋 Ready for `/plan`

- Dependencies: WO-002 (build infrastructure must exist; this is a workspace package).
- CTX-002 informs the canonical `TokensV1` internal shape — if CTX-002 hasn't landed, leave `TokensV1` as a `TODO` interface that `tokens.v1.ts` exports but Sprint 2 fills.
- `plan.md` should enumerate the exact field set per contract before `/build`.

## 🛠️ Ready for `/build`

- After WO-002 lands: `/code-build` (TS sources) + `/script-build` (build script + schema generation) in parallel.

## References

- PRD: `Docs/PRD.md` §7.4, §8.1–§8.6
- Lift reference: `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/registry.schema.json`, `shadcn-props.schema.json`, `conventions/01-config-schema.md`, `conventions/07-token-paths.md`, and `create-design-system/conventions/01-collections.md`, `02-codesyntax.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
