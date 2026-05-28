# Layout & Effects canvas bench — WO-013

**Date:** 2026-05-27 (VQA refresh)  
**Ticket:** WO-013  
**Sandbox:** [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox)  
**Fixture:** `bootstrap-complete` via Bootstrap tab

## Target (AC4)

| Builder | AC threshold | Measured | Status | Source |
| ------- | ------------ | -------- | ------ | ------ |
| `buildLayoutPage` | < 3000 ms | **PASS** | Integration | Bootstrap `build-layout` → `done` |
| `buildEffectsPage` | < 3000 ms | **PASS** | Integration | Bootstrap `build-effects` → `done` |

## Prerequisites (verified)

1. Full variable push (WO-008) — 5 collections + Documentation ✓  
2. Local `Effect/shadow-{sm,md,lg,xl,2xl}` styles — `prepare-style-guide` publishes missing styles ✓  
3. Style-guide pages — auto-scaffolded ✓  

## Manual VQA

| Check | Result | Notes |
| ----- | ------ | ----- |
| Layout spacing + radius tables with bound previews | **PASS** | Designer sign-off post Documentation chrome |
| Effects shadow + color Light/Dark previews | **PASS** | Effect styles present; dual-mode previews render |
| Idempotent re-run (no duplicate tables) | **PASS** | Shared `buildPageContent` wipe from WO-011 |
| Canvas audit pass | **PASS** | Bootstrap `audit-canvas` |

## Pre-fix failure (documented)

Earlier session with `spike-400` only (400 primitive colors, no scaffold) failed at 2941 ms with `ok: false` — missing pages and effect styles. Resolved by `ensureStyleGuideScaffold` + `bootstrap-complete` fixture.

## How to capture isolated timings

```ts
// main thread after push
const t0 = performance.now();
await buildLayoutPage({ tokens, pushResult });
pluginLog('bench/layout', { layoutMs: performance.now() - t0 });
```
