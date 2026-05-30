---
type: work-order
github_issue: 50
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jg0
---

## Goal

Generalize WO-042's token resolver beyond React: handle Vue scoped styles, Web Components Shadow DOM, and any future web-family quirks. Single resolver instance serves all web frameworks.

PRD anchors: `Docs/PRD.md` §6.9 FR-CONF-\*.

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

1. Add **`src/core/import/shared/webTokenResolver.ts`** facade — delegates class resolution to existing **`createTokenResolver`** (WO-042 unchanged).
2. Implement **`extractWebBindings`** in shared module (move from React); Vue/WC pass optional **stylesheet text** + CEM **cssProperties**.
3. Vue: parse **`<style scoped>`** for `var(--*)` → bindings; template classes still use Tailwind resolver.
4. WC: parse **`:host` / shadow CSS** + CEM `cssProperties` via **`cssVarMap`**; trace vars through **`cssThemeReader`** where possible.
5. Extend Settings/clientStorage with **`cssVarMap`** override (separate key from WO-042 class map); per-framework hint via `WebTokenResolverOptions.framework`.
6. **React regression:** all WO-041/042 import tests green after refactor.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-042, WO-045, WO-046

---

## Acceptance criteria _(definition of done)_

- [ ] Vue component using scoped styles resolves tokens correctly.
- [ ] WC component using Shadow DOM CSS resolves tokens correctly.
- [ ] React import (WO-041) still passes after refactor.

## Out of scope

- Native platform resolvers (Sprint 10 separate).

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

- Dependencies: WO-042, WO-045, WO-046.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.9 FR-CONF-\*
- [Shared web token resolver research](research/shared-web-token-resolver-hardening.md)
- [Sprint 9 research index](../research/sprint-9-research-index.md)
- WO-042 research: `.github/Sprint 8/WO-042-token-resolver-tailwind-css-vars/research/token-resolver-tailwind-css-vars.md`
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
