---
type: work-order
github_issue: 8
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt4Cn8
promoted_from: CTX-002
promoted_at: 2026-05-27
---

## Goal

Lock the **canonical internal token model** — the TypeScript shape that Figmint's token-input adapters normalize both W3C DTCG and legacy `DesignOps-plugin` formats _into_ — before Sprint 2 begins writing those adapters (WO-007).

The decision is **architecturally upstream of WO-007** (token input adapters), WO-008 (variable collection push engine), and WO-009 (codeSyntax mapping). The canonical shape lands as the concrete `TokensV1` interface inside `packages/contracts/src/tokens.v1.ts` (which WO-003 left as a `TODO` placeholder for this exact purpose).

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-2 (normalize to canonical internal model), §8.2 (`tokens` hybrid contract).

> **Pre-confirmed working assumption (locked tentatively 2026-05-27 sign-off → confirmed by WO-005 spike 2026-05-27):** the canonical model stays **plan-agnostic** — no `extended-from` relationship at the schema level. EVC (Extended Variable Collections) is a **render-time projector** on Enterprise files only, not a default storage shape. See `.github/Sprint 1/WO-005-…/research/extended-collections.md` §2.4 and §5 for the locked recommendation.

---

## Problem story

As Sprint 2 leads, we need the canonical token shape locked before any adapter code lands, otherwise WO-007's W3C DTCG and legacy-`DesignOps-plugin` adapters become a stab in the dark with high rework risk when (a) EVC findings disagree with the assumed shape, (b) Theme/Typography mode storage shape disagrees, or (c) codeSyntax-per-platform encoding disagrees. Locking now also de-risks `packages/contracts/src/tokens.v1.ts` — WO-003 shipped that file with a stub interface explicitly so this WO could fill it.

## Hypothesis _(optional)_

A single flat `TokensV1` interface (every token keyed by fully-qualified path, with explicit `collection` field, explicit per-mode value map, `codeSyntax` flat on each token, and alias stored as both string reference + resolved value for lossless round-trip) is sufficient to cover the W3C DTCG superset and the legacy `DesignOps-plugin` superset without losing any data. The WO-005 spike's measured per-call rates (`createVariable` 0.50 ms · `setValueForMode` 0.30 ms · `setVariableCodeSyntax` 0.23 ms) confirm there is no performance reason to prefer a more exotic shape (e.g. nested trees or array-indexed modes).

We'll know we're right when WO-007's W3C DTCG and legacy adapters both consume `TokensV1` without local sub-types and the push engine (WO-008) reads `TokensV1` straight into the Plugin API call sequence.

---

## User stories

- [ ] As a Sprint 2 lead, I can read the locked `decisions/canonical-token-model.md` (or this ticket body) and know exactly which TypeScript shape WO-007's adapters target — no follow-up clarifying questions.
- [ ] As a Sprint 2 WO-007 author, I can import `TokensV1` from `@detroitlabs/figmint-contracts` and write the W3C DTCG → `TokensV1` adapter without re-deriving the canonical shape.
- [ ] As a Sprint 2 WO-008 author, I can read a `TokensV1` document and emit the exact Plugin API call sequence (`createVariableCollection` × N → `createVariable` × M → `setValueForMode` × P → `setVariableCodeSyntax` × Q → `commitUndo`) without intermediate shape translation.
- [ ] As an agent porting from `DesignOps-plugin`, I can map the legacy `theme-aliases.json` + per-collection variable lists directly to `TokensV1` with a deterministic adapter (no lossy guessing).

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (architecture decision ticket).**

---

## Requirements

### Functional

