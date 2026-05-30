# Handoff tab UI (WO-038)

> **Status:** Research complete — ready for `/plan`  
> **Date:** 2026-05-29  
> **Ticket:** WO-038 (GitHub #41)  
> **PRD anchors:** §6.6, §12 Phase 3 exit (GA handoff)

---

## Summary

WO-038 adds the **Handoff** tab to the plugin UI — `src/ui/tabs/Handoff.tsx` — wiring selection state, capture trigger, markdown preview, and the existing **`ExportSheet`** (WO-020) for sink routing. This is the Phase 3 GA surface: designer selects frame → Handoff tab → **Capture selection** → preview → **Export** → clipboard (default).

**Locked recommendation:** mirror **`Components.tsx` + `ExportSandbox.tsx`** patterns: UI sends `handoff/capture` to main thread; main returns preview markdown + serializable `HandoffContextV1`; preview renders in a scrollable `<pre>` or lightweight markdown surface (no new MD parser dependency — reuse prepared markdown string from main). Export sheet reuses `runExport` with document `{ kind: 'handoff-context', payload }`.

---

## Key findings

### 1. Current UI shell

| Item | State |
|------|--------|
| Tabs in `App.tsx` | `bootstrap`, `components`, `export`, `settings` — **no handoff** |
| Export demo | `ExportSandbox.tsx` exercises `ExportSheet` with drift/registry fixtures |
| GitHub session | `useGitHubSession` / `useGitHubConnect` available for PR sink |
| Selection in UI | **Not tracked today** — need `selectionchange` postMessage from main (new) |

### 2. Selection-aware button

Main thread must broadcast selection summaries:

```typescript
// main → ui
{ type: 'handoff/selection', count: number, names: string[] }
```

On plugin init + `figma.on('selectionchange')`. Disable **Capture** when `count === 0`. Show hint: “Select one or more frames in the canvas.”

### 3. Tab layout (locked wireframe)

```text
[ Capture selection ]  (primary, disabled when no selection)
Status: 2 frames selected — Checkout, OrderSummary

┌ Preview (markdown) ─────────────────────┐
│ # handoff-context v1                    │
│ ...                                     │
└─────────────────────────────────────────┘

[ Export ▼ ]  → ExportSheet modal/inline (clipboard default ON)
```

Design reference: ticket cites “Handoff tab UI mock lives in FigHub design file” — **`/plan` must record `file_key` + `node_id`** from design file during VQA prep (TBD in research; use Plugin Sandbox chrome patterns until design link filled).

### 4. Patterns to mirror

| Pattern | File |
|---------|------|
| Tab panel + a11y | `App.tsx`, `TabPanel.tsx` |
| Export sheet integration | `ExportSandbox.tsx`, `RepoSyncCard` drift export |
| Main ↔ UI messages | `src/io/messages/export.ts`, `registerExportMessageListener` |
| Disabled primary action | `Components.tsx` scaffold guards |

### 5. Accessibility

- Capture button: `aria-disabled` when no selection; focus ring per existing tab buttons
- Preview: `aria-label="Handoff preview"` on scroll region
- Export sheet: inherit WO-020 checkbox labels

### 6. Performance AC

End-to-end <1s depends on WO-034/037 — UI shows **spinner on Capture** (`capturing` state) and blocks double-submit.

---

## Validated evidence

### Repo inventory

- **Create:** `src/ui/tabs/Handoff.tsx`
- **Modify:** `src/ui/App.tsx` (tab + panel), `src/main.ts` (selection + capture handlers)
- **Create:** `src/io/messages/handoff.ts` (+ listener registration)
- **Reuse:** `ExportSheet`, `runExport`, `defaultExportBasename` for handoff kind

### Cross-ticket matrix

| Ticket | Dependency |
|--------|------------|
| WO-037 | **Blocks** — must expose capture + preview API |
| WO-020 | Export sheet |
| WO-016 | GitHub PR sink optional |

---

## Decision log

| ID | Decision | Rationale | Rejected |
|----|----------|-----------|----------|
| D-038-1 | New `handoff` tab (not under Export) | PRD Phase 3 GA surface | Hide under Export sandbox |
| D-038-2 | Preview = markdown string in `<pre>` | No new deps; deterministic | Full MD renderer |
| D-038-3 | Selection sync via postMessage | UI iframe cannot read selection | Poll from UI |
| D-038-4 | ExportSheet inline below preview | Same as Export tab pattern | Modal only |

---

## Pre-plan spikes

| Spike | Pass criteria |
|-------|---------------|
| SPK-038-1 | Designer VQA: select frame → Capture → Export → paste in Slack shows screenshot + tables |
| SPK-038-2 | a11y: Capture disabled with empty selection announced |

Depends on WO-037 build — run at `/vqa`.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Large preview scroll perf | Virtualize only if needed; cap preview length |
| Selection desync | Re-broadcast on tab focus |
| Design mock not linked | Use Bootstrap tab spacing tokens for `/plan` |

---

## Recommendations

1. Add `'handoff'` to `AppTab` union + tab button between Components and Export (or after Export per design).
2. Implement `useHandoffSelection()` hook listening for `handoff/selection`.
3. `/vqa` Figma checklist: fill `file_key` / `node_id` from design mock when available.
4. Vitest: Handoff tab renders disabled capture when `count: 0`.

---

## Open questions

- **RESOLVED:** No in-plugin LLM ticket drafting (out of scope).
- **For `/plan`:** Exact Figma design file link for Handoff tab mock — ticket placeholder unfilled.
