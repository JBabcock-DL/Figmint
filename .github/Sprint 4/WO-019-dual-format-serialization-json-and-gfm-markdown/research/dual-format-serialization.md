# Dual-format serialization (JSON + GFM markdown)

> **Status:** Research complete — ready for `/plan`
> **Date:** 2026-05-27
> **Ticket:** WO-019 (GitHub #22)
> **PRD anchors:** §6.8 FR-IO-3, §8.4 (drift headings), §10.3 (single source → two sinks)
> **Contracts:** `@detroitlabs/fighub-contracts` — `opsProgram`, `tokens`, `componentSpec`, `driftReport`, `handoffContext` (not `registry`, not `auditReport` in this ticket’s five renderers)

---

## Summary

WO-019 adds a **write-only** formatting layer under `src/io/formats/`: canonical in-memory objects (already typed from `@detroitlabs/fighub-contracts`) serialize to **deterministic JSON** or **human/agent-readable GFM markdown**. Markdown is never parsed back to JSON — that invariant is product-level (PRD §10.3) and must stay true in `loadFromFile` (today’s `.md` rejection is correct; only the user-facing hint text is misleading).

The public entry point is `format(doc, 'json' | 'md')`, dispatching on `doc.kind` to one of **five** markdown renderers. JSON uses a small `stableStringify` helper (sorted object keys, recursive) so byte-identical output is stable across runs — supporting FR-IO-3 / §11.2 determinism. Vitest covers each kind with committed fixtures under `src/io/formats/__fixtures__/` plus golden `.md` snapshots for regression.

**Scope tension (flag for plan):** WO-010 research deferred `audit-report` markdown to WO-019 as a “6th renderer,” but this ticket explicitly lists five kinds and omits `registry.v1`. Plan should either add a sixth renderer + AC or open a follow-up ticket so WO-015/WO-010 consumers are not surprised.

---

## Key findings

### 1. Module layout (matches PRD §7.3)

| File | Responsibility |
|------|----------------|
| `src/io/formats/index.ts` | `format()`, `FormatKind`, `FormattableDocument` union, re-exports |
| `src/io/formats/json.ts` | `serializeJson(doc): string` → `stableStringify(doc, 2)` |
| `src/io/formats/markdown.ts` | `serializeMarkdown(doc): string` → `switch (doc.kind)` |
| `src/io/formats/markdown/*.ts` (optional split) | One file per renderer if `markdown.ts` exceeds ~300 lines |
| `src/io/formats/stableStringify.ts` | Recursive key sort + `JSON.stringify` (no dependency) |
| `src/io/formats/__fixtures__/` | Canonical JSON inputs + golden `.md` (and optional `.json` goldens) |

No `parseMarkdown` / `mdToJson` anywhere in `src/io/formats/` or `src/io/sources/`.

### 2. Typed document union (dispatch)

```ts
import type {
  ComponentSpecV1,
  DriftReportV1,
  HandoffContextV1,
  OpsProgramV1,
  TokensV1,
} from '@detroitlabs/fighub-contracts';

export type FormattableDocument =
  | OpsProgramV1
  | TokensV1
  | ComponentSpecV1
  | DriftReportV1
  | HandoffContextV1;

export type OutputFormat = 'json' | 'md';

export function format(doc: FormattableDocument, fmt: OutputFormat): string {
  return fmt === 'json' ? serializeJson(doc) : serializeMarkdown(doc);
}
```

**Out of union (by design for WO-019):**

- `RegistryV1` — PRD §8.6 is machine-oriented registry file (`.fighub-registry.json`); not in FR-IO-3 “five document types” table in §8 intro; no ticket AC.
- `AuditReportV1` — exists in contracts (WO-010); markdown deferred per cross-ticket note — not in ticket’s five renderers.
- `TokensV1WC3DTCG` / `TokensV1Legacy` — **input wire shapes**; markdown “tokens preview” targets normalized **`TokensV1`** only.

Runtime guard: if `format()` receives an object without a supported `kind`, throw `Error` with `Unsupported document kind` (fail fast; no silent fallback).

### 3. JSON — stable key order

`JSON.stringify` alone does **not** guarantee key order across nested objects built in different orders. Implement:

```ts
export function stableStringify(value: unknown, space?: number): string {
  return JSON.stringify(sortKeysDeep(value), null, space);
}
```

- Sort keys lexicographically at every plain object level.
- Preserve array order.
- Leave `null`, primitives, and non-plain objects (if any) unchanged.
- Default export spacing: **2** spaces (readable downloads; still deterministic).
- `undefined` in objects: omitted by `JSON.stringify` (standard); document in plan if any field must appear as `null` instead.

**Tests:** same fixture object built with keys inserted in different orders → identical string; snapshot `__fixtures__/golden/*.json` optional.

### 4. Markdown — global rules (PRD §10.3)

- **GFM only:** `##` / `###` headings, pipe tables, `-` lists, fenced `json` code blocks where values are structured `unknown`.
- **No** HTML blocks, Mermaid, or front matter.
- **Title line:** `# {kind} v1` then metadata subsection.
- **Dates:** ISO-8601 from `meta.*At` fields as-is (no locale formatting).
- **Unknown / object values** (`figma`, `repo`, `lastSynced` on drift): inline `` `JSON.stringify` truncated to ~120 chars `` or a one-line fenced block — pick one style in plan and apply consistently.
- **Determinism:** sort table rows by `id` or `name`; sort ops by index; sort token rows by `collection` then `name`.

### 5. Per-kind markdown specs

#### 5.1 `drift-report` (PRD §8.4 — primary spec)

**Acceptance driver:** fixture with **4 push, 2 pull, 1 conflict** (summary counts must match section headings).

Structure:

```markdown
# drift-report v1

## Summary

| Direction | Count |
| --------- | ----- |
| ↑ Push    | 4     |
| ↓ Pull    | 2     |
| ⚠ Conflicts | 1   |
| Synced    | 410   |

## ↑ Push (4)

| ID | Kind | Figma | Repo | Last synced |
| -- | ---- | ----- | ---- | ----------- |
| …  | …    | …     | …    | …           |

## ↓ Pull (2)

…

## ⚠ Conflicts (1)

…
```

**Locked heading pattern (PRD §8.4 + ticket):**

| `direction` | Section heading | Glyph in heading |
|-------------|-----------------|------------------|
| `push` | `## ↑ Push ({n})` | `↑` |
| `pull` | `## ↓ Pull ({n})` | `↓` |
| `conflict` | `## ⚠ Conflicts ({n})` | `⚠` (plural “Conflicts” per PRD example) |

`{n}` = `summary.push` / `summary.pull` / `summary.conflict`, not `drifts.filter.length` (they should match; test both for AC fixture).

Empty direction: omit section entirely OR render `## ↑ Push (0)` with “_None_” — **recommend omit** to keep chat paste small; document in plan.

Meta block (above Summary): `generatedAt`, `figmaFileKey`, `repoUrl` as bullet list under `## Meta`.

#### 5.2 `handoff-context` (ticket AC)

Structure:

```markdown
# handoff-context v1

## Meta
- capturedAt: …
- figmaFileKey: …
- frameUrl: …

## Frames

### {frame.name} (`{nodeId}`)
- Deep link: {deepLink}
- Screenshot: ![{name}]({screenshot.dataUrl})

## Components used

| Component | Instances | Code Connect |
| --------- | --------- | -------------- |
| Button    | 4         | [link](url) or — |

## Tokens used

- Theme/Primary
- Layout/spacing/3

## Auto layout

| Property  | Value |
| --------- | ----- |
| direction | vertical |
| gap       | Layout/spacing/4 |
| padding   | … or — |
```

- **Screenshot embed:** standard GFM image syntax with `data:image/png;base64,...` URL from contract (works in GitHub, many chat clients; Figma Output text node may truncate — acceptable per PRD sinks).
- **`codeConnectUrl` optional:** em dash `—` when missing.
- Multiple frames: repeat `###` per frame in stable `nodeId` order.

#### 5.3 `component-spec` (preview)

Human skim, not full scaffold input. Suggested sections:

- **Header:** name, framework, optional `category` / `archetype`
- **Variant matrix:** GFM table — rows = variant keys, cells = joined enum values
- **Props:** `| name | type | default | enum |`
- **Bindings:** `| selector | variable |`
- **Layout:** key/value table (`direction`, `gap`, `padding`, sizing)
- **Subcomponents / confidence:** only if present; confidence `unresolved` as bullet list

Omit deep `surface` / `field` archetype blobs from markdown unless plan adds collapsed fenced JSON (default: omit for preview).

#### 5.4 `tokens` (preview)

Target **`TokensV1`** after adapters (WO-007+). Preview = audit-friendly subset, not full token dump:

- **Collections table:** `| id | modes |` from `collections[]`
- **Tokens table (cap):** first N tokens (plan: **50** default) sorted by `collection`, `name` — columns: `collection`, `name`, `type`, modes summary (e.g. `Light: #fff, Dark: #000` or `alias → theme/color/primary`)
- **themes:** if `themes?.length`, list extension names only
- Footer when truncated: `_… and {k} more tokens_`

Full export for machines remains JSON.

#### 5.5 `ops-program`

- **Meta:** `generatedAt`, `generatedBy`
- **Ops table:** `| # | type | summary |` where summary is type-specific one-liner:
  - `push-tokens`: `inline ({n} top-level keys)` or token count if cheap
  - `build-style-guide`: `pages: color, typography, …`
  - `scaffold-component`: `spec: {spec.name}`
  - `import-component`: `repoPath`
  - `detect-drift`: `scope: variables, components`
  - `apply-resolution`: `{n} decisions`
  - `emit-handoff`: `{n} node ids`
  - `emit-code-connect-pr`: `{n} components, {framework}`
- Nested `spec` in scaffold op: do not inline full component-spec markdown; name reference only.

### 6. Input path — markdown is output-only

| Location | Behavior |
|----------|----------|
| `src/io/sources/file.ts` | `.md` → `unsupported-type` (keep) |
| `src/io/formats/*` | No imports from `sources/` |
| PRD §10.1 file picker | Lists `.md` for **download** sink, not ingest |

**Build follow-up:** change `file.ts` hint from `Markdown parsing lands in WO-019` → `Markdown is export-only. Paste or load JSON.` (WO-019 implements serializers, not parsers).

### 7. Fixture strategy (`src/io/formats/__fixtures__/`)

Co-locate with implementation (per ticket); distinct from `tests/fixtures/io/sources/` (ingest happy paths).

```
src/io/formats/__fixtures__/
  drift-report-ac.json          # 4 push, 2 pull, 1 conflict
  drift-report-ac.md            # golden
  handoff-context-min.json
  handoff-context-min.md
  component-spec-button.json
  component-spec-button.md
  ops-program-bootstrap.json
  ops-program-bootstrap.md
  tokens-preview-sample.json      # small TokensV1 (≤10 tokens)
  tokens-preview-sample.md
  json/
    key-order-a.json            # same semantic, different key order
    key-order-b.json
    key-order-expected.json       # stableStringify output
```

**Authoring:**

1. Start from `tests/fixtures/io/sources/*.json` where kinds match; extend drift fixture for AC counts.
2. Generate initial `.md` goldens via implementation, then **commit** and treat as regression snapshots (review in PR).
3. Tests import via `import.meta.url` + `readFileSync` (same pattern as `tests/unit/io/sources/ports.test.ts`).

**Vitest layout:**

- `tests/unit/io/formats/format.test.ts` — `format()` dispatch, throws on bad kind
- `tests/unit/io/formats/json.test.ts` — stable key order
- `tests/unit/io/formats/markdown.test.ts` — `it.each` golden file pairs

Extend `vitest.config.ts` `include` if colocating tests under `src/io/formats/*.test.ts` instead.

### 8. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| WO-003 `@detroitlabs/fighub-contracts` | Done | All five types exported from `packages/contracts/src/index.ts` |
| WO-006 I/O sources | Done | Ingest JSON only; hint update optional in WO-019 |
| WO-020 Export sheet | Downstream | Will call `format()` for download/clipboard |

No new npm packages required for stable JSON.

### 9. WO-010 / `audit-report` gap

`AuditReportV1` is a published contract used by bootstrap audit UI. WO-010 explicitly deferred GFM to WO-019. **This ticket does not list `audit-report`.** Options for `/plan`:

1. Add 6th renderer + fixture `audit-report-push.json` (minimal failed rules), or
2. Keep five renderers; create WO-019b or amend WO-020 to stringify audit JSON only until follow-up.

**Recommendation:** add sixth renderer in plan — low incremental cost, closes WO-010 loop — unless product owner insists on strict five.

---

## Recommendations

1. **Implement `format()` in `index.ts`** with the `FormattableDocument` union; keep renderers pure (no Figma API, no filesystem side effects).
2. **Use `stableStringify` for all JSON output** (export sheet, clipboard, PR bodies later).
3. **Lock drift headings exactly** as `## ↑ Push (N)` / `## ↓ Pull (N)` / `## ⚠ Conflicts (N)` — PRD §8.4 is normative for designer/agent scanning.
4. **Commit golden markdown** next to JSON fixtures under `src/io/formats/__fixtures__/`.
5. **Do not implement md→json**; update `file.ts` hint to export-only wording.
6. **Resolve audit-report in `/plan`** with explicit in/out scope decision.
7. **Registry:** out of scope; if export sheet needs it later, separate ticket.

---

## Open questions

1. **Sixth renderer for `audit-report`?** WO-010 expects it; ticket lists five. Needs owner decision at `/plan`.
2. **Empty drift sections:** omit vs `(0)` — recommend omit.
3. **Tokens preview cap:** 50 vs 100 vs full — recommend 50 with footer.
4. **Large base64 screenshots in handoff md:** acceptable for clipboard/PR; optional plan step to strip `dataUrl` from markdown when size > 500KB (out of ticket AC).
5. **Colocated `src/io/formats/*.test.ts` vs `tests/unit/io/formats/`** — either works; pick one in plan for consistency with existing `tests/unit/io/` tree.

---

---

## Validated evidence

### Repo inventory (grep-verified 2026-05-27)

| Path | Status | Role |
| ---- | ------ | ---- |
| `packages/contracts/src/*.v1.ts` | ✅ | All five formattable kinds exported |
| `packages/contracts/src/auditReport.v1.ts` | ✅ | Sixth kind — scope gap (§9) |
| `packages/contracts/src/registry.v1.ts` | ✅ | Out of WO-019 five renderers |
| `src/io/sources/file.ts` L12–15 | ✅ | `.md` rejected at ingest — export-only invariant |
| `src/io/formats/` | ❌ greenfield | WO-019 deliverable |
| `tests/fixtures/io/sources/` | ✅ | Seed JSON for golden fixtures |
| `tests/unit/io/sources/ports.test.ts` | ✅ | Fixture load pattern to mirror |

### Contract field inventory (dispatch validation)

| Kind | `kind` field | Key meta fields for markdown |
| ---- | ------------ | ---------------------------- |
| `drift-report` | `'drift-report'` | `meta.generatedAt`, `meta.figmaFileKey`, `meta.repoUrl`; `summary.*`; `drifts[]` |
| `handoff-context` | `'handoff-context'` | `meta.capturedAt`, `frames[]`, `components[]`, `tokensUsed[]`, `autoLayout` |
| `component-spec` | `'component-spec'` | `name`, `framework`, `variants`, `props`, `bindings` |
| `ops-program` | `'ops-program'` | `meta.generatedAt`, `ops[]` |
| `tokens` (TokensV1) | wire via normalized model | `collections[]`, `tokens[]`, optional `themes[]` |

Types imported from `@detroitlabs/fighub-contracts` — **no duplicate TS interfaces** in formats layer.

### Determinism validation approach

`stableStringify` + sorted table rows + golden `.md` files → byte-stable output for FR-IO-3. Unit test: two objects with permuted key order → identical string (see `key-order-a/b` fixtures in §7).

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D-019-1 | Write-only formats layer | PRD §10.3 md never parsed back | md→json adapter |
| D-019-2 | Five renderers in ticket; **recommend sixth** for audit-report | WO-010 deferral closure | Strict five only |
| D-019-3 | Drift headings exact PRD §8.4 glyphs | Agent/designer scanning | Unicode alternatives |
| D-019-4 | Tokens preview cap **50** rows | Readable markdown | Full token dump |
| D-019-5 | Golden fixtures under `src/io/formats/__fixtures__/` | Co-locate with renderers | Only in tests/ |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-019-1 | Implement drift AC fixture → review golden `.md` | 4 push / 2 pull / 1 conflict headings match §5.1 | ☐ at build (no Figma) |
| SPK-019-2 | `stableStringify` key-order test | `key-order-a` === `key-order-b` output | ☐ unit test |
| SPK-019-3 | Product decision: audit-report renderer in/out | Record in plan Open Questions | ☐ pending owner |

---

## Risk register

| Risk | Sev | Likelihood | Mitigation |
| ---- | --- | ---------- | ---------- |
| Handoff base64 screenshots bloat MD | Med | Med | Optional strip >500KB in plan |
| WO-010 expects audit MD; ticket lists five | Med | Certain | D-019-2 sixth renderer |
| Misleading file.ts hint | Low | Certain | Update hint in WO-019 build |

---

## References

- Sprint index: [sprint-4-io-gating-research-index.md](../../research/sprint-4-io-gating-research-index.md)
- Quality bar: [research-quality-bar.md](../../../templates/research-quality-bar.md)
- `packages/contracts/src/{driftReport,handoffContext,componentSpec,opsProgram,tokens}.v1.ts`
- `.github/Sprint 2/WO-006-…/research/io-subsystem-design.md` — ingest vs format separation
- `.github/Sprint 2/WO-010-…/research/post-push-audit-rules.md` §7 — audit markdown deferral
- `src/io/sources/file.ts` — `.md` rejection + hint
- `tests/fixtures/io/sources/` — seed inputs for format fixtures
