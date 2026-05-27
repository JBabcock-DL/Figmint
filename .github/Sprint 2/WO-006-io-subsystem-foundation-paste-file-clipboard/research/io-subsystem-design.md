# IO Subsystem — Design Notes for the 3 Input Ports (paste / file / clipboard)

> **Status:** ✅ Research complete — three concrete questions answered, interfaces locked for `/plan`.
> **Date:** 2026-05-27
> **Owner:** WO-006 (Sprint 2)
> **Author:** Research sub-agent
> **PRD anchors:** §6.8 FR-IO-1, §7.3 (`src/io/sources/` layout), §8 (5 contract kinds), §10.1 (sources table), §10.3 (dual-format serialization), §11.5 (Node 22)
> **Related contracts:** `packages/contracts/src/{opsProgram,tokens,componentSpec,driftReport,handoffContext,registry}.v1.ts`
> **Memory.md cross-refs:** "Ignore these Figma plugin console violations" (clipboard-write Permissions-Policy noise), Figma sandbox locked entry (`file_key=cVdPraIafWFBRZnzMPhtrW`, Pro/Org tier)

---

## Summary

Three findings unblock WO-006 build:

1. **Clipboard auto-detect-on-open is NOT viable via `navigator.clipboard.readText()` in the Figma plugin UI iframe.** Community evidence + Figma's parent-document Permissions-Policy (which already blocks `clipboard-write` per the noise we explicitly ignore in `memory.md`) + the fact that Figma does not set `allow="clipboard-read"` on the plugin iframe element together close the case. The **paste-event path is the canonical clipboard source** — `paste.ts` and `clipboard.ts` collapse into one mechanism (the browser's `paste` event on a focused textarea) with two product-level affordances. We provide a 5-line spike snippet in §Q1 below so the build agent can confirm in 30 seconds, but the architecture should ship assuming `readText()` fails.

2. **There are 7 detection branches across 6 contract type files**, not the "5" mentioned in the ticket. The ticket count predates `registry.v1` (§8.6) and treats hybrid tokens (§8.2) as one kind. Locking the canonical list and a 3-stage detector (versioned-kind discriminator → legacy collections shape → DTCG `$value`/`$type` leaf walk) lets every source port call one pure `detectContract()` helper and return a typed `LoadedDocument<T>`.

3. **`LoadedDocument<T>` is a discriminated union over `ContractKind`** with a `sourceMeta` tagged union covering the three port-specific diagnostic shapes (paste / file / clipboard). All three sources return `Promise<LoadedDocument<T> | ValidationError>` — uniform async signature even though paste is internally synchronous, because (a) File API is inherently async via `file.text()` and (b) the build agent never branches on sync/async at the call site.

The detector + interface are designed so Sprint 2+ features depend **only** on `LoadedDocument<T>` — none of them care whether the bytes came from a textarea, a `<input type="file">`, or a paste event on the page body.

---

## Q1 — Clipboard API in the Figma plugin UI iframe

### Q1.1 Availability

**Verdict:** `navigator.clipboard.readText()` is **unavailable / blocked** in the Figma plugin UI iframe in practice. Multiple, mutually-reinforcing signals:

