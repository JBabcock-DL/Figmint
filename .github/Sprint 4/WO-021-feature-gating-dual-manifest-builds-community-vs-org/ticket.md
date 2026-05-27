---
type: work-order
github_issue: 24
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JJQ
---

## Goal

Lock in the Community vs Org build separation. Same source tree, two manifests, build-time feature flags. Org build adds GitHub OAuth + multi-file batch via REST + Code Connect PR emission. Community build is the public-listing version.

PRD anchors: `Docs/PRD.md` §13 (Distribution & feature gating), §12 Phase 1 exit.

---

## Problem story

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/config/flags.community.ts` and `src/config/flags.org.ts` define the exported `flags` object with the gated capabilities per PRD §13.1.
2. `scripts/build-community.mjs` and `scripts/build-org.mjs` switch the flag import + manifest at build time.
3. Every gated UI affordance reads from `flags.xxx` (no conditional imports per build).
4. `manifest.community.json` and `manifest.org.json` differ in plugin id, name suffix, and any other publish metadata.
5. Phase 1 GA cut: Community build supports bootstrap + style-guide canvas + paste/file/clipboard sources + download/clipboard/Output page/pluginData sinks. Org build adds GitHub OAuth + GitHub PR sink.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-002, WO-016, WO-017, WO-018, WO-019, WO-020

---

## Acceptance criteria _(definition of done)_

- [ ] Both builds produce loadable plugin bundles.
- [ ] Community build does not expose GitHub UI.
- [ ] Org build exposes full I/O including GitHub.
- [ ] Single `npm run build` runs both targets.
- [ ] Phase 1 GA: bootstrap path benchmarked end-to-end vs MCP baseline (target: ≥10× speedup).

## Out of scope

- Variables REST API path (deferred — see PRD §11.5).
- Pre-configured token templates per client (later add-on).

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover the acceptance criteria above.

### Visual / design QA

- See ticket-level scope; most subsystem tickets have visual QA in their UI counterpart.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- Console.debug per major event; production telemetry deferred.

---

## Figma VQA Checklist

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-002, WO-016, WO-017, WO-018, WO-019, WO-020.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §13 (Distribution & feature gating), §12 Phase 1 exit
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
