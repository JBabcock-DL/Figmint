# Plan — WO-059: Handoff Figma file key resolution

## Approach

Introduce a **single resolution module** (`src/core/figma/resolveFileKey.ts`) that returns the effective file key for deep-link construction using precedence **native `figma.fileKey` → manual root pluginData override → none**. Enable automatic resolution on dev/org builds by adding `enablePrivatePluginApi: true` to those manifests. Add a **Settings** field where designers paste a Figma design URL or raw file key (required for Community GA where the API is permanently blocked). Wire handoff capture/build to the resolver, split warning messages by failure mode, and surface file-key source on the Handoff tab.

---

## Steps

- [x] **Step 1 — Manifest private API (dev/org only)**

  Add to `manifest.json` and `manifest.org.json`:

  ```json
  "enablePrivatePluginApi": true
  ```

  Do **not** add to `manifest.community.json`. Add a one-line comment in `research/figma-file-key-resolution.md` Notes if JSON comments disallowed — document in `manifest.community.json` adjacent README or ticket instead.

  **Done when:** `dist/manifest.json` includes flag after `npm run build`; community manifest unchanged.

- [x] **Step 2 — Core resolver module**

  Create `src/core/figma/resolveFileKey.ts`:

  ```typescript
  export const FIGMA_FILE_KEY_PLUGIN_DATA = 'fighub.figmaFileKey';

  export type FigmaFileKeySource = 'api' | 'override' | 'none';

  export interface ResolvedFigmaFileKey {
    fileKey: string;
    source: FigmaFileKeySource;
  }

  export function parseFigmaFileKeyInput(raw: string): string | null;
  export function readManualFigmaFileKeyOverride(): string;
  export function writeManualFigmaFileKeyOverride(fileKey: string): void;
  export function clearManualFigmaFileKeyOverride(): void;
  export function resolveFigmaFileKey(): ResolvedFigmaFileKey;
  export function fileKeyResolutionWarning(resolved: ResolvedFigmaFileKey): string | null;
  ```

  **`parseFigmaFileKeyInput` rules:**

  - Trim whitespace
  - If matches `/^figma\.com\/design\/([a-zA-Z0-9]+)/` or full URL with that segment → return capture group 1
  - If matches `/^[a-zA-Z0-9]{10,}$/` alone → return as key (Figma keys are alphanumeric; min length guard against garbage)
  - Else `null`

  **`resolveFigmaFileKey`:**

  1. If `typeof figma.fileKey === 'string' && figma.fileKey.length > 0` → `{ fileKey, source: 'api' }`
  2. Else read override from `figma.root.getPluginData(FIGMA_FILE_KEY_PLUGIN_DATA)`; if non-empty → `{ fileKey: override, source: 'override' }`
  3. Else `{ fileKey: '', source: 'none' }`

  **`fileKeyResolutionWarning`:** implement table from research §5 (native undefined vs empty string vs satisfied by override).

  Export from `src/core/figma/index.ts` (create barrel if missing).

  **Done when:** `tests/unit/core/figma/resolveFileKey.test.ts` — ≥12 cases (URL parse, bare key, invalid, precedence api>override, warnings).

- [x] **Step 3 — Refactor handoff capture**

  Update `src/core/handoff/capture.ts`:

  - Import `resolveFigmaFileKey`, `fileKeyResolutionWarning`
  - Replace direct `figma.fileKey ?? ''` with resolved key
  - Pass resolved `fileKey` into `captureNode` / `buildDeepLink`
  - Replace `EMPTY_FILE_KEY_WARNING` with `fileKeyResolutionWarning(resolved)` when `resolved.fileKey === ''`

  Update `tests/unit/core/handoff/capture.helpers.test.ts` and `captureSelection.test.ts` to mock resolver or set `figma.fileKey` + pluginData on mock root.

  **Done when:** capture tests pass; override-only path produces non-empty deep link in test.

- [x] **Step 4 — Refactor handoff build meta**

  Update `src/core/handoff/build.ts`:

  - Call `resolveFigmaFileKey()` once at start (or accept key from capture result to avoid double-read — prefer passing `fileKey` + `source` on `CaptureSelectionResult` if cleaner)
  - Set `meta.figmaFileKey` to resolved key or `'unknown'`
  - Use resolved key in `buildFileUrl`

  Optional: extend `CaptureSelectionResult` with `{ fileKey, fileKeySource }` computed in capture.

  Update `tests/unit/core/handoff/build.test.ts`.

  **Done when:** build test with override pluginData shows real key in meta, not `unknown`.

- [x] **Step 5 — Main-thread Settings handlers**

  Add `src/main/figmaFileKeyHandlers.ts`:

  - `handleFigmaFileKeyLoad()` → post `figma-file-key/loaded` with `{ fileKey, source, override }`
  - `handleFigmaFileKeySave(message)` → parse input, on success `writeManualFigmaFileKeyOverride`, post updated state; on parse fail post error
  - `handleFigmaFileKeyClear()` → `clearManualFigmaFileKeyOverride`

  Wire in `src/main.ts` `figma.ui.onmessage` alongside handoff handlers.

  Add `src/io/messages/figmaFileKey.ts` with typed message unions + guards.

  **Done when:** `tests/unit/main/figmaFileKeyHandlers.test.ts` (load/save/clear/invalid).