| Signal                                                                                                                                                                                                                                                                                                                                                                                                                       | Implication                                                                                                                                                                                                                                                                                                 |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Figma Forum — "Read clipboard data on button click"](https://forum.figma.com/ask-the-community-7/read-clipboard-data-on-button-click-25904) (community-reported, thread closed by Figma without correction): _"plugins cannot access `window.clipboardData` or `navigator.clipboard`. And so the only way to read clipboard data from a button click is to use `window.execCommand('paste')` and listen for paste events."_ | Direct community statement that Async Clipboard API does not work in the plugin iframe.                                                                                                                                                                                                                     |
| [Figma Forum — "Write to Clipboard from custom plugin"](https://forum.figma.com/ask-the-community-7/write-to-clipboard-from-custom-plugin-23974) (closed, same era): _"Right now, it's a bit hacky where one can create a temporary HTML UI, set elements like textarea with the intended value to copy, then use `document.execCommand`."_                                                                                  | Symmetrical confirmation for the write side; pattern is the same `paste`/`copy` event indirection.                                                                                                                                                                                                          |
| `memory.md` → "Ignore these Figma plugin console violations": `[Violation] Permissions policy violation: camera/microphone/clipboard-write/display-capture is not allowed` (sourced from Figma's outer `vendor-core-<hash>.min.js`, not our iframe).                                                                                                                                                                         | Figma's parent document has a restrictive `Permissions-Policy` header. By the iframe permissions-inheritance model, child iframes are denied the same features **unless** the parent explicitly opts the child in via `allow="clipboard-read"` on the iframe element — which Figma does not document doing. |
| [Figma Plugin Manifest reference](https://developers.figma.com/docs/plugins/manifest/) → `permissions?: PluginPermissionType[]` (values: `currentuser` / `activeusers` / `fileusers` / `payments` / `teamlibrary`).                                                                                                                                                                                                          | **There is no `clipboard-read` (or `clipboard-write`) value in the Figma manifest `permissions` enum.** Clipboard access is not a Figma-grantable permission; it's a pure browser Permissions-Policy decision made by the parent document.                                                                  |
| [Figma Plugin Docs — How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/): _"To use browser APIs … you need to create an `<iframe>` … Inside of this iframe, you can write any HTML/JavaScript and access any browser APIs."_                                                                                                                                                                        | The iframe **is a real browser context** — `navigator.clipboard` is defined on the object — but defined ≠ permitted. The Permissions-Policy gate is independent of API surface presence.                                                                                                                    |

### Q1.2 Permission model

Even on a normal cross-origin iframe with `allow="clipboard-read"`, `navigator.clipboard.readText()`:

1. **Requires a secure context** (Figma is HTTPS — ✅ satisfied).
2. **Requires a user gesture** in the calling frame for the first call (subsequent calls within the same gesture window may be elided, browser-dependent).
3. **Prompts the user the first time** on Chromium (Firefox auto-grants if user-gesture).
4. **Throws `NotAllowedError`** if denied, if Permissions-Policy blocks the feature, or if no user gesture is active.

In the Figma plugin iframe, item (4) is the steady state — the Permissions-Policy gate trips before the user-gesture / prompt logic ever runs.

### Q1.3 Failure modes

| Mode                                                                          | What happens                                                                                                                                                                                                                                                  |
| :---------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Permissions-Policy blocks `clipboard-read` (expected default in Figma iframe) | `navigator.clipboard.readText()` rejects synchronously with `DOMException: NotAllowedError` and message _"The Clipboard API has been blocked because of a permissions policy applied to the current document."_ (Chromium-flavored — text varies by browser.) |
| `navigator.clipboard` undefined (insecure context, very old browser)          | `TypeError: Cannot read properties of undefined`. Not a Figma-realistic mode but guard for parity.                                                                                                                                                            |
| No user gesture in scope when calling                                         | `DOMException: NotAllowedError` — message mentions "user activation" / "transient activation".                                                                                                                                                                |
| User denied the in-browser permission prompt                                  | `DOMException: NotAllowedError`. Reasonably indistinguishable from the Permissions-Policy block at the JS level — both surface as `NotAllowedError`.                                                                                                          |
| OS-level clipboard access denied (macOS sometimes)                            | `DOMException: NotAllowedError`. Same shape.                                                                                                                                                                                                                  |
| `readText()` succeeds but clipboard is empty / contains non-text (image only) | Returns `""` (empty string). Not an exception. Treat as "no contract present" silently.                                                                                                                                                                       |

**Net:** every reasonable failure surfaces as either an empty string or a `NotAllowedError` rejection. `clipboard.ts` only needs `try/catch` around the await and an empty-string short-circuit before contract detection runs.

### Q1.4 Fallback UX recommendation (architecture, not UX polish)

**Don't auto-call `readText()` on plugin open at all.** It will reliably fail in the Figma iframe and the failure has no actionable surface for the designer. Instead:

| Layer                                 | What ships in WO-006                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| :------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Paste source** (`paste.ts`)         | Pure function: takes a `string`, returns `LoadedDocument                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | ValidationError`. UI wires this to a paste-textarea's `onChange` (debounced) or to a "Detect" button next to the textarea. Bulk of clipboard ingestion goes here — designer hits Ctrl/Cmd+V, contents land in the textarea, paste.ts runs. |
| **Clipboard source** (`clipboard.ts`) | Two-mode probe: <br>**(a) Attempt** `navigator.clipboard.readText()` once on plugin open, wrapped in `try { ... } catch { return { available: false } }`. If it succeeds and the text passes `detectContract()`, surface the **"Load this from clipboard?" banner**. If it throws (the realistic case in Figma), `clipboard.ts` reports `{ available: false }` and the banner never renders. <br>**(b) Paste-event hijack:** Attach a `document.addEventListener('paste', ...)` listener at module init. When the user pastes anywhere in the plugin UI _without_ a textarea focused, `event.clipboardData.getData('text/plain')` returns the raw text — fed through the same `detectContract()` + `LoadedDocument` path. **This is the path that actually works in Figma.** |
| **Banner UX**                         | If `clipboard.ts` (a) succeeds → banner says _"Load detected `<kind>` from clipboard?"_ with Load / Dismiss. If (a) fails → no banner; the paste textarea's placeholder doubles as the hint ("Paste tokens, ops, or component spec here"). If (b) fires with valid content → banner appears mid-session.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Acceptance criterion**              | Ticket AC #3 ("Place valid `ops-program.v1.json` in OS clipboard, open plugin → banner appears") is verified in the **desktop app** with the in-iframe `readText()` succeeding (some older Electron-based Figma desktop versions permit it) OR via the paste-event path (designer focuses the plugin, hits Ctrl+V — banner appears). The browser-Figma case stays paste-event-only; this is documented as a known constraint, not a bug.                                                                                                                                                                                                                                                                                                                                     |

### Q1.5 Spike snippet for the build agent (optional verification, 30-second test)

The build agent should run this in the WO-006 first commit to confirm/disprove the Permissions-Policy verdict before locking the banner code path. Drop into `src/ui/App.tsx` behind a temporary button (delete before merging):

```ts
async function probeClipboard() {
  console.log('[probe] navigator.clipboard:', typeof navigator.clipboard);
  console.log('[probe] readText fn:', typeof navigator.clipboard?.readText);
  try {
    const text = await navigator.clipboard.readText();
    console.log('[probe] readText OK, length =', text.length);
  } catch (err) {
    console.log('[probe] readText FAIL:', err);
  }
}
```

Click the button with arbitrary text on the OS clipboard. Expected result on Figma Pro/Org sandbox (Windows desktop client, our locked sandbox): the `readText FAIL: DOMException: ...` line lands in the console. If `readText OK` lands instead, escalate to a follow-up CTX ticket to widen Q1.4 (a) and remove the paste-event hijack — but do not block WO-006 build on this discovery; the paste-event path is correct either way.

---

## Q2 — Contract detection for the PRD §8 contract kinds

### Q2.1 Enumerated kinds (from `packages/contracts/src/index.ts`, cross-checked against PRD §8)

The ticket says "5 contract kinds" but the contracts package actually defines **6 contract type files** with **7 detection branches** (tokens splits into two wire shapes). Locking the canonical list here so the ticket / detector / unit tests agree:

| #   | `ContractKind` (literal) | Wire shape source                                                   | PRD ref                                                    | `packages/contracts` ref                                      |
| :-- | :----------------------- | :------------------------------------------------------------------ | :--------------------------------------------------------- | :------------------------------------------------------------ | ------------------------------------------ |
| 1   | `'ops-program'`          | `{ v: 1, kind: 'ops-program', meta, ops }`                          | §8.1                                                       | `OpsProgramV1`                                                |
| 2   | `'tokens-dtcg'`          | `{ [group]: { ..., leaf: { $value, $type } } }` (no top-level kind) | §8.2                                                       | `TokensV1WC3DTCG` / `DtcgTokenLeaf` (`$type` ∈ 12-value enum) |
| 3   | `'tokens-legacy'`        | `{ collections: [{ name: 'Primitives'                               | ..., modes, variables: [{ valuesByMode, type, ... }] }] }` | §8.2                                                          | `TokensV1Legacy` / `LegacyTokenCollection` |
| 4   | `'component-spec'`       | `{ v: 1, kind: 'component-spec', name, ... }`                       | §8.3                                                       | `ComponentSpecV1`                                             |
| 5   | `'drift-report'`         | `{ v: 1, kind: 'drift-report', meta, summary, ... }`                | §8.4                                                       | `DriftReportV1`                                               |
| 6   | `'handoff-context'`      | `{ v: 1, kind: 'handoff-context', meta, ... }`                      | §8.5                                                       | `HandoffContextV1`                                            |
| 7   | `'registry'`             | `{ v: 1, kind: 'registry', fileKey, components }`                   | §8.6                                                       | `RegistryV1`                                                  |

**Drift correction (do as part of Step 3 ticket edit):** the ticket text "5 contract kinds" should read "7 contract detection branches across 6 contract types" — the registry was added after the original WO-006 draft, and DTCG vs legacy tokens are distinct wire shapes.

### Q2.2 Discriminator-per-kind table

Each kind has exactly one **most-specific** discriminator that survives small malformations (missing optional fields, extra unknown fields). The detector runs in the order below; first match wins.

| Stage | Kind              | Discriminator (TS predicate, ANDed)                                                                                                                                  | Survives                                                                        | Rejects                                                                                    |
| :---- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------- |
| 1     | `ops-program`     | `obj.v === 1 && obj.kind === 'ops-program'`                                                                                                                          | Missing `meta`; partial `ops` array; unknown extra fields                       | `kind` typo (e.g. `"opsprogram"`)                                                          |
| 1     | `component-spec`  | `obj.v === 1 && obj.kind === 'component-spec'`                                                                                                                       | Missing optional `subComponents` / `confidence`                                 | —                                                                                          |
| 1     | `drift-report`    | `obj.v === 1 && obj.kind === 'drift-report'`                                                                                                                         | Empty `drifts: []`                                                              | —                                                                                          |
| 1     | `handoff-context` | `obj.v === 1 && obj.kind === 'handoff-context'`                                                                                                                      | Missing optional sub-fields                                                     | —                                                                                          |
| 1     | `registry`        | `obj.v === 1 && obj.kind === 'registry'`                                                                                                                             | Empty `components: {}`                                                          | —                                                                                          |
| 2     | `tokens-legacy`   | `Array.isArray(obj.collections) && obj.collections[0]?.name ∈ {'Primitives','Theme','Typography','Layout','Effects'} && Array.isArray(obj.collections[0].variables)` | Single-collection files; missing optional `modes`                               | Generic `{ collections: [...] }` from unrelated schemas (mismatched `name`)                |
| 3     | `tokens-dtcg`     | Recursive walk; at least one leaf object that has BOTH `$value` and `$type` keys (any depth ≤ 12), where `$type` is one of the 12 DTCG types from `tokens.v1.ts`     | Mixed token/group nesting; presence of `$schema`, `$description`, `$extensions` | Files with `$value` only (no `$type`) — those are W3C drafts and are rejected as ambiguous |
| —     | _none_            | Default fall-through after all stages                                                                                                                                | —                                                                               | Returns `null` (caller emits `ValidationError { kind: 'unknown-contract' }`)               |

**Ordering rationale:** stages descend from most-specific (versioned kind discriminator on top level — single string compare) → structurally specific (legacy top-level wrapper) → semantic walk (DTCG, which requires recursion). This guarantees a versioned contract with both a `v: 1` envelope AND DTCG-looking leaves (theoretically possible in handoff-context if a designer drops literal `{ $value, $type }` into a free-text field) still resolves to the versioned kind. The W3C DTCG walk is deliberately last so its match cost only fires when nothing more specific applied.

**Ambiguity mode:** the detector itself returns `ContractKind | null` (single best match, no array). Ambiguity is a caller concern — if downstream JSON-schema validation fails after detection, the caller surfaces a `ValidationError { kind: 'unknown-contract', hint: "Did you mean to use legacy tokens? Saw 'collections' but no recognized collection name." }`. We keep the detector cheap and deterministic; richer disambiguation lives in `/plan`-locked validators per kind.

### Q2.3 `detectContract(input: string)` implementation sketch

Ready-to-drop into `src/io/sources/index.ts` (or a new `src/io/sources/detect.ts` — `/plan` decides):

```ts
import type {
  OpsProgramV1,
  ComponentSpecV1,
  DriftReportV1,
  HandoffContextV1,
  RegistryV1,
  TokensV1WC3DTCG,
  TokensV1Legacy,
  DtcgTokenType,
} from '@detroitlabs/figmint-contracts';

export type ContractKind =
  | 'ops-program'
  | 'tokens-dtcg'
  | 'tokens-legacy'
  | 'component-spec'
  | 'drift-report'
  | 'handoff-context'
  | 'registry';

const KNOWN_V1_KINDS: ReadonlySet<string> = new Set([
  'ops-program',
  'component-spec',
  'drift-report',
  'handoff-context',
  'registry',
]);

const LEGACY_COLLECTION_NAMES: ReadonlySet<string> = new Set([
  'Primitives',
  'Theme',
  'Typography',
  'Layout',
  'Effects',
]);

const DTCG_TYPES: ReadonlySet<DtcgTokenType> = new Set([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'shadow',
  'typography',
  'border',
  'transition',
  'gradient',
]);

const DTCG_WALK_MAX_DEPTH = 12;

export function detectContract(input: string): ContractKind | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;

  if (obj.v === 1 && typeof obj.kind === 'string' && KNOWN_V1_KINDS.has(obj.kind)) {
    return obj.kind as ContractKind;
  }

  if (isLegacyTokens(obj)) return 'tokens-legacy';

  if (hasDtcgLeaf(obj, 0)) return 'tokens-dtcg';

  return null;
}

function isLegacyTokens(obj: Record<string, unknown>): boolean {
  if (!Array.isArray(obj.collections) || obj.collections.length === 0) return false;
  const first = obj.collections[0];
  if (typeof first !== 'object' || first === null) return false;
  const f = first as Record<string, unknown>;
  if (typeof f.name !== 'string' || !LEGACY_COLLECTION_NAMES.has(f.name)) return false;
  if (!Array.isArray(f.variables)) return false;
  return true;
}

function hasDtcgLeaf(obj: Record<string, unknown>, depth: number): boolean {
  if (depth > DTCG_WALK_MAX_DEPTH) return false;
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$schema' || key.startsWith('$')) continue;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const v = value as Record<string, unknown>;
    if (
      '$value' in v &&
      '$type' in v &&
      typeof v.$type === 'string' &&
      DTCG_TYPES.has(v.$type as DtcgTokenType)
    ) {
      return true;
    }
    if (hasDtcgLeaf(v, depth + 1)) return true;
  }
  return false;
}
```

**Note on `replaceAll` / optional chaining / `??`:** the detector runs in the **UI iframe** (a real browser), not the main thread, so the ES2017 main-thread limit documented in `memory.md` does not apply here. The snippet uses `?.` and modern syntax intentionally.

### Q2.4 Test matrix (mirrors ticket AC #5)

The build agent should write `tests/unit/io/sources/detect.test.ts` (or wherever the workspace puts unit tests post-WO-002) covering at minimum:

| Fixture                                                      | Expected `detectContract` result | Surfaces                                                                              |
| :----------------------------------------------------------- | :------------------------------- | :------------------------------------------------------------------------------------ |
| `{ v: 1, kind: 'ops-program', meta: {}, ops: [] }`           | `'ops-program'`                  | Stage 1 happy path                                                                    |
| `{ v: 1, kind: 'component-spec', ... }`                      | `'component-spec'`               | Stage 1                                                                               |
| `{ v: 1, kind: 'drift-report', ... }`                        | `'drift-report'`                 | Stage 1                                                                               |
| `{ v: 1, kind: 'handoff-context', ... }`                     | `'handoff-context'`              | Stage 1                                                                               |
| `{ v: 1, kind: 'registry', ... }`                            | `'registry'`                     | Stage 1                                                                               |
| `{ collections: [{ name: 'Primitives', ... }] }`             | `'tokens-legacy'`                | Stage 2                                                                               |
| `{ color: { primary: { $value: '#000', $type: 'color' } } }` | `'tokens-dtcg'`                  | Stage 3 — leaf at depth 2                                                             |
| `{ $schema: '...', color: { ... } }` (deep DTCG)             | `'tokens-dtcg'`                  | `$schema` is skipped, walk continues                                                  |
| `[1,2,3]` (array)                                            | `null`                           | Top-level array rejection                                                             |
| `"hello"`                                                    | `null`                           | Top-level non-object rejection                                                        |
| `not-json-at-all`                                            | `null`                           | JSON.parse fails                                                                      |
| `{}`                                                         | `null`                           | Empty object — no discriminator                                                       |
| `{ v: 2, kind: 'ops-program' }`                              | `null`                           | v2 not recognized yet (forward-compat case for a future schema bump)                  |
| `{ v: 1, kind: 'unknown-future', ... }`                      | `null`                           | Unknown future v1 kind                                                                |
| `{ collections: [{ name: 'NotOurName' }] }`                  | `null` (or DTCG fall-through)    | Generic `collections` wrapper from another schema must not collide with legacy tokens |

---

## Q3 — `LoadedDocument<T>` and source-port shape

### Q3.1 `LoadedDocument<T>` interface

```ts
export interface LoadedDocument<T = unknown> {
  /** Contract type, narrowed via the `detectContract` helper. */
  kind: ContractKind;

  /** Parsed payload (JSON.parsed). Build/dispatch agents narrow `T` after JSON-schema validation. */
  payload: T;

  /** Per-port diagnostic envelope — see SourceMeta union below. */
  sourceMeta: SourceMeta;

  /** Original input text, truncated to RAW_SNIPPET_MAX (1 kB suggested). Used by audit log + ValidationError formatting. */
  rawSnippet: string;
}
```

`T` is unbound at the `detectContract` stage and may be typed at the call site once the kind is known:

```ts
function loadOps(input: string): Promise<LoadedDocument<OpsProgramV1> | ValidationError> { ... }
```

— or kept as `unknown` until the consumer narrows via a kind-specific validator (Sprint 4 / WO-019 work).

### Q3.2 `SourceMeta` discriminated union (one shape per input port)

```ts
export type SourceMeta = PasteSourceMeta | FileSourceMeta | ClipboardSourceMeta;

export interface PasteSourceMeta {
  port: 'paste';
  /** Wall-clock when the textarea blur / detect button fired. */
  receivedAt: string; // ISO-8601
  /** Raw text length in chars (after `.length`, not bytes). */
  charLength: number;
}

export interface FileSourceMeta {
  port: 'file';
  receivedAt: string;
  fileName: string;
  /** `file.size` from the browser File API (bytes). */
  fileSize: number;
  /** `file.type` (best-effort MIME); empty string when the OS reports nothing for `.json` / `.md`. */
  mimeType: string;
  /** `file.lastModified` (ms epoch). */
  lastModified: number;
  /** Whether the file arrived via the `<input type="file">` button (`'picker'`) or via drag-drop on the drop zone (`'dragdrop'`). */
  via: 'picker' | 'dragdrop';
}

export interface ClipboardSourceMeta {
  port: 'clipboard';
  receivedAt: string;
  charLength: number;
  /** How `clipboard.ts` got the text — `'async-clipboard-api'` (rare, desktop Figma sometimes) vs `'paste-event'` (the practical path). */
  mechanism: 'async-clipboard-api' | 'paste-event';
}
```

**Rationale:** every port carries `receivedAt` for the audit log (PRD §11.4 "always preview, never silent-apply" requires the run log to attribute each loaded doc to a source moment). Port-specific fields are exactly the diagnostic surface the build agent needs to render meaningful error messages — `fileName` for files, `mechanism` for clipboard, raw length for paste/clipboard.

### Q3.3 `ValidationError` interface

```ts
export type ValidationErrorKind =
  | 'invalid-json' // JSON.parse failed
  | 'unknown-contract' // detectContract returned null
  | 'ambiguous' // reserved for future use; current detector never returns this
  | 'oversize' // input exceeded PASTE_MAX (default 1 MB)
  | 'empty' // empty string / zero-byte file / empty clipboard
  | 'unsupported-type'; // file extension not in { .json, .md }

export interface ValidationErrorLocationPaste {
  source: 'paste';
  line?: number;
  column?: number;
}

export interface ValidationErrorLocationFile {
  source: 'file';
  fileName: string;
  line?: number;
  column?: number;
}

export interface ValidationErrorLocationClipboard {
  source: 'clipboard';
}

export type ValidationErrorLocation =
  | ValidationErrorLocationPaste
  | ValidationErrorLocationFile
  | ValidationErrorLocationClipboard;

export interface ValidationError {
  /** Always set — discriminator. */
  kind: ValidationErrorKind;
  /** Human-readable error message; safe to surface in the UI without further wrapping. */
  message: string;
  /** Where the error originated; carries port-specific diagnostic fields. */
  location: ValidationErrorLocation;
  /** Optional designer-facing hint. Used by the textarea inline error + the file picker banner. */
  hint?: string;
}
```

**`line` / `column`:** JSON.parse exceptions on V8 carry the byte offset in the message (`"Unexpected token } in JSON at position 42"`). Translating that offset to line/column is a 5-line helper; the build agent can derive it lazily for paste/file. For clipboard, line/column is unhelpful (no editor surface) so it's omitted.

### Q3.4 Per-source-port function signatures

All three return the same `Promise<LoadedDocument<unknown> | ValidationError>` envelope. The `Promise` wrapper is uniform even though paste is internally synchronous — the cost is one microtask per call and the win is callers never branch on sync vs async.

```ts
// src/io/sources/paste.ts
export async function loadFromPaste(
  input: string,
): Promise<LoadedDocument<unknown> | ValidationError>;

// src/io/sources/file.ts
export async function loadFromFile(file: File): Promise<LoadedDocument<unknown> | ValidationError>;

// src/io/sources/clipboard.ts
export interface ClipboardProbeResult {
  /** Whether `navigator.clipboard.readText()` is available + permitted in the current iframe. */
  available: boolean;
  /** Detected document (only when `available && content matched a contract`). */
  doc?: LoadedDocument<unknown>;
  /** Error from the readText call, if any (NotAllowedError / etc.). Useful for diagnostics, not user-facing. */
  rawError?: string;
}

/** Probe the async clipboard API on plugin open. Best-effort; expected to return `{ available: false }` in the Figma iframe. */
export async function probeClipboard(): Promise<ClipboardProbeResult>;

/** Wrap a paste event from anywhere in the UI (typically `document.addEventListener('paste', ...)`). Returns a result or null if the event carried no usable text. */
export async function loadFromPasteEvent(
  event: ClipboardEvent,
): Promise<LoadedDocument<unknown> | ValidationError | null>;
```

**Why two functions for the clipboard port:** the empirical Figma constraint forces two paths — `probeClipboard()` for the on-open banner attempt (cheap; returns `available: false` quickly) and `loadFromPasteEvent()` for the only path that actually works in practice. The plan agent should expose both in `src/io/sources/clipboard.ts`.

**Why the file signature takes a `File` instead of a path:** Figma plugin UI iframes do not have filesystem access; the only way to receive a file is via `<input type="file">` (`event.target.files[0]`) or drag-drop (`event.dataTransfer.files[0]`). Both produce a `File` object. The UI component handles file extraction; `loadFromFile` is purely about `.text() → detect → wrap`.

### Q3.5 `detectContract` location

Lives in **`src/io/sources/detect.ts`** as a peer of the three port files, re-exported from `src/io/sources/index.ts`. Rationale:

- All three port files import it (`paste.ts` directly, `file.ts` after `await file.text()`, `clipboard.ts` after `readText()`/`getData('text/plain')`). Co-location avoids a deep relative import.
- Future ports (GitHub OAuth — WO-016, frame pluginData — Sprint 3+) also import it; same module path stays valid.
- Pure function, no side effects, no Figma API access — trivially unit-testable without mocking the iframe.

Re-exports:

```ts
// src/io/sources/index.ts
export { loadFromPaste } from './paste';
export { loadFromFile } from './file';
export { probeClipboard, loadFromPasteEvent } from './clipboard';
export { detectContract } from './detect';
export type {
  ContractKind,
  LoadedDocument,
  SourceMeta,
  PasteSourceMeta,
  FileSourceMeta,
  ClipboardSourceMeta,
  ValidationError,
  ValidationErrorKind,
  ValidationErrorLocation,
  ClipboardProbeResult,
} from './types'; // new file; centralizes the public surface
```

The `./types` file isolates the interface declarations so consumers can import types without dragging the runtime detector tree. This is the same pattern `packages/contracts/src/index.ts` uses.

---

## Recommendations for `/plan`

The plan agent should lock these decisions before any `Build Agents` section is written:

1. **The 7-branch detector replaces the ticket's "5 contract kinds" wording.** Step 3 of this research run patches the ticket; `/plan` Tasks should reference `detectContract` returning the 7-kind union, not 5.
2. **The clipboard port has two functions, not one** — `probeClipboard()` (best-effort, expected to return `{ available: false }`) + `loadFromPasteEvent()` (the practical path). The ticket's User Story #3 ("clipboard contains valid contract JSON when I open the plugin → banner") stays in scope but is documented as **desktop-app-best-effort**; the steady-state behavior is "paste a JSON anywhere in the plugin → banner fires."
3. **`src/io/sources/types.ts` is a new file** that holds `ContractKind`, `LoadedDocument<T>`, `SourceMeta`, `ValidationError`, and friends. All three port files + the detector + downstream consumers import from this file. Lock this file first; everything else depends on it.
4. **The unit test matrix in Q2.4 above is the WO-006 unit-test floor.** Plan should make a Task for "write 14+ detector unit tests covering all 7 happy paths + rejection cases."
5. **Markdown files (`.md`) are accepted by `loadFromFile` but currently return `ValidationError { kind: 'unsupported-type', hint: 'Markdown parsing lands in WO-019.' }`.** The plumbing exists; the parser doesn't. This keeps WO-006 scope clean per the ticket "Out of scope: Markdown ↔ JSON conversion (Sprint 4 / WO-019)" line.
6. **No `clipboard-read` manifest entry needed.** Q1 confirms Figma's `manifest.permissions` enum does not include clipboard values; the iframe gets clipboard access (or doesn't) purely via the parent-document Permissions-Policy. No manifest patch ships with WO-006.
7. **`PASTE_MAX = 1 MB` constant**, declared in `src/io/sources/types.ts` (or a shared `src/io/limits.ts`), matches the ticket Visual/UX requirement "accepts up to 1 MB input." `paste.ts` checks `input.length > PASTE_MAX` before JSON.parse and returns `ValidationError { kind: 'oversize' }`.

---

## Open questions

None blocking WO-006 build.

One forward-looking question that lands in CTX-002 / WO-019 territory:

- **Should `tokens-dtcg` and `tokens-legacy` collapse to a single `'tokens'` kind at the `LoadedDocument` level**, with the wire-format distinction carried in `sourceMeta` instead of the kind discriminator? This would simplify downstream dispatching ("tokens go to the adapter regardless of source format"). Counter-argument: the adapter implementation in WO-007 / WO-008 will branch on wire format anyway, so the kind discriminator carries useful information. **Recommendation: keep them separate at detection time; collapse at consumption time if a clean adapter interface emerges.** This is a Sprint 2 follow-up, not a WO-006 blocker.

---

## Sources

### Figma plugin docs

- [How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/) — iframe is real browser context; sandbox limits apply to main thread only.
- [Plugin Manifest](https://developers.figma.com/docs/plugins/manifest/) — `permissions?: PluginPermissionType[]` enum has no clipboard value.
- [Making Network Requests](https://developers.figma.com/docs/plugins/making-network-requests/) — `networkAccess.allowedDomains` is the only network gate.
- [Read clipboard data on button click — Figma Forum](https://forum.figma.com/ask-the-community-7/read-clipboard-data-on-button-click-25904) — community confirmation that `navigator.clipboard` is unavailable in the plugin iframe.
- [Write to Clipboard from custom plugin — Figma Forum](https://forum.figma.com/ask-the-community-7/write-to-clipboard-from-custom-plugin-23974) — symmetrical confirmation for the write side.
- [Support for file drop on plugin UI — Figma Forum](https://forum.figma.com/ask-the-community-7/support-for-file-drop-on-plugin-ui-34852) — confirms standard browser File API + drag-drop work in the iframe.

### Browser / web platform

- [W3C DTCG — Design Tokens Format Module](https://design-tokens.github.io/community-group/format/) — `$value` and `$type` are the canonical discriminators for the W3C DTCG token format.
- [MDN — Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) — Permissions-Policy gate, secure-context requirement, user-gesture requirement.
- [MDN — `Permissions-Policy: clipboard-read`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy/clipboard-read) — explains the inheritance model from parent document to iframe.
- [Async clipboard read denied — StackOverflow (Nov 2023)](https://stackoverflow.com/questions/77422790/uncaught-in-promise-domexception-read-permission-denied) — failure-mode catalog (`NotAllowedError` shapes).
- [copyToClipboard TypeScript: 4 Cases Nobody Documents](https://juanchi.dev/en/blog/clipboard-api-typescript-fails-undocumented-cases-copytext) — cross-origin iframe + `allow="clipboard-*"` attribute requirement.

### Internal Figmint refs

- `Docs/PRD.md` §6.8 FR-IO-1, §7.3 (`src/io/sources/` layout), §8.1–8.6 (contracts), §10.1 (sources), §10.3 (dual-format), §11.4 (always preview).
- `Docs/lift-sources.md` §0 — IO subsystem is new code per the PRD; no DesignOps-plugin lift source.
- `packages/contracts/src/index.ts` — canonical list of contract types currently exported.
- `packages/contracts/src/tokens.v1.ts` — `DtcgTokenType` enum (12 values), `LegacyTokenCollection` shape (5 collection names).
- `packages/contracts/src/opsProgram.v1.ts` + `componentSpec.v1.ts` + `driftReport.v1.ts` + `handoffContext.v1.ts` + `registry.v1.ts` — v1 envelope shape (`v: 1`, `kind: '...'`).
- `manifest.community.json` + `manifest.org.json` — confirm no `permissions` field needed for clipboard.
- `memory.md` → "Ignore these Figma plugin console violations" — parent-document Permissions-Policy blocks `clipboard-write`; cited as supporting evidence that clipboard-read is similarly gated in the iframe.
- `memory.md` → Figma sandbox locked entry — `file_key=cVdPraIafWFBRZnzMPhtrW` (Pro/Org), the default file for the optional Q1.5 spike snippet.
