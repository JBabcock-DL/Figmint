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

---

## Design reference

|                            |                                      |
| -------------------------- | ------------------------------------ |
| **Figma**                  | N/A — schema / architecture decision |
| **File key**               | —                                    |
| **Node ID**                | —                                    |
| **Frame / component name** | —                                    |
| **Type**                   | —                                    |

**Screenshot / preview:** N/A.

---

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

---

## Acceptance criteria

- [ ] Decision document covers all 6 dimensions above with a chosen answer + 1-paragraph rationale per choice.
- [ ] WO-005 (Phase 0 spike) `research/extended-collections.md` findings cited where EVC affects the shape (specifically: mode inheritance).
- [ ] Final canonical shape expressible as a single TS type alias / interface (sketch the type in the document — don't yet commit to `tokens.v1.ts`; that happens during the promoted WO).
- [ ] Promoted to a WO in Sprint 2 via `/create-ticket promote CTX-002` before Sprint 2 adapter work begins.

---

## Out of scope

- Implementing the adapters (W3C DTCG → canonical, legacy → canonical) — that's the promoted Sprint 2 WO.
- Committing the canonical shape into `packages/contracts/src/tokens.v1.ts` — WO-003 leaves a `TODO` slot; this promoted WO fills it.
- Designing the codeSyntax mapping rules per platform (separate from canonical shape — that's a Sprint 2 concern handled by codeSyntax helper).
- Choosing the JSON Schema generator (WO-003's concern).

---

## Notes for build agent

This is a **decision capture**, not a build task. The agent promoting CTX-002 should:

1. Read WO-005 `research/extended-collections.md` and `research/latency-benchmark.md`.
2. Read `Docs/lift-sources.md` §0 (drift corrections) and §4 (convention shards) for the corrected lift map.
3. Read these DesignOps-plugin sources for prior art:
   - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/04-step11-push.md` — Plugin API push prose + value rules (COLOR / FLOAT / STRING / BOOLEAN / VARIABLE_ALIAS); the de-facto canonical shape used during creation
   - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/phases/02-steps5-9.md` — per-collection variable lists (what every token looks like)
   - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/data/theme-aliases.json` — Theme `rows` + `rawLiterals` shape (codeSyntax-per-token already encoded)
   - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/01-collections.md` — 5-collection model
   - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — codeSyntax-per-platform pattern
   - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/07-token-paths.md` — token path / naming conventions
4. Sketch the canonical TS type inline; record in this ticket's body OR a `decisions/canonical-token-model.md`.
5. Run `/create-ticket promote CTX-002` once decision is locked → becomes WO-### in Sprint 2.

---

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
