# WO-031 — Drift report v1 emission

---

## Summary

Aggregate variable + component drift arrays into **`DriftReportV1`**, compute summary counts, render **GFM markdown** via existing WO-019 pipeline, and emit through **WO-020 ExportSheet sinks** (download, clipboard, Output page, pluginData, GitHub PR).

**Locked recommendation:** Thin **`src/core/drift/report.ts`** module — `buildDriftReport({ variableDrifts, componentDrifts, meta })` returns validated `DriftReportV1`. No new markdown renderer; wire existing `renderDriftReportMarkdown` and `format()`. PR title pattern: `DesignOps drift: N push, M pull, K conflicts (sprint X)` via `src/io/github/prBody.ts` extension.

Most infrastructure **already shipped** in Sprints 3–4; this ticket is **integration + orchestration**.

---

## Key Findings

### 1. Contract already defined

`packages/contracts/src/driftReport.v1.ts` (lines 1–40):

- `DriftReportMeta`: generatedAt, figmaFileKey, repoUrl
- `DriftReportSummary`: push, pull, conflict, synced
- `DriftEntry`: VariableDriftEntry | ComponentDriftEntry with direction + triple values

Matches PRD §8.4 example (lines 502–544).

### 2. Markdown renderer shipped

`src/io/formats/markdown/driftReport.ts` (lines 20–69):

- Sections: `## ↑ Push (N)`, `## ↓ Pull (N)`, `## ⚠ Conflicts (N)`
- GFM tables: ID, Kind, Figma, Repo, Last synced
- Uses `truncateUnknown` for cell safety

**Tests:** `tests/unit/io/formats/driftReport.test.ts` — AC headings verified.

### 3. AC fixture exists

`src/io/formats/__fixtures__/drift-report-ac.json` — 4 push, 2 pull, 1 conflict, 410 synced.

Also `tests/fixtures/ui/export/drift-report.json` for Export sandbox.

### 4. Export pipeline

| Step | Module | Notes |
| ---- | ------ | ----- |
| Serialize JSON | `src/io/formats/index.ts` | `format(doc, 'json')` |
| Render MD | `src/io/formats/markdown.ts` | Routes drift-report kind |
| Prepare content | `src/io/sinks/prepareContent.ts` | Dual json+md |
| Sinks | `src/io/sinks/index.ts` | 5 sinks including github-pr |
| UI | `src/ui/components/ExportSheet.tsx` | Sink selection |
| PR flow | `src/io/github/createPullRequestFlow.ts` | Branch + blob + PR |

**Gap:** No runtime produces live report from detectors — only static samples.

### 5. buildDriftReport algorithm

```typescript
export function buildDriftReport(input: {
  variableDrifts: VariableDriftEntry[];
  componentDrifts: ComponentDriftEntry[];
  meta: DriftReportMeta;
  syncedCount: number;
}): DriftReportV1 {
  const drifts = [...input.variableDrifts, ...input.componentDrifts]
    .sort((a, b) => a.id.localeCompare(b.id));
  const summary = {
    push: drifts.filter(d => d.direction === 'push').length,
    pull: drifts.filter(d => d.direction === 'pull').length,
    conflict: drifts.filter(d => d.direction === 'conflict').length,
    synced: input.syncedCount,
  };
  return { v: 1, kind: 'drift-report', meta: input.meta, summary, drifts };
}
```

Validate summary matches drifts length (synced excluded from drifts[] per WO-029 decision).

### 6. PR emission

Extend `src/io/github/prBody.ts` or add `driftReportPrTitle(summary, sprintLabel?)`:

- Title: `DesignOps drift: 4 push, 2 pull, 1 conflicts`
- Body: full markdown from `renderDriftReportMarkdown`
- File path default: `docs/figmint/drift-{ISO-date}.md` + `.json` (PRD §653)

Reuse `executeGithubPRSink` from `src/io/sinks/githubPR.ts`.

### 7. Main-thread orchestration

New message: `drift/build-report` → runs detect (WO-029+030) → buildDriftReport → returns doc for ExportSheet or direct sink.

Ops program already declares `detect-drift` in `packages/contracts/src/opsProgram.v1.ts` — wire handler in `main.ts` post-WO-031.

---

## Validated evidence

### Repo inventory

| Exists | Path | Role |
| ------ | ---- | ---- |
| ✅ | `packages/contracts/src/driftReport.v1.ts` | Schema |
| ✅ | `src/io/formats/markdown/driftReport.ts` | MD renderer |
| ✅ | `src/ui/export/sampleDriftReport.ts` | Sandbox sample |
| ✅ | `src/io/sinks/githubPR.ts` | PR sink |
| ✅ | `tests/unit/io/formats/driftReport.test.ts` | MD tests |
| ❌ | `src/core/drift/report.ts` | Greenfield aggregator |
| ❌ | Live detect→report handler | Greenfield |

### Cross-ticket matrix

| Ticket | Role |
| ------ | ---- |
| WO-029 | Supplies VariableDriftEntry[] |
| WO-030 | Supplies ComponentDriftEntry[] |
| WO-019 | Dual format serialization |
| WO-020 | ExportSheet UI |
| WO-003 | Contract package |
| WO-032 | Consumes report for resolution UI |

---

## Decision log

| ID | Decision | Rationale | Rejected |
| -- | -------- | --------- | -------- |
| D-031-1 | No new MD renderer | Already tested | Duplicate driftReport.ts |
| D-031-2 | synced in summary only | WO-029 D-029-4 | Full synced table |
| D-031-3 | Sort drifts by id | Deterministic PR diffs | Insertion order |
| D-031-4 | PR commits both json+md | FR-IO-3 dual format | MD only |
| D-031-5 | figmaFileKey from figma.fileKey \|\| '' | Untitled file behavior | Block report on empty |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-031-1 | E2E: mock drifts → buildDriftReport → format json+md | Schema valid; headings match AC fixture | ☐ pending |
| SPK-031-2 | Render MD; paste into GitHub preview | Tables render | ☐ manual VQA |
| SPK-031-3 | PR sink with drift sample | PR opened on test repo | ☐ deferred (needs OAuth) |

---

## Risk register

| Risk | Sev | Lik | Mitigation |
| ---- | --- | --- | ---------- |
| Large drift payload in PR | Med | Low | Truncate cells via truncateUnknown (existing) |
| Summary/drift count mismatch | Med | Med | Unit test invariant checker |
| github-pr sink without OAuth | Low | Med | ExportSheet disables sink (existing pattern) |

---

## Recommendations

1. Implement `src/core/drift/report.ts` + `src/core/drift/index.ts` barrel.
2. Add `tests/unit/core/drift/report.test.ts` using AC fixture counts.
3. Wire `drift/build-report` message; connect ExportSheet "Detect drift" demo in Export tab initially, then WO-032.
4. Add JSON Schema validation test against generated schema from WO-003 if drift-report schema exported.
5. Document PR path convention in `src/ui/export/defaultPaths.ts` for drift-report kind.

---

## Open questions

| ID | Question | Status |
| -- | -------- | ------ |
| OQ-031-1 | Sprint label in PR title — auto or manual? | **RESOLVED:** optional meta field; omit if unknown |
| OQ-031-2 | Include detect timestamp in filename? | **RESOLVED:** yes `drift-2026-05-28` ISO date |
