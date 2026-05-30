# Plan — WO-046: Web Components parser + CEM + Code Connect

## Approach

Add **Phase 4b Web Components** support by implementing **`WebComponentsImportTemplate`** that maps **Custom Elements Manifest (CEM) 2.1.0** JSON to **`ComponentSpecV1`**, with a **`customElements.define`** fallback when no manifest is available, and **`WCMappingTemplate`** generating **`.figma.ts`** HTML Code Connect stubs with the custom element tag in the example.

CEM is loaded in **`main.ts` import handler** (GitHub fetch) using discovery order from research: `package.json` `"customElements"` → `custom-elements.json` → `dist/custom-elements.json`. Manifest text is passed to the UI parse exec via extended **`ImportTemplateContext`**.

**Depends on WO-045 Steps 1–3** for `ImportParseExecMessage.framework`, `resolveStubPath({ framework })`, and shared message guards — merge or land WO-045 Phase 1 first when building in parallel.

**In scope:** CEM 2.1.0; Lit-style `.ts` sources; HTML Code Connect stubs; define-scan fallback; Vitest + validate fixture.

**Out of scope (ticket verbatim):** auto-generating missing CEM; native platform parsers; shadow CSS token resolution depth (WO-047).

---

## Acceptance criteria traceability

| Ticket AC / requirement | Plan steps |
| ----------------------- | ---------- |
| R1 `templates/webcomponents.ts` + CEM pipeline | Steps 4–12, 14 |
| R2 `codeconnect/templates/webcomponents.ts` | Steps 15–17 |
| R3 define fallback + cem-not-found | Steps 6, 8, 13 |
| R4 ImportTemplateContext CEM fields | Steps 2–3, 14 |
| R5 Registries + FrameworkPicker `wc` | Steps 18–19 |
| R6 Fixtures + validate | Steps 1, 16, 22–23 |
| AC Lit + CEM → spec | Step 21 |
| AC WC stub validates | Step 23 |
| AC E2E import + CC PR | Step 24 |

---

## Module tree

```
src/core/import/
  types.ts                        # extend ImportTemplateContext
  templates/webcomponents.ts
  templates/webcomponents/
    index.ts
    types.ts
    loadCemManifest.ts
    findCustomElementInCem.ts
    cemToComponentSpec.ts
    scanCustomElementsDefine.ts
    parseWebComponent.ts

src/core/codeconnect/templates/
  webcomponents.ts

src/io/github/
  cemDiscovery.ts                 # paths + package.json customElements field

tests/fixtures/wc/
  custom-elements.json            # schemaVersion 2.1.0
  ds-button.ts                    # Lit-style source
  component-spec-ds-button-canonical.json

tests/fixtures/code-connect-consumer-wc/
  package.json
  figma.config.json
  src/components/ds-button/ds-button.ts
  src/components/ds-button/DsButton.figma.ts

tests/unit/core/import/templates/webcomponents/
  loadCemManifest.test.ts
  cemToComponentSpec.test.ts
  scanCustomElementsDefine.test.ts
  parseDsButton.test.ts

tests/unit/core/codeconnect/
  webcomponentsMappingTemplate.test.ts
```

---

## Steps

- [ ] **Step 1** — Create CEM fixture `tests/fixtures/wc/custom-elements.json`:

- `schemaVersion: "2.1.0"`
- Module path `src/ds-button.ts`
- Class `DsButton`, `tagName: "ds-button"`, `customElement: true`
- Attributes: `variant`, `size`, `disabled`
- Export kind `custom-element-definition` for `ds-button`
- Optional `cssProperties`: `[{ "name": "--ds-button-bg" }]`

Create matching `ds-button.ts` with `customElements.define('ds-button', DsButton)` and static properties.

**Done when:** fixtures committed.

- [ ] **Step 2** — Extend `src/core/import/types.ts`:

```typescript
export interface ImportTemplateContext {
  // existing…
  cemManifestText?: string;
  cemManifestPath?: string;
}
```

**Done when:** TypeScript compiles; React parse ignores optional fields.

- [ ] **Step 3** — Extend `src/io/messages/import.ts` `ImportParseExecMessage`:

```typescript
cemManifestText?: string;
cemManifestPath?: string;
```

Update validators. Forward from `importHandlers.ts` when framework is `wc`.

**Done when:** message tests updated.

- [ ] **Step 4** — Implement `src/io/github/cemDiscovery.ts`:

