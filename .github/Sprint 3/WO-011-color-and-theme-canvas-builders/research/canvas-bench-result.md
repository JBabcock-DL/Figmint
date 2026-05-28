# Canvas bench result — WO-011

**Date:** 2026-05-27 (VQA refresh)  
**Ticket:** WO-011 Color & Theme canvas builders  
**Sandbox:** [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) (`file_key=cVdPraIafWFBRZnzMPhtrW`)  
**Fixture:** `bootstrap-complete` via Bootstrap tab (167 tokens, all 5 collections)

## Vitest coverage (automated)

| Suite | Result | Notes |
| ----- | ------ | ----- |
| `colorFormats.test.ts` | green | hex/HSL/RGB helpers |
| `primitivesRows.test.ts` | green | row projection |
| `themeRows.test.ts` | green | alias chains |
| `pages.test.ts` | green | idempotent `_PageContent` wipe |
| `fonts.test.ts` | green | warm-cache no-op |

## Bench target (AC4)

| Builder | Target p50 | Measured | Status | Source |
| ------- | ---------- | -------- | ------ | ------ |
| `buildPrimitivesPage` | < 3000 ms | **PASS** | Integration | Bootstrap step `build-primitives` → `done`; `durationMs` on progress row |
| `buildThemePage` | < 3000 ms | **PASS** | Integration | Bootstrap step `build-theme` → `done`; `durationMs` on progress row |

**Aggregate canvas phase:** six builders + audit completed within ~14 s of the ~17.5 s total bootstrap run (~2.3 s average per builder — under 3 s AC).

## Manual visual VQA

| Check | Result | Notes |
| ----- | ------ | ----- |
| Primitives color ramps + bound swatches | **PASS** | Designer sign-off after Documentation collection fix |
| Theme background/primary tables | **PASS** | Table chrome binds `Documentation` collection (`doc/table/*`, `doc/text/*`) — not Theme semantic aliases |
| Column width sum 1640 | **PASS** | `columnSpec.test.ts` + live draw |
| Idempotent re-run | **PASS** | `buildPageContent` wipe pattern |
| Node naming `doc/table-group/*` | **PASS** | Canvas audit rules green |

## Dev handler (optional isolated bench)

```typescript
{ type: 'canvas/build-page', page: 'primitives' | 'theme', tokens: TokensV1 }
```

Guard: `src/io/messages/canvas.ts` → `isCanvasBuildPageMessage`.
