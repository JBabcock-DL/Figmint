# WO-057 — Section contract trace (`04-doc-pipeline-contract.md` §§1 / 3.2 / 4 / 5 / 6 / 13.1.a verbatim)

> **Status:** Research-complete · 2026-05-28
> **Quality bar:** `.github/templates/research-quality-bar.md`
> **Sibling:** [`doc-pipeline-lift-map.md`](./doc-pipeline-lift-map.md) (file-by-file lift map)

## Summary

The five-section doc pipeline is contract-locked in `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md`. This document extracts the **verbatim emitter spec** for each section, the **canonical shadcn Button spec** for §13.1.a, and the per-cell `applyStateOverride` opacity contract. Every build-agent step in WO-057's plan.md must trace back to a section-emitter row in this trace.

The full doc frame consists of exactly **5 sections in this order** as direct children of `doc/component/{name}`:

```
doc/component/{name}                        VERTICAL · AUTO height · FIXED width 1640 · itemSpacing 48
├── doc/component/{name}/header              Section 1 — title + summary
├── doc/component/{name}/properties          Section 2 — properties table
├── doc/component/{name}/component-set-group Section 3 — live ComponentSet (extended in-place)
├── doc/component/{name}/matrix              Section 4 — Variants × States matrix
└── doc/component/{name}/usage               Section 5 — Do / Don't notes (REPLACES instance gallery)
```

**Validation invariant (`04-doc-pipeline-contract.md` §12 build-order step 8):** `docRoot.children.length === 5`. Anything else is a regression.

## Key findings

### F1 — Section 1: Header (§1 + §6.4)

**Source (verbatim from `cc-doc-page-header.js`):**

```js
const header = figma.createFrame();
header.name = `doc/component/${CONFIG.component}/header`;
header.layoutMode = 'VERTICAL';
header.resize(DOC_FRAME_WIDTH, 1);                   // = resize(1640, 1)
header.primaryAxisSizingMode = 'AUTO';
header.counterAxisSizingMode = 'FIXED';
header.layoutAlign = 'STRETCH';
header.itemSpacing = 12;
header.fills = [];
docRoot.appendChild(header);

const title = makeText(CONFIG.title, 'section', 32);
bindColor(title, 'color/background/content', '#0a0a0a', 'fills');
header.appendChild(title);

const summary = makeText(CONFIG.summary, 'caption', 14);
bindColor(summary, 'color/background/content-muted', '#6b7280', 'fills');
header.appendChild(summary);
```

**Figmint emit (`src/core/canvas/doc/header.ts`):**

