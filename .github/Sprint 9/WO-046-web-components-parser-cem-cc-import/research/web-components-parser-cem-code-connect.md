# Web Components parser + CEM + Code Connect (WO-046)

> **Status:** ✅ Research expanded for `/plan` (2026-05-30)
> **PRD:** §12 Phase 4b, §6.3 FR-IMP-*, §6.7 FR-CC-*
> **Dependencies:** WO-039, WO-040, WO-041, WO-042 (Sprint 8 — Completed)

---

## Summary

WO-046 adds **Web Components** import support by reading the **Custom Elements Manifest (CEM)** — typically `custom-elements.json` at schema version **2.1.0** — and mapping declared custom elements to `ComponentSpecV1`. A fallback scanner detects **`customElements.define('tag', Class)`** in source when no manifest is present (best-effort, not a substitute for CEM). Code Connect stubs use the **HTML parser** with the element's **tag name** as the example root.

**Locked recommendation:** Primary path = load CEM JSON from repo (discovered via `package.json` `"customElements"` field or conventional paths), select module by source path or tag name, map **attributes + reflected properties** to spec props, **events** to optional metadata (not variant axes). Secondary path = regex/TS scan for `customElements.define`. Register `WebComponentsImportTemplate` + `WCMappingTemplate`; enable **`wc`** in framework picker.

**Out of scope:** auto-generating CEM (`@custom-elements-manifest/analyzer` integration), Lit-specific decorators beyond what CEM captures, native mobile parsers.

---

## Requirement traceability

| Req / AC | Research finding | Plan target |
| -------- | ---------------- | ----------- |
| R1 `templates/webcomponents.ts` | CEM-driven ImportTemplate | `WebComponentsImportTemplate` |
| R2 `codeconnect/templates/webcomponents.ts` | HTML `<tag-name>` example | `WCMappingTemplate` |
| R3 CEM read + define fallback | Discovery order locked below | `loadCemManifest.ts`, `scanCustomElementsDefine.ts` |
| R4 Framework picker WC enabled | Same as WO-045 picker change | `FrameworkPicker.tsx` |
| AC Lit + CEM → spec | Fixture pair | `tests/fixtures/wc/` |
| AC WC stub validates | SPK-046-2 | `DsButton.figma.ts` |
| AC E2E import + CC PR | Reuse emit path | Integration test |

---

## Key findings

### 1. Repo inventory — exists today

| Path | Role |
| ---- | ---- |
| `src/core/import/shared/importSourceExtensions.ts` | `wc: ['.ts', '.tsx']` already defined |
| `src/core/import/registry.ts` | Returns null for `wc` |
| `src/core/codeconnect/registry.ts` | Returns null for `wc` |
| `src/core/import/shared/tsAst.ts` | Reuse for define-fallback class scan |
| `src/core/import/shared/dependencyScanner.ts` | Import graph for Lit `@lit/` packages |
| `packages/contracts/src/componentSpec.v1.ts` | `framework: 'wc'` already in union |

### 2. Greenfield modules

| Path | Role |
| ---- | ---- |
| `src/core/import/templates/webcomponents.ts` | ImportTemplate entry |
| `src/core/import/templates/webcomponents/parseWebComponent.ts` | Orchestrator |
| `src/core/import/templates/webcomponents/loadCemManifest.ts` | Fetch + parse CEM JSON |
| `src/core/import/templates/webcomponents/findCustomElementInCem.ts` | Match tag/class to module |
| `src/core/import/templates/webcomponents/cemToComponentSpec.ts` | CEM → spec mapper |
| `src/core/import/templates/webcomponents/scanCustomElementsDefine.ts` | Fallback when no CEM |
| `src/core/codeconnect/templates/webcomponents.ts` | HTML stub generator |
| `tests/fixtures/wc/custom-elements.json` | CEM 2.1.0 fixture |
| `tests/fixtures/wc/ds-button.ts` | Lit-style sample source |

### 3. CEM discovery order (locked)

