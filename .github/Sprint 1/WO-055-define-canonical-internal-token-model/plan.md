# Plan — WO-055: Define canonical internal token model + W3C DTCG / legacy adapters

> **Status:** stub. Run `/plan` (or `/research` first) to fill this in before `/build` will run.

## Context

Promoted from `CTX-002` on 2026-05-27 after the WO-005 spike confirmed EVC is plan-gated and the canonical model can safely stay plan-agnostic (`research/extended-collections.md` §2.4, §5). This WO locks the concrete `TokensV1` interface that replaces the WO-003 stub at `packages/contracts/src/tokens.v1.ts`.

## Dependencies

- WO-003 (complete) — owns the contracts package shell + `ts-json-schema-generator` wiring.
- WO-005 (complete) — supplied the EVC findings + per-call latency rates that inform the shape.

## Downstream consumers (notify in their plan.md before they enter `/build`)

- Sprint 2 WO-007 (token input adapters) — must add `depends_on: WO-055`.
- Sprint 2 WO-008 (variable collection push engine) — consumes `TokensV1` directly.
- Sprint 2 WO-009 (codeSyntax mapping per platform) — reads `codeSyntax` field on each `TokensV1` token.
- Sprint 2 WO-010 (audit reporter) — diffs pushed variables against the `TokensV1` document.

## Build Agents

_To be defined during `/plan`._

```
<!-- /plan will populate this Build Agents section with parallel phases.
     For an architecture-decision WO with a small contracts edit, the phases are likely:
       Phase 1: doc-build (canonical-token-model.md) + code-build (tokens.v1.ts) in parallel.
       Phase 2: VQA (schema regeneration + typecheck pass).
-->
```
