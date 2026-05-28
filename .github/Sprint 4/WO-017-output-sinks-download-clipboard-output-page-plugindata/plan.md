# Plan — WO-017: Output sinks (download, clipboard, Output page, pluginData)

## Approach

Implement **`src/io/sinks/`** — four output destinations behind one **`Sink`** interface. **UI iframe:** `download.ts`, `clipboard.ts` (browser APIs, user gesture). **Main thread:** `outputPage.ts`, `pluginData.ts` (Figma Plugin API). UI never imports `figma`; UI wrappers `outputPageClient.ts` / `pluginDataClient.ts` post typed messages via `src/io/messages/sinks.ts` (mirror Bootstrap `bootstrap/run` pattern).

All sinks call **`prepareSinkContent()`** once per export. **Phase A (parallel build):** stub serializer until WO-019 merges. **Phase B:** replace stub with `format()` from `@/io/formats`.

**Out of scope:** `github-pr` (WO-018), ExportSheet (WO-020), snapshot node (WO-028).

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| All four sinks implement `Sink.write()` on drift sample | Steps 1–7, 11, 14 |
| Download `.v1.json` / `.v1.md` MIME | Step 4 |
| Clipboard + execCommand fallback | Step 5 |
| Output page auto-create + update-by-label | Step 6 |
| pluginData single selection + `fighub:<kind>` | Step 7 |
| Unit tests + message guards | Steps 8–10, 13 |

---

## Steps

- [x] **Step 1** — Create `src/io/sinks/types.ts` (no Figma imports):

```ts
import type { ContractKind, LoadedDocument } from '@/io/sources/types';

export type OutputFormat = 'json' | 'md';
export type SinkId = 'download' | 'clipboard' | 'output-page' | 'plugin-data';

export interface FormatOptions {
  format: OutputFormat | 'both';
  primaryFormat?: OutputFormat; // when both: clipboard defaults md
  baseName?: string;
  label?: string;
}

export interface SinkArtifact {
  format: OutputFormat;
  byteLength: number;
  destination?: string;
}

export interface SinkResult {
  ok: boolean;
  sink: SinkId;
  message: string;
  artifacts?: SinkArtifact[];
  error?: string;
}

export interface Sink {
  readonly id: SinkId;
  write(doc: LoadedDocument, options: FormatOptions): Promise<SinkResult>;
}

export interface SerializableDocument {
  kind: ContractKind;
  payload: unknown;
}
```

  - **Done when:** typecheck passes.

- [x] **Step 2** — Fixture + test helper:
  - Create `tests/fixtures/io/sinks/drift-report-sample.v1.json` — minimal valid `DriftReportV1` (copy/trim from contracts examples).
  - Create `tests/helpers/sinks/loadDriftSampleDoc.ts`:

```ts
export function loadDriftSampleDoc(): LoadedDocument<DriftReportV1>;
// kind: 'drift-report', payload parsed, sourceMeta stub port:'paste'
```

  - **Done when:** helper used in all sink tests.

- [x] **Step 3** — Implement `src/io/sinks/prepareContent.ts`:

```ts
export interface PreparedContent {
  json: string;
  markdown: string;
  baseName: string;
  label: string;
}

function defaultBaseName(doc: LoadedDocument): string;
// `${doc.kind}-${isoDateFromPayloadOrNow}` — read meta.generatedAt if present

function defaultLabel(doc: LoadedDocument): string;
// `fighub/${doc.kind}/${generatedAt}`

export function prepareSinkContent(
  doc: LoadedDocument,
  options: FormatOptions,
): PreparedContent;
```

  **Stub body (until WO-019 Step 12 swap):**

```ts
const json = JSON.stringify(doc.payload, null, 2);
const markdown =
  '# ' + doc.kind + '\n\n_(markdown renderer lands in WO-019)_\n\n```json\n' + json + '\n```';
```

  - **Done when:** `tests/unit/io/sinks/prepareContent.test.ts` asserts defaults from drift meta dates.

- [x] **Step 4** — Implement `src/io/sinks/download.ts`:

```ts
function downloadText(filename: string, mimeType: string, text: string): void;
// Blob → createObjectURL → <a download> → click → revokeObjectURL

export const downloadSink: Sink = {
  id: 'download',
  async write(doc, options) { /* ... */ },
};
```

| `options.format` | Files | MIME |
| ---------------- | ----- | ---- |
| `json` | `{baseName}.v1.json` | `application/json` |
| `md` | `{baseName}.v1.md` | `text/markdown;charset=utf-8` |
| `both` | both above | sequential clicks; `await sleep(0)` between |

  - Return `SinkResult` with `artifacts[].destination` = filename.
  - **Done when:** `tests/unit/io/sinks/download.test.ts` spies `URL.createObjectURL`, `HTMLAnchorElement.click`.

