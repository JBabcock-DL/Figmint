---
type: work-order
github_issue: 37
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JWQ
---

## Goal

When designer selects a frame and triggers handoff capture, extract: node id, frame name, deep link with `node-id` query param, and a PNG export of the frame. Foundation for the rest of the handoff bundle (WO-035, WO-036).

PRD anchors: `Docs/PRD.md` §6.6 FR-HAND-1.

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

1. `src/core/handoff/capture.ts` — async `captureSelection()` returning `CapturedFrame[]` aligned with `HandoffFrame` (contract fields only).
2. Read `figma.currentPage.selection`; accept `FRAME`, `COMPONENT`, `INSTANCE`, `SECTION`; cap at **10** nodes with clear error beyond cap.
3. PNG export via `exportAsync({ format: 'PNG' })` @ **1×** scale → `data:image/png;base64,...`.
4. Deep link: `https://www.figma.com/design/{fileKey}/{fileName}?node-id={id-with-dashes}`; empty `deepLink` when `figma.fileKey` is blank (Untitled file) + warning in result.
5. Multi-selection: one array entry per selected node; parallel `exportAsync` with `<1s` target for 1–3 typical frames.
6. Export pure helpers `buildDeepLink()` and `pngToDataUrl()` for unit tests; barrel `src/core/handoff/index.ts`.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-002

---

## Acceptance criteria _(definition of done)_

- [ ] With a frame selected, capture returns node id, name, deep link, PNG data URL.
- [ ] Multi-selection captures all selected frames.
- [ ] Performance: <1s for typical frames.

## Out of scope

- Components-used enumeration (WO-035).
- Tokens-used (WO-036).
- UI (WO-038).

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

- Dependencies: WO-002.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.6 FR-HAND-1
- [Selection metadata + screenshot capture research](research/selection-metadata-screenshot-capture.md)
- Contract: `packages/contracts/src/handoffContext.v1.ts`
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
