# Plan — WO-045: Vue SFC parser + Code Connect + ImportTemplate

## Approach

Add **Phase 4b Vue** support by implementing a production **`VueImportTemplate`** that parses `.vue` SFCs with **`@vue/compiler-sfc`** + **`@vue/compiler-dom`** in the **UI iframe** (same constraint as React TS AST), emits **`ComponentSpecV1`**, and registers a **`VueMappingTemplate`** that generates **`.figma.ts`** stubs via **`@figma/code-connect/html`**.

The parse pipeline mirrors WO-041 React pass order under `src/core/import/templates/vue/`: SFC descriptor → script-setup props → optional variant map → **WO-043 `scanDependencies`** on script block → template class tokens → **WO-042 `extractBindings`** → layout inference → **`inferArchetype`** + confidence.

Shared Sprint 9 protocol changes owned by this ticket: **`framework`** on `ImportParseExecMessage` / `ImportParseMessage`, **`resolveStubPath({ framework })`**, and enabling **`vue`** in **`FrameworkPicker`** + **`ImportFromRepoSection`**.

**In scope:** Vue `.vue` only; standard `defineProps` / `withDefaults`; static and string-literal `:class`; Code Connect HTML stubs; Vitest + consumer validate fixture.

**Out of scope (ticket verbatim):** Vue Composition API quirks beyond standard patterns; scoped CSS token resolution (WO-047); auto CEM; SwiftUI/Compose.

---

## Acceptance criteria traceability

| Ticket AC / requirement | Plan steps |
| ----------------------- | ---------- |
| R1 `templates/vue.ts` + pipeline | Steps 5–14, 16 |
| R2 `codeconnect/templates/vue.ts` HTML stubs | Steps 17–19 |
| R3 `@vue/compiler-sfc` in UI iframe | Steps 1, 5–6, 21 |
| R4 Registries + FrameworkPicker | Steps 3–4, 15–16 |
| R5 Fixture `Button.vue` → spec | Steps 10, 22 |
| R6 `figma connect validate` + PR body note | Steps 1, 20, 24 |
| AC parse Button.vue → ComponentSpecV1 | Step 22 |
| AC CC stub validates | Step 24 |
| AC E2E import + CC PR | Step 25 |

---

## Module tree

```
src/core/import/templates/
  vue.ts
  vue/
    index.ts
    types.ts
    parseSfcDescriptor.ts
    parseScriptSetupProps.ts
    collectClassTokensFromTemplate.ts
    parseVueLayout.ts
    attachConfidence.ts
    parseVueComponent.ts

src/core/codeconnect/templates/
  vue.ts

src/core/import/shared/
  extractBindings.ts          # move from react/ (re-export from react path)

tests/fixtures/vue/
  Button.vue
  component-spec-button-vue-canonical.json

tests/fixtures/code-connect-consumer-vue/
  package.json
  figma.config.json             # parser: html, include **/*.figma.ts
  src/components/button/Button.vue
  src/components/button/Button.figma.ts

tests/unit/core/import/templates/vue/
  parseSfcDescriptor.test.ts
  parseScriptSetupProps.test.ts
  collectClassTokensFromTemplate.test.ts
  parseVueButton.test.ts

tests/unit/core/codeconnect/
  vueMappingTemplate.test.ts
  vueStubValidate.test.ts       # SPK-045-2 shell
```

---

## Steps

- [ ] **Step 1** — Add dependencies to root `package.json`:

```json
"@vue/compiler-sfc": "^3.5.13",
"@vue/compiler-dom": "^3.5.13",
"@figma/code-connect": "^1.3.0"
```

Run `npm install`. **Done when:** `npm run typecheck` passes; record `dist/ui.html` byte size for SPK-045-1 baseline.

- [ ] **Step 2** — Extend `src/io/messages/import.ts`:

```typescript
export interface ImportParseMessage {
  // existing…
  framework?: ComponentFramework; // default 'react'
}

export interface ImportParseExecMessage {
  // existing…
  framework: ComponentFramework;
}
```

