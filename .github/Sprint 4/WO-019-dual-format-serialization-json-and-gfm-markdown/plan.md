# Plan — WO-019: Dual-format serialization (JSON + GFM markdown)

## Approach

Stand up **`src/io/formats/`** as a pure, side-effect-free serialization layer: canonical `@detroitlabs/fighub-contracts` objects in → deterministic **JSON** (`stableStringify`) or **GFM markdown** out. Public API is `format(doc, 'json' | 'md')` dispatching on `doc.kind`. Six markdown renderers (five ticket kinds + **`audit-report`** to close WO-010 deferral). **No** md→json, **no** imports from `src/io/sources/`, **no** Figma API.

Downstream consumers (WO-017 sinks, WO-018 PR, WO-020 ExportSheet) call `format()` only — they never hand-author markdown.

**Out of scope:** `registry.v1` markdown, schema validation, ingest parsers, `.md` file loading (only update `file.ts` hint text).

---

## Acceptance criteria traceability

| Ticket AC                                                  | Plan steps                                           |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| Drift MD: 4 push / 2 pull / 1 conflict sections with `(N)` | Steps 5, 10, 11 — `drift-report-ac` fixture + golden |
| Handoff MD: screenshot + components + tokens               | Steps 6, 10                                          |
| `stableStringify` key-order invariant                      | Steps 2, 3, 11                                       |
| Vitest golden tests per renderer                           | Steps 10–11                                          |
| No markdown parsing in formats/sources                     | Steps 12, 14                                         |

---

## Steps

- [x] **Step 1** — Create directory scaffold (empty exports OK until Step 4):

```
src/io/formats/
  index.ts
  json.ts
  stableStringify.ts
  markdown.ts
  markdown/
    driftReport.ts
    handoffContext.ts
    componentSpec.ts
    tokens.ts
    opsProgram.ts
    auditReport.ts
    shared.ts          # truncateUnknown, sortRows, heading helpers
  __fixtures__/
    json/
    *.json + *.md golden pairs
```

- Delete `src/io/formats/.gitkeep` if present.
- **Done when:** `npm run typecheck` passes; `rg "from '@/io/sources" src/io/formats` → no matches.

- [x] **Step 2** — Implement `src/io/formats/stableStringify.ts`:

```ts
function isPlainObject(value: unknown): value is Record<string, unknown>;

export function sortKeysDeep(value: unknown): unknown;
// Arrays: map sortKeysDeep over elements, preserve order
// null/primitive: return as-is
// Plain objects: sort Object.keys lexicographically, rebuild object

export function stableStringify(value: unknown, space?: number): string;
// default space = 2; JSON.stringify(sortKeysDeep(value), null, space)
```

- **Done when:** `tests/unit/io/formats/json.test.ts`:
  - `key-order-a.json` and `key-order-b.json` (same semantics, different insertion order) → identical string
  - matches committed `__fixtures__/json/key-order-expected.json`

- [x] **Step 3** — Implement `src/io/formats/json.ts`:

```ts
import type { FormattableDocument } from './index';

export function serializeJson(doc: FormattableDocument): string {
  return stableStringify(doc, 2);
}
```

- **Done when:** each fixture JSON input serializes without throw; optional snapshot file per kind.

- [x] **Step 4** — Implement `src/io/formats/index.ts` public API:

```ts
export type OutputFormat = 'json' | 'md';

export type FormattableDocument =
  | OpsProgramV1
  | TokensV1
  | ComponentSpecV1
  | DriftReportV1
  | HandoffContextV1
  | AuditReportV1;

export function format(doc: FormattableDocument, fmt: OutputFormat): string;

export function assertFormattableKind(value: unknown): asserts value is FormattableDocument;
```

- `format()`: if `fmt === 'json'` → `serializeJson(doc)`; else `serializeMarkdown(doc)`.
- Unknown `kind` on object → `throw new Error('Unsupported document kind: ' + String(kind))`.
- Re-export `serializeJson`, `stableStringify` for tests.
- **Done when:** `tests/unit/io/formats/format.test.ts` — one case per kind + throw on `{ v: 1, kind: 'registry' }`.