| Property | Value | Source |
| -------- | ----- | ------ |
| Frame name | `doc/component/${docKey}/header` | `cc-doc-page-header.js` line 33 |
| `layoutMode` | `VERTICAL` | line 34 |
| Width | 1640 (DOC_FRAME_WIDTH); fixed | line 35-37 |
| Height | AUTO (hugs content) | line 36 |
| `layoutAlign` | `STRETCH` (so it expands to docRoot width) | line 38 |
| `itemSpacing` | 12 | line 39 |
| `fills` | `[]` (no fill) | line 40 |
| **Children** | title (`_Doc/Section`, 32px, color/background/content #0a0a0a) + summary (`_Doc/Caption`, 14px, color/background/content-muted #6b7280) | lines 43-49 |

**Title source:** `CONFIG.title` — for shadcn Button = `"Button"`.

**Summary source:** `CONFIG.summary` — for shadcn Button = `"Trigger an action or navigate. Follows shadcn/ui defaults."` (per §13 line 365).

**Optional:** §1 mentions a 1px solid divider under the summary; `cc-doc-page-header.js` does NOT emit one. Decision: **omit divider** — match the legacy emitter as the canonical source, not the prose. Designer can re-request in VQA if desired.

### F2 — Section 2: Properties table (§4 + §3.2 + §6.6)

**Spec (verbatim from `04-doc-pipeline-contract.md` §4):**

| Col | Header | Width | Cell pattern |
| --- | ------ | ----- | ------------ |
| 1 | `PROPERTY` | 240 | `_Doc/TokenName` — e.g. `variant`, `size`, `disabled`, `asChild` |
| 2 | `TYPE` | 380 | `_Doc/Code` — TypeScript-style union or `boolean` |
| 3 | `DEFAULT` | 160 | `_Doc/Code` — default value in quotes, or `—` if none |
| 4 | `REQUIRED` | 120 | `_Doc/Caption` — `yes` / `no` |
| 5 | `DESCRIPTION` | 740 | `_Doc/Caption` — one sentence |

**Sum: 240 + 380 + 160 + 120 + 740 = 1640.**

**Header chrome:** header row uses uppercase ASCII (`PROPERTY`, `TYPE`, `DEFAULT`, `REQUIRED`, `DESCRIPTION`) bound to `color/background/variant` fill. From §3.1.3:

> **Mixed-case column headers — Builder rewrote the header row. Restore `buildPropertiesTable` from `draw-engine.figma.js §6.6` verbatim — uppercase is non-negotiable.**

**Row chrome (verbatim from `cc-doc-fill-props.js` self-healing rebuild lines 17-50):**

```js
const COLS = [240, 380, 160, 120, 740];
const row = figma.createFrame();
row.name = `row/placeholder-${addIdx}`;
row.layoutMode = 'HORIZONTAL';
row.primaryAxisSizingMode = 'FIXED';
row.counterAxisSizingMode = 'AUTO';
row.resize(1640, 64);                  // minHeight 64 per §4
row.counterAxisAlignItems = 'CENTER';
row.paddingTop = 16;
row.paddingBottom = 16;
if (addIdx < want - 1) {                                   // bottom stroke on non-last rows
  row.strokeWeight = 1;
  row.strokeBottomWeight = 1;
  row.strokeTopWeight = row.strokeLeftWeight = row.strokeRightWeight = 0;
  bindColor(row, 'color/border/subtle', '#e4e4e7', 'strokes');
}
for (const w of COLS) {
  const cell = figma.createFrame();
  cell.name = 'cell';
  cell.layoutMode = 'VERTICAL';
  cell.primaryAxisSizingMode = 'AUTO';
  cell.counterAxisSizingMode = 'FIXED';
  cell.resize(w, 64);
  cell.paddingLeft = cell.paddingRight = 20;
  cell.paddingTop = cell.paddingBottom = 4;
  const t = figma.createText();
  t.characters = '—';
  t.resize(w - 40, 1);
  t.textAutoResize = 'HEIGHT';
  cell.appendChild(t);
  row.appendChild(cell);
}
```

**Figmint emit (`src/core/canvas/doc/propertiesTable.ts`):** wrap table in `doc/table-group/${docKey}/properties` (per §4 last paragraph). Inner table = `doc/table/${docKey}/properties`. Header row + N body rows. Apply text-style id post-creation: `cell.children[0].textStyleId = resolveDocStyles().tokenName.id` (or code/caption per column).

**Row ordering (per §4 "Property row ordering"):**

1. Core variant props in declaration order (e.g. `variant`, `size`).
2. State props (`disabled`, `checked`, `selected`, `pressed`, `open`).
3. Content props (`children`, `label`, `placeholder`).
4. Accessibility / ARIA props (`aria-label`, `role`) if documented.
5. Escape-hatch props last (`className`, `asChild`, `...props`).

**Button row data (verbatim from §13 lines 367-373):**

| variant | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | no | Visual style. |
| size | `"default" \| "sm" \| "lg" \| "icon"` | `"default"` | no | Overall height + padding preset. |
| disabled | `boolean` | `false` | no | Disables pointer + keyboard interaction; visual dim applied. |
| asChild | `boolean` | `false` | no | Renders the styled classes onto the immediate child via Radix Slot. |
| type | `"button" \| "submit" \| "reset"` | `"button"` | no | Native HTML type. |
| className | `string` | `—` | no | Tailwind class escape hatch. |

### F3 — Section 3: Component Set section (§3.2)

**Spec (verbatim from `04-doc-pipeline-contract.md` §3.2):**

```
doc/component/{name}/component-set-group       VERTICAL auto-layout, width 1640
├── title              "Component"              _Doc/Section, 24
├── caption            "Live ComponentSet — edit here, matrix updates."  _Doc/Caption, 13
└── [ComponentSetNode] — reparented from the page, configured as a grid
```

**ComponentSet auto-layout (the WRAP grid):**

| Property | Value | Reason |
| -------- | ----- | ------ |
| `layoutMode` | `HORIZONTAL` | variants left-to-right |
| `layoutWrap` | `WRAP` | wraps on width exhaustion |
| `resize(1640, 1)` → then `primaryAxisSizingMode = FIXED`, `counterAxisSizingMode = AUTO` | — | fixed width triggers wrap; height grows |
| `paddingTop/Bottom/Left/Right` | 32 | breathing room |
| `itemSpacing` | 24 | gap between variants in row |
| `counterAxisSpacing` | 24 | gap between wrapped rows |
| `fills` | bound `color/background/variant` (fallback `#fafafa`) | subtle bg |
| `strokes` | bound `color/border/subtle` (fallback `#e5e7eb`) | frame outline |
| `strokeWeight` | 1 | — |
| `dashPattern` | `[6, 4]` | dashed = editable source |
| `cornerRadius` | 16 | match doc containers |

**Critical:** Per §3.2 "Do not set `x`/`y` on the ComponentSet after reparenting — the parent's auto-layout owns position."

**Title:** "Component" (not "Variants" as the ticket suggests; align to §3.2 prose). The title is `_Doc/Section` at 24px.

**Caption:** "Live ComponentSet — edit here, matrix updates." (verbatim from §3.2). `_Doc/Caption` at 13px.

**Figmint extension (`src/core/canvas/doc/setGroup.ts`):** Wrap existing `ensureComponentSetGroup` to add:

1. After group creation, append title + caption + the reparented ComponentSet (in that order).
2. After ComponentSet is reparented (the existing `group.insertChild(0, componentSet)` becomes `group.appendChild(componentSet)` since title + caption come first).
3. Apply WRAP grid auto-layout config to the ComponentSet (NOT the group frame).
4. Apply dashed stroke + 16-corner-radius + `color/background/variant` fill + 32-padding + 24-itemSpacing + 24-counterAxisSpacing to the **ComponentSet** (not group).

### F4 — Section 4: Matrix specimen (§5 + §11)

**Spec (verbatim from `04-doc-pipeline-contract.md` §5):**

```
doc/component/{name}/matrix                          VERTICAL · AUTO · STRETCH · width 1640 · stroke 1 color/border/subtle dashed · cornerRadius 16 · padding 0
├── matrix/header-groups                             HORIZONTAL · FIXED height 44 · width 1640 · bottom 1px stroke color/border/subtle
│   ├── matrix/header-groups/gutter                  FIXED width 220 · (empty spacer)
│   ├── matrix/header-groups/cell/default            _Doc/Caption uppercase "DEFAULT" · spans N-1 state columns
│   └── matrix/header-groups/cell/disabled           _Doc/Caption uppercase "DISABLED" · spans 1 state column
├── matrix/header-states                             HORIZONTAL · FIXED height 40 · bottom 1px stroke color/border/subtle
│   ├── matrix/header-states/gutter                  FIXED width 220
│   └── matrix/header-states/cell/{state}            FIXED width (§5.3) · _Doc/Caption "default" / "hover" / "pressed" / "disabled"
└── matrix/size-group/{size}                         HORIZONTAL · AUTO height · STRETCH (one block per size)
    ├── matrix/size-group/{size}/label               FIXED width 60 · VERTICAL · centered · _Doc/TokenName "Small" + 1px right edge stroke color/border/subtle
    └── matrix/size-group/{size}/rows                VERTICAL · AUTO · STRETCH
        └── matrix/size-group/{size}/row/{variant}   HORIZONTAL · AUTO height · minHeight 72 · bottom 1px stroke color/border/subtle (omit on last row of last size group)
            ├── matrix/.../row/{variant}/label       FIXED width 160 · VERTICAL · Hug height · minHeight 72 · layoutAlign STRETCH (in row) · _Doc/Caption "Primary"
            └── matrix/.../row/{variant}/cell/{state} FIXED width (§5.3) · HORIZONTAL · primary FIXED · counter AUTO (Hug) · minHeight 72 · center + center · paddingH/V 16 · appendChild(instance)
```

**Lift source — `cc-doc-matrix-only.js` lines 1-148** is the canonical port target. It uses `matrix-group` as the section frame name (NOT `matrix`); the inner matrix is `matrix`. The section frame name to keep for §12 "docRoot.children.length === 5" assertion is `doc/component/${docKey}/matrix-group`.

**Column widths (§5.3):**

| States visible | State cell width |
| -------------: | ---------------: |
| 6 | ~236 |
| 5 | 284 |
| 4 | 355 |
| 3 | ~473 |
| 2 | 710 |
| 1 | 1420 |

For shadcn Button (4 states: default/hover/pressed/disabled), cell width = (1640 − 60 − 160) / 4 = (1420)/4 = **355**.

**Header rows (§5.1):**

- DEFAULT group spans 3 state columns (default, hover, pressed).
- DISABLED group spans 1 state column.

**Size-label column (§5.2):** 60px wide; vertically centered; `_Doc/TokenName` text; 1px right-edge stroke (the "bracket").

**Variant-label column:** 160px wide; left of state cells; `_Doc/Caption` text.

**Cells:** HORIZONTAL frame, FIXED width (`cellW = 355` for Button), `counterAxisSizingMode = AUTO` (Hug height), `minHeight = 72`, padding H/V = 16, child = ONE instance from `componentSet`, `applyStateOverride(instance, stateKey)`.

**Per-cell instance creation** (verbatim from `cc-doc-matrix-only.js` lines 137-143):

```js
const componentNode = variantByKey[key];  // key = "size=sm, variant=default" or hasSizeAxis ? `${variant}|${size}` : variant
if (componentNode) {
  const instance = componentNode.createInstance();
  if (typeof CONFIG.applyStateOverride === 'function') {
    CONFIG.applyStateOverride(instance, st.key, { variant, size, componentNode });
  }
  cell.appendChild(instance);
}
```

**Figmint variant key format:** WO-022's `formatVariantName(combo)` produces sorted `key=value` joined by `, ` (e.g. `"size=sm, variant=default"`). The matrix emitter must use the same key shape for `variantByKey` lookup — already returned by `scaffold()`.

**Critical (§5.4):** Instance is **not resized** (it hugs its own auto-layout). Cell counterAxis is AUTO (Hug height), primaryAxis is FIXED at column width.

**Last-row stroke (lines 105-113):** drop the bottom-stroke on the last variant row of the last size group (one less border). Use `isLastVariantRow = (si === groupList.length - 1) && (vi === variants.length - 1)`.

### F5 — Section 5: Do / Don't usage notes (§6)

**Spec (verbatim from `04-doc-pipeline-contract.md` §6):**

```
doc/component/{name}/usage                           HORIZONTAL · primary AUTO · counter AUTO · STRETCH · itemSpacing 30
├── usage/do                                         VERTICAL · width 805 · padding 28 · fill color/background/variant · cornerRadius 16
│   ├── title   _Doc/TokenName "Do"  with a leading "✓ " glyph
│   └── bullets VERTICAL · itemSpacing 12 · each: TEXT _Doc/Caption with leading "· " bullet
└── usage/dont                                       VERTICAL · width 805 · padding 28 · fill color/background/variant · cornerRadius 16
    ├── title   _Doc/TokenName "Don't" with leading "✕ "
    └── bullets — same as Do
```

**Lift source — `cc-doc-usage-only.js` lines 1-38** is the canonical port (38 lines, port verbatim):

```js
function buildUsageNotes() {
  const row = makeFrame(`doc/component/${CONFIG.component}/usage`, {
    layoutMode: 'HORIZONTAL', primary: 'AUTO', counter: 'AUTO', width: 1640,
    itemSpacing: 30, align: 'STRETCH',
  });
  row.layoutSizingHorizontal = 'FIXED';   // critical — usage parent is HORIZONTAL so counter axis = vertical
  row.layoutSizingVertical = 'HUG';        // critical — §6 last paragraph
  function card(titleText, glyph, bullets) {
    const c = makeFrame(`usage/${titleText.toLowerCase().replace(/[^a-z]/g, '')}`, {
      layoutMode: 'VERTICAL', primary: 'AUTO', counter: 'FIXED', width: 805,
      padL: 28, padR: 28, padT: 28, padB: 28, itemSpacing: 16,
      fillVar: 'color/background/variant', fillHex: '#f4f4f5', radius: 16,
    });
    c.appendChild(makeText(`${glyph}  ${titleText}`, 'tokenName', 18, 'color/background/content'));
    const list = makeFrame('bullets', {
      layoutMode: 'VERTICAL', primary: 'AUTO', counter: 'FIXED', width: 805 - 56,
      itemSpacing: 12, align: 'STRETCH',
    });
    c.appendChild(list);
    for (const b of bullets) {
      const bt = makeText(`·  ${b}`, 'caption', 13, 'color/background/content');
      bt.resize(805 - 56, 1); bt.textAutoResize = 'HEIGHT';
      list.appendChild(bt);
    }
    return c;
  }
  row.appendChild(card('Do',    '✓', CONFIG.usageDo));
  row.appendChild(card("Don't", '✕', CONFIG.usageDont));
  return row;
}
```

**Minimum content per §6:** 3 "Do" bullets + 3 "Don't" bullets. If absent in spec, render placeholder bullets (DO NOT skip).

**Width math:** Each card = `(1640 − 30 itemSpacing) / 2 ≈ 805`. Cards have padding 28.

**Critical (§6 last paragraph and `03-auto-layout-invariants.md` §10.2):** Parent is HORIZONTAL so counter axis is vertical. Must explicitly set `counterAxisSizingMode = 'AUTO'` after resize (and `layoutSizingVertical = 'HUG'`) to avoid 1px-tall collapse. This is what BUG-S5-001 was — the existing `usageFrame.ts` already handles it via `reassertDocSectionStretch`.

**Button bullet content (from spec or default — per §13 line 375):** "pulled from shadcn button guidance". Suggested defaults if `CONFIG.usageDo` / `usageDont` are absent on the spec:

- Do: "Use `default` variant for primary actions.", "Use `outline` or `ghost` for secondary actions.", "Combine with leading icons for clarity."
- Don't: "Don't use `link` variant for destructive actions.", "Don't stack more than 3 buttons in a row.", "Don't override the focus ring."

### F6 — Section 13.1.a: shadcn Button spec (verbatim) — REPLACES current canonical fixture

**Spec (from `04-doc-pipeline-contract.md` §13):**

| Variant axis | Values |
| ------------ | ------ |
| `variant` | `default` · `destructive` · `outline` · `secondary` · `ghost` · `link` (6 values) |
| `size` | `sm` · `default` · `lg` · `icon` (4 values) |

**Total variants:** 6 × 4 = **24 ComponentNode masters** in the ComponentSet.

**State is NOT a variant (§13.1).** State (`hover`, `pressed`, `disabled`) is applied per-cell at matrix render time via `applyStateOverride`. The Button ComponentSet has exactly 2 variant properties (`variant`, `size`) and 0 state property.

**Per-cell opacity overlay (verbatim from §13.1.a):**

```js
applyStateOverride: (instance, stateKey) => {
  if (stateKey === 'hover')    instance.opacity = 0.92;
  if (stateKey === 'pressed')  instance.opacity = 0.85;
  if (stateKey === 'disabled') instance.opacity = 0.5;
},
```

> **Important:** ticket.md row 5 says `0.9 / 0.8 / 0.5`. The §13.1.a contract says `0.92 / 0.85 / 0.5`. **§13.1.a is the contract — opacities are 0.92 / 0.85 / 0.5.** Update ticket Requirements when refining (Step 6 below).

**Why opacity (verbatim §13.1.a "Why opacity"):**

- Deterministic across every variant — no per-variant `color/{variant}/hover` token lookup.
- One number per state.
- Survives theme swaps.
- Matches the audit checklist in `06-audit-checklist.md`.

**§13.1.c — Per-state bound tokens:** if a design system author has published `color/primary/hover`, `color/primary/pressed`, etc. as Theme variables, they are still exposed for manual use — but they are NOT consumed by `applyStateOverride` in the default pipeline.

**Component properties (per §13 line 373):** The ComponentSet exposes 3 element properties:

- `Label` — TEXT, default `"Button"`.
- `Leading icon` — BOOLEAN, default on.
- `Trailing icon` — BOOLEAN, default off.

WO-024 already adds these via `applyProperties.ts`; matrix emitter doesn't add them — it reads them from the set.

### F7 — Frame name + child-count invariants (§12 step 8)

**Critical invariant from `04-doc-pipeline-contract.md` §12 step 8:**

```
Validate: docRoot.children.length === 5,
          compSet.parent !== figma.currentPage,
          pageContent.height > 500.
```

**Five children of `docRoot` (in order):**

1. `doc/component/${docKey}/header`
2. `doc/component/${docKey}/properties` (or `doc/table-group/${docKey}/properties` if wrapped per §4)
3. `doc/component/${docKey}/component-set-group`
4. `doc/component/${docKey}/matrix-group` (or `/matrix` — `cc-doc-matrix-only.js` uses `matrix-group`)
5. `doc/component/${docKey}/usage`

**Audit row:** `doc-pipeline/section-count` — assert `docRoot.children.length === 5`. Add to the new doc-pipeline audit rule set (next to the preflight gate — see [`audit-gate-spec.md`](./audit-gate-spec.md)).

## Validated evidence

### Verbatim contract sections (with file:line citations)

| Section | File | Lines | Status |
| ------- | ---- | ----- | ------ |
| §1 — Matrix is mandatory; 5-section frame | `04-doc-pipeline-contract.md` | 7-22 | ✅ extracted |
| §2 — Page layout (1800/1640 widths) | `04-doc-pipeline-contract.md` | 26-39 | ✅ extracted (consumed by `_PageContent` + `docRoot` create) |
| §3 — ComponentSet lives in doc frame | `04-doc-pipeline-contract.md` | 76-87 | ✅ extracted |
| §3.2 — Component Set section layout | `04-doc-pipeline-contract.md` | 90-116 | ✅ extracted (F3) |
| §4 — Properties table | `04-doc-pipeline-contract.md` | 144-168 | ✅ extracted (F2) |
| §5 — Variant × State matrix | `04-doc-pipeline-contract.md` | 172-232 | ✅ extracted (F4) |
| §6 — Usage notes | `04-doc-pipeline-contract.md` | 236-254 | ✅ extracted (F5) |
| §11 — Token bindings for chrome | `04-doc-pipeline-contract.md` | 318-335 | ✅ extracted |
| §12 — Build order | `04-doc-pipeline-contract.md` | 339-355 | ✅ extracted |
| §13.1.a — Opacity authoritative | `04-doc-pipeline-contract.md` | 379-401 | ✅ extracted (F6) |

### Matrix dimensions for shadcn Button

| Axis | Count | Cells |
| ---- | ----- | ----- |
| Variants (rows) | 6 (default, destructive, outline, secondary, ghost, link) | — |
| Sizes (row blocks) | 4 (sm, default, lg, icon) | — |
| States (columns) | 4 (default, hover, pressed, disabled) | — |
| **Total cells** | 6 × 4 × 4 = **96 instances** | — |
| **Component masters (in ComponentSet)** | 6 × 4 = **24** | — |

**Cell width:** (1640 − 60 size-label − 160 variant-label) / 4 states = **355px** each.

### Token chrome bindings (§11)

| Element | Variable | Theme |
| ------- | -------- | ----- |
| Outer dashed stroke | `color/border/subtle` | Light |
| Header rows bottom stroke | `color/border/subtle` | Light |
| Header group text (DEFAULT/DISABLED) | `color/background/content-muted` | Light |
| State header text | `color/background/content-muted` | Light |
| Size label text | `color/background/content` | Light |
| Variant row label text | `color/background/content-muted` | Light |
| Size-label column right stroke | `color/border/subtle` | Light |
| Variant row bottom stroke | `color/border/subtle` | Light |
| Usage card fill | `color/background/variant` | Light |
| Usage card text | `color/background/content` | Light |
| ComponentSet group fill (§3.2) | `color/background/variant` | Light |
| ComponentSet group stroke (§3.2) | `color/border/subtle` | Light |

**4 distinct color tokens** total: `color/border/subtle`, `color/background/variant`, `color/background/content`, `color/background/content-muted`. These are the 4 the audit gate must check for — see [`audit-gate-spec.md`](./audit-gate-spec.md).

### Cross-ticket matrix

| Ticket | Interface | This ticket consumes |
| ------ | --------- | -------------------- |
| WO-022 | `componentSet` + `variantByKey` shape (sorted `key=value` joined by `, `) | matrix cell lookup |
| WO-023 | `applyBindings` runs before pipeline — variants ship with bound paints | matrix cells inherit |
| WO-024 | `applyProperties` adds `Label` / `Leading icon` / `Trailing icon` element props to ComponentSet | set-group renders props |
| WO-025 | `buildUsageFrame` (replaced) | §5 replaces §5; existing audit rule names retired |
| WO-026 | `registry` upserts by `spec.name` | unchanged |
| WO-027 | UI orchestrator + preview render | preview now must handle 5 sections (currently 2) |

## Decision log

| # | Decision | Rationale |
| --- | -------- | --------- |
| D1 | Section frame name for Section 4 = `doc/component/${docKey}/matrix-group` (matches `cc-doc-matrix-only.js` line 13) | Keep parity with legacy; the inner `matrix` (line 21) is a child of `matrix-group` |
| D2 | Use `0.92 / 0.85 / 0.5` (per §13.1.a verbatim) for hover/pressed/disabled opacity — NOT `0.9 / 0.8 / 0.5` (ticket draft) | §13.1.a is the contract; ticket text must be amended in Step 6 |
| D3 | Section 3 title text = "Component" (not "Variants" as ticket draft suggests) | Per §3.2 verbatim |
| D4 | Section 3 caption text = "Live ComponentSet — edit here, matrix updates." | Per §3.2 verbatim |
| D5 | Section 1 emits title + summary; no horizontal divider | `cc-doc-page-header.js` does not emit one; defer divider to designer VQA request |
| D6 | Section 2 wrapper frame is `doc/table-group/${docKey}/properties`; inner table is `doc/table/${docKey}/properties` | Match style-guide convention per §4 last paragraph |
| D7 | Section 4 cells use FIXED-width column (355 for Button) + AUTO-height Hug | Per §5.4 verbatim — instance not resized |
| D8 | Section 5 row is HORIZONTAL with `counterAxisSizingMode = AUTO` after resize | Per §6 last paragraph + `03-auto-layout-invariants.md` §10.2 (avoids 1px-tall collapse — BUG-S5-001) |
| D9 | docRoot children must equal exactly 5 in order — enforce in `doc-pipeline/section-count` audit row | Per §12 step 8 verbatim |
| D10 | Per-cell opacity override is wired via a function parameter `applyStateOverride` injected at orchestrator scope, not inlined in spec JSON | shadcn states aren't a Figma variant property; opacity is the deterministic path per §13.1.a |
| D11 | Replace `_Doc/Section` 32px in header (per `cc-doc-page-header.js` line 43 "section, 32") with the published `_Doc/Section` style id — DO NOT inline fontSize | Per §11 last paragraph "Never set raw `fontName` / `fontSize` on matrix chrome" |
| D12 | When ticket Requirement text + section contract disagree (e.g. opacity values, title strings), **§04-doc-pipeline-contract.md wins** | Per `Docs/lift-sources.md` §0 drift rule |
| D13 | Drop the `sizes ?? []` fallback from `cc-doc-matrix-only.js` line 4 — shadcn Button always has 4 sizes | Simplifies code path; no-size-axis case is out of scope for this WO (Button verbatim only) |

## Pre-plan spikes

Not required for this trace — every section emitter spec is documented verbatim with file:line citations. Spikes live in [`doc-pipeline-lift-map.md`](./doc-pipeline-lift-map.md).

## Risk register

| Risk | Severity | Likelihood | Mitigation |
| ---- | -------- | ---------- | ---------- |
| R1 — Existing `_Doc/Section` 32px size (header) may not match the published style fontSize (likely 28px or 24px) | Medium | High | Apply `textStyleId` from `_Doc/Section` and let the published style win; ignore the 32px hint in legacy code (it's pre-style-id). |
| R2 — `cc-doc-matrix-only.js` `cellW` formula uses integer floor — at 4 states cellW=355 exactly; at 6 states cellW=236 with 4px remainder lost | Low | Low | Document the rounding; visually negligible. |
| R3 — `applyStateOverride` opacity 0.92/0.85 may render the "default" column at full opacity 1.0 — must default unconditionally | Low | Low | Emitter sets `instance.opacity = 1` before checking state, then overrides for hover/pressed/disabled. |
| R4 — Section 5 horizontal sizing rule (§6 last paragraph) is the same trap that produced BUG-S5-001 — must verify after each appendChild | Medium | Medium | Reuse `reassertDocSectionStretch` from existing `usageFrame.ts`; new emitter calls it after every appendChild. |
| R5 — Section 2 (properties) for shadcn Button has 6 rows × 5 cols = 30 text nodes; pre-loading text styles must happen before any `t.characters = ...` | Low | Low | Orchestrator awaits `figma.getLocalTextStylesAsync()` once at top before any emitter runs. |
| R6 — Section 4 matrix renders 96 instances — `createInstance` cost may stack on Pro/Org tier | Low | Low | WO-005 spike measured `createInstance` ≈ 0.5ms; 96 × 0.5 ≈ 50ms. Well under any budget. |

## Recommendations

1. **Plan must include AC traceability table** — one row per AC in ticket.md, citing this trace's F1-F7 + decision-log row.
2. **Plan must update opacities** in the Build steps from 0.9/0.8/0.5 to **0.92/0.85/0.5** per D2.
3. **Plan must update Section 3 title/caption** to "Component" + "Live ComponentSet — edit here, matrix updates." per D3/D4.
4. **Plan must reference `doc/component/${docKey}/matrix-group`** (not `matrix`) per D1.
5. **Build agent must read this trace** in addition to plan.md before implementing each section; section-by-section file:line citations are here, not in plan.md.
6. **Build agent must read `cc-doc-matrix-only.js` verbatim** (148 lines) before implementing Section 4 — the matrix is the densest emitter.

## Open questions

- **OQ-A (BLOCKS DESIGN VQA)** — Section 1 horizontal divider: legacy emitter (`cc-doc-page-header.js`) omits it; §1 prose mentions it. Decision: omit (D5). Designer may request in VQA. Owner: design reviewer.
- **OQ-B (RESOLVED)** — opacity values 0.9/0.8/0.5 vs 0.92/0.85/0.5? **§13.1.a wins → 0.92/0.85/0.5** (D2).
- **OQ-C (RESOLVED)** — Section 3 title "Variants" or "Component"? **"Component" per §3.2** (D3).
- **OQ-D (RESOLVED)** — Section 4 frame name `matrix` or `matrix-group`? **`matrix-group` (the wrapper) + `matrix` (the inner frame); both exist per `cc-doc-matrix-only.js`** (D1).

## References

- `DesignOps-plugin/skills/create-component/conventions/04-doc-pipeline-contract.md` (retrieved 2026-05-28) — primary contract.
- `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-page-header.js` (50 lines) — Section 1 lift source.
- `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-fill-props.js` (66 lines) — Section 2 self-heal logic.
- `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-matrix-only.js` (148 lines) — Section 4 lift source.
- `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-usage-only.js` (38 lines) — Section 5 lift source.
- `DesignOps-plugin/skills/create-component/canvas-templates/cc-doc-constants.js` (3 lines) — DOC_FRAME_WIDTH + gutter constants.
- `DesignOps-plugin/skills/create-component/conventions/03-auto-layout-invariants.md` §10.1, §10.2 — resize ordering rules.
- [`doc-pipeline-lift-map.md`](./doc-pipeline-lift-map.md) — file-by-file lift map + helpers inventory.
