---
type: work-order
github_issue: 47
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5Jes
---

## Goal

Add the Import-from-repo flow and the 'Emit Code Connect PR' flow to the Components tab. Phase 4a cut (React-only).

PRD anchors: `Docs/PRD.md` §6.3, §6.7, §12 Phase 4a.

---

## Problem story

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

Components tab Import + CC PR UI mock lives in the Figmint design file.

---

## Requirements

### Functional

1. Extend `src/ui/tabs/Components.tsx` with: 'Import from repo' button + repo file browser (filtered to React component files initially).
2. Dependency tree display (WO-043).
3. Import preview + edit (per FR-IMP-7 'never silent-apply').
4. 'Emit Code Connect PR' button when unmapped components exist on canvas.
5. Framework picker (visible but only React enabled in Phase 4a).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-040, WO-041, WO-042, WO-043

---

## Acceptance criteria *(definition of done)*

- [ ] Designer imports a React component end-to-end: pick file → scan deps → preview spec → scaffold + add to registry → optional CC PR.
- [ ] Designer emits CC PR for 5 unmapped components → single PR opens in connected repo.
- [ ] Phase 4a GA: full React import + CC roundtrip works.

## Out of scope

- Vue/WC/SwiftUI/Compose flows (later sprints).

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

**Figma source (filled before `/vqa` runs):**

| Field | Value |
| --- | --- |
| `file_key` | `<!-- filled during /plan or /vqa -->` |
| `node_id` | `<!-- filled during /plan or /vqa -->` |
| Figma deep link | `<!-- filled -->` |
| Frame / scope | `<!-- e.g. Figmint plugin window — Bootstrap tab -->` |
| Captured at | `<!-- ISO date -->` |

**Assertions** *(agent fills `Design (Figma)` and `Build (implemented)` columns during `/vqa`):*

| # | Category | Property | Design (Figma) | Build (implemented) | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Layout | Frame width × height | | | |
| 2 | Layout | Auto-layout direction / gap | | | |
| 3 | Layout | Padding (T/R/B/L) | | | |
| 4 | Typography | Font family / size / weight | | | |
| 5 | Color | Background fill (token) | | | |
| 6 | Color | Foreground fill (token) | | | |
| 7 | Spacing | Margin / gap tokens | | | |
| 8 | Effects | Border radius / shadow | | | |
| 9 | Accessibility | Contrast ratio | | | |
| 10 | Accessibility | Focus ring + hit target | | | |

**Per-row deviations:**

- *Filled by `/vqa` with FAIL rationale.*

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-040, WO-041, WO-042, WO-043.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §6.3, §6.7, §12 Phase 4a
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