| Priority | Path | Notes |
| -------- | ---- | ----- |
| 1 | Path from repo `package.json` `"customElements"` field | Standard CEM discovery |
| 2 | `custom-elements.json` (repo root) | Convention |
| 3 | `dist/custom-elements.json` | Post-build output |
| 4 | `**/custom-elements.manifest.json` | Alternate naming |

**Fetch:** reuse GitHub blob load from import UI context — pass manifest text into parse context as optional `cemManifestText` on extended `ImportTemplateContext` (plan must add optional field to avoid breaking React).

**Ticket constraint:** auto-generating missing CEM is **out of scope** — if no manifest and define-scan fails, return error issue `cem-not-found`.

### 4. CEM schema 2.1.0 (validated)

Source: https://github.com/webcomponents/custom-elements-manifest — schema version **2.1.0** (2024-05-06). Retrieved 2026-05-30.

Minimal module shape:

```json
{
  "schemaVersion": "2.1.0",
  "modules": [
    {
      "kind": "javascript-module",
      "path": "src/ds-button.ts",
      "declarations": [
        {
          "kind": "class",
          "customElement": true,
          "name": "DsButton",
          "tagName": "ds-button",
          "attributes": [
            { "name": "variant", "type": { "text": "string" }, "default": "default" },
            { "name": "disabled", "type": { "text": "boolean" } }
          ],
          "members": [
            { "kind": "field", "name": "size", "type": { "text": "string" } }
          ],
          "cssProperties": [
            { "name": "--ds-button-bg", "description": "Background token" }
          ]
        }
      ],
      "exports": [
        {
          "kind": "custom-element-definition",
          "name": "ds-button",
          "declaration": { "name": "DsButton", "module": "src/ds-button.ts" }
        }
      ]
    }
  ]
}
```

### 5. CEM → ComponentSpecV1 mapping

| CEM field | Spec field | Rule |
| --------- | ---------- | ---- |
| `tagName` / export name | `name` | PascalCase display name from class `name` |
| `attributes[]` | `props[]` | `type.text` → spec prop type mapper |
| `members[]` (fields) | `props[]` | Skip private `#` fields |
| Boolean attribute | prop `type: 'boolean'` | `reflects: true` → default handling |
| Enum-like string attrs | `variantMatrix` | If attr name matches variant axis (`variant`, `size`) |
| `cssProperties[]` | `bindings[]` | Map `--token-name` via WO-047 web resolver; MVP: store unresolved + warning |
| `slots[]` | `subComponents` / layout hints | Optional metadata in `confidence.unresolved` |
| `events[]` | not in spec MVP | Listed in parse `issues` as info |

**Framework field:** always `framework: 'wc'`.

### 6. Fallback — `customElements.define` scan

When CEM missing, scan source file with regex + TS AST:

```typescript
// Patterns
customElements.define('ds-button', DsButton);
window.customElements.define("ds-alert", Alert);
```

Extract tag name + class name; infer props from **class body static properties** or `@property` decorators if present (Lit). **Lower confidence** — set `confidence.bindings: 'low'`.

### 7. Code Connect stub (HTML / Web Components)

Per Figma docs — Web Components example uses custom element tag in `html` template:

```typescript
import figma, { html } from '@figma/code-connect/html';

figma.connect('https://www.figma.com/design/…?node-id=…', {
  props: {
    label: figma.string('Label'),
    disabled: figma.boolean('Disabled'),
    variant: figma.enum('Variant', { Default: 'default', Destructive: 'destructive' }),
  },
  example: (props) => html`
    <ds-button
      variant=${props.variant}
      disabled=${props.disabled}
    >
      ${props.label}
    </ds-button>`,
  imports: ["import '@my-ds/button/ds-button.js'"],
});
```

**Lit note:** escape `$` in template literals per Figma Lit example — use `\${` when rendering literal `$` in attributes.

**Stub path:** `{specsPath}/{kebab-key}/DsButton.figma.ts` via extended `resolveStubPath`.

### 8. Bindings and Shadow DOM CSS

CEM `cssProperties` documents design tokens on `:host`. Full **`var(--*)` resolution inside shadow stylesheets** is **WO-047** — WO-046 MVP:

