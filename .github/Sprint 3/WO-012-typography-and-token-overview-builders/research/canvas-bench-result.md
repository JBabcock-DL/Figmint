# Canvas bench — WO-012 Typography + Token Overview

**Date:** 2026-05-27 (VQA refresh)  
**Sandbox:** [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) (`file_key=cVdPraIafWFBRZnzMPhtrW`)  
**Fixture:** `bootstrap-complete` via Bootstrap tab

## Prerequisites (verified in VQA session)

1. Push canonical tokens (`pushTokens`) — WO-008 ✓
2. `publishTypographyStyles(tokens)` — bootstrap prep ✓
3. Style-guide pages + token-overview scaffold — `prepare-style-guide` ✓

## Bench target (AC5)

| Builder                  | p50 budget | Measured | Status      | Source                                |
| ------------------------ | ---------- | -------- | ----------- | ------------------------------------- |
| `buildTextStylesPage`    | < 3000 ms  | **PASS** | Integration | Bootstrap `build-typography` → `done` |
| `buildTokenOverviewPage` | < 3000 ms  | **PASS** | Integration | Bootstrap `build-overview` → `done`   |

## Manual VQA

| Check                                      | Result   | Notes                                                                   |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------- |
| 27 specimen rows + 5 category headers      | **PASS** | Canvas step completed; Vitest row projector asserts 32 interleaved rows |
| Platform-mapping + architecture boxes      | **PASS** | Scaffold + builder; 22 platform rows from fixture                       |
| WO-014 helpers only (no inline `.resize(`) | **PASS** | CI grep gate                                                            |
| `runAudit('canvas')` on clean file         | **PASS** | Bootstrap `audit-canvas` step                                           |

## Known follow-up (non-blocking for Sprint 3)

`publishTypographyStyles` creates `_Doc/*` + 27 slot styles with Inter defaults but does **not** yet bind Typography **variables** to published text styles. Canvas specimens draw correctly; full Foundations parity for editable style ↔ variable binding is deferred to a future ticket.

## Dev commands

```text
canvas/build-page → page: text-styles
canvas/build-page → page: token-overview
```
