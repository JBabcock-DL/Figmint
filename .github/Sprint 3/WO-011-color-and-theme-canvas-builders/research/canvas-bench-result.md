# Canvas bench result — WO-011

> **Status:** Manual VQA deferred — Figma MCP unavailable in build agent session.
> **Date:** 2026-05-27
> **Ticket:** WO-011 Color & Theme canvas builders

## Summary

Manual Plugin Sandbox VQA was not run in this build session. Dev handler `canvas/build-page` is wired in `src/main.ts` for manual verification after WO-008 push.

## Vitest coverage (proxy verification)

| Suite                    | Result       | Notes                                                |
| ------------------------ | ------------ | ---------------------------------------------------- |
| `colorFormats.test.ts`   | Vitest green | hex/HSL/RGB pure helpers                             |
| `primitivesRows.test.ts` | Vitest green | `foundations-minimal` + `primitives-100` (100 stops) |
| `themeRows.test.ts`      | Vitest green | alias chain, empty group omission                    |
| `pages.test.ts`          | Vitest green | idempotent `_PageContent` wipe                       |
| `fonts.test.ts`          | Vitest green | warm-cache no-op on second call                      |

## Bench target (AC4)

| Builder                               | Target p50 | Measured     | Status             |
| ------------------------------------- | ---------- | ------------ | ------------------ |
| `buildPrimitivesPage` (~100 swatches) | < 3000 ms  | **deferred** | Manual VQA pending |
| `buildThemePage` (~100 swatches)      | < 3000 ms  | **deferred** | Manual VQA pending |

## Manual VQA checklist (deferred)

1. Push `spike-400` or foundations fixture via existing push UI in Plugin Sandbox (`file_key=cVdPraIafWFBRZnzMPhtrW`)
2. Post `{ type: 'canvas/build-page', page: 'primitives' | 'theme', tokens }` from UI or console
3. Verify column sum 1640, bound swatches, node names `doc/table-group/*`, idempotent re-run
4. Record warm-font bench timings here

## Dev handler

```typescript
// UI → main
{ type: 'canvas/build-page', page: 'primitives' | 'theme', tokens: TokensV1 }
```

Guard: `src/io/messages/canvas.ts` → `isCanvasBuildPageMessage`.
