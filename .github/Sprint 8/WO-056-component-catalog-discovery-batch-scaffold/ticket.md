---
type: work-order
github_issue: 59
project_item_id: PVTI_lAHOD9B30s4BY4aYzguEet4
---

## Goal

Deliver the **component catalog** experience designers expect on the Components tab: discover scaffoldable components from the connected GitHub repo, **multiselect**, and run **batch scaffold** without pasting specs one-by-one. Implements the deferred intent from WO-027 manual VQA (2026-05-28).

PRD anchors: `Docs/PRD.md` §5.4 UC-4 (import), §6.3 FR-IMP-*; extends Phase 4a with catalog UX that complements WO-044.

---

## Problem story

Phase 2 **UC-2** loads `.fighub-registry.json` — a **Figma sync ledger** of components already on canvas. Designers reasonably expect **Load** to show **all components available in the codebase** and let them scaffold many at once. That gap blocks self-serve onboarding until every spec is pasted manually.

WO-056 closes the product loop: **repo discovery → multiselect → queued scaffold → merged registry export**.

---

## User stories

- As a designer, after connecting GitHub in Settings, I open **Browse repo components** and see every discoverable `component-spec.v1.json` (and/or importable React entry) in my repo.
- As a designer, I **multiselect** Button, Input, Card (etc.) and run **Scaffold selected** — the plugin queues scaffolds with progress per component.
- As a designer, I export **one** updated `.fighub-registry.json` after the batch completes (ExportSheet confirm — no silent PR).

---

## Requirements

### Functional

1. **Discovery API (UI + GitHub):** Scan connected repo for component specs via GitHub Contents API / tree (configurable roots: `design/components/`, `design/component-specs/`, globs for `*.component-spec.v1.json`). Return sorted list `{ key, path, name }`.
2. **Catalog panel (Components tab):** Replace mental-model gap left by sync-registry-only pick — new section **Browse repo components** with searchable multiselect checklist (not single `<select>`).
3. **Batch scaffold queue:** For each selected item, resolve spec → preview optional → `scaffold/run` sequential or bounded-parallel with aggregate progress (`2/5 Button…`). Stop or continue on per-item failure (designer choice in plan).
4. **Integration with WO-044:** React **Import from repo** (file picker) remains the deep path for un-spec'd source; catalog lists **spec files first**, import adds new specs to catalog on success.
5. **Settings-only repo config:** Repo URL, tokens path, sync registry path stay in Settings (WO-027 UX lock); catalog reads session state only.

### Visual / UX

- Distinguish **Browse repo components** (catalog — WO-056) vs **Re-scaffold from sync file** (UC-2 — WO-027).
- Empty catalog: link to import flow + paste spec; explain sync file vs catalog.

### Technical / architectural

- **Dependencies:** WO-027 (Components tab shell), WO-016 (GitHub read), WO-022..026 (scaffold pipeline), WO-044 (import UI — coordinate section layout).
- **Lift reference:** DesignOps create-component registry resolver patterns for spec path conventions.

---

## Acceptance criteria _(definition of done)_

- [ ] Connected repo shows ≥1 discoverable component spec without pasting JSON.
- [ ] Designer multiselects 3 specs and batch scaffolds all three; registry export lists all three entries.
- [ ] Batch run surfaces per-component progress and failures without losing completed work.
- [ ] Settings remains sole place for repo URL / sync file path.

## Out of scope

- Non-React import parsers (WO-045+).
- Code Connect PR emission (WO-044 CC slice).
- Drift sync (Sprint 6+).

---

## Roadmap placement

| Phase | Ticket | Delivers |
| ----- | ------ | -------- |
| Phase 2 (done) | WO-027 | Sync registry pick, paste spec, single scaffold |
| **Phase 4a** | **WO-056** | **Catalog discovery + multiselect batch scaffold** |
| Phase 4a | WO-044 | Import-from-repo file browser + CC PR |
| Phase 4a | WO-041..043 | Parsers + dependency scan |

**Build order:** WO-027 remediation (WO-022/024/025) → WO-056 (catalog) in parallel with WO-041..043 → WO-044 UI integration.

---

## References

- WO-027 [registry-ux-intent](../Sprint%205/WO-027-components-tab-ui-forward-flow/research/registry-ux-intent.md)
- [component-catalog-roadmap](../Sprint%205/research/component-catalog-roadmap.md)
- PRD §5.4 UC-4
