# Plan — WO-058: GitHub-Desktop-style sync

_Status: **STUB** — do not run `/build` against this plan._

This plan is a stub. The ticket is **vision capture only** at this stage and is **BLOCKED BY WO-057** (full doc-pipeline parity, #60) Ship + designer sign-off.

Until WO-057 ships and `/research` runs against this WO, `/plan` must not produce a full execution contract.

## Next steps (in order)

1. Wait for WO-057's `research/vqa-report.md` to recommend **Ship** and designer to confirm Plugin Sandbox parity.
2. Run `/research` per `ticket.md` → **🔍 Ready for `/research`** to:
   - Confirm `figmint.json` final schema (beyond locked minimum).
   - Locate canvas pluginData key + envelope shape for the hidden Figmint Output node (PRD §6.4 FR-DRIFT-1).
   - Decide whether `comp/registry-envelope` / `comp/registry-filekey` are repurposed against pluginData or deleted outright.
   - Sketch the GitHub-Desktop-style repo card UI for designer review.
   - Define Push PR title/body conventions + commit signature strategy.
3. After research lands and is signed off, re-run `/plan` to expand this stub into the full execution contract per `.github/templates/plan-quality-bar.md` — Approach / Steps / Build Agents / Dependencies / Open Questions / AC traceability table.

## References

- `ticket.md` (this folder) — locked architectural decisions, requirements, acceptance criteria.
- `.github/Sprint 5/WO-057-designops-doc-pipeline-parity/` — upstream block.
- `.github/templates/plan-quality-bar.md` — depth bar for the eventual full plan.
