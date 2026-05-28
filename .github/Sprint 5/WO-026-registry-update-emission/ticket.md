---
type: work-order
github_issue: 29
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JOI
superseded_by: WO-058
note: `.figmint-registry.json` envelope is deleted in WO-058 — canvas pluginData snapshots become single source of truth (PRD §6.4 FR-DRIFT-1). DO NOT move this ticket to Completed; close as Won't Do when WO-058 enters /research. 2026-05-28 architectural lock.
---

## Goal

After each successful scaffold, emit an updated `.figmint-registry.json` (or stage one for emission via export sheet) so the consumer repo stays in sync with what exists in Figma. Implements FR-SCAF-6.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-6, §8.6.

---

## Problem story

When a designer scaffolds a component (e.g. Button), Figma gains a ComponentSet but the connected repo's registry file does not update automatically. Downstream flows — composed archetypes, dependency scanning, drift detection — need a repo-side map of component names to Figma `nodeId`, `key`, and monotonic `version`. WO-026 closes the loop: read existing registry from GitHub (if any), upsert the new entry, and stage export via WO-020.

---

## User stories

- [ ] As a designer, after scaffolding Button I can export an updated `.figmint-registry.json` without hand-editing JSON.
- [ ] As a designer on Org build, GitHub PR is pre-selected as the default export sink for registry updates.
- [ ] As a designer re-scaffolding Button, the registry entry is replaced and its version increments — no duplicate rows.

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).** Export UX reuses WO-020 `ExportSheet.tsx`.

---

## Requirements

### Functional

1. **`src/core/components/registry.ts`** — pure module with:
   - `normalizeRegistryInput` — accept `RegistryV1` or legacy `{ fileKey, components }` bodies.
   - `loadRegistryFromGitHub(repoUrl, path?)` — wrap `loadFromGitHub`; 404 → greenfield empty registry; default path `.figmint-registry.json`.
   - `buildRegistryEntry` — from `ScaffoldResult` + `ComponentSpecV1` + target page: populate `nodeId`, `key`, `pageName`, `publishedAt`, `version`, optional `cvaHash`, optional `composedChildVersions`.
   - `mergeRegistryEntry` — upsert by **`spec.name`** map key; refuse merge on `fileKey` mismatch; increment `version` on re-scaffold.
2. Registry entry fields per **`RegistryComponentEntry`** (WO-003): `nodeId` (ComponentSet), `key` (Figma component key), `pageName`, `publishedAt`, `version` (≥ 1). Optional: `cvaHash`, `composedChildVersions` for composites. **Not** in registry row: archetype, variant matrix, props (those remain in `component-spec.v1.json`).
3. Post-scaffold: build `ContractDocument { kind: 'registry', payload: RegistryV1 }` and open **WO-020 ExportSheet** — default sinks: **`github-pr`** when `flags.githubOAuth && flags.githubPRSink`, else **`download`**. No silent PR; designer confirms export (FR-SCAF-6, preview-first).
4. Serialize via `stableStringify` / existing export path → `.figmint-registry.json` (basename `.figmint-registry`).

### Visual / UX

- ExportSheet title default: "Update registry" (or "Export registry").
- Registry export: JSON only (MD checkbox hidden — WO-020 behavior).

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/resolver/merge-registry.mjs` — upsert semantics (port to TS)
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/registry.schema.json` — field set (superseded by `RegistryV1` envelope)
- **Dependencies:** WO-022 (`ScaffoldResult`), WO-003 (`RegistryV1`), WO-020 (ExportSheet), WO-016 (`loadFromGitHub`)

---

## Acceptance criteria _(definition of done)_

- [ ] Scaffolding a new Button updates the registry with a new entry referencing the Figma ComponentSet's `nodeId`.
- [ ] Re-scaffolding the same Button updates (not duplicates) the entry; `version` increments.
- [ ] Registry document validates against `RegistryV1` schema (WO-003 / AJV on `dist/registry.v1.schema.json`).
- [ ] Unit tests cover merge, fileKey guard, version bump, and legacy normalization.

## Out of scope

- Removing entries on component delete (Sprint 6 drift detection handles).
- Multi-file registry support.
- Code Connect mapping URL in registry (deferred — Sprint 8; `key` + `nodeId` suffice).
- Configurable registry path UI (FR-CONF-5) — default path only; param on API.
- Auto-commit without ExportSheet confirmation.
- **Repo component catalog / discovery** — registry is a **sync ledger**, not a list of all scaffoldable components in the codebase (see WO-027 [registry-ux-intent](../WO-027-components-tab-ui-forward-flow/research/registry-ux-intent.md)).

---

## Product semantics _(for UI copy — 2026-05-28)_

**`.figmint-registry.json` is not "all components in my repo."** It records components **already scaffolded in Figma** (nodeId, key, page, version) so re-scaffold, composed children, and drift can resolve Figma nodes. Spec content stays in `component-spec.v1.json` files. First-time users often have **no registry file** until after first scaffold + export — empty load is expected, not an error.

**Settings vs Components:** Registry **path** configuration is a connection/setup concern; prefer **Settings** tab for path + helper text; Components tab should only **load** the sync file and show linked component names (WO-027 UX follow-on).

---

## Testing & verification

### Functional QA

- Vitest: `tests/unit/core/components/registry.test.ts` — merge, upsert, fileKey mismatch, legacy normalize.
- Integration (VQA / WO-027): scaffold → ExportSheet → download or PR.

### Visual / design QA

- ExportSheet renders for registry kind; MD checkbox absent.

### Accessibility

- ExportSheet fieldset/legend pattern (WO-020).

### Telemetry / observability

- `console.debug` in UI iframe on merge + export start; main-thread uses existing GitHub message logging.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- ✅ Complete — see [registry-update-emission](research/registry-update-emission.md)

## 📋 Ready for `/plan`

- Dependencies: WO-022, WO-003, WO-020, WO-016 (read path).
- Research locked merge rules + export integration; `/plan` should define module API + build phases.

## 🛠️ Ready for `/build`

- After `/plan` — `/code-build` single domain unless plan adds ExportSheet wiring agent.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-6, §8.6
- Research: [registry-update-emission](research/registry-update-emission.md)
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/resolver/merge-registry.mjs`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/registry.schema.json`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