```typescript
export const CEM_CANDIDATE_PATHS: readonly string[] = [
  'custom-elements.json',
  'dist/custom-elements.json',
];

export function resolveCemPathFromPackageJson(packageJsonText: string): string | null;
export function orderedCemPaths(packageJsonCustomElements?: string): string[];
```

**Done when:** unit test reads `{"customElements": "dist/custom-elements.json"}` → path returned.

- [ ] **Step 5** — Implement `src/core/import/templates/webcomponents/loadCemManifest.ts`:

```typescript
export interface CemManifest {
  schemaVersion: string;
  modules: CemModule[];
}

export function parseCemManifestText(text: string): CemManifest | null;
```

Reject unsupported major version (`schemaVersion` not starting with `2.` → warning issue).

**Done when:** parses Step 1 fixture.

- [ ] **Step 6** — Implement `src/core/import/templates/webcomponents/findCustomElementInCem.ts`:

```typescript
export function findCustomElementInCem(
  manifest: CemManifest,
  sourcePath: string,
): CemCustomElementDeclaration | null;
```

Match rules:

1. Module `path` ends with `sourcePath` suffix
2. Declaration with `customElement: true` and matching `tagName`
3. Prefer export kind `custom-element-definition`

**Done when:** finds `ds-button` for `src/ds-button.ts`.

- [ ] **Step 7** — Implement `src/core/import/templates/webcomponents/cemToComponentSpec.ts`:

```typescript
export function cemDeclarationToSpec(input: {
  declaration: CemCustomElementDeclaration;
  className: string;
  tagName: string;
  tokenResolver: TokenResolver;
}): { spec: ComponentSpecV1; issues: ImportParseIssue[] };
```

| CEM input | Spec output |
| --------- | ----------- |
| `attributes[].name` + `type.text` | `props[]` via shared prop type mapper |
| `variant`, `size` attrs | `variantMatrix` axes |
| `cssProperties[]` | bindings when manual map hit; else warning `css-property-unmapped` |
| — | `framework: 'wc'`, `archetype: 'chip'` default |

**Done when:** unit test matches `component-spec-ds-button-canonical.json` props/matrix.

- [ ] **Step 8** — Implement `src/core/import/templates/webcomponents/scanCustomElementsDefine.ts`:

```typescript
export interface DefineScanResult {
  tagName: string;
  className: string;
}

export function scanCustomElementsDefine(sourceText: string): DefineScanResult | null;
```

Regex + TS AST for `customElements.define('tag', ClassName)`.

**Done when:** extracts from `ds-button.ts` without CEM.

- [ ] **Step 9** — Fallback spec builder when CEM missing:

Minimal spec from define-scan: props from class `@property` decorators or static fields (best-effort); `confidence: { layout: 'low', bindings: 'low' }`.

**Done when:** test returns spec with `issues` containing `cem-missing-fallback`.

- [ ] **Step 10** — Error path when both CEM and define-scan fail:

```typescript
issues.push({ code: 'cem-not-found', message: '…', severity: 'error' });
```

Return empty spec skeleton `framework: 'wc'`.

**Done when:** test triggers error issue.

- [ ] **Step 11** — Integrate `scanDependencies` on WC source text (WO-043).

**Done when:** dependency tree includes `@lit/` imports when present.

- [ ] **Step 12** — Implement `src/core/import/templates/webcomponents/parseWebComponent.ts`:

```typescript
export function parseWebComponent(ctx: ImportTemplateContext): ImportTemplateResult;
```

Flow:

1. If `ctx.cemManifestText` → parse + find + cemToComponentSpec
2. Else attempt define-scan fallback
3. Else cem-not-found error

Log passes: `console.debug('[import:wc:pass]', …)`.

**Done when:** integration unit test green with CEM fixture.

- [ ] **Step 13** — Create `src/core/import/templates/webcomponents.ts` class implementing `ImportTemplate`.

**Done when:** exported from import index.

- [ ] **Step 14** — Update `src/main/importHandlers.ts` for `framework === 'wc'`:

Before `IMPORT_PARSE_EXEC`, when parsing WC:

1. Fetch `package.json` from repo root (if not cached)
2. Resolve CEM path via `cemDiscovery`
3. Fetch CEM blob text
4. Include `cemManifestText`, `cemManifestPath`, `framework: 'wc'` on exec message

**Done when:** handler unit test with mocked fetch returns CEM on exec payload.

- [ ] **Step 15** — Implement `src/core/codeconnect/templates/webcomponents.ts`:

```typescript
export class WebComponentsMappingTemplate implements MappingTemplate {
  readonly framework = 'wc' as const;
  generateStub(ctx: MappingTemplateContext): MappingStubFile;
}
```