Update `isImportParseExecMessage` to require valid `framework`. **Done when:** `tests/unit/io/messages/import.test.ts` updated and green.

- [ ] **Step 3** — Extend `src/core/codeconnect/resolveStubPath.ts`:

```typescript
export function resolveStubPath(input: {
  specsPath: string;
  componentKey: string;
  componentName: string;
  framework: ComponentFramework;
}): { relativePath: string; implementationImportPath: string };
```

| `framework` | Stub extension | Implementation import |
| ----------- | -------------- | --------------------- |
| `react` | `.figma.tsx` | `./{folder}` |
| `vue`, `wc` | `.figma.ts` | `./{folder}/Button.vue` or `./{file}` per research |

Update `templates/react.ts` call site with `framework: 'react'`. **Done when:** existing React codeconnect unit tests green.

- [ ] **Step 4** — Update `src/ui/components/codeconnect/FrameworkPicker.tsx`:

Replace `PHASE_4A_ENABLED` with `PHASE_4B_ENABLED: ImportFramework[] = ['react', 'vue']` (WC enabled in WO-046).

**Done when:** `tests/unit/ui/codeconnect/FrameworkPicker.test.tsx` — Vue option enabled, title undefined.

- [ ] **Step 5** — Implement `src/core/import/templates/vue/parseSfcDescriptor.ts`:

```typescript
import { parse as parseSfc } from '@vue/compiler-sfc';

export interface VueSfcDescriptor {
  templateContent: string | null;
  scriptSetupContent: string | null;
  styles: { content: string; scoped: boolean }[];
  errors: string[];
}

export function parseSfcDescriptor(sourcePath: string, sourceText: string): VueSfcDescriptor;
```

**Done when:** `parseSfcDescriptor.test.ts` parses minimal SFC with template + script setup.

- [ ] **Step 6** — Implement `src/core/import/templates/vue/parseScriptSetupProps.ts`:

Reuse `createTsxSourceFile` from React on wrapped script: `export default defineComponent({ setup() {} })` wrapper OR parse script block as TS module.

Output: `{ props: ComponentSpecProp[]; variantMatrix: Record<string, string[]> }`.

Detect `defineProps<{ variant?: 'default' | 'destructive'; size?: 'sm' | 'default' | 'lg' }>()` and `withDefaults`.

**Done when:** unit test extracts variant + size enums from fixture script.

- [ ] **Step 7** — Move `extractBindings` to `src/core/import/shared/extractBindings.ts`; re-export from `react/extractBindings.ts` as thin forwarder (WO-047 will extend). Update React imports.

**Done when:** all existing `react.extractBindings.test.ts` pass unchanged.

- [ ] **Step 8** — Implement `src/core/import/templates/vue/collectClassTokensFromTemplate.ts`:

Use `@vue/compiler-dom` `parse(template)`; walk AST for:

- static `class="bg-primary …"`
- string literal `:class="'bg-primary'"`
- first string arg to `cn('…')` / `clsx('…')` in template expressions (best-effort)

**Done when:** unit test returns `['bg-primary', 'text-primary-foreground']` from Button template.

- [ ] **Step 9** — Implement `src/core/import/templates/vue/parseVueLayout.ts`:

Mirror `parseJsxLayout.ts` heuristics on root `<button>` / first element class list (`flex`, `gap-*`, `px-*`, `inline-flex`).

**Done when:** layout `{ direction: 'horizontal', gap: '8', … }` for Button fixture.

- [ ] **Step 10** — Create `tests/fixtures/vue/Button.vue`:

shadcn-style button: `defineProps` variant/size/disabled, template root `<button :class="cn(buttonVariants({ variant, size }), props.class)">`, tailwind utilities matching canonical binding tokens.

Create `component-spec-button-vue-canonical.json` with `framework: "vue"`.

**Done when:** fixture committed; JSON documents expected matrix + bindings.

- [ ] **Step 11** — Implement `src/core/import/templates/vue/attachConfidence.ts` (or reuse shared attachConfidence from React if identical).

**Done when:** unresolved tokens → `confidence.bindings: 'low'`.

