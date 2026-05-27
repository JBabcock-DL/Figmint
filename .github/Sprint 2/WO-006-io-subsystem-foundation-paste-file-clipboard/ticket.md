---
type: work-order
github_issue: 9
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt4Hbk
---

## Goal

Stand up the I/O sources subsystem (sources side of `src/io/`) with the first three input ports: paste textarea, file picker / drag-drop, and clipboard auto-detect on plugin open. These three are the always-on input surface for every Sprint 2+ feature; GitHub OAuth and frame pluginData come later.

PRD anchors: `Docs/PRD.md` §6.8 FR-IO-1, §10.1 (Sources).

---

## Problem story

As a designer driving Figmint, I want to bring tokens/specs/ops into the plugin without switching tools — by pasting, picking a file, or having the plugin notice valid JSON already on my clipboard.

## Hypothesis (optional)

A single normalizer behind multiple source ports keeps source code simple and lets every downstream feature consume one "loaded document" interface.

---

## User stories

- [ ] As a designer, I can paste a `tokens.json` into a textarea and have it validate + load.
- [ ] As a designer, I can drag-drop or pick a `.json` / `.md` file from disk and have it load.
- [ ] As a designer, if my clipboard contains a valid contract JSON when I open the plugin, I see a banner offering to load it.

## Design reference _(when UI work applies)_

A minimal source-picker UI: paste textarea + file button + clipboard banner. Visual polish lives in the Bootstrap tab UI (WO-015).

---

## Requirements

### Functional

1. `src/io/sources/paste.ts` — `loadFromPaste(input: string): Promise<LoadedDocument<unknown> | ValidationError>`. Wraps the shared `detectContract` helper, builds a `PasteSourceMeta`, enforces the 1 MB `PASTE_MAX` cap (returns `ValidationError { kind: 'oversize' }` over the cap).
2. `src/io/sources/file.ts` — `loadFromFile(file: File): Promise<LoadedDocument<unknown> | ValidationError>`. Accepts `.json` and `.md` files via `<input type="file">` (picker) and drag-drop on a dedicated drop zone; reads via `file.text()`, builds a `FileSourceMeta { via: 'picker' | 'dragdrop' }`. **`.md` files are currently rejected with `ValidationError { kind: 'unsupported-type', hint: 'Markdown parsing lands in WO-019.' }`** — plumbing only, no parser.
3. `src/io/sources/clipboard.ts` — two functions: (a) `probeClipboard(): Promise<ClipboardProbeResult>` best-effort `navigator.clipboard.readText()` on plugin open (expected to return `{ available: false }` in the Figma iframe — banner stays hidden); (b) `loadFromPasteEvent(event: ClipboardEvent): Promise<LoadedDocument<unknown> | ValidationError | null>` consumes `event.clipboardData.getData('text/plain')` from a `document.addEventListener('paste', ...)` listener — this is the path that actually works in Figma.
4. `src/io/sources/detect.ts` — pure `detectContract(input: string): ContractKind | null` helper covering all **7 detection branches across 6 contract type files** (see Acceptance criteria below). Re-exported from `src/io/sources/index.ts` alongside the three port loaders.
5. `src/io/sources/types.ts` — locks `ContractKind` (7-member union), `LoadedDocument<T>` (`{ kind, payload, sourceMeta, rawSnippet }`), `SourceMeta` (`PasteSourceMeta | FileSourceMeta | ClipboardSourceMeta` discriminated union), `ValidationError` (with port-tagged `location`). Downstream features depend ONLY on this file.

### Visual / UX

- Paste textarea: 280px tall, monospace, accepts up to 1 MB input.
- File picker: button + drop zone; drag-over state.
- Clipboard banner: top-of-plugin notification with "Load" / "Dismiss" actions.

### Technical / architectural

- **Lift reference (DesignOps-plugin):** no direct lift — this is new code designed in the PRD (`Docs/lift-sources.md` §0 confirms).
- **LOCKED:** `navigator.clipboard.readText()` is unavailable / blocked in the Figma plugin UI iframe (Permissions-Policy gate on the parent document; Figma forum confirms; manifest has no `clipboard-read` permission to grant). `clipboard.ts` ships as a two-function module: `probeClipboard()` (best-effort, expected to fail silently) + `loadFromPasteEvent()` (the canonical clipboard path, fed by `document.addEventListener('paste', ...)`). No manifest change required — clipboard is a Permissions-Policy concern, not a Figma-grantable permission. See `research/io-subsystem-design.md` §Q1.
- **LOCKED:** Contract detector runs in 3 stages, first match wins: (1) `v: 1` + known-kind discriminator (5 versioned kinds); (2) legacy tokens shape (`Array.isArray(collections) && collections[0].name ∈ {Primitives, Theme, Typography, Layout, Effects}`); (3) recursive walk for at least one DTCG leaf (`$value` + `$type ∈ DtcgTokenType` 12-value enum, max depth 12). Discriminator-per-kind table + ready-to-drop TS implementation in `research/io-subsystem-design.md` §Q2.
- **LOCKED:** `LoadedDocument<T> = { kind: ContractKind, payload: T, sourceMeta: SourceMeta, rawSnippet: string }` with `ContractKind` = `'ops-program' | 'tokens-dtcg' | 'tokens-legacy' | 'component-spec' | 'drift-report' | 'handoff-context' | 'registry'` (7 branches; supersedes the original "5 contract kinds" wording). `SourceMeta` is a `port`-tagged discriminated union (paste / file / clipboard) carrying port-specific diagnostics. Full interface in `research/io-subsystem-design.md` §Q3.
- Pure functions where possible; UI components live in `src/ui/` and call into `src/io/sources/`. All three port loaders return the uniform `Promise<LoadedDocument<unknown> | ValidationError>` envelope; paste is wrapped in `Promise.resolve` for symmetry even though it's internally synchronous.

