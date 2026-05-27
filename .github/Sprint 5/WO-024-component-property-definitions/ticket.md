---
type: work-order
github_issue: 27
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JMY
---

## Goal

Add component property definitions to the scaffolded ComponentSet per the spec's `props` field — Boolean, Text, Variant, and InstanceSwap types. Implements FR-SCAF-4.

PRD anchors: `Docs/PRD.md` §6.2 FR-SCAF-4.

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

1. `src/core/components/scaffold/applyProperties.ts` — calls `addComponentProperty` on the ComponentSet with the correct type per spec prop.
2. Variant props auto-derived from variant matrix axes; explicit `props[]` entries cover Boolean/Text/InstanceSwap.
3. Default values applied per spec.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/01-config-schema.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/shadcn-props.schema.json` — source of prop shapes
- **Dependencies:** WO-022

---

## Acceptance criteria *(definition of done)*

- [ ] A spec with `props: [{ name: 'loading', type: 'boolean', default: false }]` results in a Boolean component property on the ComponentSet with default false.
- [ ] Variant matrix axes appear as Variant properties (auto-derived).
- [ ] Integration test against a sample shadcn component spec.

## Out of scope

- Instance-level prop overrides (designer authors those manually).
- Property descriptions (cosmetic; defer).

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

- Dependencies: WO-022.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.2 FR-SCAF-4
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/conventions/01-config-schema.md`
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-component/shadcn-props.schema.json` — source of prop shapes
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
