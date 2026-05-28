# Plan — WO-020: Unified export sheet UI

## Approach

Build **`ExportSheet.tsx`** — reusable export panel for all contract emit flows. Owns format/sink checkboxes, path input, parallel orchestration, per-sink status UI. Serializes via WO-019 **`format()`**; executes sinks via WO-017 **`runSink`** (UI) and **`export/run`** postMessage (main: output-page, plugin-data, github-pr).

State in **`exportSheetReducer.ts`** (mirror `bootstrapProgressReducer.ts`). No Storybook — **Vitest + @testing-library/react**.

**Depends on** WO-019, WO-017, WO-018 landing (or stubs with feature flags until merged).

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| Component tests all 6 ContractDocument variants | Steps 3, 9–10, 14 |
| GitHub PR hidden when `!flags.githubOAuth` | Steps 6, 14 |
| Multi-sink parallel + partial failure | Steps 7–8, 14 |
| Path defaults per kind | Steps 2, 14 |

---

## Steps

- [x] **Step 1** — Add devDependencies (if missing):

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

  - Create `tests/setup/dom.ts`: `import '@testing-library/jest-dom/vitest'`.
  - Add to `vitest.config.ts`: `setupFiles: ['tests/setup/dom.ts']`.
  - **Done when:** smoke render test passes.

- [x] **Step 2** — Implement `src/ui/export/defaultPaths.ts`:

```ts
import type { ContractDocument } from './types';

export function defaultExportBasename(
  doc: ContractDocument,
  now?: Date,
): string;
```

| `kind` | Return (no extension) |
| ------ | ----------------------- |
| `drift-report` | `docs/figmint/drift-{YYYY-MM-DD}` |
| `handoff-context` | `docs/figmint/handoff-{date}` |
| `ops-program` | `docs/figmint/ops-{date}` |
| `component-spec` | `docs/figmint/components/{kebab(name)}` |
| `registry` | `.figmint-registry` |
| `tokens` | `docs/figmint/tokens-{date}` |

  - `kebab(name)` from `payload.name` on component-spec.
  - **Done when:** `tests/unit/ui/export/defaultPaths.test.ts` — 6 rows + component slug.

- [x] **Step 3** — Create `src/ui/export/types.ts`:

```ts
export type ContractDocument = /* union of 6 kinds per research */;

export type ExportFormatSelection = { json: boolean; md: boolean };

export type ExportSinkSelection = Record<SinkId, boolean>;

export interface ExportResults {
  requestId: string;
  bySink: Partial<Record<SinkId, { ok: boolean; message?: string; error?: string }>>;
}

export interface ExportSheetProps {
  document: ContractDocument;
  defaultSinks?: SinkId[];
  title?: string;
  onComplete?: (results: ExportResults) => void;
  onCancel?: () => void;
}
```

  - Import `SinkId` from `@/io/sinks/types` (includes `github-pr` when WO-018 merged).

- [x] **Step 4** — Implement `src/ui/export/exportSheetReducer.ts`:

```ts
export type ExportSheetState = {
  formats: ExportFormatSelection;
  sinks: ExportSinkSelection;
  path: string;
  exporting: boolean;
  results: ExportResults | null;
  formError: string | null;
};

export type ExportSheetAction =
  | { type: 'toggle-format'; format: 'json' | 'md' }
  | { type: 'toggle-sink'; sink: SinkId }
  | { type: 'set-path'; path: string }
  | { type: 'start-export'; requestId: string }
  | { type: 'sink-result'; sink: SinkId; ok: boolean; message?: string; error?: string }
  | { type: 'complete' }
  | { type: 'reset' };
```

  - Initial sinks: intersect `defaultSinks` with `availableSinks()` (see Step 6).
  - Initial formats: both true except registry → json only.
  - **Done when:** reducer tests cover partial failure (2 ok, 1 fail).

- [x] **Step 5** — Create `src/io/messages/export.ts`:

```ts
export interface ExportRunMessage {
  type: 'export/run';
  requestId: string;
  sinks: Array<'output-page' | 'plugin-data' | 'github-pr'>;
  doc: SerializableDocument;
  formatOptions: FormatOptions;
  files: Array<{ path: string; content: string; format: 'json' | 'md' }>;
  githubPR?: ExportGithubPRPayload; // when github-pr selected
}

export interface ExportSinkResultMessage {
  type: 'export/sink-result';
  requestId: string;
  sink: SinkId;
  ok: boolean;
  message?: string;
  error?: string;
  code?: SinkFailureCode;
}

export interface ExportCompleteMessage {
  type: 'export/complete';
  requestId: string;
  bySink: ExportResults['bySink'];
}
```

  - Guards: `isExportRunMessage`, `isExportSinkResultMessage`, `isExportCompleteMessage`.
  - **Done when:** `tests/unit/io/messages/export.test.ts`.

- [x] **Step 6** — Implement `src/ui/export/availableSinks.ts`:

```ts
import { flags } from '@/config/flags';

export function availableSinks(): SinkId[] {
  const base: SinkId[] = ['download', 'clipboard', 'output-page', 'plugin-data'];
  if (flags.githubOAuth && flags.githubPRSink) {
    base.push('github-pr');
  }
  return base;
}

export function isPathInputVisible(sinks: ExportSinkSelection): boolean {
  return sinks.download === true || sinks['github-pr'] === true;
}

export function canExport(state: ExportSheetState): boolean {
  const hasFormat = state.formats.json || state.formats.md;
  const hasSink = Object.keys(state.sinks).some(function (k) { return state.sinks[k as SinkId]; });
  return hasFormat && hasSink && !state.exporting;
}
```

- [x] **Step 7** — Implement `src/ui/export/serializeForExport.ts`:

```ts
export function buildExportFiles(
  doc: ContractDocument,
  formats: ExportFormatSelection,
  basename: string,
): Array<{ path: string; content: string; format: 'json' | 'md' }>;
```

  - Paths: `{basename}.v1.json`, `{basename}.v1.md` (registry: `{basename}.json` only if kind registry).
  - Content: `format(payload, 'json'|'md')` from WO-019.
  - Registry: skip md even if checkbox somehow true.
  - **Done when:** test produces 2 files for drift-report both formats.

- [x] **Step 8** — Implement `src/ui/export/runExport.ts`:

```ts
export async function runExport(
  doc: ContractDocument,
  state: ExportSheetState,
  dispatch: Dispatch<ExportSheetAction>,
): Promise<void>;
```

**Algorithm:**
1. `requestId = 'export-' + Date.now()`
2. `dispatch({ type: 'start-export', requestId })`
3. Build `LoadedDocument` from ContractDocument for sinks
4. Build `files` via `buildExportFiles`
5. **UI sinks:** for each selected download/clipboard → `runSink(id, loadedDoc, formatOptions)` in `Promise.allSettled` → dispatch sink-result per outcome
6. **Main sinks:** if any of output-page/plugin-data/github-pr selected → `parent.postMessage({ pluginMessage: { type: 'export/run', … }})`
7. Listen for `export/sink-result` / `export/complete` (register listener module `exportMessageListener.ts`)
8. `dispatch({ type: 'complete' })`; call `onComplete`

  - **Done when:** test with mocked runSink + postMessage shows 3 results with 1 failure.

- [x] **Step 9** — Wire `src/main.ts` `handleExportRun(message: ExportRunMessage)`:
  - For `output-page`: convert to sink message / call `writeToOutputPage` directly
  - For `plugin-data`: call `writeToPluginData`
  - For `github-pr`: call `executeGithubPRSink` (WO-018)
  - Emit `export/sink-result` after each; then `export/complete`
  - ES2017-safe

- [x] **Step 10** — Implement `src/ui/components/ExportSheet.tsx`:

**Layout (inline styles per Bootstrap):**