- [x] **Step 5** — Implement `src/io/sinks/clipboard.ts`:

```ts
async function copyViaWriteText(text: string): Promise<void>;
function copyViaExecCommand(text: string): boolean;
// off-screen readonly textarea, select, execCommand('copy')

export const clipboardSink: Sink = { id: 'clipboard', async write(...) };
```

  - Text pick: `const fmt = options.primaryFormat ?? (options.format === 'both' ? 'md' : options.format)`.
  - Try `writeText`; on `NotAllowedError` try execCommand; both fail → `ok: false`.
  - **Done when:** tests mock `navigator.clipboard.writeText` reject → fallback path called.

- [x] **Step 6** — Implement `src/io/sinks/outputPage.ts` (main thread only):

Constants (export for tests):

```ts
export const FIGHUB_OUTPUT_PAGE_NAME = 'FigHub Output';
export const LEGACY_OUTPUT_PAGE_NAMES = ['DesignOps Output'];
export const FIGHUB_OUTPUT_CONTENT_FRAME = '_FigHubOutputContent';
export const FIGHUB_SHARED_NS = 'fighub';
export const FIGHUB_PAGE_ROLE_KEY = 'pageRole';
export const FIGHUB_PAGE_ROLE_OUTPUT = 'output';
```

**`findOrCreateOutputPage(): Page`** — resolution order:
1. All pages: shared pluginData `fighub`/`pageRole` === `output`
2. Name === `FigHub Output`
3. Name === `DesignOps Output` (exactly one)
4. Create page, set name + shared pluginData, append to root; set `figma.currentPage = page` on first create only

**`findOrCreateContentFrame(page): Frame`** — child frame `_FigHubOutputContent`, VERTICAL auto-layout, width ~960.

**`writeToOutputPage(prepared, options): Promise<SinkResult>`**:
- Content string: `options.format === 'json' ? prepared.json : prepared.markdown`; when `both` → **markdown** on canvas.
- Find TEXT child where `node.name === label`; if found update `characters`; else create TEXT, append to frame.
- `await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })` before set (pattern from `src/core/canvas/lib/fonts.ts`).

  - **Done when:** `tests/unit/io/sinks/outputPage.test.ts` with extended figma mock — create page, update existing node by name.

- [x] **Step 7** — Implement `src/io/sinks/pluginData.ts` (main thread):

```ts
export const FIGHUB_PLUGIN_DATA_PREFIX = 'fighub:';
export const PLUGIN_DATA_MAX_BYTES = 100_000;

export function pluginDataKey(kind: ContractKind): string;
// return FIGHUB_PLUGIN_DATA_PREFIX + kind

export async function writeToPluginData(
  doc: LoadedDocument,
  prepared: PreparedContent,
): Promise<SinkResult>;
```

  - `selection.length !== 1` → error with message from ticket AC.
  - `!('setPluginData' in target)` → error.
  - Value: **`prepared.json`** always (machine-readable per research §5).
  - Reject if `prepared.json.length > PLUGIN_DATA_MAX_BYTES`.
  - **Done when:** tests for 0, 2+, oversize, happy path.

- [x] **Step 8** — Create `src/io/messages/sinks.ts`:

**UI → main:**

```ts
export interface SinkOutputPageMessage {
  type: 'sink/output-page';
  requestId: string;
  doc: SerializableDocument;
  options: FormatOptions;
}

export interface SinkPluginDataMessage {
  type: 'sink/plugin-data';
  requestId: string;
  doc: SerializableDocument;
  options: FormatOptions;
}
```

**Main → UI:**

```ts
export interface SinkResultMessage {
  type: 'sink/result';
  requestId: string;
  result: SinkResult;
}

export interface SinkErrorMessage {
  type: 'sink/error';
  requestId: string;
  message: string;
}
```

  - Guards: `isSinkOutputPageMessage`, `isSinkPluginDataMessage`, `isSinkResultMessage`, `isSinkErrorMessage` — ES2017-safe (`typeof` checks, no `?.`).
  - **Done when:** `tests/unit/io/messages/sinks.test.ts` — 4+ valid + 4+ invalid payloads per guard.

- [x] **Step 9** — UI clients `src/io/sinks/outputPageClient.ts`, `pluginDataClient.ts`:

```ts
function createPendingMap(): Map<string, { resolve, reject }>;

export const outputPageClientSink: Sink = {
  id: 'output-page',
  write(doc, options) {
    const requestId = nextId();
    return new Promise(function (resolve, reject) {
      pending.set(requestId, { resolve, reject });
      parent.postMessage({ pluginMessage: { type: 'sink/output-page', requestId, doc: serializeDoc(doc), options } }, '*');
    });
  },
};
```

  - Register `window.addEventListener('message')` once in module init or per-call in ExportSheet later — for WO-017 export a `registerSinkMessageListener()` called from App mount.
  - **Done when:** test mocks postMessage + synthetic pluginMessage response.

