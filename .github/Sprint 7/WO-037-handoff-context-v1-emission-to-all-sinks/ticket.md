---
type: work-order
github_issue: 40
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JZM
---

## Goal

Aggregate WO-034/35/36 outputs into a `HandoffContextV1` document; emit via the WO-020 export sheet with all 5 sinks. Default to clipboard (most common use case).

PRD anchors: `Docs/PRD.md` §6.6 FR-HAND-5, §8.5.

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

1. `src/core/handoff/build.ts` — `buildHandoffContext()` orchestrating WO-034/035/036 into `HandoffContextV1`.
2. Merge policy: union `tokensUsed` (sorted); aggregate `components` counts; `autoLayout` from **first** captured frame; `meta.frameUrl` from first deep link.
3. Reuse WO-019 `format(doc, 'md'|'json')` and WO-020 **`ExportSheet` / `runExport`** — default sinks: **clipboard + markdown on**, others off.
4. Main handler `handoff/capture` + messages in `src/io/messages/handoff.ts`; validate against `handoff-context.v1.schema.json` in tests.
5. GitHub PR basename: `docs/fighub/handoff-{date}` (`defaultExportBasename`); warn when plugin-data export would exceed 100 kB screenshot payload.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-034, WO-035, WO-036, WO-019, WO-020, WO-003

---

## Acceptance criteria _(definition of done)_

- [ ] Capture a 'Checkout' frame → resulting markdown opens cleanly in Slack / Claude / GitHub PR.
- [ ] JSON validates against `HandoffContextV1` schema.
- [ ] Latency: capture-to-clipboard <1s.

## Out of scope

- Auto-creation of GitHub issues from handoff (manual; designer routes via clipboard or PR).

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

- Dependencies: WO-034, WO-035, WO-036, WO-019, WO-020, WO-003.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.6 FR-HAND-5, §8.5
- [Handoff emission + sinks research](research/handoff-context-v1-emission-to-all-sinks.md)
- WO-019: `src/io/formats/markdown/handoffContext.ts` · WO-020: `ExportSheet`
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