Example shape:

```typescript
figma.connect(nodeUrl, {
  props: { … },
  example: (props) => html`<ds-button variant=${props.variant} disabled=${props.disabled}>${props.label}</ds-button>`,
  imports: ["import '@my-ds/button/ds-button.js'"],
});
```

Tag name from spec name kebab-case or stored tag in stub context (pass via `component.name` → derive `ds-button`).

Use `resolveStubPath({ framework: 'wc' })`.

**Done when:** snapshot test locked.

- [ ] **Step 16** — Create `tests/fixtures/code-connect-consumer-wc/` (mirror WO-045 HTML consumer).

**Done when:** `figma.config.json` has `parser: "html"`.

- [ ] **Step 17** — Wire `src/core/codeconnect/registry.ts` for `wc`.

**Done when:** `getMappingTemplate('wc')` non-null.

- [ ] **Step 18** — Update `FrameworkPicker.tsx`: add `'wc'` to enabled list (`PHASE_4B_ENABLED`).

**Done when:** FrameworkPicker test — wc enabled.

- [ ] **Step 19** — Update `src/core/import/registry.ts` + `ImportFromRepoSection.tsx`:

`parseSupported` when `getImportTemplate(framework) !== null` (covers wc after registry wired).

**Done when:** registry test + UI logic.

- [ ] **Step 20** — Create `tests/fixtures/wc/component-spec-ds-button-canonical.json`.

**Done when:** golden expected output documented.

- [ ] **Step 21** — Golden test `parseDsButton.test.ts` with CEM + source + canonical resolver mock.

**Done when:** AC Lit + CEM satisfied.

- [ ] **Step 22** — Fallback test: parse without CEM text but with define in source.

**Done when:** spec produced with low confidence.

- [ ] **Step 23** — SPK-046-2 validate test shell (same pattern as WO-045 Step 24).

**Done when:** test file exists.

- [ ] **Step 24** — Integration test mocked emit PR with WC stub `.figma.ts`.

**Done when:** AC E2E path covered at unit/integration level.

- [ ] **Step 25** — CI:

```bash
npm run test -- tests/unit/core/import/templates/webcomponents tests/unit/core/codeconnect/webcomponentsMappingTemplate.test.ts
npm run build
```

**Done when:** green.

---

## Build Agents

### Phase 1 (parallel — after WO-045 Steps 1–3)

- `code-build` — **Steps 1–3:** fixtures + ImportTemplateContext + exec message CEM fields
- `code-build` — **Step 4:** cemDiscovery helper

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 5–8:** CEM parse, find, map, define-scan
- `code-build` — **Steps 20, 16:** canonical JSON + consumer fixture

### Phase 3 (parallel, after Phase 2)

- `code-build` — **Steps 9–13:** fallback, errors, orchestrator, template class
- `code-build` — **Steps 14:** main handler CEM fetch

### Phase 4 (parallel, after Phase 3)

- `code-build` — **Steps 15–19:** WC mapping template + registries + UI
- `code-build` — **Steps 21–22:** golden + fallback tests

### Phase 5 (sequential, after Phase 4)

- `code-build` — **Steps 23–25:** validate spike, integration, CI

---

## Dependencies & Tools

| Dependency | Status | Usage |
| ---------- | ------ | ----- |
| WO-039 interfaces | ✅ | ImportTemplate / MappingTemplate |
| WO-040 emit PR | ✅ | Batch stubs |
| WO-042 TokenResolver | ✅ | cssProperties manual hits |
| WO-043 scanDependencies | ✅ | Source imports |
| WO-045 Steps 1–3 | required | framework protocol + resolveStubPath |
| WO-047 | ⏳ later | Shadow CSS bindings |
| CEM spec 2.1.0 | docs | Fixture shape |
| GitHub blob fetch | ✅ | CEM load in main |

---

## Open Questions

| Q | Status |
| - | ------ |
| Tag name in stub when spec uses PascalCase class? | **RESOLVED** — derive kebab-case from CEM `tagName` field |
| Fetch CEM on every parse vs cache? | **RESOLVED** — fetch per parse; cache deferred |
| Events array in spec? | **RESOLVED** — info issues only; no schema bump |

---

## Notes

- Research: [web-components-parser-cem-code-connect.md](./research/web-components-parser-cem-code-connect.md)
- CEM spec: https://github.com/webcomponents/custom-elements-manifest (2.1.0)
- Do not port `@custom-elements-manifest/analyzer` into plugin
- Ticket: `./ticket.md`