1. Produce a written decision document (committed as this ticket's `decisions/canonical-token-model.md` OR inlined in the final ticket body) that captures the canonical TS shape. The shape must support:
   - W3C DTCG round-trip (lossless from input → canonical → output).
   - Legacy `DesignOps-plugin` format round-trip (lossless — `theme-aliases.json`, per-collection variable lists, codeSyntax-per-platform).
   - All 5 collections from PRD §6.1 (Primitives, Theme, Typography, Layout, Effects).
   - Per-collection modes (1 mode on Primitives/Layout; 2 modes Light/Dark on Theme + Effects; 8 Android-curve modes on Typography).
   - codeSyntax per platform (Web / Android / iOS) on every token.
   - Variable aliasing — one token references another's resolved value (e.g. Theme `color/primary` aliases Primitives `color/blue/500`).
2. The decision document must include a worked example showing the same Theme `color/primary` token in (a) W3C DTCG input form, (b) legacy `theme-aliases.json` row form, (c) canonical `TokensV1` form, side by side.
3. The canonical interface must round-trip through `ts-json-schema-generator` (WO-003's tooling) without manual schema editing. If it requires `@ts-json-schema-generator/*` annotations to resolve discriminated unions or branded types, document those annotations inline.

### Visual / UX

**N/A — schema decision, no UI surface.**

### Technical / architectural

The decision must address all of these six dimensions explicitly. Each gets a chosen answer + 1-paragraph rationale:

1. **Shape:** flat (every token has a fully-qualified path key) vs nested (tree of nested objects)? _Working preference (per Hypothesis): flat._
2. **Mode storage:** `Record<ModeId, Value>` per token vs array indexed by ordered mode list? _Working preference: `Record<ModeId, Value>` — explicit mode IDs survive reordering._
3. **Alias representation:** string reference (`{Theme/Primary}`), resolved value, or both? _Working preference: both — keep the string reference for round-trip, cache the resolved value for fast reads._
4. **codeSyntax storage:** flat field on each token (`codeSyntax: { WEB, ANDROID, iOS }`) vs separate map keyed by token path? _Working preference: flat on the token._
5. **Collection identity:** explicit `collection: "Primitives"` field on each token vs scope inferred from path prefix? _Working preference: explicit field — path prefixes can collide across collections, especially with codeSyntax-derived names._
6. **Mode inheritance (post-EVC):** WO-005 confirmed EVC is Enterprise-only and gated; the canonical model stays **plan-agnostic**. EVC is expressed as a **render-time projection** by the push engine when `isEnterprise()` returns true — not a schema field. Document the projection algorithm at a high level (Theme + Effects each become 1 parent collection + N extended collections per brand; Typography never extends).

These working preferences are **not** the locked answer — they're the seed the decision pass starts from. The pass must validate each against the legacy `DesignOps-plugin` data shape (`theme-aliases.json`, `data/typography.json` if it exists, per-collection variable lists in `phases/02-steps5-9.md`) and a representative W3C DTCG fixture before locking.

---

## Acceptance criteria _(definition of done)_

- [ ] `decisions/canonical-token-model.md` exists (or equivalent content inlined in this ticket body) covering all six dimensions above with a chosen answer + 1-paragraph rationale per choice.
- [ ] WO-005 spike findings cited where EVC affects the shape (specifically: mode inheritance — `research/extended-collections.md` §2.4 + §5 reference).
- [ ] Final canonical shape expressible as a single TS type alias / interface in `packages/contracts/src/tokens.v1.ts`. The interface ships as part of this WO (replacing the WO-003 `TODO` placeholder); JSON Schema regenerates cleanly via WO-003's `ts-json-schema-generator` wiring.
- [ ] Worked example with W3C DTCG → legacy `theme-aliases.json` → `TokensV1` side-by-side included.
- [ ] WO-007 (Sprint 2 token input adapters) marked as `depends_on: WO-055` in its plan.md before WO-007's `/research` or `/plan` runs.

## Out of scope

- Implementing the W3C DTCG → canonical adapter — Sprint 2 WO-007.
- Implementing the legacy `DesignOps-plugin` → canonical adapter — Sprint 2 WO-007.
- The Plugin API push engine that consumes `TokensV1` — Sprint 2 WO-008.
- The codeSyntax-per-platform mapping rules (which CSS prefix / which Android casing / which iOS dot-path convention) — Sprint 2 WO-009.
- The audit reporter that diffs pushed variables vs the canonical document — Sprint 2 WO-010.
- The JSON Schema generator choice — already locked in WO-003 (`ts-json-schema-generator`).

---

## Testing & verification

### Functional QA

- The decision document compiles as a single TS interface in `packages/contracts/src/tokens.v1.ts` without errors under `npm run typecheck`.
- The worked side-by-side example parses (manually verified for now; the actual adapter tests live in WO-007).
- Round-trip claim is verifiable: starting from `theme-aliases.json` (legacy) and a small W3C DTCG fixture, both can in principle be transformed to `TokensV1` and back without data loss. _Manual reasoning pass for this ticket; actual adapter round-trip lives in WO-007._

### Visual / design QA

**N/A.**

### Accessibility _(WCAG AA where applicable)_

**N/A.**

### Telemetry / observability _(if needed)_

**N/A.**

---

## Figma VQA Checklist

**N/A — no Figma artifact (architecture / contracts ticket).**

---

## 🔍 Ready for `/research`

WO-005 spike findings already deliver the EVC-side input this decision needs (`research/extended-collections.md` §2.4 / §5). The remaining research before `/plan` is:

- Map every field in legacy `theme-aliases.json` (Detroit Labs Foundations example) into the canonical shape — no field can drop without explicit "intentional loss" rationale.
- Map a representative W3C DTCG token tree (with `$value`, `$type`, `$description`, `$extensions.figmint.modes`, `$extensions.figmint.codeSyntax`) into the canonical shape — same no-loss rule.
- Confirm `ts-json-schema-generator` emits a usable JSON Schema for the chosen interface without manual edits.

Open questions:

- For aliases that span collections (Theme alias into Primitives by id), does the canonical shape store the alias as `{collection: 'primitives', name: 'color/blue/500'}` or as a fully-qualified single string `primitives:color/blue/500` or as the Figma-style `{<collection>}/<name>` reference? Lock during this WO's research pass.

## 📋 Ready for `/plan`

Plan should enumerate:

- The exact `TokensV1` interface (full TS), pasted at the top of `plan.md`.
- The migration plan for `packages/contracts/src/tokens.v1.ts` (where the interface replaces the WO-003 stub).
- The `decisions/canonical-token-model.md` outline — section order matching the six dimensions in **Technical / architectural** above.
- Dependencies: WO-005 (complete — feeds EVC implication), WO-003 (complete — owns the contracts package shell).
- Downstream consumers to notify: WO-007 (Sprint 2), WO-008 (Sprint 2), WO-009 (Sprint 2), WO-010 (Sprint 2).

## 🛠️ Ready for `/build`

Build artifacts:

- `decisions/canonical-token-model.md` (or this ticket body section if the team prefers inline).
- `packages/contracts/src/tokens.v1.ts` updated from stub to concrete interface.
- JSON Schema regenerated under `packages/contracts/dist/schemas/tokens.v1.schema.json` via the WO-003 tooling.

---

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-2 (normalize to canonical internal model), §8.2 (`tokens` hybrid contract)
- Lift-source map: `Docs/lift-sources.md` §0 (drift corrections), §4 (convention shards)
- WO-005 spike outputs (informs this decision):
  - `.github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/extended-collections.md` §2.4, §5
  - `.github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/latency-benchmark.md` §3, §6
  - `.github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/spike-execution-log.md` §5, §6
- WO-003 contracts package (this WO fills the `TokensV1` stub): `packages/contracts/src/tokens.v1.ts`
- Legacy lift sources (read before drafting the canonical shape — see `Docs/lift-sources.md` for the file-by-file map + size warnings):
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` — Plugin API push prose + value rules (COLOR / FLOAT / STRING / BOOLEAN / VARIABLE_ALIAS); the de-facto canonical shape used during creation
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md` — per-collection variable lists (what every token looks like)
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/data/theme-aliases.json` — Theme `rows` + `rawLiterals` shape (codeSyntax-per-token already encoded)
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md` — 5-collection model
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — codeSyntax-per-platform pattern
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/07-token-paths.md` — token path / naming conventions
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`

---

<details>
<summary>Original context capture (CTX-002, 2026-05-27)</summary>

```
---
type: context
github_issue: 8
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt4Cn8
---

## Source

Sprint 1 planning + WO-005 (Phase 0 spike) research outputs. Decision-capture intake (not raw research dump).

This ticket is a **design-handoff scaffold** for an architectural decision that gates Sprint 2's bootstrap-engine implementation. It will be **promoted** to a WO in Sprint 2 once WO-005's spike findings are in and the canonical shape is chosen.

## Goal

Lock the **canonical internal token model** — the TypeScript shape that Figmint's token-input adapters normalize both W3C DTCG and legacy `DesignOps-plugin` formats _into_ — before Sprint 2 begins writing those adapters.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-2 (normalize to canonical internal model), §8.2 (`tokens` hybrid contract).

## Design reference

|                            |                                      |
| -------------------------- | ------------------------------------ |
| **Figma**                  | N/A — schema / architecture decision |
| **File key**               | —                                    |
| **Node ID**                | —                                    |
| **Frame / component name** | —                                    |
| **Type**                   | —                                    |

**Screenshot / preview:** N/A.

## Requirements

### Functional

1. Produce a written decision document (committed as this ticket's `ticket.md` body OR as `decisions/canonical-token-model.md`) that captures the canonical TS shape. The shape must support:
   - W3C DTCG round-trip (lossless from input → canonical → output)
   - Legacy DesignOps-plugin format round-trip (lossless)
   - All 5 collections from PRD §6.1 (Primitives, Theme, Typography, Layout, Effects)
   - Per-collection modes (Light/Dark on Theme; Android-scale modes on Typography)
   - codeSyntax per platform (Web / Android / iOS) on every token
   - Variable aliasing (one token references another's resolved value)

### Visual | layout

- N/A.

### Technical

The decision must address all of:

- **Shape:** flat (every token has a fully-qualified path key) vs nested (tree of nested objects)?
- **Mode storage:** `Record<ModeId, Value>` per token vs array indexed by ordered mode list?
- **Alias representation:** string reference (`{Theme/Primary}`) vs resolved value vs both (alias kept for round-trip, resolved cached)?
- **codeSyntax storage:** flat field on each token (`codeSyntax: { web, android, ios }`) vs separate map keyed by token path?
- **Collection identity:** explicit `collection: "Primitives"` field on each token vs scope inferred from path prefix?
- **Mode inheritance (post-EVC):** if WO-005 confirms EVC viable, how does the canonical shape express "this collection extends parent X, override mode Y on tokens Z"?

## Acceptance criteria

- [ ] Decision document covers all 6 dimensions above with a chosen answer + 1-paragraph rationale per choice.
- [ ] WO-005 (Phase 0 spike) `research/extended-collections.md` findings cited where EVC affects the shape (specifically: mode inheritance).
- [ ] Final canonical shape expressible as a single TS type alias / interface (sketch the type in the document — don't yet commit to `tokens.v1.ts`; that happens during the promoted WO).
- [ ] Promoted to a WO in Sprint 2 via `/create-ticket promote CTX-002` before Sprint 2 adapter work begins.

## Out of scope

- Implementing the adapters (W3C DTCG → canonical, legacy → canonical) — that's the promoted Sprint 2 WO.
- Committing the canonical shape into `packages/contracts/src/tokens.v1.ts` — WO-003 leaves a `TODO` slot; this promoted WO fills it.
- Designing the codeSyntax mapping rules per platform (separate from canonical shape — that's a Sprint 2 concern handled by codeSyntax helper).
- Choosing the JSON Schema generator (WO-003's concern).

## Notes for build agent

This is a **decision capture**, not a build task. The agent promoting CTX-002 should:

1. Read WO-005 `research/extended-collections.md` and `research/latency-benchmark.md`.
2. Read `Docs/lift-sources.md` §0 (drift corrections) and §4 (convention shards) for the corrected lift map.
3. Read DesignOps-plugin sources for prior art (full list — preserved in the Sprint 1 WO-055 References section above).
4. Sketch the canonical TS type inline; record in this ticket's body OR a `decisions/canonical-token-model.md`.
5. Run `/create-ticket promote CTX-002` once decision is locked → becomes WO-### in Sprint 2.

## Summary

Lock the canonical internal token model before Sprint 2 adapter implementation. WO-005 (Phase 0 spike) findings — especially EVC behavior — must inform the decision.

## Raw Notes

_Spike findings will land here after WO-005 completes. Currently empty._

## Assets & Links

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-2, §8.2
- Spike findings (TBD): `.github/Sprint 1/WO-005-phase-0-spike-variable-push-evc-validation-latency-benchmark/research/`
- Lift reference: DesignOps-plugin paths listed in **Notes for build agent**
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`

## Observed Problems / Opportunities

- Without this decision locked, any token-input adapter built in Sprint 2 will be a stab in the dark and risk rework when EVC findings or canonical shape disagreements surface.
- Locking now also de-risks `packages/contracts/src/tokens.v1.ts` (WO-003) — that file can ship with a `TODO` interface in Sprint 1 and have it filled in during this CTX's promoted WO.

## Proposed Ticket Type

- [ ] `bug` — a defect to fix
- [x] `work-order` — a feature, enhancement, or deliverable
- [ ] `unknown` — needs human / agent triage

**Promotion notes:** Promote to `work-order` after WO-005 spike findings are committed. Title suggestion: `Define canonical internal token model + W3C DTCG / legacy adapters`.

## Related Tickets

- WO-003 — contracts package (leaves `TokensV1` as a TODO; this WO fills it)
- WO-005 — Phase 0 spike (informs)
- (Sprint 2) Promoted WO — will own implementation
```

</details>