- [x] **Step 6 — UI session hook**

  Create `src/ui/figma/useFigmaFileKey.ts`:

  - Hydrate on mount via `figma-file-key/load` request
  - Expose `{ fileKey, source, override, inputValue, setInputValue, save, clear, error, statusMessage }`
  - Register listener in `App.tsx` `useEffect` (or colocate listener module like `handoffMessageListener.ts`)

  **Done when:** `tests/unit/ui/figma/useFigmaFileKey.test.ts`.

- [x] **Step 7 — Settings UI section**

  Update `src/ui/tabs/Settings.tsx`:

  - New bordered section **"Figma file key"** below GitHub block (or above — file-scoped before repo-scoped)
  - Label + text input (URL or key), **Save** + **Clear** buttons
  - Status: "Using key from Figma" / "Using manual key" / "Not set — handoff deep links disabled"
  - Inline validation error from save handler
  - Helper text: "Required for Community plugin. Org/dev builds usually auto-detect when the file is saved to cloud."

  Pass hook from `App.tsx` or instantiate inside Settings.

  **Done when:** `tests/unit/ui/tabs/Settings.test.tsx` (or dedicated Settings file-key test) — save posts message, displays source.

- [x] **Step 8 — Handoff tab status + Settings link**

  Update `src/ui/tabs/Handoff.tsx`:

  - Consume `useFigmaFileKey()` (or receive props from App)
  - Below selection status, show file-key source line (11px muted)
  - When `source === 'none'`, append hint: "Set a file key in Settings for deep links."

  Update `tests/unit/ui/tabs/Handoff.test.tsx` — status line for each source.

  **Done when:** Handoff tests pass (add 2–3 cases).

- [x] **Step 9 — Broadcast file-key state on change**

  After save/clear in main handler, optionally post `figma-file-key/changed` so Handoff tab updates without remount.

  **Done when:** Handoff hook receives broadcast after Settings save in test.

- [x] **Step 10 — Documentation + memory**

  Append to `memory.md` (short):

  - `enablePrivatePluginApi` on dev/org manifests for `figma.fileKey`
  - Community requires Settings file-key override
  - PluginData key `fighub.figmaFileKey`

  **Done when:** memory.md updated; no PRD edit required.

- [x] **Step 11 — Manual VQA checklist**

  Update `ticket.md` Testing section with Plugin Sandbox steps:

  1. Saved sandbox + dev manifest → auto key
  2. Clear override, mock undefined fileKey → Settings paste URL → handoff deep link works

  **Done when:** ticket.md manual steps present.

---

## Build Agents

### Phase 1 (parallel)

- `code-build` — **Steps 1–4:** manifests, `resolveFileKey.ts`, handoff capture/build refactor, unit tests

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 5–6:** main handlers, message types, UI hook + listener

### Phase 3 (parallel, after Phase 2)

- `code-build` — **Steps 7–9:** Settings UI, Handoff status, change broadcast, component tests

### Phase 4 (sequential, after Phase 3)

- `doc-build` — **Steps 10–11:** memory.md, ticket manual VQA steps

---

## Dependencies & Tools

| Dependency | Notes |
| ---------- | ----- |
| WO-034 `capture.ts` | Deep link builder stays; caller supplies resolved key |
| WO-037 `build.ts` | Meta assembly |
| WO-038 Handoff + Settings tabs | UI surfaces |
| Figma Plugin API | `figma.fileKey`, `figma.root.get/setPluginData` |
| WO-021 dual manifest build | Deferred — document manifest matrix manually |

No Figma MCP required for build.

---

## Open Questions

| ID | Question | Default if unresolved |
| -- | -------- | --------------------- |
| OQ-059-1 | Create GitHub issue + Project item before build? | Run `/create-ticket` to assign WO-059 number + board slot |
| OQ-059-2 | Min length for bare file key validation | 10 chars alphanumeric (adjust if false reject) |
| OQ-059-3 | Show override value masked in Settings? | No — file keys are not secrets; show full value |

---

## Notes

- **Community GA path is not optional** — Figma will not expose `figma.fileKey` to public plugins ([forum](https://forum.figma.com/ask-the-community-7/why-is-the-figma-filekey-showing-as-undefined-30221)).
- **Untitled files:** override allows deep links even when native key is `''`; designer must ensure pasted key matches the file they intend to share.
- **File duplicate:** pluginData copies with file — override may be wrong after duplicate; accept v1 limitation; future: detect mismatch vs native when native becomes available.
- **Follow-up ticket:** migrate `reportMeta.ts`, `runScaffold.ts`, `snapshotStore.ts` to `resolveFigmaFileKey()` for consistent drift/audit URLs.
- Research: `research/figma-file-key-resolution.md`
