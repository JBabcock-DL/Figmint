# WO-057 — Bootstrap text-styles spec (Doc/* + Label/*)

> **Status:** Research-complete · 2026-05-28
> **Quality bar:** `.github/templates/research-quality-bar.md`
> **Sibling:** [`doc-pipeline-lift-map.md`](./doc-pipeline-lift-map.md), [`section-contract-trace.md`](./section-contract-trace.md), [`audit-gate-spec.md`](./audit-gate-spec.md)

## Summary

**Ticket Requirement 7 is already fulfilled.** The four `_Doc/*` text styles (`_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption`) and the seven `Label/*` slot styles (including SM, MD, LG) are already published by the existing bootstrap pipeline. No new push code, no new fixture entries, no DTCG-shape definitions are required from WO-057.

The audit gate ([`audit-gate-spec.md`](./audit-gate-spec.md)) handles the missing-prerequisite case at scaffold time. Per the locked decision (D3 in lift-map), Requirement 7 of `ticket.md` is amended to: **"Verify that bootstrap already publishes the required Doc/* text styles and Label/*/font-family variables."**

**Locked recommendation:** No bootstrap extension work in WO-057's scope. The ticket Requirement 7 wording must be amended (Step 6 in research skill); the plan must NOT include "extend bootstrap" build steps.

## Key findings

### F1 — `_Doc/*` styles already published

`src/core/canvas/publishTypographyStyles.ts` line 19:

```ts
const DOC_STYLE_NAMES = ['_Doc/Section', '_Doc/TokenName', '_Doc/Code', '_Doc/Caption'];
```

Lines 53-72 iterate `DOC_STYLE_NAMES`, calling `ensureTextStyle` (creates if missing) then `applyTypographyVariableBindings` (binds the style to Typography variables via `DOC_STYLE_TOKEN_PREFIX`).

The DOC_STYLE_TOKEN_PREFIX map in `src/core/canvas/typographyStyleBinding.ts` lines 10-13:

```ts
'_Doc/Section': 'Headline/LG',
'_Doc/TokenName': 'Label/LG',
'_Doc/Code': 'Label/SM',
'_Doc/Caption': 'Body/SM',
```

So:

| Doc style | Backing slot | Resolved properties (mode-100) |
| --------- | ------------ | ------------------------------ |
| `_Doc/Section` | `Headline/LG` | Headline LG font-family, font-size, font-weight, line-height |
| `_Doc/TokenName` | `Label/LG` | Label LG font-family, font-size, font-weight, line-height |
| `_Doc/Code` | `Label/SM` | Label SM font-family, font-size, font-weight, line-height |
| `_Doc/Caption` | `Body/SM` | Body SM font-family, font-size, font-weight, line-height |

The styles bind to the Typography variables (mode-aware) so theme switches Just Work.

### F2 — `Label/SM`, `Label/MD`, `Label/LG` slot styles already published

`src/core/canvas/data/typography-slots.json` line 28+ defines the slots. The slot-style publisher loop in `publishTypographyStyles.ts` lines 74-87 iterates `listExpectedSlotStyleNames()` and calls `ensureTextStyle` + `applyTypographyVariableBindings` for each (27 total — Label/SM/MD/LG are 3 of those 27).

Verified by repo grep for slot definitions:

```
src/core/canvas/data/typography-slots.json:28:    { "slot": "Label/MD", "fontSize": 12, "fontWeight": 500, "lineHeight": 16 },
```

### F3 — `Label/*/font-family` variables already pushed

`src/core/variables/__fixtures__/bootstrap-complete.v1.json` line 2845:

```
"name": "Label/MD/font-family",
```