- [x] **Step 5** — Implement `markdown/shared.ts` helpers:
  - `truncateUnknown(value: unknown, maxLen = 120): string` — `JSON.stringify` then slice + `…` if over limit.
  - `renderMetaBullets(fields: Record<string, string | undefined>): string` — `- key: value` lines, skip undefined.
  - `renderGfmTable(headers: string[], rows: string[][]): string` — pipe table with header separator row.
  - **Done when:** unit tests for empty rows + truncation.

- [x] **Step 6** — Implement `markdown/driftReport.ts` — `renderDriftReportMarkdown(doc: DriftReportV1): string`:

  **Structure (exact headings — PRD §8.4):**
  1. `# drift-report v1`
  2. `## Meta` — bullets: `generatedAt`, `figmaFileKey`, `repoUrl`
  3. `## Summary` — table columns `Direction | Count` with rows: `↑ Push`, `↓ Pull`, `⚠ Conflicts`, `Synced` using `doc.summary.*`
  4. For each direction with **N > 0** only:
     - `## ↑ Push (N)` / `## ↓ Pull (N)` / `## ⚠ Conflicts (N)` where N = summary count (not filter length — assert equal in tests)
     - Table: `ID | Kind | Figma | Repo | Last synced` — sort rows by `id` asc
     - Object cells via `truncateUnknown`
  - **Omit** sections where N === 0 (locked).
  - **Done when:** golden `__fixtures__/drift-report-ac.md` byte-matches; fixture JSON has exactly 4 push, 2 pull, 1 conflict.

- [x] **Step 7** — Implement `markdown/handoffContext.ts` — `renderHandoffContextMarkdown(doc: HandoffContextV1): string`:
  - `# handoff-context v1`
  - `## Meta` — `capturedAt`, `figmaFileKey`, `frameUrl`
  - `## Frames` — for each frame (sort by `nodeId`): `### {name} (\`{nodeId}\`)`, deep link bullet, `![{name}]({screenshot.dataUrl})`
  - `## Components used` — table `Component | Instances | Code Connect` — `—` when no `codeConnectUrl`
  - `## Tokens used` — bullet list of token paths
  - `## Auto layout` — property table
  - **Done when:** golden `handoff-context-min.md` passes; AC screenshot line present.

- [x] **Step 8** — Implement `markdown/componentSpec.ts` — preview only:
  - Header: name, framework, optional category/archetype
  - Variant matrix table, props table (`name | type | default | enum`), bindings table, layout key/values
  - **Do not** inline deep `surface` / `field` blobs
  - **Done when:** golden `component-spec-button.md` passes.

- [x] **Step 9** — Implement `markdown/tokens.ts` — `renderTokensMarkdown(doc: TokensV1): string`:
  - Collections table: `id | modes`
  - Tokens table capped at **50** rows sorted by `collection`, then `name`; columns `collection | name | type | modes summary`
  - If truncated: footer `_… and {k} more tokens_`
  - Optional `themes` list when present
  - **Done when:** golden `tokens-preview-sample.md` passes; test with 60-token fixture asserts footer.

- [x] **Step 10** — Implement `markdown/opsProgram.ts`:
  - Meta: `generatedAt`, `generatedBy`
  - Ops table: `# | type | summary` — summary one-liner per op type (see research §5.5)
  - **Done when:** golden `ops-program-bootstrap.md` passes.

- [x] **Step 11** — Implement `markdown/auditReport.ts` (sixth renderer):
  - `# audit-report v1`
  - Summary table: rule counts by status
  - `## Failed rules` GFM table when failures exist: `ruleId | severity | message`
  - **Done when:** golden `audit-report-push.md` passes.

- [x] **Step 12** — Wire `src/io/formats/markdown.ts`:

```ts
export function serializeMarkdown(doc: FormattableDocument): string {
  switch (doc.kind) {
    case 'drift-report':
      return renderDriftReportMarkdown(doc);
    case 'handoff-context':
      return renderHandoffContextMarkdown(doc);
    // … all six kinds
    default:
      throw new Error('Unsupported document kind: ' + String((doc as { kind?: string }).kind));
  }
}
```

- [x] **Step 13** — Author fixtures `src/io/formats/__fixtures__/`:

