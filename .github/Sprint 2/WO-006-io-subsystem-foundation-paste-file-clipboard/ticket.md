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

## Design reference *(when UI work applies)*

A minimal source-picker UI: paste textarea + file button + clipboard banner. Visual polish lives in the Bootstrap tab UI (WO-015).

---

## Requirements

### Functional

1. `src/io/sources/paste.ts` — accepts pasted string, attempts contract detection (5 types), returns `LoadedDocument | ValidationError`.
2. `src/io/sources/file.ts` — file picker + drag-drop handler; accepts `.json` and `.md` files.
3. `src/io/sources/clipboard.ts` — on plugin open, reads clipboard via `navigator.clipboard.readText()` (UI iframe scope), runs same contract detection; surfaces a banner if valid.
4. `src/io/sources/index.ts` — re-exports + a shared `detectContract(input: string): ContractKind | null` helper.
5. Normalization: every source returns a `LoadedDocument<T>` with `{ kind: ContractKind, payload: T, sourceMeta: {...} }` — downstream features depend only on this shape.

### Visual / UX

- Paste textarea: 280px tall, monospace, accepts up to 1 MB input.
- File picker: button + drop zone; drag-over state.
- Clipboard banner: top-of-plugin notification with "Load" / "Dismiss" actions.

### Technical / architectural

- **Lift reference (DesignOps-plugin):** no direct lift — this is new code designed in the PRD.
- Contract detection rules from PRD §8 (`$value`/`$type` keys → tokens W3C DTCG, `kind: "ops-program"` → ops-program, etc.).
- Pure functions where possible; UI components live in `src/ui/` and call into `src/io/sources/`.

---

## Acceptance criteria *(definition of done)*

- [ ] Paste a 10-token W3C DTCG tokens.json → plugin detects it as `tokens` and emits `LoadedDocument<TokensV1WC3DTCG>`.
- [ ] Pick a `.json` file from disk → same result as paste.
- [ ] Place a valid `ops-program.v1.json` in OS clipboard, open plugin → banner appears and "Load" populates the loaded document.
- [ ] Invalid input → validation error message inline; no crash.
- [ ] Unit tests cover all three sources + the shared detector for each of the 5 contract kinds.

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

- Confirm `navigator.clipboard.readText()` availability in Figma plugin UI iframe + permission model (1-day spike if uncertain).

## 📋 Ready for `/plan`

- Dependencies: WO-002 (plugin scaffold), WO-003 (contract types).
- `plan.md` locks the `LoadedDocument` interface shape before any consumer relies on it.

## 🛠️ Ready for `/build`

- `/code-build` single domain.

## References

- PRD: `Docs/PRD.md` §6.8 FR-IO-1, §10.1
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
