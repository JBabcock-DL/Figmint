# Registry UX intent — designer mental model vs Phase 2 implementation

> **Status:** Intent capture only — **no build in Sprint 5 remediation.** Informs copy, tab placement, and future tickets (WO-044+).
> **Date:** 2026-05-28
> **Source:** Manual Components tab VQA — user feedback on "Load registry"

---

## Summary

Designers may interpret **"Load registry"** as **"show me all components in my codebase I can push to Figma."** Phase 2 implements **UC-2**: load **`.fighub-registry.json`**, a **sync ledger** of components **already scaffolded in Figma**, then resolve one `component-spec.v1.json` per pick. That gap causes empty lists, schema-path confusion, and the feeling that paste is the only viable path.

**Deferred product intent (not WO-027):** repo-wide **component discovery** (spec files and/or source), **multiselect**, and **batch scaffold** — closer to **UC-4 / WO-044** and a future bulk-scaffold ticket.

**Near-term UX (no new features):** clarify naming, empty states, and **move connection + registry path config to Settings**; keep Components tab focused on **pick spec → preview → scaffold**.

---

## User mental model (captured intent)

When tapping something like "load components from repo," the designer expects:

1. See **all available components in the connected codebase** (not only ones already in Figma).
2. **Multiselect** the ones to materialize on canvas.
3. **Scaffold automatically** without pasting JSON per component.

This is **valid product intent** but **out of scope for Phase 2 GA** (WO-027 explicitly excludes import-from-repo, bulk scaffold, and codebase scan).

| User expectation | Phase 2 reality |
| ---------------- | --------------- |
| Catalog of scaffoldable components in repo | Only keys in `.fighub-registry.json` (often empty on first run) |
| Multiselect + batch run | Single `<select>`, one scaffold per run |
| Discover from code / file tree | Fixed spec paths after picking a registry key; no repo scan |
| "Registry" = component library index | "Registry" = **Figma ↔ repo sync record** (nodeId, version, page) |

---

## What "Load registry" actually does (for copy writers)

**Purpose:** Hydrate the **sync ledger** so the plugin can:

- Offer **quick re-scaffold / update** for components already linked to Figma.
- Resolve **which spec file** to fetch for a known name (`design/components/{key}.component-spec.v1.json`).
- Pass **`registry` into scaffold** for composed archetypes (child ComponentSet refs).

**Not purpose:** Enumerate every component spec or React file in the monorepo.

**Lifecycle:**

```text
First visit (no .fighub-registry.json on GitHub)
  → Load sync registry → empty list (expected)
  → Paste spec OR pick after first scaffold + export

After scaffold + export
  → Registry lists Button, Input, … with Figma nodeIds
  → Pick Button → spec resolved from repo → re-scaffold updates entry
```

**Common confusion:** Pointing registry path at `packages/contracts/dist/registry.v1.schema.json` — that is the **JSON Schema contract**, not a registry **instance** (`kind: "registry"`).

---

## Ideation — making the distinction obvious (copy + layout)

### A. Rename actions (Components tab)

| Current label | Clearer label | Subtext |
| ------------- | ------------- | ------- |
| Load registry | **Load sync registry** or **Load Figma sync file** | "Components already linked between this file and GitHub" |
| (missing) | **Browse component specs** _(future)_ | "All `*.component-spec.v1.json` in repo — not built yet" |
| (missing) | **Import from code** _(WO-044)_ | "Pick React files — Sprint 8" |

### B. Empty-state education (Components tab)

When registry load returns null or zero keys:

```text
No sync registry yet (.fighub-registry.json).

This file tracks components already scaffolded in Figma — not every
component in your repo. To add your first component:
  • Paste a component-spec.json below, or
  • (Coming) browse specs / import from code

After scaffold, export the registry to GitHub so picks appear here next time.
```

### C. Section reorder (Components tab)

1. **Paste or load spec** (primary for greenfield — matches user paste workflow)
2. **Re-scaffold from sync registry** (secondary — power users / updates)
3. Preview → Scaffold

Puts the mental model "I have a spec" before "I have a sync file."

### D. Settings tab — connection + paths (recommended)

Move **infrequent / setup** fields out of Components:

| Field | Current | Recommended |
| ----- | ------- | ----------- |
| Repo URL | Settings + duplicated on Components | **Settings only** (read-only on Components: "Connected: owner/repo") |
| Tokens path | Settings | Settings |
| **Registry path** | Components only | **Settings** — "Figma sync file path" with helper text |
| GitHub connect | Settings | Settings |

Components tab keeps **Load sync registry** button + read-only status (`3 components linked`) using paths from Settings session state (already via `useGitHubSession`).

**Rationale:** Settings = "how this plugin talks to my repo"; Components = "what I want to build today."

### E. Tooltip / info icon (low effort)

**ⓘ Sync registry** → modal or expandable:

- What the file contains (name, nodeId, version — not full specs)
- Default path `.fighub-registry.json`
- Difference from JSON Schema in `packages/contracts`
- Link to export after scaffold

### F. Future entry points (document only)

| Intent | Ticket / UC |
| ------ | ----------- |
| **Browse repo components** + multiselect batch scaffold | **WO-056** (committed) — [component-catalog-roadmap](../research/component-catalog-roadmap.md) |
| Import React/Vue from repo + dependency tree | **WO-044** UC-4 |

---

## Decision log (UX-only, deferred)

| ID | Decision | Rationale |
| -- | -------- | --------- |
| UX-1 | Document intent; do not build discovery/bulk in Sprint 5 remediation | User confirmed deferral |
| UX-2 | Prefer **Settings** for registry path + repo config | Reduces Components clutter; matches Bootstrap pattern (tokens path in Settings) |
| UX-3 | Rename **Load registry** → **Load sync registry** when copy pass runs | Aligns language with sync ledger semantics |
| UX-4 | Empty state must explain first-run behavior | Prevents schema-path / empty-dropdown confusion |

---

## Open questions

| # | Question | Owner |
| - | -------- | ----- |
| OQ-1 | Should Components show read-only repo summary from Settings only? | WO-027 follow-on UX |
| OQ-2 | Spec-discovery WO before WO-044 as interim multiselect? | Product / backlog |
| OQ-3 | Auto-create empty `.fighub-registry.json` on first export vs explicit greenfield | WO-026 |

---

## References

- WO-027 ticket — UC-2 scope + deferred intent section
- WO-026 ticket — registry semantics (sync ledger)
- WO-044 ticket — UC-4 import-from-repo (user's long-term vision)
- PRD §5.2 UC-2 vs §5.4 UC-4
- [scaffold-canvas-failure-remediation.md](scaffold-canvas-failure-remediation.md) — registry schema path confusion
