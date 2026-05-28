# Plan — WO-006: I/O Subsystem Foundation — Paste, File, Clipboard

## Approach

Stand up the **sources** side of `src/io/` as a pure, UI-iframe-local subsystem: lock the public contract surface in `types.ts` first, then a single 3-stage `detectContract` helper covering all **7 detection branches**, then three port loaders (`paste`, `file`, `clipboard`) that all return the uniform `Promise<LoadedDocument<unknown> | ValidationError>` envelope. Clipboard ships as two functions — `probeClipboard()` (best-effort on plugin open; expected `{ available: false }` in Figma) and `loadFromPasteEvent()` (the canonical path via `document.addEventListener('paste', …)`). Minimal React UI in `src/ui/` wires the three ports (280px monospace textarea, file picker + drag-drop zone, dismissible clipboard banner). Vitest is introduced at the repo root (WO-004 deferred it) with 14+ detector tests plus port-loader coverage. `main.ts` keeps a typed `onmessage` stub only — all I/O runs in the UI iframe; no Figma API calls in this ticket.

## Steps

- [x] **Step 1** — Create `src/io/sources/types.ts` as the **first landing file**. Export: `ContractKind` (7-member union: `'ops-program' | 'tokens-dtcg' | 'tokens-legacy' | 'component-spec' | 'drift-report' | 'handoff-context' | 'registry'`), `LoadedDocument<T>` (`{ kind, payload, sourceMeta, rawSnippet }`), `SourceMeta` discriminated union (`PasteSourceMeta | FileSourceMeta | ClipboardSourceMeta` — each tagged with `port`), `ValidationError` + `ValidationErrorKind` + port-tagged `ValidationErrorLocation` variants, `ClipboardProbeResult`, constants `PASTE_MAX = 1_048_576` (1 MB char cap) and `RAW_SNIPPET_MAX = 1_024` (1 kB snippet truncation for `rawSnippet`). Import `DtcgTokenType` from `@detroitlabs/fighub-contracts` only if needed for JSDoc cross-refs — do **not** re-export contract payload types from this file.
- [x] **Step 2** — Create `src/io/sources/detect.ts`: pure `detectContract(input: string): ContractKind | null` implementing the locked 3-stage detector from [`research/io-subsystem-design.md`](research/io-subsystem-design.md) §Q2.3 — (1) `v === 1 && kind ∈ KNOWN_V1_KINDS` (5 versioned kinds), (2) legacy tokens shape (`collections[0].name ∈ {Primitives, Theme, Typography, Layout, Effects}` + `variables` array), (3) recursive DTCG leaf walk (`$value` + `$type` in 12-value `DtcgTokenType` set, max depth 12). Invalid JSON / non-object top-level → `null`. No side effects; modern TS syntax allowed (runs in UI iframe, not main thread).
- [x] **Step 3** — Create `src/io/sources/paste.ts`: export `async function loadFromPaste(input: string): Promise<LoadedDocument<unknown> | ValidationError>`. Check `input.length === 0` → `{ kind: 'empty' }`; `input.length > PASTE_MAX` → `{ kind: 'oversize' }`; `JSON.parse` failure → `{ kind: 'invalid-json', location: { source: 'paste' } }` with optional line/column derived from V8 parse error offset; `detectContract` returns `null` → `{ kind: 'unknown-contract' }`. On success, build `PasteSourceMeta { port: 'paste', receivedAt: ISO-8601, charLength }`, truncate `rawSnippet`, return `LoadedDocument`. Wrap in `Promise.resolve` internally for uniform async signature.
- [x] **Step 4** — Create `src/io/sources/file.ts`: export `async function loadFromFile(file: File, via: 'picker' | 'dragdrop' = 'picker'): Promise<LoadedDocument<unknown> | ValidationError>`. Gate on extension: `.json` proceeds; `.md` returns `{ kind: 'unsupported-type', hint: 'Markdown parsing lands in WO-019.' }`; anything else → `{ kind: 'unsupported-type' }`. Read via `await file.text()`, then same empty / detect / invalid-json / unknown-contract path as paste. Build `FileSourceMeta { port: 'file', receivedAt, fileName, fileSize, mimeType, lastModified, via }`.
- [x] **Step 5** — Create `src/io/sources/clipboard.ts` with two exports per research §Q1.4: (a) `probeClipboard(): Promise<ClipboardProbeResult>` — `try { await navigator.clipboard.readText() } catch { return { available: false } }`, empty string → `{ available: false }`, valid contract → `{ available: true, doc }` with `ClipboardSourceMeta { mechanism: 'async-clipboard-api' }`; (b) `loadFromPasteEvent(event: ClipboardEvent): Promise<LoadedDocument<unknown> | ValidationError | null>` — read `event.clipboardData?.getData('text/plain')`, return `null` when no text, else same validation path with `ClipboardSourceMeta { mechanism: 'paste-event' }`.
- [x] **Step 6** — Create `src/io/sources/index.ts` barrel: re-export `loadFromPaste`, `loadFromFile`, `probeClipboard`, `loadFromPasteEvent`, `detectContract`, and all public types from `./types`. Remove `src/io/.gitkeep` once the folder has real modules.
- [x] **Step 7** — **Vitest bootstrap** (repo has no test runner yet — WO-004 deferred). Add `vitest@^3` (+ `@vitest/coverage-v8` optional) as root `devDependencies`. Create `vitest.config.ts` with `@/` path alias matching `tsconfig.json`, `environment: 'jsdom'` (File API + ClipboardEvent), `include: ['tests/**/*.test.ts']`. Extend root `tsconfig.json` `include` to cover `tests/**`. Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to root `package.json`. Add Vitest globals/types to satisfy strict mode. **CI extension is optional for this ticket** — run `npm test` locally in Step 14; append a `npm run test` step to `.github/workflows/ci.yml` only if green locally (follow-up WO if CI change is out of appetite).
- [x] **Step 8** — Create minimal JSON fixtures under `tests/fixtures/io/sources/`: one file per happy-path `ContractKind` (7 files — minimal valid bodies matching research §Q2.4 matrix) plus rejection fixtures (`invalid.json`, `top-level-array.json`, `empty-object.json`, `unknown-v1-kind.json`, `v2-ops-program.json`, `generic-collections.json`). Keep fixtures tiny (< 30 lines each).
- [x] **Step 9** — Write `tests/unit/io/sources/detect.test.ts` with **14+ cases** mirroring research §Q2.4: all 7 happy paths, top-level array, top-level scalar string, malformed JSON, empty object, unknown `v: 1` kind, `v: 2` forward-compat rejection, generic `{ collections: [{ name: 'NotOurName' }] }`, and `$value`-only leaf (no `$type`) → `null`. Assert exact `ContractKind | null` return values.
- [x] **Step 10** — Write `tests/unit/io/sources/ports.test.ts` covering `loadFromPaste`, `loadFromFile` (picker + dragdrop `via`), and `loadFromPasteEvent`: one fixture per detected kind, plus failure modes (oversize paste, empty input, unsupported `.md`, invalid JSON). Mock `File` via `new File([content], name, { type })` and synthetic `ClipboardEvent` with `clipboardData: { getData: () => text }`.
- [x] **Step 11** — Add UI components under `src/ui/sources/`: `SourcePasteTextarea.tsx` (280px tall, monospace, `onLoad` callback, inline `ValidationError` text), `SourceFilePicker.tsx` (hidden `<input type="file" accept=".json,.md">` + button), `SourceDropZone.tsx` (drag-over visual state, `onDrop` → `loadFromFile(file, 'dragdrop')`). Each calls the corresponding `src/io/sources/` loader and surfaces result via props/callbacks. `console.debug` on each load event.
- [x] **Step 12** — Add `src/ui/sources/ClipboardBanner.tsx` + `useClipboardSources.ts` hook: on mount call `probeClipboard()` and register `document.addEventListener('paste', handler)` (cleanup on unmount). When probe or paste-event yields a doc, show top-of-panel banner ("Load detected `<kind>` from clipboard?") with **Load** / **Dismiss** actions. Load dispatches the doc to parent state; Dismiss hides banner. Keyboard-accessible buttons; textarea retains visible focus ring.
- [x] **Step 13** — Integrate sources UI into `src/ui/App.tsx`: replace Sprint 1 placeholder paragraph with a "Sources" section stacking `ClipboardBanner`, `SourcePasteTextarea`, `SourceFilePicker`, and `SourceDropZone`. Hold loaded doc / error in component state; render minimal success line (`Loaded <kind> via <port>`) or error message. No production polish — WO-015 owns Bootstrap tab UI.
- [x] **Step 14** — Update `src/main.ts` `figma.ui.onmessage` with a typed discriminated union stub (e.g. `{ type: 'io/loaded', kind: ContractKind }` passthrough or no-op) and a comment pointing to Sprint 4 ops dispatch. Verify all four existing CI legs still pass locally: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build:community` (+ `build:org`), plus `npm test`. Manual smoke in Figma desktop: paste DTCG JSON, pick ops-program `.json`, drag-drop same file, Ctrl/Cmd+V with clipboard content — confirm banner or inline load per ticket AC.

## Build Agents

### Phase 1 (sequential — foundation)

- `code-build` — **Steps 1–2**: `src/io/sources/types.ts` (public contract surface) + `src/io/sources/detect.ts` (7-branch pure detector). Must land before any port loader imports them.

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Step 3**: `src/io/sources/paste.ts` — paste port loader.
- `code-build` — **Step 4**: `src/io/sources/file.ts` — file picker / drag-drop port loader.
- `code-build` — **Step 5**: `src/io/sources/clipboard.ts` — `probeClipboard` + `loadFromPasteEvent`.
- `code-build` — **Step 6**: `src/io/sources/index.ts` — barrel re-exports (after Steps 3–5 complete).

### Phase 3 (parallel, after Phase 2)

- `code-build` — **Steps 7–10**: Vitest setup, fixtures, detector tests (14+), port-loader tests.
- `code-build` — **Steps 11–14**: UI components (`SourcePasteTextarea`, `SourceFilePicker`, `SourceDropZone`, `ClipboardBanner`, hook), `App.tsx` integration, `main.ts` onmessage stub, local CI + manual smoke verification.

## Dependencies & Tools

**Ticket dependencies (satisfied):**

- **WO-002** — Plugin scaffold (`src/`, Vite dual-thread build, `@/` alias, React 19 UI shell).
- **WO-003** — `@detroitlabs/fighub-contracts` workspace package (`DtcgTokenType`, contract envelope shapes for fixture authoring).

**Runtime environment:**

- **Node ≥22** — workspace baseline (`memory.md`).
- **Figma desktop** — manual VQA for clipboard AC (browser Figma is paste-event-only; both branches PASS per ticket).
- **No Figma MCP** — ticket Figma VQA Checklist is N/A.

**New dev dependencies (Step 7):**

- `vitest@^3` — unit test runner (first tests in repo).
- `jsdom` — Vitest environment for File / ClipboardEvent APIs.

**No manifest changes.** Clipboard access is Permissions-Policy gated; no `clipboard-read` in Figma manifest enum (research §Q1).

**No MCP servers required for `/build`.**

## Open Questions

- **CI test step:** WO-004 explicitly deferred Vitest. Step 7 ships local `npm test`; whether to append it to `.github/workflows/ci.yml` in this ticket vs. a tiny follow-up WO is a build-time call — default: add CI step if `npm test` is green and adds < 10 s to the job.
- **`tokens-dtcg` vs `tokens-legacy` at consumption time:** Research recommends keeping separate kinds at detection; collapsing at adapter dispatch (WO-007+) is a Sprint 2 follow-up, not a WO-006 blocker.

## Notes

### Locked decisions (do not relitigate during `/build`)

- **7 detection branches**, not "5 contract kinds" — registry + DTCG/legacy token split (research §Q2.1; ticket Requirements updated 2026-05-27).
- **Clipboard:** `probeClipboard()` best-effort on open; `loadFromPasteEvent()` is the canonical Figma path (research §Q1.4). Either AC #6 branch is PASS.
- **`.md` files:** accepted by file picker plumbing but return `unsupported-type` until WO-019.
- **`PASTE_MAX = 1 MB`** enforced in `paste.ts` before parse.
- **ES2017 main thread vs modern UI iframe:** `detect.ts` / port loaders run in UI bundle (modern syntax OK). `main.ts` stays ES2017-safe — no optional chaining / nullish coalescing / `replaceAll` in main thread (`memory.md`).
- **Git strategy:** `main`, uncommitted — build agents leave changes for user review (`memory.md`).

### Detector ordering (first match wins)

1. Versioned `v: 1` + known `kind` (5 kinds)
2. Legacy tokens (`collections[0].name` in 5-collection set)
3. DTCG recursive leaf walk
4. Fall-through → `null` → port loader emits `unknown-contract`

### Test matrix source

Full fixture table: [`research/io-subsystem-design.md`](research/io-subsystem-design.md) §Q2.4.

### References

- Ticket: [`./ticket.md`](./ticket.md)
- Research: [`./research/io-subsystem-design.md`](./research/io-subsystem-design.md)
- PRD: `Docs/PRD.md` §6.8 FR-IO-1, §10.1 (Sources)
- Contracts: `packages/contracts/src/index.ts`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
