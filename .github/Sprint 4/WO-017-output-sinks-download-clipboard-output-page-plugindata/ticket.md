---
type: work-order
github_issue: 20
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JEE
---

## Goal

Implement the four non-GitHub output sinks: download as file, copy to clipboard, write to a labeled text node on the DesignOps Output page (renamed: Figmint Output page), and write to a selected frame's pluginData. All sinks share the same `LoadedDocument` input shape.

PRD anchors: `Docs/PRD.md` §6.8 FR-IO-2, §10.2.

---

## Problem story

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/io/sinks/download.ts` — browser-native file download (.json or .md).
2. `src/io/sinks/clipboard.ts` — write to OS clipboard via `navigator.clipboard.writeText()`.
3. `src/io/sinks/outputPage.ts` — find-or-create a `Figmint Output` page, write a labeled text node with the document content.
4. `src/io/sinks/pluginData.ts` — `setPluginData(key, value)` on a target node.
5. All four implement the same `Sink` interface for use by the unified export sheet (WO-020).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-002, WO-003

---

## Acceptance criteria *(definition of done)*

- [ ] Each sink works against a sample drift-report.v1 document.
- [ ] Output page auto-created on first use; subsequent writes append text nodes (or update by label).
- [ ] pluginData sink uses a stable namespace prefix (`figmint:` for collision avoidance).
- [ ] Unit tests for each sink (mock Figma + clipboard APIs where needed).

## Out of scope

- GitHub PR sink (WO-018).
- Format conversion (handled by WO-019 serializer).
- Unified export sheet UI (WO-020).

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

- Dependencies: WO-002, WO-003.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.8 FR-IO-2, §10.2
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