- Map CEM `cssProperties[].name` to bindings when manual resolver map provides `--ds-*` → variable path
- Parse `:host { background: var(--color-primary); }` from source file stylesheet if inline (optional enhancement)

**Class-based tokens:** uncommon in WC — prefer CSS custom properties.

### 9. Import context extension

```typescript
export interface ImportTemplateContext {
  // existing…
  /** Parsed CEM JSON text when importing WC from connected repo */
  cemManifestText?: string;
  /** Repo-relative path to CEM file (for issues) */
  cemManifestPath?: string;
}
```

UI import flow: when framework is `wc`, fetch CEM once per repo session before parse exec.

---

## Validated evidence

### Cross-ticket matrix

| Ticket | Interface | WO-046 consumes / produces |
| ------ | --------- | --------------------------- |
| WO-039 | `ImportTemplate` | Implements for `wc` |
| WO-042 | `TokenResolver` | Consumes; CSS var mapping limited until WO-047 |
| WO-043 | `scanDependencies` | Lit imports |
| WO-045 | `ImportParseExecMessage.framework` | Shares protocol extension |
| WO-047 | `webTokenResolver` | Shadow DOM CSS resolution |

---

## Decision log

| ID | Decision | Rationale | Alternatives rejected |
| -- | -------- | --------- | --------------------- |
| D1 | CEM 2.1.0 as primary source | Industry standard; ticket requirement | JSDoc-only parse |
| D2 | No CEM auto-generation | Explicit out of scope | Ship analyzer in plugin |
| D3 | define-scan as fallback only | Unblocks dev without manifest | Require CEM always |
| D4 | HTML Code Connect parser | Figma WC documented path | React-style connect |
| D5 | Props from attributes + fields | CEM models both | Attributes only |
| D6 | Events omitted from spec MVP | ComponentSpec has no events array | Schema bump |

---

## Pre-plan spikes

| Spike ID | Procedure | Pass criteria | Status |
| -------- | --------- | ------------- | ------ |
| SPK-046-1 | Vitest: fixture CEM + Lit source → spec | Props + tag + framework wc | ☐ build |
| SPK-046-2 | `figma connect validate` on WC stub | Exit 0 | ☐ build |
| SPK-046-3 | define-scan without CEM | Tag extracted; low confidence | ☐ build |

---

## Risk register

| Risk | Sev | Likelihood | Mitigation |
| ---- | --- | ---------- | ---------- |
| CEM out of sync with source | H | M | Warn in issues; prefer CEM path match by `module.path` |
| Multiple elements per file | M | M | Match by `sourcePath` suffix |
| Shadow CSS tokens unresolved MVP | M | H | WO-047 follow-up; document in confidence |
| CEM schema drift | L | L | Validate `schemaVersion` major 2.x |

---

## Recommendations

1. Plan **CEM loader** as shared util usable from UI (fetch once) and unit tests (inline JSON).
2. Align **canonical fixture** with Lit + CEM 2.1.0 — `ds-button` tag, variant/size attrs.
3. Share **`resolveStubPath` framework param** with WO-045 plan.
4. Extend **import list-files** to surface `custom-elements.json` in repo browser (optional UX — not blocking AC).
5. **WO-047** owns `:host` / shadow stylesheet token extraction — WO-046 passes raw CSS text in context if found.

---

## Open questions

| Q | Status | Owner |
| - | ------ | ----- |
| Extend `ImportTemplateContext` with CEM fields? | **RESOLVED** — yes, optional fields | Planner |
| Match element by tag vs class when multiple CEs in one module? | **RESOLVED** — prefer export kind `custom-element-definition` matching source basename | WO-046 |
| Store CEM path in fighub.json? | **RESOLVED** — defer; use discovery order | Future config ticket |

---

## References

- CEM spec repo — https://github.com/webcomponents/custom-elements-manifest (schema 2.1.0, 2026-05-30)
- CEM intro — https://custom-elements-manifest.open-wc.org/
- Figma Code Connect HTML / WC — https://developers.figma.com/docs/code-connect/html/
- Sprint 9 index — [sprint-9-research-index.md](../../research/sprint-9-research-index.md)