---

## Acceptance criteria _(definition of done)_

- [ ] Paste a 10-token W3C DTCG tokens.json into the textarea → `loadFromPaste` returns `LoadedDocument<unknown>` with `kind === 'tokens-dtcg'` and a `PasteSourceMeta`.
- [ ] Paste a legacy `{ collections: [{ name: 'Primitives', ... }] }` document → returns `kind === 'tokens-legacy'`.
- [ ] Pick a `.json` file containing a valid `ops-program.v1` document → `loadFromFile` returns `kind === 'ops-program'` with a `FileSourceMeta { via: 'picker' }`.
- [ ] Drag-drop the same `.json` file onto the drop zone → same result with `via: 'dragdrop'`.
- [ ] Pick a `.md` file → returns `ValidationError { kind: 'unsupported-type', hint: 'Markdown parsing lands in WO-019.' }`.
- [ ] Place a valid `ops-program.v1.json` text on the OS clipboard, open the plugin in **Figma desktop** → on plugin open, `probeClipboard()` either returns `{ available: true, doc: {...} }` (banner appears with Load/Dismiss) OR `{ available: false }` (no banner — expected when the iframe Permissions-Policy blocks `clipboard-read`). Either branch is a PASS — the banner is best-effort, not required.
- [ ] With the same clipboard contents, focus the plugin UI and hit Ctrl/Cmd+V → `loadFromPasteEvent` fires, banner appears with the detected `ops-program` document. This path is the contract for AC #6.
- [ ] Invalid JSON pasted → `ValidationError { kind: 'invalid-json' }` rendered inline; no crash.
- [ ] Unit tests cover the detector against all **7 ContractKinds** (`ops-program`, `tokens-dtcg`, `tokens-legacy`, `component-spec`, `drift-report`, `handoff-context`, `registry`) plus rejection cases (top-level array, top-level scalar, malformed JSON, empty object, unknown `v: 1` kind, unknown `v: 2`, generic `{ collections: [...] }` not matching legacy names).
- [ ] Unit tests cover `loadFromPaste`, `loadFromFile`, `loadFromPasteEvent` with one fixture per detected kind plus the size / type / empty failure modes.

## Out of scope

- GitHub OAuth source (Sprint 4 / WO-016).
- Frame pluginData source (Sprint 3+ once snapshots exist).
- Output sinks (Sprint 4 / WO-017+).
- Markdown ↔ JSON conversion (Sprint 4 / WO-019).
- Production-quality validation error UX — minimal text is fine until Bootstrap tab UI (WO-015).

---

## Testing & verification

### Functional QA

- Paste / pick / clipboard each load a sample of every contract kind.
- Invalid JSON → graceful error.

### Visual / design QA

- Drop zone reacts to drag-over.
- Banner dismissible.

### Accessibility

- Textarea has visible focus; file picker keyboard-accessible.

### Telemetry / observability

- Console.debug on each source event for now; production telemetry deferred.

---

## Figma VQA Checklist

**N/A — no Figma artifact (subsystem ticket; UI surfaces in WO-015 Bootstrap tab).**

---

## 🔍 Ready for `/research`

- ✅ Resolved 2026-05-27. Verdict in `research/io-subsystem-design.md` §Q1: `navigator.clipboard.readText()` is blocked by the parent-document Permissions-Policy in the Figma plugin UI iframe (no manifest opt-in available). Fallback locked: `clipboard.ts` exposes `probeClipboard()` (best-effort) + `loadFromPasteEvent()` (the canonical clipboard path, driven by `document.addEventListener('paste', ...)`).

## 📋 Ready for `/plan`

- Dependencies: WO-002 (plugin scaffold), WO-003 (contract types).
- `plan.md` locks the `LoadedDocument` interface shape before any consumer relies on it.

## 🛠️ Ready for `/build`

- `/code-build` single domain.

## References

- PRD: `Docs/PRD.md` §6.8 FR-IO-1, §10.1
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
- [IO subsystem design](research/io-subsystem-design.md)