Plus lines 2905, 2925, 2945 for `Label/MD/font-size`, `font-weight`, `line-height`. The fixture similarly defines Label/SM/* and Label/LG/* variables across the typography section. Verified by grep at start of this research (lift-map F5).

The 4 properties per slot × 7 slots × 8 Android-curve modes = the full typography slot model from `/skills/labs-design-ops:create-design-system`.

### F4 — All 4 required color tokens are present in `bootstrap-complete.v1.json`

Grepped 2026-05-28:

```
src/core/variables/__fixtures__/bootstrap-complete.v1.json:
      "name": "color/background/content",
      "name": "color/background/content-muted",
      "name": "color/background/variant",
      "name": "color/border/subtle",
```

**OQ-2 in lift-map = RESOLVED.** No fixture-fix WO needed before WO-057.

### F5 — Ticket Requirement 7 — proposed amendment

**Current text (ticket.md row 69):**

> **Design-system bootstrap extension**: extend `src/core/variables/bootstrap*.ts` (or equivalent) to push the Doc text styles — `Doc/Section`, `Doc/TokenName`, `Doc/Code`, `Doc/Caption` — plus `Label/SM`, `Label/MD`, `Label/LG`. These are referenced by §§1–5.

**Amended text (proposed for Step 6 of research):**

> **Design-system bootstrap prerequisite check**: verify that the existing bootstrap (`publishTypographyStyles.ts`) already publishes `_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption` text styles plus the `Label/SM/*`, `Label/MD/*`, `Label/LG/*` font-family / size / weight / line-height variables. The pre-flight audit gate (Requirement 8) catches the missing case; no bootstrap extension is required.

**Acceptance criteria row in ticket.md (line 114) is similarly amended:**

> Design-system bootstrap **continues to publish** `_Doc/Section`, `_Doc/TokenName`, `_Doc/Code`, `_Doc/Caption` text styles plus `Label/SM`, `Label/MD`, `Label/LG` (verified by audit gate — no new bootstrap work).

### F6 — Naming-prefix delta (legacy "Doc/X" vs FigHub "_Doc/X")

Per [`doc-pipeline-lift-map.md`](./doc-pipeline-lift-map.md) F6 + D2: legacy contract names them `Doc/X` (no underscore). FigHub names them `_Doc/X` (underscore prefix to keep them from cluttering the published-style picker for non-doc users).

**Decision (locked, D2 in lift-map):** keep FigHub's `_Doc/*` prefix. Section emitters must resolve via `findTextStyleByName(existing, '_Doc/Section')` (NOT `'Doc/Section'`). The ticket text and `04-doc-pipeline-contract.md` use the unprefixed form for human readability; the code uses the prefixed form to match FigHub's already-published styles.

### F7 — Why the original ticket Requirement 7 over-scoped

The ticket was drafted from the `04-doc-pipeline-contract.md` §11 "every text node assigns `textStyleId` to one of `Doc/Section`, `Doc/TokenName`, `Doc/Code`, `Doc/Caption`" and §13 reference. The drafter assumed FigHub's bootstrap did not yet publish those styles. In fact:

- `publishTypographyStyles.ts` lines 19, 74 were shipped by WO-011 (Sprint 3 primitives + WO-012 typography).
- `bootstrap-complete.v1.json` was regenerated in Sprint 2 to include all slot variables.
- The audit gate ([`audit-gate-spec.md`](./audit-gate-spec.md)) verifies presence at scaffold time — covers the "what if user only ran half of bootstrap" case.

So WO-057's only additions on this axis are:

1. The audit-gate rule that **verifies** the prerequisites exist.
2. Section emitters that **consume** the prerequisites via `findTextStyleByName(_, '_Doc/Section')` etc.

No bootstrap code changes.

## Validated evidence

### Bootstrap publishing code (already shipped)

| File | Lines | Role |
| ---- | ----- | ---- |
| `src/core/canvas/publishTypographyStyles.ts` | 1-112 | Publishes 4 `_Doc/*` + 27 slot styles; binds to Typography variables |
| `src/core/canvas/typographyStyleBinding.ts` | 10-13 | Maps `_Doc/X` → backing slot (`Headline/LG`, `Label/LG`, `Label/SM`, `Body/SM`) |
| `src/core/canvas/data/typography-slots.json` | (whole file) | Slot definitions for all 27 styles |
| `src/core/variables/__fixtures__/bootstrap-complete.v1.json` | 2845+ | Pre-baked Label/MD/* variables (plus Label/SM, Label/LG by analogy) |
| `src/core/bootstrap/runBootstrap.ts` | 1-100 | Bootstrap orchestrator — calls `publishTypographyStyles` after token push |

### Bootstrap audit verification (already shipped)

`src/core/canvas/publishTypographyStyles.ts` lines 115-130 (`verifySlotTextStyles`) returns `{ count, missing }`. The bootstrap orchestrator surfaces missing styles via `bootstrap/progress` → audit panel.

### Color-token presence (verified)

| Token | In fixture? |
| ----- | ----------- |
| `color/background/content` | ✅ |
| `color/background/content-muted` | ✅ |
| `color/background/variant` | ✅ |
| `color/border/subtle` | ✅ |

### Cross-ticket matrix

| Ticket | Bootstrap interface | This WO depends on |
| ------ | ------------------- | ------------------ |
| WO-011 (color primitives) | Pushed primitives + theme color tokens | YES — gate verifies 4 color tokens |
| WO-012 (typography styles) | Published `_Doc/*` + slot styles | YES — gate verifies 4 doc text styles + 3 Label font-family variables |
| WO-013 (layout + effects) | Pushed Layout + Effects variables | NO direct dependency |
| WO-008 (variable push engine) | Push primitive — no direct UI | YES — gate reads from the pushed Theme + Typography collections |

## Decision log

| # | Decision | Rationale |
| --- | -------- | --------- |
| D1 | No new DTCG text-style definitions in WO-057 scope | All 4 Doc styles + 7 Label styles already published by `publishTypographyStyles.ts` |
| D2 | No new fixture entries in `bootstrap-complete.v1.json` | All required color tokens + font-family variables already present |
| D3 | Ticket Requirement 7 is amended (not scope-added) — see F5 | Original wording over-scopes; actual requirement is verification, not publication |
| D4 | Section emitters resolve text styles via `findTextStyleByName(_, '_Doc/Section')` with underscore prefix | FigHub convention (D2 in lift-map) |
| D5 | If a user somehow has `_Doc/Section` but not `_Doc/Caption`, the audit gate flags ALL missing styles in one row | One actionable error per scaffold run |
| D6 | The `verifySlotTextStyles` helper in bootstrap is the model for the new audit gate's presence check | Mirror the pattern for consistency |

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-BOOTSTRAP-1 | Run bootstrap on empty file with `bootstrap-complete` fixture; assert all 4 `_Doc/*` styles + 27 slot styles + 4 required color tokens + 3 Label/*/font-family variables present | All 38 prerequisites confirmed | ☐ pending (build) — covered by SPK-AUDIT-1 in [`audit-gate-spec.md`](./audit-gate-spec.md) |
| SPK-BOOTSTRAP-2 | Manually delete `_Doc/Caption` after bootstrap; trigger scaffold; assert preflight gate fires | Gate fires with single missing-style row | ☐ pending (build) |
| SPK-BOOTSTRAP-3 | Run bootstrap THEN scaffold on Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW`; assert no preflight error | Full 5-section frame produced | ☐ pending (build Phase 2 end) |

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| R1 — Bootstrap publish order changes in a future sprint and breaks the audit gate's presence check | Low | Low | Audit gate is name-based, not order-based; resilient to publish-order changes. |
| R2 — User's Figma file has `_Doc/Section` as a remote-library style instead of a local style | Medium | Low | `getLocalTextStylesAsync()` returns local + remote published in same file; name match works regardless. Watch in VQA. |
| R3 — A user re-renames `_Doc/Section` to `Doc/Section` (no prefix) | Low | Low | Gate fires correctly; user re-publishes via bootstrap. |
| R4 — `Headline/LG` slot doesn't exist (delta with `_Doc/Section`'s backing — typographyStyleBinding.ts line 10) — would break `applyTypographyVariableBindings` silently | Medium | Low | `publishTypographyStyles.ts` line 93 already collects `missing` and surfaces; bootstrap result has the count. WO-057 audit gate adds a redundant check at scaffold time. |
| R5 — `Body/SM` not in `listExpectedSlotStyleNames()` would mean `_Doc/Caption` binding falls back; could cause caption to render wrong fontWeight | Medium | Low | `_Doc/Caption` has DOC_STYLE_TOKEN_PREFIX = `Body/SM` per `typographyStyleBinding.ts:13`; verify `Body/SM` is one of the 27 expected slots (likely YES per typography-slots.json structure). |

## Recommendations

1. **Plan agent:** drop Requirement 7's "extend bootstrap" framing; replace with "verify bootstrap prerequisites" wording per F5.
2. **Plan agent:** the bootstrap-prerequisite audit gate IS the work for Requirement 7 — no separate build step needed for bootstrap.
3. **Build agent:** if Phase 0 SPK-BOOTSTRAP-3 fails because some `_Doc/X` style is missing post-bootstrap, file a bootstrap-fix bug (likely zero-incidence — covered by existing tests).
4. **Step 6 in this skill:** update ticket Requirements 7 and AC line 114 to match F5.

## Open questions

- **OQ-BS-A (RESOLVED)** — Are all 4 required color tokens in `bootstrap-complete.v1.json`? **YES** (F4). OQ-2 in lift-map = RESOLVED.
- **OQ-BS-B (RESOLVED)** — Does WO-057 need new text-style push code? **NO** (F1-F3).
- **OQ-BS-C (RESOLVED)** — Are Doc styles named with underscore prefix? **YES**, `_Doc/X` (D2 in lift-map, F6 here).
- **OQ-BS-D (RESOLVED)** — Does `Body/SM` exist as a slot? **YES** — required by `typographyStyleBinding.ts:13` already; if missing bootstrap would already throw. Confirmed indirectly by ship history (WO-012 green).

## References

- `FigHub/src/core/canvas/publishTypographyStyles.ts` (130 lines) — proves Doc + Label slot styles published.
- `FigHub/src/core/canvas/typographyStyleBinding.ts:10-13` — `DOC_STYLE_TOKEN_PREFIX` mapping.
- `FigHub/src/core/canvas/data/typography-slots.json` — slot definitions.
- `FigHub/src/core/variables/__fixtures__/bootstrap-complete.v1.json:2845+` — Label/MD/* variables.
- `FigHub/src/core/bootstrap/runBootstrap.ts` — bootstrap orchestrator.
- `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md` §11 — text-style assignment rule.
- [`audit-gate-spec.md`](./audit-gate-spec.md) — preflight gate consumes the publish set.
- [`doc-pipeline-lift-map.md`](./doc-pipeline-lift-map.md) F3, F5, F6 — confirms no bootstrap work needed.
- `FigHub/memory.md` 2026-05-28 — Sprint 5 entry on DesignOps parity.
