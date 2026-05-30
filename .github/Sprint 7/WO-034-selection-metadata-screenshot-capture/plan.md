# Plan — WO-034: Selection metadata + screenshot capture

## Approach

Introduce the greenfield **`src/core/handoff/`** module with **`capture.ts`** as the foundation for Sprint 7 handoff. When invoked (later by WO-037 / WO-038), `captureSelection()` reads `figma.currentPage.selection`, validates exportable node types, exports each node as PNG @ 1× via `exportAsync`, and returns **`CapturedFrame[]`** aligned 1:1 with contract `HandoffFrame` fields (`nodeId`, `name`, `deepLink`, `screenshot`).

Pure helpers **`buildDeepLink()`** and **`pngToDataUrl()`** enable unit tests without Figma globals. Main-thread logging uses **`pluginLog()`** only (never `console.debug` on main thread per project memory).

**In scope:** selection read, PNG export, deep links, multi-select (cap 10), parallel export, barrel export, Vitest unit + integration tests.

**Out of scope (do not implement):** component enumeration (WO-035), token walk (WO-036), UI tab (WO-038), markdown rendering (WO-019), export sinks (WO-020).

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| Frame selected → node id, name, deep link, PNG data URL | Steps 3–5, 8, 12 |
| Multi-selection captures all selected frames | Steps 4, 8, 12 |
| Performance <1s typical frames | Steps 4, 8, 13 |
| Vitest unit + integration tests | Steps 6–8, 12–14 |

---

## Steps

- [x] **Step 1** — Scaffold module tree under `src/core/handoff/`:

```
src/core/handoff/
  types.ts
  capture.ts
  index.ts
```

- Re-export public API from `index.ts`: `captureSelection`, `buildDeepLink`, `pngToDataUrl`, types.
- **Done when:** `npm run typecheck` passes with empty stub exports.

- [x] **Step 2** — Implement `src/core/handoff/types.ts`:

```typescript
import type { HandoffFrame, HandoffScreenshot } from '@detroitlabs/fighub-contracts';

export type CapturedFrame = HandoffFrame;

export interface CaptureSelectionResult {
  frames: CapturedFrame[];
  warnings: string[];
}

export const MAX_SELECTION_COUNT = 10;

export const EXPORTABLE_NODE_TYPES = new Set([
  'FRAME',
  'COMPONENT',
  'INSTANCE',
  'SECTION',
  'GROUP',
] as const);
```

- **Done when:** types compile; no `any`.

- [x] **Step 3** — Implement pure helpers in `src/core/handoff/capture.ts`:

```typescript
export function buildDeepLink(
  fileKey: string,
  fileName: string,
  nodeId: string,
): string;

export function pngToDataUrl(bytes: Uint8Array): string;
// Returns `data:image/png;base64,{base64}` using btoa/chunk pattern safe for ES2017
```

| Input | Output |
| ----- | ------ |
| `fileKey === ''` | `''` (empty deep link) |
| Valid fileKey + nodeId `12:34` | `https://www.figma.com/design/{fileKey}/{encodeURIComponent(fileName)}?node-id=12-34` |
| PNG bytes | `data:image/png;base64,...` |

- **Done when:** `tests/unit/core/handoff/capture.helpers.test.ts` — 6 cases (empty fileKey, encoded spaces in fileName, node-id dash conversion, 1×1 PNG round-trip prefix).

- [x] **Step 4** — Implement selection validation + export in `capture.ts`:

```typescript
export async function captureSelection(): Promise<CaptureSelectionResult>;
```

Behavior:

1. Read `figma.currentPage.selection`.
2. If length `=== 0` → throw typed error `'No selection'` (message surfaced by WO-037 handler).
3. If length `> MAX_SELECTION_COUNT` → throw `'Selection exceeds maximum of 10 nodes'`.
4. Filter to nodes where `node.type` ∈ `EXPORTABLE_NODE_TYPES`; log skip via `pluginLog` for unsupported types.
5. For each accepted node, in parallel (`Promise.all`):
   - `node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 1 } })`
   - Build `CapturedFrame`: `{ nodeId: node.id, name: node.name, deepLink: buildDeepLink(figma.fileKey, figma.root.name, node.id), screenshot: { format: 'png', dataUrl: pngToDataUrl(bytes) } }`
6. If `figma.fileKey === ''`, push warning `'Deep links unavailable — save file to Figma cloud'` into `warnings[]`.
7. Per-node `exportAsync` failure: catch, `pluginLog` error, omit frame from array + append warning with node name (partial capture allowed).

- **Done when:** mock-figma integration test (Step 8) passes parallel export + cap enforcement.

- [x] **Step 5** — Wire `src/core/handoff/index.ts` barrel:

```typescript
export { captureSelection, buildDeepLink, pngToDataUrl } from './capture';
export type { CapturedFrame, CaptureSelectionResult } from './types';
export { MAX_SELECTION_COUNT, EXPORTABLE_NODE_TYPES } from './types';
```

