---
type: work-order
github_issue: 53
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JiY
---

## Goal

Resolver for native platforms: iOS Asset Catalog (`.xcassets`) and Android resources (`res/values/colors.xml`, etc.). Different token model than CSS — colors/dimensions live in catalog files, not class names. Phase 4c GA cut.

PRD anchors: `Docs/PRD.md` §6.9, §12 Phase 4c.

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

1. `src/core/import/shared/nativeTokenResolver.ts` — `resolve(reference: NativeRef): { variable: string } | { unresolved: true }`.
2. iOS: parse `.xcassets/Colors/*` directories.
3. Android: parse `res/values/colors.xml` + `dimens.xml`.
4. Auto-detect path conventions from connected repo.
5. Phase 4c GA: all 5 frameworks shipping with full import + CC capability.

### Visual / UX

_See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket._

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - _None — new code designed in PRD._
- **Dependencies:** WO-016, WO-048, WO-049

---

## Acceptance criteria _(definition of done)_

- [ ] iOS asset reference `Color.themePrimary` → `{ variable: 'Theme/Primary' }`.
- [ ] Android resource `R.color.theme_primary` → `{ variable: 'Theme/Primary' }`.
- [ ] Auto-detect catalog/res paths.
- [ ] Phase 4c GA: SwiftUI + Compose end-to-end import + CC works.

## Out of scope

- Watch-mode asset catalog updates.

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

- Dependencies: WO-016, WO-048, WO-049.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.9, §12 Phase 4c
- Lift reference:
  - _None — new code designed in PRD._
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
