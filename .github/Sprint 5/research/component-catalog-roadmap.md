# Component catalog roadmap (committed)

> **Status:** Locked product direction — **WO-056** on GitHub Project #9. Not optional / not “future maybe.”
> **Date:** 2026-05-28

## Summary

Designers expect **Browse repo → multiselect → batch scaffold**. Phase 2 ships **sync registry + paste + single scaffold** (WO-027). **WO-056** (Sprint 8, Phase 4a) delivers the catalog + batch queue. **WO-044** adds import-from-source for specs not yet on disk.

## Terminology (locked)

| UI label | File / concept | Purpose |
| -------- | -------------- | ------- |
| **Figma sync file** | `.figmint-registry.json` | Already scaffolded in Figma (nodeId, version) |
| **Browse repo components** | WO-056 catalog | All discoverable specs in GitHub repo |
| **Import from repo** | WO-044 | Parse React/source → new spec |

## Roadmap tickets

| WO | Title | Swimlane note |
| -- | ----- | ------------- |
| WO-022 | ComponentSet scaffolder | **In Build** — geometry remediation |
| WO-024 | Property definitions | **In Build** — pre-combine properties |
| WO-025 | Usage frame | **In Build** — after geometry |
| WO-027 | Components tab | **In Build** — UX 1/2/4 shipped; canvas remediation pending |
| **WO-056** | Component catalog + batch scaffold | **Backlog** — Phase 4a committed |
| WO-044 | Import + Code Connect UI | **Backlog** — pairs with WO-056 |

## WO-027 UX shipped (2026-05-28)

1. Rename **Load registry** → **Load sync registry** + education copy  
2. Empty-state explains sync file vs codebase catalog → points to WO-056  
4. Repo URL + sync file path → **Settings only**