- **Done when:** `@/core/handoff` import resolves from tests.

- [x] **Step 6** — Add test fixture bytes `tests/fixtures/handoff/1x1.png.base64.txt` (minimal valid PNG base64, ~100 bytes decoded).

- **Done when:** fixture file committed; used by helper tests.

- [x] **Step 7** — Create mock harness `tests/mocks/handoffFigma.ts`:

```typescript
export function createMockExportableNode(overrides?: Partial<{
  id: string;
  name: string;
  type: SceneNode['type'];
  exportBytes: Uint8Array;
}>): SceneNode;
export function installHandoffFigmaMock(options: {
  selection: SceneNode[];
  fileKey?: string;
  fileName?: string;
}): void;
```

- Stub `globalThis.figma` with `currentPage.selection`, `fileKey`, `root.name`, per-node `exportAsync`.
- **Done when:** harness used by integration test without leaking globals between tests (`afterEach` restore).

- [x] **Step 8** — Integration tests `tests/unit/core/handoff/captureSelection.test.ts`:

| Case | Assert |
| ---- | ------ |
| Single FRAME selected | `frames.length === 1`, all HandoffFrame fields non-empty except deepLink when fileKey blank |
| Two nodes selected | `frames.length === 2`, distinct `nodeId` |
| 11 nodes selected | throws cap error |
| Empty selection | throws `'No selection'` |
| `exportAsync` rejects one of two | one frame + warning in result |
| Parallel timing | mock delay 100ms × 3 nodes → total < 350ms (fake timers) |

- **Done when:** all cases green.

- [x] **Step 9** — Contract shape guard test `tests/unit/core/handoff/capture.contract.test.ts`:

- Map each `CapturedFrame` field to `HandoffFrame` keys only (no extras).
- `screenshot.format === 'png'`.
- **Done when:** structural test passes.

- [x] **Step 10** — Performance micro-benchmark (non-flaky):

- In `captureSelection.test.ts`, assert mock 3-frame capture completes `< 1000ms` wall time with 50ms stubbed export each.
- **Done when:** ticket AC performance covered in CI.

- [x] **Step 11** — Document manual spike checklist in plan Notes only (runtime proof at `/vqa`):

- SPK-034-1: Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW`, select frame → `captureSelection()` via dev console or WO-037 handler → PNG dataUrl non-empty.
- SPK-034-2: multi-select 2 frames < 1s.

- **Done when:** no code — tracked for VQA.

- [x] **Step 12** — Add golden snapshot `tests/fixtures/handoff/captured-frame-min.json` (redact base64 to `[PNG]` placeholder in snapshot compare or strip in test).

- **Done when:** snapshot test stable in CI.

- [x] **Step 13** — Ensure no UI or main.ts wiring in this ticket (WO-037 owns handler).

- Grep gate: `rg 'captureSelection' src/main.ts src/ui/` → zero matches after build.
- **Done when:** grep clean.

- [x] **Step 14** — CI gate:

```bash
npm run lint && npm run typecheck && npm run test -- tests/unit/core/handoff
```

- **Done when:** all green on PR branch.

---

## Build Agents

### Phase 1 (parallel)

- `code-build` — Steps 1–5: types, pure helpers, `captureSelection()`, barrel

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 6–10: fixtures, mocks, unit + integration tests

### Phase 3 (parallel, after Phase 2)

- `code-build` — Steps 11–14: snapshot, scope grep, CI gate

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-002 | Plugin scaffold, Vitest, `@/` alias |
| `@detroitlabs/fighub-contracts` | `HandoffFrame`, `HandoffScreenshot` types |
| Figma Plugin API | `exportAsync`, `figma.currentPage.selection`, `figma.fileKey` |
| Vitest | Unit + integration tests |
| Plugin Sandbox (manual VQA) | `cVdPraIafWFBRZnzMPhtrW` |

No MCP servers required for build.

---

## Open Questions

- **RESOLVED:** Multi-selection returns array (ticket AC).
- **RESOLVED:** PNG @ 1× default (research D-034-2).
- **RESOLVED:** Cap at 10 nodes (research D-034-3).
- **RESOLVED:** Include GROUP when explicitly selected (research — rare but valid export target).
- **Deferred to WO-037:** UI error surfacing for empty selection.

---

## Notes

- ES2017 target: avoid `BigInt` in base64; use chunked `btoa` for large PNG buffers.
- Main thread: **`pluginLog('[handoff] capture', …)`** at start, per skip, per failure, at complete with frame count + duration ms.
- Downstream WO-035/036 receive **`SceneNode`** roots from captured selection order; WO-037 merges outputs.
- Bibliography: `research/selection-metadata-screenshot-capture.md`, `packages/contracts/src/handoffContext.v1.ts`.
- Manual spikes SPK-034-1/2 run during `/vqa` or WO-037 integration — not blocking WO-034 merge.