- [ ] **Step 12** — Implement `src/core/import/templates/vue/parseVueComponent.ts` orchestrator:

```typescript
export function parseVueComponent(ctx: ImportTemplateContext): ImportTemplateResult;
```

Pipeline passes logged via `console.debug('[import:vue:pass]', …)`.

Integrate `scanDependencies(descriptor.scriptSetupContent, ctx.sourcePath, { registryKeys })`.

**Done when:** orchestrator returns spec for Button fixture in unit test (mock resolver).

- [ ] **Step 13** — Create `src/core/import/templates/vue.ts`:

```typescript
export class VueImportTemplate implements ImportTemplate {
  readonly framework = 'vue' as const;
  parse(ctx: ImportTemplateContext): ImportTemplateResult {
    return parseVueComponent(ctx);
  }
}
```

**Done when:** exported from `src/core/import/index.ts`.

- [ ] **Step 14** — Wire `src/core/import/registry.ts`:

```typescript
import { VueImportTemplate } from './templates/vue';
// getImportTemplate('vue') → VueImportTemplate
// listSupportedImportFrameworks() → ['react', 'vue']
```

**Done when:** `registry.test.ts` updated — vue non-null.

- [ ] **Step 15** — Update UI parse path:

| File | Change |
| ---- | ------ |
| `src/ui/hooks/useImportParse.ts` | Accept `framework` in parse input; post on `IMPORT_PARSE` |
| `src/main/importHandlers.ts` | Read `message.framework ?? 'react'`; forward on `IMPORT_PARSE_EXEC` |
| `src/ui/import/runImportParseExec.ts` | `getImportTemplate(message.framework)` |
| `src/ui/components/import/ImportFromRepoSection.tsx` | `parseSupported = getImportTemplate(framework) !== null`; remove React-only banner for vue |

**Done when:** `ImportFromRepoSection` test or manual Vitest for parseSupported logic.

- [ ] **Step 16** — Export barrel `src/core/import/templates/vue/index.ts`.

**Done when:** Vitest resolves `@/core/import/templates/vue`.

- [ ] **Step 17** — Implement `src/core/codeconnect/templates/vue.ts`:

```typescript
export class VueMappingTemplate implements MappingTemplate {
  readonly framework = 'vue' as const;
  generateStub(ctx: MappingTemplateContext): MappingStubFile;
}
```

Generated content uses:

```typescript
import figma, { html } from '@figma/code-connect/html';
figma.connect(nodeUrl, { props: {…}, example: (props) => html`…`, imports: ["import Button from './Button.vue'"] });
```

Use `mapFigmaPropsToCodeConnect` + `resolveStubPath({ framework: 'vue' })`.

**Done when:** `vueMappingTemplate.test.ts` snapshot matches locked shape (no JSX).

- [ ] **Step 18** — Wire `src/core/codeconnect/registry.ts` for `vue`; update `listSupportedMappingFrameworks()`.

**Done when:** `codeconnect/registry.test.ts` — vue non-null.

- [ ] **Step 19** — Extend `src/core/codeconnect/prBodyCodeConnect.ts` (or emit module) footer:

```
Consumer figma.config.json must set:
  "parser": "html"
  "include": ["**/*.figma.ts"]
CI: npx figma connect publish (after merge)
```

**Done when:** unit test asserts PR body contains `parser": "html"`.

- [ ] **Step 20** — Create `tests/fixtures/code-connect-consumer-vue/` with `figma.config.json`:

```json
{
  "codeConnect": {
    "parser": "html",
    "include": ["src/**/*.figma.ts"],
    "label": "Vue 3"
  }
}
```

Commit generated `Button.figma.ts` from Step 17 generator output.

**Done when:** fixture tree exists.

- [ ] **Step 21** — Verify Vue compiler loads only in UI bundle:

Confirm `@vue/compiler-sfc` imported only from `src/ui/**` or `src/core/import/templates/vue/**` paths reached via UI exec — **not** `src/main.ts`.

**Done when:** grep gate — no `@vue/compiler` in main-thread entry imports.

