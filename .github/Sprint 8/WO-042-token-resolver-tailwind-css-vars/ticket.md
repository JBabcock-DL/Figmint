---
type: work-order
github_issue: 45
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JdY
---

## Goal

Implement the token resolver that maps CSS class names / CSS variables to Figma Variables. Auto-detect from connected repo: Tailwind config first, then `tokens.css`, then Style Dictionary config, then Tokens Studio JSON. Manual override available.

PRD anchors: `Docs/PRD.md` §6.9 FR-CONF-*, §6.3 FR-IMP-5.

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

1. `src/core/import/shared/tokenResolver.ts` — `resolve(className: string): { variable: string } | { unresolved: true }`.
2. Detection priority (PRD FR-CONF-2): Tailwind config → tokens.css → Style Dictionary config → Tokens Studio.
3. Settings panel for manual override (PRD FR-CONF-3).
4. Per-project cache in clientStorage scoped per repo URL.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-016

---

## Acceptance criteria *(definition of done)*

- [ ] `resolve('bg-primary')` against a Tailwind v4 config containing `--theme-primary` → `{ variable: 'Theme/Primary' }`.
- [ ] `resolve('bg-mystery')` → `{ unresolved: true }`.
- [ ] Detection auto-finds Tailwind v3/v4 configs.
- [ ] Manual override in Settings overrides detection.

## Out of scope

- Native platform asset catalogs (Sprint 10 separate resolver).
- Reverse: Figma variable → className.

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

- Dependencies: WO-016.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.9 FR-CONF-*, §6.3 FR-IMP-5
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
