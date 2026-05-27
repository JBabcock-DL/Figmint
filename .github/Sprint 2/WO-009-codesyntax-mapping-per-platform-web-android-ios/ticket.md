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

_Derived from Goal — see ticket-level scope._

## User stories

- [ ] _See Requirements section below._

## Design reference _(when UI work applies)_

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. `src/core/variables/codeSyntax.ts` exports:
   - `mapCodeSyntax(token)` — pure hybrid mapper: stored `token.codeSyntax` wins; derive missing platforms via collection rules (except Theme — stored only, no path derivation).
   - `applyCodeSyntax(variable, token)` — calls `mapCodeSyntax`, then `setVariableCodeSyntax` for each present platform (`WEB`, `ANDROID`, `iOS` literal casing).
2. **Hybrid source-of-truth (locked):** stored canonical `codeSyntax` when present; derive fallback for Primitives / Typography / Layout / Effects when absent. Theme tokens **must** carry stored triples (from legacy adapter / role tables) — never derive from Figma path.
3. **Per-platform conventions (Detroit Labs Foundations):**
   - **WEB:** `var(--kebab-path)` for derivable collections; Theme uses role-table strings (e.g. `var(--color-primary)`, not path-derived).
   - **ANDROID:** kebab-case M3 resource **basename** only (no `R.color.` / `R.dimen.` prefix in codeSyntax); Theme uses M3 role names (`primary`, `surface-container-high`).
   - **iOS:** dot-separated semantic paths; Theme uses stored values (e.g. `.Primary.default`); derivable collections use domain prefixes (`.Palette.*`, `.Typography.*`, `.Layout.*`, `.Effect.*`).
4. Alias tokens carry codeSyntax on the **alias row**, not inherited from alias target.
5. Integrated into WO-008 push: per variable, after all `setValueForMode` calls → `applyCodeSyntax`.
6. Vitest unit tests per research test matrix (`research/platform-codesyntax-mapping.md` §6).

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — per-platform mapping conventions
  - `…/data/theme-aliases.json`, `primitives-baseline.json`, `layout-effects.json`, `typography-slots.json` — authoritative examples + derivation rules
- **Dependencies:** WO-008

---

## Acceptance criteria _(definition of done)_

- [ ] Every pushed variable has codeSyntax set for all three platforms (stored or derived per collection rules).
- [ ] Spot-check: Theme `color/primary/default` → `var(--color-primary)` (Web), `primary` (Android basename), `.Primary.default` (iOS).
- [ ] Theme token with missing stored codeSyntax → no platforms set (no path-derived fallback).
- [ ] Primitives `color/primary/500` → `var(--color-primary-500)` / `color-primary-500` / `.Palette.primary.500` (derived).
- [ ] Platform keys use exact Figma API casing: `WEB`, `ANDROID`, `iOS` — never `IOS`.
- [ ] `tsc --noEmit` clean.

## Out of scope

- Per-component codeSyntax (Code Connect handles that — Sprint 8).
- Platform-specific value adaptation (e.g. iOS color profiles).
- Adding `R.color.` / `R.dimen.` prefixes to ANDROID codeSyntax strings (consumer codegen concern).

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
- [Platform codeSyntax mapping research](research/platform-codesyntax-mapping.md)
- Lift reference:
  - `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/conventions/02-codesyntax.md` — per-platform mapping conventions
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