- [ ] **Step 22** — Golden test `tests/unit/core/import/templates/vue/parseVueButton.test.ts`:

Use `createCanonicalButtonTokenResolver()` from `tests/mocks/tokenResolverCanonical.ts`.

Assert `variantMatrix`, `props`, `bindings`, `framework === 'vue'`, `name === 'Button'`.

**Done when:** AC parse Button satisfied.

- [ ] **Step 23** — Unresolved token test for Vue (mirror `react.unresolvedTokens.test.ts`).

**Done when:** `confidence.bindings === 'low'` for unknown utility.

- [ ] **Step 24** — SPK-045-2: `tests/unit/core/codeconnect/vueStubValidate.test.ts`:

Shell exec (skip if no network/token in CI):

```bash
cd tests/fixtures/code-connect-consumer-vue && npx figma connect validate
```

In CI: skip with `describe.skipIf(!process.env.FIGMA_ACCESS_TOKEN)` or document manual gate.

**Done when:** test file exists; passes locally when token set.

- [ ] **Step 25** — Integration test `tests/integration/core/import/vueEmitCodeConnectPR.test.ts`:

Mock `executeGithubPRSink`; flow: parse Vue spec → `getMappingTemplate('vue')` → stub → emit batch includes `.figma.ts`.

**Done when:** mocked PR contains vue stub path.

- [ ] **Step 26** — CI gate:

```bash
npm run test -- tests/unit/core/import/templates/vue tests/unit/core/codeconnect/vueMappingTemplate.test.ts
npm run build
```

**Done when:** all green; SPK-045-1 bundle size noted in PR.

---

## Build Agents

### Phase 1 (parallel)

- `code-build` — **Steps 1–4:** deps, message protocol, resolveStubPath, FrameworkPicker
- `code-build` — **Steps 10, 20:** Vue Button fixture + consumer validate fixture tree

### Phase 2 (parallel, after Phase 1)

- `code-build` — **Steps 5–6, 8–9:** SFC parse, props, class tokens, layout
- `code-build` — **Step 7:** shared extractBindings move

### Phase 3 (parallel, after Phase 2)

- `code-build` — **Steps 11–16:** orchestrator, registry, UI parse wiring
- `code-build` — **Steps 17–19:** VueMappingTemplate + registry + PR body

### Phase 4 (sequential, after Phase 3)

- `code-build` — **Steps 21–26:** bundle guard, golden tests, validate spike, integration, CI

---

## Dependencies & Tools

| Dependency | Status | Usage |
| ---------- | ------ | ----- |
| WO-039 ImportTemplate / MappingTemplate | ✅ merged | Implement interfaces |
| WO-040 emitCodeConnectPR | ✅ merged | Reuse emit path |
| WO-041 React pipeline | ✅ merged | Mirror pass order |
| WO-042 TokenResolver | ✅ merged | Bindings in parse |
| WO-043 scanDependencies | ✅ merged | Script imports |
| WO-047 webTokenResolver | ⏳ later | MVP uses class tokens only |
| npm packages | add in Step 1 | `@vue/compiler-sfc`, `@figma/code-connect` |
| Figma Code Connect CLI | dev/CI | SPK-045-2 validate |

---

## Open Questions

| Q | Status |
| - | ------ |
| Enable `wc` in FrameworkPicker in this ticket? | **RESOLVED** — WO-046 enables `wc`; WO-045 only `vue` |
| `.figma.ts` import path for Vue stub | **RESOLVED** — `import Button from './Button.vue'` |
| Move extractBindings now vs WO-047? | **RESOLVED** — move in Step 7 (shared stub for WO-047) |

---

## Notes

- Research: [vue-sfc-parser-code-connect-import-template.md](./research/vue-sfc-parser-code-connect-import-template.md)
- ES2017 / no `?.` in `src/main.ts`; Vue compiler **UI only**
- Use `console.debug` per parse pass; `pluginLog` not required in UI iframe
- Build parallel with WO-046 after Steps 1–3 land (shared protocol)
- Ticket: `./ticket.md`
