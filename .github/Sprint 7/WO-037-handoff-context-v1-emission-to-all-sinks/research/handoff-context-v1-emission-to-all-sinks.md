# HandoffContext v1 emission to all sinks (WO-037)

> **Status:** Research complete — ready for `/plan`  
> **Date:** 2026-05-29  
> **Ticket:** WO-037 (GitHub #40)  
> **PRD anchors:** §6.6 FR-HAND-5, §8.5, §10.2 sinks

---

## Summary

WO-037 adds **`src/core/handoff/build.ts`** to orchestrate WO-034/035/036 into a validated **`HandoffContextV1`**, then reuses the **existing WO-020 export pipeline** (`ExportSheet` / `runExport` / `handleExportRun`) with `contractKind: 'handoff-context'`. Markdown rendering is already implemented (WO-019); default sink selection should be **clipboard + markdown** (FR-HAND-5 “default to clipboard”).

New main-thread handler: `handoff/capture` UI message → build document → post preview payload to UI → optional `export/run` with user-selected sinks. GitHub PR sink uses basename `docs/fighub/handoff-{date}` from `src/ui/export/defaultPaths.ts`.

---

## Key findings

### 1. Downstream infrastructure already shipped

| Layer | Path | Status |
|-------|------|--------|
| Contract | `packages/contracts/src/handoffContext.v1.ts` | Complete |
| JSON + MD format | `src/io/formats/markdown/handoffContext.ts`, `format()` dispatch | Complete (WO-019) |
| Export UI | `src/ui/components/ExportSheet.tsx`, `runExport.ts` | Complete (WO-020) |
| Main export | `handleExportRun` in `src/main.ts` | Handles all five sinks |
| Clipboard default | `src/io/sinks/clipboard.ts` | Copies prepared text |
| GitHub PR | `executeGithubPRSink` | Uses `contractKind` + files array |
| Sample fixture | `tests/fixtures/io/sources/handoff-context.json` | Minimal envelope |

**Greenfield:** `src/core/handoff/build.ts`, message types in `src/io/messages/handoff.ts`, main handler wiring.

### 2. Build pipeline (locked)

```text
captureSelection()           → frames[]
for each frame root:
  enumerateComponents(root)  → merge component counts
  enumerateTokensAndLayout() → union tokens; autoLayout from primary frame only
assemble HandoffContextV1:
  meta.capturedAt = ISO UTC
  meta.figmaFileKey = figma.fileKey || 'unknown'
  meta.frameUrl = first frame deepLink or composite file URL
validate shape (runtime guard matching schema)
prepareSinkContent → format json/md
export/run OR return preview to UI
```

**Multi-frame policy:** `components` aggregated across frames; `tokensUsed` = sorted union; `autoLayout` from **first selected frame** (document in plan — designer primary selection order).

### 3. Markdown content (WO-019 already implements)

- Embedded screenshots via `![name](dataUrl)`
- Components table with Code Connect links
- Tokens bullet list
- Auto-layout table

Ensure clipboard export uses **`format: 'md'`** as default primary format; JSON available via export sheet toggle.

### 4. Latency budget (<1s capture-to-clipboard)

| Stage | Budget |
|-------|--------|
| Capture PNGs (WO-034) | ≤ 800 ms (1–3 frames) |
| Walk components + tokens | ≤ 100 ms |
| Markdown serialize | ≤ 50 ms |
| Clipboard write | ≤ 50 ms |

Defer GitHub PR path from hot path — user-triggered second step.

### 5. Ops program hook (future)

PRD §9.2 lists `emit-handoff` op type — **out of scope** for WO-037 unless plan adds thin wrapper; ticket does not require ops dispatcher.

---

## Validated evidence

### Cross-ticket matrix

| Ticket | Produces | WO-037 consumes |
|--------|----------|-----------------|
| WO-034 | `HandoffFrame[]` | yes |
| WO-035 | `HandoffComponentUsage[]` | yes |
| WO-036 | tokens + autoLayout | yes |
| WO-019 | markdown renderer | yes |
| WO-020 | ExportSheet | yes (WO-038 embeds) |
| WO-003 | schema types | yes |

### Sink defaults (locked for handoff)

| Sink | Default on | Notes |
|------|------------|-------|
| clipboard | **on** | Primary FR-HAND-5 |
| download | off | User opt-in |
| output-page | off | Large screenshots |
| plugin-data | off | 100 kB limit risk |
| github-pr | off | Requires OAuth + repo |

---

## Decision log

| ID | Decision | Rationale | Rejected |
|----|----------|-----------|----------|
| D-037-1 | Reuse `ExportSheet` / `runExport` | DRY — WO-020 complete | Custom handoff-only export |
| D-037-2 | Default clipboard + md | PRD FR-HAND-5 | JSON-only |
| D-037-3 | `buildHandoffContext()` pure core | Testable without UI | All logic in React |
| D-037-4 | Primary frame auto-layout | Single object in contract | Array per frame (schema change) |

---

## Pre-plan spikes

| Spike | Pass criteria |
|-------|---------------|
| SPK-037-1 | End-to-end in sandbox: capture → clipboard markdown opens in editor with screenshot + table |
| SPK-037-2 | JSON validates against `handoff-context.v1.schema.json` via ajv in test |

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Clipboard size limits (browser) | Prefer md; strip dataUrl from clipboard variant if needed (plan decision) |
| pluginData 100 kB | Keep default off; document in export sheet |
| Untitled file fileKey | meta + warnings from WO-034 |

---

## Recommendations

1. Add `src/io/messages/handoff.ts` with `handoff/capture`, `handoff/capture-result`, `handoff/preview`.
2. Add `handleHandoffCapture` in `main.ts` parallel to `handleExportRun`.
3. Unit test `buildHandoffContext()` with frozen sub-module outputs (no figma globals).
4. Integration test: fixture frames → golden `handoff-context.v1.json` snapshot.

---

## Open questions

- **RESOLVED:** GitHub issue auto-create out of scope (designer-mediated routing).
- **Plan decision:** Whether clipboard markdown should use **embedded** screenshots or **link-only** if payload > N KB — recommend embedded for AC “opens cleanly in Slack” with 1-frame default.
