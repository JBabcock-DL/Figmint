---
type: work-order
github_issue: 12
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5I8M
---

## Goal

Attach `codeSyntax` to every pushed variable per platform (Web, Android, iOS) so consumer codebases reference variables by their platform-native token names. Removes the need for platform-specific alias collections.

PRD anchors: `Docs/PRD.md` §6.1 FR-BOOT-5.

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

1. `src/core/variables/codeSyntax.ts` — pure mapper from `TokensV1` token → `{ WEB, ANDROID, iOS }` codeSyntax triple.
2. Naming conventions per platform (CSS custom property / Android resource / iOS asset) — match Detroit Labs Foundations precedent.
3. Applied as part of the variable push (WO-008) via `setVariableCodeSyntax`.
4. Unit tests for each platform's naming transformation.

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — per-platform mapping conventions
- **Dependencies:** WO-008

---

## Acceptance criteria *(definition of done)*

- [ ] Every pushed variable has codeSyntax set for all three platforms.
- [ ] Spot-check: a `Theme/Primary` token resolves to `--theme-primary` (Web), `R.color.theme_primary` (Android), `Color.themePrimary` (iOS).
- [ ] `tsc --noEmit` clean.

## Out of scope

- Per-component codeSyntax (Code Connect handles that — Sprint 8).
- Platform-specific value adaptation (e.g. iOS color profiles).

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

- Dependencies: WO-008.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.1 FR-BOOT-5
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — per-platform mapping conventions
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
