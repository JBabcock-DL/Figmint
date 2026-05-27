# Layout & Effects canvas bench — WO-013

> **Status:** Deferred — manual VQA requires Figma plugin sandbox + pushed variables (WO-008).
> **Date:** 2026-05-27
> **Ticket:** WO-013

## Target

| Builder            | AC threshold | Typical expectation |
| ------------------ | ------------ | ------------------- |
| `buildLayoutPage`  | < 3000 ms    | ~500 ms             |
| `buildEffectsPage` | < 3000 ms    | ~500 ms             |

## Prerequisites (not run in this build)

1. Full variable push on Foundations-scale file (WO-008)
2. Local `Effect/shadow-{sm,md,lg,xl,2xl}` styles present
3. Plugin sandbox: `canvas/build-page` with `page: 'layout' | 'effects'`

## Results

| Run | File | Layout ms | Effects ms | Idempotent re-run | Notes                                        |
| --- | ---- | --------- | ---------- | ----------------- | -------------------------------------------- |
| —   | —    | —         | —          | —                 | Manual VQA deferred — no Figma session in CI |

## How to capture

```ts
// main thread after push
const t0 = performance.now();
await buildLayoutPage({ tokens });
const layoutMs = performance.now() - t0;
pluginLog('bench/layout', { layoutMs });
```

Repeat for `buildEffectsPage`, then re-run both builders and confirm stable `doc/table-group/*` counts.