| File                                                                   | Purpose                |
| ---------------------------------------------------------------------- | ---------------------- |
| `drift-report-ac.json` + `.md`                                         | AC counts 4/2/1        |
| `handoff-context-min.json` + `.md`                                     | Screenshot + tables    |
| `component-spec-button.json` + `.md`                                   | Preview sections       |
| `ops-program-bootstrap.json` + `.md`                                   | Ops summary            |
| `tokens-preview-sample.json` + `.md`                                   | ≤10 tokens             |
| `tokens-truncated.json`                                                | 60 tokens for cap test |
| `audit-report-push.json` + `.md`                                       | Failed rules           |
| `json/key-order-a.json`, `key-order-b.json`, `key-order-expected.json` | Stable JSON            |

- Seed bodies from `tests/fixtures/io/sources/` where kinds match; extend drift counts manually.
- Generate initial `.md` goldens from implementation, commit, treat as regression snapshots.
- Load in tests via `readFileSync` + `fileURLToPath` (mirror `tests/unit/io/sources/ports.test.ts`).

- [x] **Step 14** — Write `tests/unit/io/formats/`:

| File                  | Cases                                                           |
| --------------------- | --------------------------------------------------------------- |
| `format.test.ts`      | dispatch all 6 kinds; throw on registry                         |
| `json.test.ts`        | key-order invariant                                             |
| `markdown.test.ts`    | `it.each` golden pairs — normalize `\r\n` → `\n` before compare |
| `driftReport.test.ts` | heading regex `/## ↑ Push \(4\)/`; omit zero sections           |

- **Done when:** `npm run test` green for formats suite.

- [x] **Step 15** — Update `src/io/sources/file.ts` line ~15:

```ts
hint: 'Markdown is export-only. Paste or load JSON.',
```

- Add/adjust test in `tests/unit/io/sources/ports.test.ts` for `.md` → `unsupported-type` with new hint.

- [x] **Step 16** — CI gate: `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build`.
  - **Done when:** all green; `rg -i 'parseMarkdown|mdToJson|fromMarkdown' src/io/formats src/io/sources` → empty.

---

## Build Agents

### Phase 1 (sequential — API foundation)

- `code-build` — **Steps 1–4**: scaffold, `stableStringify`, `serializeJson`, `format()` + dispatch tests.

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 5–7**: shared helpers + drift + handoff renderers.
- `code-build` — **Steps 8–11**: component-spec, tokens, ops-program, audit-report renderers.

### Phase 3 (sequential)

- `code-build` — **Step 12**: `serializeMarkdown` switch wiring.

### Phase 4 (parallel)

- `code-build` — **Steps 13–16**: fixtures, full test suite, file hint, CI.

---

## Dependencies & Tools

| Dependency                             | Status               |
| -------------------------------------- | -------------------- |
| WO-003 `@detroitlabs/fighub-contracts` | ✅                   |
| WO-006 `file.ts`                       | ✅ hint update only  |
| Vitest + jsdom                         | ✅                   |
| WO-017/018/020                         | Downstream consumers |

No Figma MCP. No new npm packages.

---

## Open Questions

| #       | Question              | Resolution                              |
| ------- | --------------------- | --------------------------------------- |
| OQ-19-1 | Sixth renderer?       | **RESOLVED:** include `audit-report`.   |
| OQ-19-2 | Empty drift sections? | **RESOLVED:** omit when N=0.            |
| OQ-19-3 | Tokens cap?           | **RESOLVED:** 50 + footer.              |
| OQ-19-4 | Test location?        | **RESOLVED:** `tests/unit/io/formats/`. |

---

## Notes

### Locked decisions (do not relitigate)

- Drift headings **exact** strings: `## ↑ Push (N)`, `## ↓ Pull (N)`, `## ⚠ Conflicts (N)`.
- Determinism: sort table rows by `id` / `name` / `collection`.
- `registry` **not** in `FormattableDocument` — JSON-only export in WO-020.
- Modern TS syntax OK in formats (UI bundle path); if imported from main thread later, audit ES2017.

### Wrong vs correct

| Wrong                                  | Correct                             |
| -------------------------------------- | ----------------------------------- |
| `JSON.stringify(doc)` for export bytes | `stableStringify(doc, 2)`           |
| Parse `.md` in formats layer           | Write-only; update ingest hint only |
| Filter-length for `(N)` in headings    | Use `summary.push/pull/conflict`    |

### References

- Ticket: [`ticket.md`](./ticket.md)
- Research: [`research/dual-format-serialization.md`](./research/dual-format-serialization.md)
- PRD: §6.8 FR-IO-3, §8.4, §10.3
- Contracts: `packages/contracts/src/*.v1.ts`