- [x] **Step 10** — Wire `src/main.ts` (append before final `isIoLoadedMessage` guard):

```ts
if (isSinkOutputPageMessage(message)) {
  handleSinkOutputPage(message.requestId, message.doc, message.options);
  return;
}
if (isSinkPluginDataMessage(message)) {
  handleSinkPluginData(message.requestId, message.doc, message.options);
  return;
}
```

  - Handlers: rebuild `LoadedDocument` from serializable payload, `prepareSinkContent`, call main sink, `figma.ui.postMessage({ type: 'sink/result', requestId, result })`.
  - Catch → `sink/error`. Use `pluginLog()` only.
  - **Done when:** typecheck; no optional chaining in new main code.

- [x] **Step 11** — Barrel `src/io/sinks/index.ts`:

```ts
export const SINKS: Record<SinkId, Sink> = {
  download: downloadSink,
  clipboard: clipboardSink,
  'output-page': outputPageClientSink,
  'plugin-data': pluginDataClientSink,
};

export async function runSink(id: SinkId, doc: LoadedDocument, options: FormatOptions): Promise<SinkResult>;
```

- [x] **Step 12** — WO-019 integration in `prepareContent.ts`:

```ts
import { format } from '@/io/formats';
import type { FormattableDocument } from '@/io/formats';

const payload = doc.payload as FormattableDocument;
const json = format(payload, 'json');
const markdown = format(payload, 'md');
```

  - Skip for `registry` kind — keep JSON.stringify only (no MD renderer).
  - **Done when:** download of drift sample contains `## ↑ Push` in `.v1.md`.

- [x] **Step 13** — Test matrix `tests/unit/io/sinks/`:

| File | Min cases |
| ---- | --------- |
| `prepareContent.test.ts` | defaults, stub, post-WO-019 |
| `download.test.ts` | json, md, both, blob throw |
| `clipboard.test.ts` | writeText ok, fallback, both→md |
| `outputPage.test.ts` | create, update-by-label, legacy page name |
| `pluginData.test.ts` | selection errors, size limit |
| `outputPageClient.test.ts` | postMessage round-trip |

- [ ] **Step 14** — Manual smoke (Plugin Sandbox `file_key=cVdPraIafWFBRZnzMPhtrW`):
  1. Load drift sample via temporary dev button or WO-020 preview
  2. Download JSON+MD
  3. Copy markdown
  4. Output page creates `FigHub Output`
  5. Select one frame → pluginData write
  - **Done when:** checklist recorded in build notes.

- [x] **Step 15** — CI: `npm run typecheck && npm run lint && npm run test && npm run build`.

---

## Build Agents

### Phase 1 (sequential)
- `code-build` — **Steps 1–3**: types, fixture, `prepareContent` stub.

### Phase 2 (parallel)
- `code-build` — **Steps 4–5**: download + clipboard.
- `code-build` — **Steps 6–7**: outputPage + pluginData (main).

### Phase 3 (sequential)
- `code-build` — **Steps 8–10**: messages, UI clients, `main.ts`.

### Phase 4
- `code-build` — **Steps 11–15**: barrel, WO-019 hookup, tests, smoke, CI.

---

## Dependencies & Tools

| Dependency | Status |
| ---------- | ------ |
| WO-002, WO-003 | ✅ |
| WO-019 `format()` | Step 12 |
| WO-006 clipboard read research | ✅ inverse for write |
| Figma mock in tests | Extend existing canvas mocks |

---

## Open Questions

| # | Question | Resolution |
| - | -------- | ---------- |
| OQ-17-1 | Stub until WO-019? | **RESOLVED:** yes. |
| OQ-17-2 | Both formats on output page? | **RESOLVED:** MD on canvas when both. |

---

## Notes

### Thread split (locked)

| Module | Thread | May import `figma`? |
| ------ | ------ | ------------------- |
| `download.ts`, `clipboard.ts` | UI | No |
| `outputPage.ts`, `pluginData.ts` | Main | Yes |
| `*Client.ts` | UI | No — postMessage only |

### Wrong vs correct

| Wrong | Correct |
| ----- | ------- |
| Import `figma` in UI sink | postMessage to main |
| `console.debug` on main | `pluginLog()` |
| Hand-author markdown in sink | `prepareSinkContent` → `format()` |

### References

- Research: [`output-sinks-implementation.md`](./research/output-sinks-implementation.md)
- Bootstrap message pattern: `src/io/messages/bootstrap.ts`, `src/main.ts`