```tsx
<section aria-label={title ?? 'Export document'} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 10 }}>
  <h2 style={{ fontSize: 13 }}>{title ?? defaultTitle(document.kind)}</h2>

  <fieldset>
    <legend style={{ fontSize: 11 }}>Format</legend>
    {/* JSON checkbox — disabled when kind === 'registry' */}
    {/* Markdown checkbox — hidden/disabled when kind === 'registry' */}
  </fieldset>

  <fieldset>
    <legend style={{ fontSize: 11 }}>Destinations</legend>
    {/* one checkbox per availableSinks() */}
  </fieldset>

  {pathVisible ? (
    <label>
      Path (no extension)
      <input type="text" value={path} onChange={…} style={{ fontFamily: 'monospace', fontSize: 11, width: '100%' }} />
    </label>
  ) : null}

  <div style={{ display: 'flex', gap: 6 }}>
    <button type="button" disabled={!canExport(state)} onClick={handleExport}>Export</button>
    <button type="button" onClick={onCancel}>Cancel</button>
  </div>

  <ul role="status">{/* per-sink ✓/✗ with color #0a6b0a / #b00020 */}</ul>
</section>
```

  - **Done when:** renders without crash for each fixture document.

- [x] **Step 11** — Create `tests/fixtures/ui/export/` — one JSON per ContractDocument kind (minimal valid v1 payloads).

- [x] **Step 12** — Component tests `tests/unit/ui/components/ExportSheet.test.tsx`:

| Test | Assert |
| ---- | ------ |
| drift-report fixture | format + sink fieldsets render |
| registry fixture | MD checkbox absent/disabled |
| flags.githubOAuth false | github-pr checkbox not in document |
| partial mock failure | one ✗ one ✓ in status list |
| Export disabled | when no format selected |

- [x] **Step 13** — Integrate in `src/ui/App.tsx`:
  - Add **Export** tab or section with button "Export sample drift report" opening `<ExportSheet document={sample} defaultSinks={['download']} />`.
  - Sample doc from fixture import.
  - **Done when:** manual download works in Plugin Sandbox.

- [x] **Step 14** — Register `registerExportMessageListener()` in App `useEffect` (alongside sink listener from WO-017).

- [x] **Step 15** — CI + line count report.

---

## Build Agents

### Phase 1 (parallel — after WO-019 `format` exists)
- `code-build` — **Steps 1–4**: testing libs, defaultPaths, types, reducer.

### Phase 2 (parallel)
- `code-build` — **Steps 5–7**: export messages, availableSinks, serializeForExport.

### Phase 3 (sequential — needs WO-017/018 main handlers)
- `code-build` — **Steps 8–9**: runExport + main handler.

### Phase 4 (parallel)
- `code-build` — **Steps 10–12**: ExportSheet component + fixtures + tests.

### Phase 5
- `code-build` — **Steps 13–15**: App integration, listener, CI.

---

## Dependencies & Tools

| Dependency | Notes |
| ---------- | ----- |
| WO-019 | `format()` in serializeForExport |
| WO-017 | `runSink` for download/clipboard |
| WO-018 | github-pr in main handler |
| WO-016 | token for github-pr |
| `@testing-library/react` | new devDep |

Figma VQA: **N/A** until design frame assigned.

---

## Open Questions

| # | Question | Resolution |
| - | -------- | ---------- |
| OQ-20-1 | Clipboard when both formats | **RESOLVED:** copy MD |
| OQ-20-2 | Storybook | **RESOLVED:** no |

---

## Notes

### Orchestration sequence (mermaid reference)

UI: `Promise.allSettled(download, clipboard)` || postMessage `export/run` for main sinks. Main responds async with per-sink results. UI must not block successful sinks on one failure.

### Style tokens (copy from Bootstrap)

| Token | Value |
| ----- | ----- |
| body font | 11px Inter |
| section header | 13px |
| success | `#0a6b0a` |
| error | `#b00020` |
| muted | `#666` |
| border | `#ddd` |

### References

- [`export-sheet-ui-patterns.md`](./research/export-sheet-ui-patterns.md)
- `src/ui/tabs/Bootstrap.tsx`, `src/ui/bootstrapProgressReducer.ts`
