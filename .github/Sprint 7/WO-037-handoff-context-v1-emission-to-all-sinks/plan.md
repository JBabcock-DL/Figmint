# Plan — WO-037: HandoffContext v1 emission to all sinks

## Approach

Orchestrate WO-034/035/036 into a validated **`HandoffContextV1`** document via **`src/core/handoff/build.ts`**, expose a main-thread **`handoff/capture`** message handler, and reuse the existing WO-020 export pipeline (`ExportSheet` / `runExport` / `handleExportRun`) with `contractKind: 'handoff-context'`. Markdown rendering already exists (WO-019 `renderHandoffContextMarkdown`); default export sinks: **clipboard + markdown on**, all others off.

**Merge policy (multi-frame):**

- `frames[]` — direct output of `captureSelection()`
- `components[]` — merge by `name`, sum `instances`; prefer first non-empty `codeConnectUrl`
- `tokensUsed` — sorted union across frames
- `autoLayout` — from **first** captured frame root only
- `meta.frameUrl` — first non-empty `deepLink`, else file-level URL without node-id

**In scope:** `buildHandoffContext()`, message types, main handler, schema validation in tests, export integration, latency budget.

**Out of scope:** Handoff tab UI (WO-038), GitHub issue auto-create, ops `emit-handoff` dispatcher (PRD §9.2 future).

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| Checkout frame → markdown opens cleanly in Slack/Claude/GitHub PR | Steps 5–6, 12, 18, 20 |
| JSON validates against HandoffContextV1 schema | Steps 7, 14, 19 |
| Capture-to-clipboard <1s | Steps 5, 16, 19 |
| Vitest unit + integration | Steps 13–19 |

---

## Steps

- [x] **Step 1** — Create merge helpers `src/core/handoff/merge.ts`:

```typescript
import type { HandoffComponentUsage } from '@detroitlabs/fighub-contracts';

export function mergeComponentUsages(
  lists: HandoffComponentUsage[][],
): HandoffComponentUsage[];

export function mergeTokenLists(lists: string[][]): string[];
```

| Function | Rule |
| -------- | ---- |
| `mergeComponentUsages` | Key by `name`; sum `instances`; keep first defined `codeConnectUrl` |
| `mergeTokenLists` | Set union → sort lexicographically |

- **Done when:** `tests/unit/core/handoff/merge.test.ts` — 4+4 Button + duplicate tokens.

- [x] **Step 2** — Implement `src/core/handoff/build.ts`:

```typescript
import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';
import type { CaptureSelectionResult } from './types';

export interface BuildHandoffContextResult {
  document: HandoffContextV1;
  markdown: string;
  warnings: string[];
}

export async function buildHandoffContext(): Promise<BuildHandoffContextResult>;
```

Pipeline:

1. `const capture = await captureSelection()` (WO-034)
2. For each frame in `capture.frames`, resolve `SceneNode` by `figma.getNodeByIdAsync(frame.nodeId)` — skip missing with warning
3. Per root: `enumerateComponents(root)`, `enumerateTokensAndLayout(root)` (WO-035/036)
4. Merge components + tokens; `autoLayout` from first root's layout result
5. Assemble envelope:

```typescript
const document: HandoffContextV1 = {
  v: 1,
  kind: 'handoff-context',
  meta: {
    capturedAt: new Date().toISOString(),
    figmaFileKey: figma.fileKey || 'unknown',
    frameUrl: firstDeepLink || buildFileUrl(figma.fileKey, figma.root.name),
  },
  frames: capture.frames,
  components: mergedComponents,
  tokensUsed: mergedTokens,
  autoLayout: primaryAutoLayout,
};
```

6. `const markdown = format({ kind: 'handoff-context', payload: document }, 'md')` via `@/io/formats`
7. Return `{ document, markdown, warnings: [...capture.warnings, ...buildWarnings] }`

- **Done when:** unit test with frozen submodule mocks returns valid shape.

- [x] **Step 3** — Implement `buildFileUrl` helper (pure):

```typescript
export function buildFileUrl(fileKey: string, fileName: string): string;
// https://www.figma.com/design/{fileKey}/{encodeURIComponent(fileName)}
// empty string when fileKey blank
```

- **Done when:** helper test matches WO-034 deep link base without node-id.

- [x] **Step 4** — Runtime schema guard `src/core/handoff/validate.ts`:

```typescript
import Ajv from 'ajv';
import handoffSchema from '@detroitlabs/fighub-contracts/schemas/handoff-context.v1.schema.json';

export function assertHandoffContextV1(doc: unknown): asserts doc is HandoffContextV1;
```

- Use existing ajv setup pattern from other contract tests in repo.
- **Done when:** invalid doc throws; golden fixture passes.

- [x] **Step 5** — Create message types `src/io/messages/handoff.ts`:

```typescript
export const HANDOFF_CAPTURE = 'handoff/capture' as const;
export const HANDOFF_CAPTURE_RESULT = 'handoff/capture-result' as const;
export const HANDOFF_SELECTION = 'handoff/selection' as const;

export interface HandoffCaptureMessage {
  type: typeof HANDOFF_CAPTURE;
  requestId: string;
}

export interface HandoffCaptureResultMessage {
  type: typeof HANDOFF_CAPTURE_RESULT;
  requestId: string;
  ok: boolean;
  markdown?: string;
  document?: HandoffContextV1;
  warnings?: string[];
  error?: string;
  durationMs?: number;
}

export interface HandoffSelectionMessage {
  type: typeof HANDOFF_SELECTION;
  count: number;
  names: string[];
}

export function isHandoffCaptureMessage(msg: unknown): msg is HandoffCaptureMessage;
```

- **Done when:** type guards tested in `tests/unit/io/messages/handoff.test.ts`.

- [x] **Step 6** — Register UI listener `src/ui/handoff/handoffMessageListener.ts`:

```typescript
export function registerHandoffMessageListener(handlers: {
  onCaptureResult?: (msg: HandoffCaptureResultMessage) => void;
  onSelection?: (msg: HandoffSelectionMessage) => void;
}): void;
```

- Mirror `exportMessageListener.ts` pattern (`window.onmessage` → `pluginMessage`).
- **Done when:** Vitest jsdom test receives mocked postMessage.

- [x] **Step 7** — Implement `handleHandoffCapture` in `src/main.ts` (via `src/main/handoffHandlers.ts`):

```typescript
async function handleHandoffCapture(message: HandoffCaptureMessage): Promise<void>;
```

Flow:

1. Record `start = Date.now()`
2. try `{ document, markdown, warnings } = await buildHandoffContext()`
3. `assertHandoffContextV1(document)`
4. post `handoff/capture-result` with ok, markdown, document (serializable), warnings, durationMs
5. catch → post ok:false + error via `extractErrorMessage`

Wire in existing `figma.ui.onmessage` chain **before** early return guards.

- **Done when:** integration test mocks postMessage payload.

- [x] **Step 8** — Implement selection broadcast for WO-038 (main thread):

```typescript
function broadcastHandoffSelection(): void;
```

- On plugin init (after `showUI`) + `figma.on('selectionchange')`:
- post `{ type: 'handoff/selection', count, names: selection.slice(0, 5).map(n => n.name) }`
- **Done when:** unit test via extracted pure `selectionSummary(selection)`.

- [x] **Step 9** — Export document wrapper for UI `src/ui/handoff/prepareHandoffExport.ts`:

```typescript
import type { HandoffContextV1 } from '@detroitlabs/fighub-contracts';
import type { ContractDocument } from '@/ui/export/types';

export function prepareHandoffExport(document: HandoffContextV1): {
  doc: ContractDocument;
  defaultSinks: SinkId[];
  defaultFormats: { json: boolean; md: boolean };
};
```

Defaults:

| Setting | Value |
| ------- | ----- |
| `defaultSinks` | `['clipboard']` |
| `defaultFormats` | `{ json: false, md: true }` |
| Path basename | `defaultExportBasename({ kind: 'handoff-context', payload: document })` → `docs/fighub/handoff-{date}` |

- **Done when:** test asserts clipboard-only defaults.

- [x] **Step 10** — Plugin-data size warning in `buildHandoffContext` or export prep:

```typescript
const PLUGIN_DATA_MAX_BYTES = 100_000;
function estimatePayloadBytes(doc: HandoffContextV1): number;
```

- If JSON.stringify(doc).length > limit → append warning `'Plugin-data export may exceed 100 kB — use clipboard or download'`
- Keep plugin-data sink **off** by default in `prepareHandoffExport`.
- **Done when:** test with large fake dataUrl triggers warning.

- [x] **Step 11** — Clipboard markdown policy (locked):

- Use **embedded** screenshots in markdown (WO-019 already embeds `dataUrl`) for single-frame handoff — satisfies AC “opens cleanly in Slack”.
- Do not strip images for default path.
- **Done when:** golden markdown snapshot includes `![` image syntax.

- [x] **Step 12** — Verify `handleExportRun` accepts `handoff-context` without modification:

- Read `src/main.ts` `handleExportRun` + `prepareSinkContent` — ensure `kind: 'handoff-context'` path exists from WO-019/020.
- If gap: add case mapping to `renderHandoffContextMarkdown` / JSON serialize only (minimal patch).
- **Done when:** `tests/unit/main/exportHandoff.test.ts` dispatches export/run with handoff doc.

- [x] **Step 13** — Unit tests `tests/unit/core/handoff/build.test.ts` with injected deps:

```typescript
// vi.mock submodules
vi.mock('@/core/handoff/capture', …);
vi.mock('@/core/handoff/components', …);
vi.mock('@/core/handoff/tokens', …);
```

- Cases: single frame, multi-frame merge, missing node warning, empty fileKey meta.
- **Done when:** all cases green without figma globals.

- [x] **Step 14** — Schema validation test:

```bash
npm run test -- tests/unit/core/handoff/build.schema.test.ts
```

- Load `tests/fixtures/io/sources/handoff-context.json` + build output from mocks → `assertHandoffContextV1`.
- **Done when:** ajv validates.

- [x] **Step 15** — Golden JSON snapshot `tests/fixtures/handoff/handoff-context-built.v1.json`:

- Build from composed mocks (redact dataUrl to stable placeholder in compare).
- **Done when:** snapshot test committed.

- [x] **Step 16** — Latency test `tests/unit/core/handoff/build.latency.test.ts`:

- Mock capture 50ms + walks 20ms → total handler `< 1000ms`.
- **Done when:** AC latency covered.

- [x] **Step 17** — Thread-split matrix (document + test):

| Concern | Main thread | UI iframe |
| ------- | ----------- | --------- |
| Figma selection read | yes | no |
| PNG export | yes | no |
| Tree walks | yes | no |
| Markdown preview string | produced on main | displays in `<pre>` |
| Clipboard sink | via runExport UI path | yes |
| GitHub PR sink | handleExportRun | user opt-in |

- **Done when:** matrix in test file comment; no UI code imports `@/core/handoff/build`.

- [x] **Step 18** — End-to-end message test `tests/unit/main/handoffCapture.test.ts`:

- Simulate UI → `handoff/capture` → assert `handoff/capture-result` markdown contains `# handoff-context v1` and `## Components used`.
- **Done when:** passes with mocks.

- [ ] **Step 19** — Manual spike **SPK-037-1** (sandbox):

- Select Checkout-like frame → trigger capture → copy markdown to external editor → screenshot visible.
- **Done when:** logged for `/vqa`.

- [x] **Step 20** — CI gate:

```bash
npm run lint && npm run typecheck && npm run test -- tests/unit/core/handoff tests/unit/io/messages/handoff.test.ts tests/unit/main/handoffCapture.test.ts
```

- **Done when:** all green.

---

## Build Agents

### Phase 1 (parallel) — requires WO-034/035/036 merged or stubbed

- `code-build` — Steps 1–4: merge helpers, `buildHandoffContext`, file URL helper, schema guard

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 5–8: messages, UI listener registration, main capture handler, selection broadcast

### Phase 3 (parallel, after Phase 2)

- `code-build` — Steps 9–12: export prep, payload warning, clipboard policy, export/run verification

### Phase 4 (parallel, after Phase 3)

- `code-build` — Steps 13–18: unit, schema, golden, latency, e2e message tests

### Phase 5

- `code-build` — Steps 19–20: manual spike checklist + CI

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-034 | `captureSelection()` |
| WO-035 | `enumerateComponents()` |
| WO-036 | `enumerateTokensAndLayout()` |
| WO-019 | `format()` / markdown renderer |
| WO-020 | `ExportSheet`, `runExport`, sink orchestration |
| WO-003 | Contract types + JSON schema |
| WO-016 | GitHub PR sink (optional, off by default) |
| `src/main.ts` | Message routing |
| Vitest + ajv | Tests + validation |
| Plugin Sandbox | SPK-037-1 manual |

No Figma MCP required for automated tests.

---

## Open Questions

- **RESOLVED:** Reuse ExportSheet (research D-037-1).
- **RESOLVED:** Default clipboard + md (research D-037-2).
- **RESOLVED:** Primary frame auto-layout only (research D-037-4).
- **RESOLVED:** GitHub issue auto-create out of scope.
- **RESOLVED:** Embedded screenshots in clipboard markdown (AC Slack/Claude readability).

---

## Wrong vs correct

| Wrong | Correct |
| ----- | ------- |
| Duplicate markdown renderer in handoff module | Call WO-019 `format()` |
| Custom sink implementations | Reuse WO-017/020 `runExport` + `handleExportRun` |
| Put Figma API calls in UI | Main thread only via messages |
| Default all five sinks on | Clipboard + md only |
| `console.debug` in main | `pluginLog` |

---

## Notes

- `buildHandoffContext()` must remain callable from main handler only — no React imports in core.
- WO-038 consumes `handoff/capture-result` + `prepareHandoffExport` — coordinate message field names with WO-038 plan.
- Bibliography: `research/handoff-context-v1-emission-to-all-sinks.md`, `src/io/formats/markdown/handoffContext.ts`, `src/ui/export/defaultPaths.ts`.
- Export basename: `docs/fighub/handoff-{YYYY-MM-DD}` per WO-020.
