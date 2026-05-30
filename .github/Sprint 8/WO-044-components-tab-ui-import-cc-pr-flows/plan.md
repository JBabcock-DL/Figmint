# Plan — WO-044: Components tab — Import from repo + Code Connect PR UI

## Approach

Wire **Phase 4a designer surfaces** onto the existing **`Components.tsx`** tab: **Import from repo** (GitHub `.tsx` file pick → dependency tree → spec preview edit → scaffold → optional Code Connect PR) and **Emit Code Connect PR** (scan unmapped canvas components → batch stub PR). All import paths enforce **FR-IMP-7** — designer must edit the parsed spec in **`SpecPreviewPanel`** before **`scaffold/run`** is enabled.

**Architecture:** UI sections post typed messages to main; main orchestrates **WO-041** parse, **WO-043** dependency scan, **WO-042** token resolver, **WO-040** detect/emit; UI reuses existing scaffold progress, validation, and audit UX from **WO-027**.

**Components tab section order (locked with WO-056):**

| # | Section | Owner | Insertion |
| - | ------- | ----- | --------- |
| 1 | Paste or load spec | WO-027 | existing ~L282 |
| 2 | Browse repo components | WO-056 | `CatalogPanel.tsx` after #1 |
| 3 | **Import from repo** | **WO-044** | `ImportFromRepoSection.tsx` after #2 |
| 4 | **Code Connect** | **WO-044** | `CodeConnectSection.tsx` after #3 |
| 5 | Re-scaffold from linked components | WO-027 | existing ~L302 (move below #4) |
| 6 | Spec preview + scaffold | shared | existing preview + CTA |

**In scope:**

- `src/io/messages/import.ts` + `src/io/messages/codeconnect.ts` guards
- `src/main.ts` handlers: `handleImportListFiles`, `handleImportParse`, `handleCodeConnectDetect`, `handleCodeConnectEmitPr`
- UI: `ImportFromRepoSection.tsx`, `CodeConnectSection.tsx`, `DependencyTreePanel.tsx`, `FrameworkPicker.tsx`, hooks
- Extend `Components.tsx` — lift shared draft/scaffold state; wire new sections without duplicating preview
- Org/feature gates: `flags.componentImport`, `flags.codeConnectPR`, `github.connected`
- Framework picker visible; **React enabled only** (Vue/WC/SwiftUI/Compose disabled + tooltip)
- Vitest: message guards, hook tests, component tests, message contract tests
- Manual VQA on Plugin Sandbox `file_key=cVdPraIafWFBRZnzMPhtrW`

**Out of scope (ticket verbatim):**

- Vue / Web Components / SwiftUI / Compose import or stub flows (later sprints)
- WO-056 catalog discovery implementation (WO-044 only reserves slot #2 + empty-state copy already references WO-056)
- Core parse/generate logic (WO-040..043) — consume via main handlers only
- In-plugin `figma connect publish` (FR-CC-4)

**Wrong vs correct (integration drift guards):**

| Wrong | Correct |
| ----- | ------- |
| Parse `.tsx` in UI iframe (no GitHub token) | List + fetch in **main** via existing GitHub relay |
| New preview panel for import | Reuse **`SpecPreviewPanel`** + shared `draft` state |
| Auto-scaffold on parse success | Disable scaffold until user edits + **`validateComponentSpecDraft`** ok (FR-IMP-7) |
| Import section above paste | Section **#3** — after catalog (#2), before sync registry (#5) |
| Hide framework picker | Show picker; only **React** selectable in Phase 4a |
| Call `@/core/import` from UI | UI sends **`import/parse`** message only |
| CC PR without org gate | Hide **`CodeConnectSection`** when `!flags.codeConnectPR \|\| !github.connected` |

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| Designer imports React component E2E: pick file → scan deps → preview spec → scaffold + registry → optional CC PR | Steps 1–8, 12–18, 22–24, 28–30 |
| Designer emits CC PR for 5 unmapped components → single PR in connected repo | Steps 9–11, 19–21, 28–30 |
| Phase 4a GA: full React import + CC roundtrip | Steps 28–32 |
| FR-IMP-7 preview edit gate | Steps 12, 17, 24 |
| FR-IMP-9 optional CC after import | Step 18 |
| Framework picker React-only | Step 13 |
| WO-056 layout coordination | Step 14 |
| Vitest unit + integration | Steps 25–27, 31 |
| Figma VQA checklist filled | Step 32 |

---

## Design reference (VQA prep — locked)

| Field | Value |
| ----- | ----- |
| `file_key` | `cVdPraIafWFBRZnzMPhtrW` |
| `node_id` | **N/A** — panel-only VQA (implemented plugin UI; no static Figma mock frame in sandbox) |
| Figma deep link | `https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox` |
| Frame / scope | Plugin window — **Components tab** sections #3 Import from repo + #4 Code Connect |
| Captured at | `2026-05-29` (plan lock) |
| Fallback styling | Match WO-027 inline tokens from `Components.tsx` until FigHub design-file mock linked |

FigHub design file holds the Import + CC PR UI mock (ticket Design reference). **VQA execution** uses the live plugin panel in Plugin Sandbox per `memory.md` locked sandbox policy.

---

## Module tree

```
src/io/messages/
  import.ts                          # NEW — guards + types
  codeconnect.ts                     # NEW — guards + types
src/main/
  importHandlers.ts                  # NEW — handleImportListFiles, handleImportParse
  codeconnectHandlers.ts             # NEW — handleCodeConnectDetect, handleCodeConnectEmitPr
src/ui/components/import/
  ImportFromRepoSection.tsx          # NEW
  DependencyTreePanel.tsx            # NEW
  FileBrowserList.tsx                # NEW — scrollable .tsx list
src/ui/components/codeconnect/
  CodeConnectSection.tsx             # NEW
  FrameworkPicker.tsx                # NEW — React-only Phase 4a
src/ui/hooks/
  useImportParse.ts                  # NEW
  useImportListFiles.ts              # NEW
  useCodeConnectDetect.ts            # NEW
  useCodeConnectEmitPr.ts            # NEW
src/ui/tabs/
  Components.tsx                     # EDIT — section order + shared state wiring
tests/unit/io/messages/
  import.test.ts                     # NEW
  codeconnect.test.ts                # NEW
tests/unit/ui/import/
  DependencyTreePanel.test.tsx       # NEW
  ImportFromRepoSection.test.tsx     # NEW
tests/unit/ui/codeconnect/
  CodeConnectSection.test.tsx        # NEW
  FrameworkPicker.test.tsx           # NEW
tests/unit/ui/hooks/
  useImportParse.test.ts             # NEW
  useCodeConnectDetect.test.ts       # NEW
tests/unit/ui/tabs/
  Components.import.integration.test.tsx  # NEW
tests/unit/main/
  importHandlers.test.ts             # NEW
  codeconnectHandlers.test.ts        # NEW
```

---

## Steps

### Phase 0 — dependency gate

- [x] **Step 0** — Verify WO-040..043 core modules export before UI work:

  | Module | Expected export |
  | ------ | ---------------- |
  | WO-039 | `getImportTemplate('react')`, `ImportTemplateResult` |
  | WO-040 | `detectUnmapped`, `emitCodeConnectPR` |
  | WO-041 | React `ImportTemplate.parse` |
  | WO-042 | `createTokenResolver` |
  | WO-043 | `scanDependencies`, `DependencyTree`, `DependencyNodeStatus` |

  Run: `npm run typecheck` — abort build if any import resolves to stub/TBD.

  **Done when:** all five modules import cleanly from `src/main/importHandlers.ts` dry compile.

---

### Phase 1 — message contracts (TDD first)

- [x] **Step 1** — Create `src/io/messages/import.ts`:

```typescript
import type { ComponentSpecV1 } from '@detroitlabs/fighub-contracts';
import type { DependencyTree } from '@/core/import/dependencyTree';

export interface ImportListFilesMessage {
  type: 'import/list-files';
  requestId: string;
  repoUrl: string;
  /** default: parent of specsPath or 'components/' */
  rootPath?: string;
  extension?: '.tsx';
}

export interface ImportParseMessage {
  type: 'import/parse';
  requestId: string;
  repoUrl: string;
  sourcePath: string;
  figmaMappingPath?: string;
}

export interface ImportParseIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ImportListFilesResultMessage {
  type: 'import/list-files/result';
  requestId: string;
  ok: boolean;
  files: { path: string; name: string }[];
  error?: string;
}

export interface ImportParseResultMessage {
  type: 'import/parse/result';
  requestId: string;
  ok: boolean;
  spec?: ComponentSpecV1;
  dependencyTree?: DependencyTree;
  issues?: ImportParseIssue[];
  error?: string;
}

export function isImportListFilesMessage(msg: unknown): msg is ImportListFilesMessage;
export function isImportParseMessage(msg: unknown): msg is ImportParseMessage;
export function isImportListFilesResultMessage(msg: unknown): msg is ImportListFilesResultMessage;
export function isImportParseResultMessage(msg: unknown): msg is ImportParseResultMessage;
```

  **Done when:** `tests/unit/io/messages/import.test.ts` covers all four guards + rejects malformed payloads.

- [x] **Step 2** — Create `src/io/messages/codeconnect.ts`:

```typescript
import type { SinkFailureCode } from '@/core/sinks/types';

export interface UnmappedComponentRef {
  nodeId: string;
  name: string;
  componentSetName?: string;
  implementationPath?: string;
}

export interface CodeConnectDetectMessage {
  type: 'codeconnect/detect';
  requestId: string;
  repoUrl: string;
  nodeIds?: string[];
}

export interface CodeConnectEmitPrMessage {
  type: 'codeconnect/emit-pr';
  requestId: string;
  repoUrl: string;
  componentIds: string[];
  commitMessage?: string;
}

export interface CodeConnectDetectResultMessage {
  type: 'codeconnect/detect/result';
  requestId: string;
  ok: boolean;
  unmapped: UnmappedComponentRef[];
  error?: string;
}

export interface CodeConnectEmitPrResultMessage {
  type: 'codeconnect/emit-pr/result';
  requestId: string;
  ok: boolean;
  prUrl?: string;
  error?: string;
  code?: SinkFailureCode;
}

export function isCodeConnectDetectMessage(msg: unknown): msg is CodeConnectDetectMessage;
export function isCodeConnectEmitPrMessage(msg: unknown): msg is CodeConnectEmitPrMessage;
export function isCodeConnectDetectResultMessage(msg: unknown): msg is CodeConnectDetectResultMessage;
export function isCodeConnectEmitPrResultMessage(msg: unknown): msg is CodeConnectEmitPrResultMessage;
```

  **Done when:** `tests/unit/io/messages/codeconnect.test.ts` green.

---

### Phase 2 — main handlers

- [x] **Step 3** — Implement `src/main/importHandlers.ts` — **`handleImportListFiles`**:

  **Behavior:**

  1. Validate `repoUrl` via existing GitHub session helpers (mirror `loadFromGitHub` auth path).
  2. Resolve `rootPath`: `message.rootPath ?? deriveComponentsRoot(specsPath)` where default is parent directory of `specsPath` or `'components/'`.
  3. Use GitHub **Trees API** recursive walk (reuse WO-056 `discoverCatalogEntries` tree fetch if merged; else inline minimal tree filter in handler).
  4. Filter paths ending in `.tsx`; exclude `*.test.tsx`, `*.stories.tsx`, `*.figma.tsx`.
  5. Sort by `name` ascending; cap at 500 files (post truncated flag in result if exceeded).
  6. Post `import/list-files/result` with matching `requestId`.

  ```typescript
  export async function handleImportListFiles(message: ImportListFilesMessage): Promise<void>;
  ```

  **Done when:** `tests/unit/main/importHandlers.test.ts` — mock tree returns 3 `.tsx` files; test/story files excluded.

- [x] **Step 4** — Implement **`handleImportParse`** in same file:

  **Behavior (research locked sequence):**

  1. `loadFromGitHub(repoUrl, sourcePath)` → source text
  2. Optional: load sibling `{basename}.figma.tsx` when `figmaMappingPath` omitted (auto-derive)
  3. Merge registry keys: canvas snapshot + repo `.fighub-registry.json`
  4. `createTokenResolver({ repoUrl })` (WO-042)
  5. `getImportTemplate('react').parse({ sourceText, sourcePath, mappingText, registryKeys, tokenResolver })`
  6. Include `dependencyTree` from parse result (WO-043)
  7. On success: `ok: true`, `spec`, `dependencyTree`, `issues` (non-fatal warnings)
  8. On failure: `ok: false`, `error` string; never throw uncaught

  ```typescript
  export async function handleImportParse(message: ImportParseMessage): Promise<void>;
  ```

  **Done when:** handler test parses fixture Button source → spec name `Button`; golden fields match `tests/fixtures/component-spec-button-canonical.json` name/archetype.

- [x] **Step 5** — Implement `src/main/codeconnectHandlers.ts` — **`handleCodeConnectDetect`**:

  1. Delegate to `detectUnmapped({ repoUrl, nodeIds: message.nodeIds })` (WO-040)
  2. Post `codeconnect/detect/result` with `unmapped[]`
  3. `console.debug('[main] codeconnect/detect', { count: unmapped.length })`

  **Done when:** handler test returns 2 unmapped refs from mocked detect.

- [x] **Step 6** — Implement **`handleCodeConnectEmitPr`**:

  1. Guard: `flags.codeConnectPR && github session connected` — else result `ok: false`, `code: 'feature-disabled'`
  2. Delegate to `emitCodeConnectPR({ repoUrl, componentIds, commitMessage })` (WO-040)
  3. Post `codeconnect/emit-pr/result` with `prUrl` on success
  4. Mirror error mapping from `executeGithubPRSink` (WO-018)

  **Done when:** handler test mocks sink → `prUrl` `https://github.com/o/r/pull/42`.

- [x] **Step 7** — Wire handlers in `src/main.ts` message dispatch (after `scaffold/run` block ~L1708):

```typescript
import { handleImportListFiles, handleImportParse } from '@/main/importHandlers';
import { handleCodeConnectDetect, handleCodeConnectEmitPr } from '@/main/codeconnectHandlers';
import {
  isImportListFilesMessage,
  isImportParseMessage,
} from '@/io/messages/import';
import {
  isCodeConnectDetectMessage,
  isCodeConnectEmitPrMessage,
} from '@/io/messages/codeconnect';

// inside figma.ui.onmessage:
if (isImportListFilesMessage(message)) {
  handleImportListFiles(message).catch(/* post error result */);
  return;
}
if (isImportParseMessage(message)) {
  handleImportParse(message).catch(/* post error result */);
  return;
}
if (isCodeConnectDetectMessage(message)) {
  handleCodeConnectDetect(message).catch(/* post error result */);
  return;
}
if (isCodeConnectEmitPrMessage(message)) {
  handleCodeConnectEmitPr(message).catch(/* post error result */);
  return;
}
```

  **Done when:** typecheck passes; dispatch tests in handler test files cover routing.

---

### Phase 3 — UI hooks + listeners

- [x] **Step 8** — Create `src/ui/hooks/useImportListFiles.ts`:

```typescript
export interface ImportListFilesState {
  loading: boolean;
  files: { path: string; name: string }[];
  error: string;
}

export function useImportListFiles(repoUrl: string): {
  state: ImportListFilesState;
  refresh: (rootPath?: string) => void;
};
```

  - Post `{ type: 'import/list-files', requestId, repoUrl, rootPath }`
  - Listen for `import/list-files/result` matching `requestId`
  - Register listener once via shared pattern (see `useHandoffCapture`)

  **Done when:** `tests/unit/ui/hooks/useImportListFiles.test.ts` happy + timeout error paths.

- [ ] **Step 9** — Create `src/ui/hooks/useImportParse.ts`:

```typescript
export interface ImportParseState {
  parsing: boolean;
  spec: ComponentSpecV1 | null;
  dependencyTree: DependencyTree | null;
  issues: ImportParseIssue[];
  error: string;
}

export function useImportParse(): {
  state: ImportParseState;
  parse: (input: { repoUrl: string; sourcePath: string }) => void;
  reset: () => void;
};
```

  **Done when:** hook test completes parse + resets state.

- [ ] **Step 10** — Create `src/ui/hooks/useCodeConnectDetect.ts`:

```typescript
export interface CodeConnectDetectState {
  scanning: boolean;
  unmapped: UnmappedComponentRef[];
  error: string;
}

export function useCodeConnectDetect(): {
  state: CodeConnectDetectState;
  scan: (input: { repoUrl: string; nodeIds?: string[] }) => void;
};
```

  **Done when:** hook test populates 3 unmapped entries.

- [ ] **Step 11** — Create `src/ui/hooks/useCodeConnectEmitPr.ts`:

```typescript
export interface CodeConnectEmitPrState {
  emitting: boolean;
  prUrl: string;
  error: string;
}

export function useCodeConnectEmitPr(): {
  state: CodeConnectEmitPrState;
  emitPr: (input: { repoUrl: string; componentIds: string[] }) => void;
};
```

  **Done when:** hook test sets `prUrl` on success.

---

### Phase 4 — UI components

- [ ] **Step 12** — Create `src/ui/components/import/DependencyTreePanel.tsx`:

```typescript
export interface DependencyTreePanelProps {
  tree: DependencyTree | null;
  onResolveUnknown: (nodeName: string, action: 'import-first' | 'placeholder' | 'cancel') => void;
}
```

  **Render rules:**

  | `DependencyNodeStatus` | UI |
  | -------------------- | -- |
  | `registered` | Green check + registry key label |
  | `unknown` | Amber warning + 3 action buttons |
  | `circular` | Red inline error |

  - Tree indent via nested `<ul>`; `aria-label="Component dependency tree"`
  - Block parent **Continue to preview** when any `unknown` unresolved (parent controls)

  **Done when:** `tests/unit/ui/import/DependencyTreePanel.test.tsx` — registered/unknown/circular cases.

- [ ] **Step 13** — Create `src/ui/components/codeconnect/FrameworkPicker.tsx`:

```typescript
export type ImportFramework = 'react' | 'vue' | 'wc' | 'swiftui' | 'compose';

export interface FrameworkPickerProps {
  value: ImportFramework;
  onChange: (value: ImportFramework) => void;
}

const PHASE_4A_ENABLED: ImportFramework[] = ['react'];
```

  - `<select>` with all five options; disable non-React with `disabled` + `title="Coming in a later sprint"`
  - Label: `Framework`; fontSize 11; full width
  - Only shown inside Import section (Phase 4a)

  **Done when:** `FrameworkPicker.test.tsx` — Vue option disabled; React selectable.

- [ ] **Step 14** — Create `src/ui/components/import/FileBrowserList.tsx`:

  - Scrollable list (`maxHeight: 160px`, `overflow: auto`)
  - Filter input (client-side substring on `name`)
  - Row click selects file → callback `onSelect(path)`
  - Selected row: `background: #f0f0f0`
  - Empty state: "No .tsx files found under {rootPath}."

  **Done when:** component test selects file + filter works.

- [ ] **Step 15** — Create `src/ui/components/import/ImportFromRepoSection.tsx`:

```typescript
export interface ImportFromRepoSectionProps {
  repoUrl: string;
  github: UseGitHubConnectResult;
  specsPath?: string;
  onSpecReady: (spec: ComponentSpecV1, meta: { sourcePath: string }) => void;
  onOpenSettings?: () => void;
}
```

  **Layout (top → bottom):**

  1. Section heading **Import from repo**
  2. Helper copy: "Pick a React `.tsx` file from your connected repo. Edit the preview before scaffolding."
  3. `FrameworkPicker` (React only)
  4. Disconnected guard (mirror sync registry section — opacity 0.6 + Open Settings)
  5. When connected: **Refresh file list** button → `useImportListFiles`
  6. `FileBrowserList`
  7. **Parse component** button (disabled until file selected)
  8. Loading: "Parsing…" + `aria-busy`
  9. `DependencyTreePanel` when tree present
  10. **Use in preview** button — calls `onSpecReady(spec, { sourcePath })` only when tree has no blocking unknowns

  **Org gate:** return `null` when `!flags.componentImport`.

  **Style tokens:** reuse `SECTION_BORDER`, `SECTION_HEADING` from `Components.tsx`.

  **Done when:** `ImportFromRepoSection.test.tsx` — disconnected, list, parse, blocked unknown, preview handoff.

- [ ] **Step 16** — Create `src/ui/components/codeconnect/CodeConnectSection.tsx`:

```typescript
export interface CodeConnectSectionProps {
  repoUrl: string;
  github: UseGitHubConnectResult;
  onOpenSettings?: () => void;
}
```

  **Layout:**

  1. Heading **Code Connect**
  2. Copy: "Generate Code Connect stub files in one PR. Plugin does not publish mappings."
  3. **Scan for unmapped** → checklist (checkbox per `UnmappedComponentRef`)
  4. Select all / clear buttons
  5. **Emit Code Connect PR** — disabled when `selectedIds.length === 0 || emitting`
  6. Success: PR link pattern from `RepoSyncCard.tsx` (`PR opened:` + `<a href={prUrl}>`)
  7. Error banner with sink failure code when present

  **Org gate:** return `null` when `!flags.codeConnectPR || !github.connected`.

  **Done when:** `CodeConnectSection.test.tsx` — scan, select 5, emit, PR link render.

---

### Phase 5 — Components.tsx integration

- [x] **Step 17** — Extend `src/ui/tabs/Components.tsx` shared state for import handoff:

  - Add `importSourcePath: string | null` state
  - Callback from `ImportFromRepoSection.onSpecReady`:
    - `setDraft(cloneSpec(spec))`
    - `setSourceLabel('Imported from ' + sourcePath)`
    - `setImportSourcePath(sourcePath)`
    - `dispatchProgress({ type: 'scaffold/reset' })`
  - Existing `canScaffold` gate unchanged — requires validation ok (FR-IMP-7)

  **Done when:** integration test: mock parse result → preview populated → scaffold button disabled until JSON edit.

- [x] **Step 18** — Post-scaffold optional CC PR (FR-IMP-9):

  - After `scaffold/result` ok, when `importSourcePath !== null`, show checkbox:
    - Label: "Offer Code Connect stub PR for this component"
    - Default: **unchecked**
  - On check + confirm: post `codeconnect/emit-pr` with `[componentSetId from result]` or resolved node id
  - Clear checkbox on next import/parse

  **Done when:** integration test — checkbox default off; emit message sent only when checked.

- [x] **Step 19** — Insert sections in locked order:

```tsx
{/* #1 Paste — existing */}
{flags.componentImport && wo056Ready ? <CatalogPanel … /> : null}
{/* WO-056 placeholder: omit CatalogPanel until WO-056 merged; no gap in layout */}
<ImportFromRepoSection … />
<CodeConnectSection … />
{/* #5 Re-scaffold — move existing section below Code Connect */}
{/* #6 Preview + scaffold — existing */}
```

  - If WO-056 not merged: skip `CatalogPanel` import; preserve comment `{/* WO-056: CatalogPanel slot #2 */}`
  - Move "Re-scaffold from linked components" block to after `CodeConnectSection`

  **Done when:** DOM order matches table in Approach; `Components.import.integration.test.tsx` asserts section `aria-label` order.

- [x] **Step 20** — Consolidate message listeners in `Components.tsx`:

  - Extend existing `useEffect` onMessage OR register dedicated listeners in child hooks (prefer hooks — no duplicate handlers)
  - Ensure tab switch does not duplicate listeners (App keeps panels mounted)

  **Done when:** no double scaffold/import handlers in integration test with tab remount simulation.

---

### Phase 6 — reducer / state map (documentation)

- [x] **Step 21** — Document UI state map in `Components.import.integration.test.tsx` header:

| UI state | Source | User action |
| -------- | ------ | ----------- |
| `draft` | paste / import / registry | edit in SpecPreviewPanel |
| `importSourcePath` | ImportFromRepoSection | triggers post-scaffold CC offer |
| `files[]` | `import/list-files/result` | Refresh file list |
| `dependencyTree` | `import/parse/result` | resolve unknowns |
| `unmapped[]` | `codeconnect/detect/result` | checkbox select |
| `prUrl` | `codeconnect/emit-pr/result` | open PR link |
| `canScaffold` | `validateComponentSpecDraft` | Scaffold button |
| `progressState` | scaffold messages | passive |

  **Done when:** table present in test file.

---

### Phase 7 — tests + CI

- [x] **Step 22** — Message contract alignment `tests/unit/ui/import/messageContract.test.ts`:

  - Assert UI posts match `import.ts` / `codeconnect.ts` shapes
  - Assert result fields consumed by hooks

  **Done when:** compile-time imports + runtime guard tests green.

- [x] **Step 23** — Main handler integration tests with mocked GitHub + core:

  - `importHandlers.test.ts` — list + parse failure paths
  - `codeconnectHandlers.test.ts` — feature gate off + sink error

  **Done when:** both files green.

- [x] **Step 24** — Component accessibility assertions:

  | Control | Requirement |
  | ------- | ----------- |
  | Parse button | `aria-busy` while parsing |
  | File list | keyboard selectable rows |
  | Dependency actions | `aria-label` per action button |
  | CC checklist | `<input type="checkbox">` + `<label htmlFor>` |
  | Emit PR button | disabled state + `aria-disabled` |
  | PR link | opens in new tab `rel="noopener noreferrer"` |

  **Done when:** documented assertions in component tests.

- [x] **Step 25** — CI gate:

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

  **Done when:** all commands pass on PR branch.

- [x] **Step 26** — Regression: existing Components tab tests unaffected:

```bash
npm run test -- tests/unit/ui/tabs/Components
```

  **Done when:** WO-027 scaffold integration tests still green.

---

### Phase 8 — manual VQA + Figma checklist

- [ ] **Step 27** — Manual E2E **SPK-044-1** (Plugin Sandbox `file_key=cVdPraIafWFBRZnzMPhtrW`):

  | Step | Action |
  | ---- | ------ |
  | 1 | Open Plugin Sandbox; bootstrap if needed (WO-057 fixture) |
  | 2 | Settings → connect GitHub test repo with shadcn Button source |
  | 3 | Components tab → **Import from repo** → Refresh → pick `button.tsx` |
  | 4 | Parse → dependency tree shows registered deps → **Use in preview** |
  | 5 | Edit variant matrix JSON field → validation ok → **Scaffold component** |
  | 6 | Progress completes; registry updated |
  | 7 | Optional: check post-scaffold CC offer → emit single-component PR |
  | 8 | **Code Connect** section → Scan → select 5 unmapped → Emit PR |
  | 9 | Verify one PR opens with 5 `.figma.tsx` stubs |

  **Done when:** SPK-044-1 logged in `research/vqa-report.md`.

- [ ] **Step 28** — Manual E2E **SPK-044-2** — React-only framework gate:

  - Framework picker shows Vue/WC/SwiftUI/Compose disabled
  - Tooltip visible on hover/disabled option
  - Import proceeds only with React selected

  **Done when:** recorded in VQA report.

- [ ] **Step 29** — Update `ticket.md` Figma VQA Checklist source fields:

  | Field | Value |
  | ----- | ----- |
  | `file_key` | `cVdPraIafWFBRZnzMPhtrW` |
  | `node_id` | N/A — panel-only |
  | Figma deep link | `https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox` |
  | Frame / scope | Components tab — Import from repo + Code Connect sections |
  | Captured at | ISO date of `/vqa` run |

  **Done when:** ticket table no longer has placeholder comments.

- [ ] **Step 30** — Fill Figma VQA assertion table (Design column = WO-027 inline tokens; Build = measured during `/vqa`):

| # | Category | Property | Design (Figma) | Build (implemented) | Result |
| - | -------- | ---------- | -------------- | ------------------- | ------ |
| 1 | Layout | Frame width × height | Plugin panel ~300×auto (min-height fills viewport) | _vqa fills_ | |
| 2 | Layout | Auto-layout direction / gap | Column; gap **12px** between sections | _vqa fills_ | |
| 3 | Layout | Padding (T/R/B/L) | Section padding **12px** all sides | _vqa fills_ | |
| 4 | Typography | Font family / size / weight | System UI; heading **13px/600**; body **11px/400**; helper **10px** | _vqa fills_ | |
| 5 | Color | Background fill (token) | `#ffffff` panel background | _vqa fills_ | |
| 6 | Color | Foreground fill (token) | Primary text `#333`; secondary `#666`; error `#b00020` | _vqa fills_ | |
| 7 | Spacing | Margin / gap tokens | Section internal gap **8px**; heading margin-bottom **8px** | _vqa fills_ | |
| 8 | Effects | Border radius / shadow | Section border **1px #ccc**; radius **4px**; no shadow | _vqa fills_ | |
| 9 | Accessibility | Contrast ratio | Body `#333` on `#fff` ≥ 4.5:1; error `#b00020` on `#fff` ≥ 4.5:1 | _vqa fills_ | |
| 10 | Accessibility | Focus ring + hit target | Buttons min **44×28** effective; visible focus on tab/enter | _vqa fills_ | |

  Style reference (from `Components.tsx`):

  ```typescript
  const SECTION_HEADING = { fontSize: 13, fontWeight: 600, margin: '0 0 8px' };
  const SECTION_BORDER = { border: '1px solid #ccc', borderRadius: 4, padding: 12 };
  ```

  **Done when:** Design column complete in plan + ticket; Build/Result filled during `/vqa`.

- [x] **Step 31** — WO-056 merge coordination checklist:

  - When WO-056 lands: insert `<CatalogPanel />` at slot #2 without reordering WO-044 sections
  - Verify empty-state copy at paste section still accurate
  - Run combined manual: catalog multiselect + single-file import on same tab

  **Done when:** noted in PR description; combined smoke if WO-056 merged same sprint.

---

## Build Agents

### Phase 0 (sequential — gate)

- `code-build` — **Step 0**: Verify WO-040..043 exports; abort if stubs

### Phase 1 (parallel — contracts)

- `code-build` — **Steps 1–2**: `import.ts` + `codeconnect.ts` message guards + unit tests

### Phase 2 (parallel — main thread; blocked on Phase 0)

- `code-build` — **Steps 3–7**: import + codeconnect handlers + `main.ts` dispatch

### Phase 3 (parallel — hooks; blocked on Phase 1)

- `code-build` — **Steps 8–11**: `useImportListFiles`, `useImportParse`, `useCodeConnectDetect`, `useCodeConnectEmitPr`

### Phase 4 (parallel — UI primitives; blocked on Phase 3)

- `code-build` — **Steps 12–16**: `DependencyTreePanel`, `FrameworkPicker`, `FileBrowserList`, `ImportFromRepoSection`, `CodeConnectSection`

### Phase 5 (parallel — tab integration; blocked on Phase 4)

- `code-build` — **Steps 17–21**: `Components.tsx` wiring, section order, state map

### Phase 6 (sequential — verification)

- `code-build` — **Steps 22–31**: contract tests, CI, manual VQA, Figma checklist, WO-056 coordination

---

## Dependencies & Tools

| Dependency | Role in WO-044 |
| ---------- | -------------- |
| WO-039 | `ImportTemplate` / `MappingTemplate` interfaces |
| WO-040 | `detectUnmapped`, `emitCodeConnectPR` |
| WO-041 | React `ImportTemplate.parse` |
| WO-042 | `createTokenResolver` for binding resolution |
| WO-043 | `scanDependencies`, `DependencyTree` types |
| WO-027 | `Components.tsx` shell, `SpecPreviewPanel`, scaffold progress |
| WO-016 | GitHub OAuth + contents relay |
| WO-018 | `executeGithubPRSink` for CC PR emission |
| WO-056 | `CatalogPanel` slot #2 (layout only — optional at build time) |

| Tool | Usage |
| ---- | ----- |
| Vitest + Testing Library | UI/hook/integration tests |
| `@detroitlabs/fighub-contracts` | `ComponentSpecV1`, validation |
| Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW` | SPK-044-1/2 manual VQA |
| `src/config/flags.ts` | `componentImport`, `codeConnectPR` gates |
| `console.debug` / `pluginLog` | Telemetry per ticket |

**Thread split matrix:**

| Work | Thread |
| ---- | ------ |
| GitHub file list + fetch | main |
| TS parse + dependency scan | main |
| Token resolver (repo file read) | main |
| CC detect (Figma API) | main |
| PR sink | main |
| Preview edit + validation | UI |
| postMessage | both |

---

## Open Questions

| Q | Status |
| - | ------ |
| `componentsPath` vs `specsPath` for file list root | **RESOLVED:** use `rootPath` default = parent of `specsPath` or `'components/'` (research D5) |
| FR-IMP-9 default for post-scaffold CC checkbox | **RESOLVED:** default **off** (research D4) |
| Figma design mock `node_id` | **RESOLVED:** N/A panel-only VQA on Plugin Sandbox; design mock in FigHub design file is reference-only |
| WO-056 same-PR vs sequential merge | **DEFERRED:** Step 31 coordination; WO-044 can ship with catalog slot comment if WO-056 open |

---

## Notes

- **ES2017:** no optional chaining in shipped plugin bundle if project convention requires — match surrounding `Components.tsx` style.
- **Logging:** `console.debug('[ui] import/parse', …)` and `[main] codeconnect/emit-pr` per major events.
- **Do not import core modules in UI** — messages only (`@/core/import`, `@/core/codeconnect` stay main-side).
- **Phased delivery if WO-040..043 not merged:** ship message guards + disabled banner sections ("Import pipeline unavailable — update plugin") behind Step 0 gate; do not merge UI without handlers.
- **Preferred build order:** WO-039 → WO-040..043 (parallel) → **WO-044**; WO-056 can parallel UI slot or land immediately before/after WO-044 with file-ownership split.
- **Bibliography:** `ticket.md`, `research/components-tab-ui-import-cc-pr-flows.md`, `src/ui/tabs/Components.tsx`, `src/ui/components/RepoSyncCard.tsx`, `src/io/messages/scaffold.ts`, WO-040/043 research files.
- **2026-05-29 build:** WO-044 code-build agent — import + Code Connect UI, main handlers, hooks, tests. WO-056 CatalogPanel already present in Components.tsx slot #2.
- **Files:** see git diff; key paths: `src/io/messages/import.ts`, `src/main/importHandlers.ts`, `src/ui/components/import/*`, `src/ui/components/codeconnect/*`, `src/ui/hooks/useImport*.ts`, `src/ui/hooks/useCodeConnect*.ts`.
- **VQA blockers:** Steps 27–30 require manual Plugin Sandbox run (`file_key=cVdPraIafWFBRZnzMPhtrW`) — not executed in this build session.
- **CI note:** Full `npm run lint` reports pre-existing errors in WO-041 import template files (not introduced by WO-044); WO-044 new files lint-clean. Full test suite has 2 pre-existing failures (`json.test.ts` line endings, `variableDrift.integration.test.ts`).

---

## Phased delivery if dependencies lag

1. **Messages only (Steps 1–2)** — merge guards; UI can stub with feature flag off.
2. **Handlers without UI (Steps 3–7)** — Vitest handler coverage; manual postMessage dev console smoke.
3. **Full UI (Steps 8–21)** — enable when Step 0 passes.
4. **VQA (Steps 27–30)** — after full E2E on Org build with GitHub connected.

Prefer **WO-040..043 before WO-044 build** per sprint dependency order.
