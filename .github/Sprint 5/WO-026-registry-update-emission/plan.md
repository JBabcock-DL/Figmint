# WO-026 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

_To be filled during `/plan`._

## Tasks

1. _TBD_

## Build Agents

### Phase 1

- _TBD_

## Notes

_Research decisions (2026-05-28) — carry into `/plan`._

- **Module:** `src/core/components/registry.ts` — port `merge-registry.mjs` upsert to TypeScript; no Node CLI script.
- **Map key:** `spec.name` (PascalCase, e.g. `"Button"`); legacy kebab read alias optional on load.
- **Merge rules:** upsert replaces entry; `version = (existing ?? 0) + 1`; fresh `publishedAt` each merge; `fileKey` mismatch → throw `REGISTRY_FILE_KEY_MISMATCH`; missing file → greenfield `{ v:1, kind:'registry', fileKey, components:{} }`.
- **Read:** `loadRegistryFromGitHub` wraps `loadFromGitHub`; default path `.figmint-registry.json`; normalize legacy `.designops-registry.json` bodies without `v`/`kind`.
- **Export:** stage `ContractDocument { kind:'registry' }` → WO-020 ExportSheet; default sinks Org `github-pr`, Community `download`; path basename `.figmint-registry`.
- **Contract boundary:** entry fields = `RegistryComponentEntry` only; no archetype/variant/props in registry; no Code Connect URL (Sprint 8).
- **Tests:** golden fixtures under `tests/fixtures/registry/`; fix invalid `tests/fixtures/ui/export/registry.json`.
- **Blockers:** none for `/plan`. WO-027 owns auto-open ExportSheet UX (OQ-4).

## References

- Ticket: `./ticket.md`
- Research: `./research/registry-update-emission.md`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
