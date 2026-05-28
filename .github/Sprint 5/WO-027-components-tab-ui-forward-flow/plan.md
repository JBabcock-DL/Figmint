# Plan — WO-027: Components tab UI (forward-scaffold flow)

## Approach

Deliver the **Phase 2 GA integration surface** for forward component scaffolding: a new **Components** tab that mirrors the proven Bootstrap tab pattern (WO-015) while orchestrating the WO-022→026 pipeline on the main thread. Designers reach the same `scaffold/run` path via **registry pick (UC-2)** or **paste/load spec (UC-3)**; both paths land on a **preview-before-apply** gate (editable `variantMatrix`, `props[]`, `bindings[]`), then one **Scaffold** CTA streams `scaffold/progress`, surfaces audits, and auto-opens **ExportSheet** with merged `RegistryV1` (WO-020 — never silent PR).

**In scope:** `App.tsx` tab shell (`'components'` between Bootstrap and Export), `Components.tsx`, `scaffold/*` message contract, `runScaffold.ts` inline orchestrator, progress reducer + step list, registry GitHub read + spec resolution, canonical VQA fixture, Vitest + integration tests.

**Out of scope (ticket verbatim — do not implement):** import-from-repo (Sprint 8 / WO-044); Code Connect PR emission (Sprint 8); bulk scaffold (one component per run); formal `src/ops/` dispatcher (inline orchestrator OK); structured form editors for spec fields (JSON textareas v1); auto-commit registry to GitHub without ExportSheet confirmation.

**Build gate:** `/build` MUST refuse to start if any dependency WO-022..026 `plan.md` is still a stub (`_TBD_`, missing Steps). At runtime, if a dependency export is missing, `runScaffold` posts `scaffold/error` with step id — do not crash main thread.

**Visual parity:** Match Bootstrap inline styles until token-bound chrome ships — 11px Inter, `#f0f0f0` active tab, `1px solid #ccc` borders, section headings **13px semibold**, `16px` padding.

---

## AC traceability

| Ticket AC / requirement | Plan step(s) |
| ----------------------- | ------------ |
| FR-1 `Components.tsx` + App tab `'components'` | Steps 14–15 |
| FR-2 Registry pick UC-2 | Steps 16–18 |
| FR-3 Paste/load spec UC-3 | Steps 19–20 |
| FR-4 Spec preview + edit + validate | Steps 21–23 |
| FR-5 Scaffold orchestration `scaffold/run` | Steps 3–8, 24 |
| FR-6 Progress + audit | Steps 9–11, 25 |
| FR-7 ExportSheet registry | Steps 26–27 |
| FR-8 Pass `registry` into scaffold | Steps 3, 18, 24 |
| AC Button <5s registry pick | Step 32 (SPK-027-1 VQA) |
| AC paste canonical spec | Steps 2, 20, 28 |
| AC G2 p50 <5s | Steps 8, 32 |
| AC ExportSheet confirm (no auto-PR) | Steps 26–27 |
| Vitest guards + reducer | Steps 12–13, 28–29 |
| A11y tab/progress/export keyboard | Steps 15, 11, 27 |
| `console.debug` progress / `pluginLog` main | Steps 8, 24 |

---

## Steps

### Phase 0 — Dependency verification (planning artifact; no code)

- [x] **Step 0** — Before `/build`, verify upstream plans export the signatures below. If any plan is stub, stop and run `/plan` on that ticket first.

  | Ticket | Module | Required export |
  | ------ | ------ | ----------------- |
  | WO-022 | `src/core/components/scaffold/index.ts` | `scaffold(spec, targetPage, options?) → ScaffoldResult` |
  | WO-023 | `src/core/components/scaffold/applyBindings.ts` | `applyBindings(spec, componentSet, options?) → ApplyBindingsResult` |
  | WO-024 | `src/core/components/scaffold/applyProperties.ts` | `applyProperties(spec, componentSet) → ApplyPropertiesResult` |
  | WO-025 | `src/core/components/scaffold/usageFrame.ts` | `buildUsageFrame(componentSet, spec, ctx: UsageFrameContext) → UsageFrameResult` |
  | WO-026 | `src/core/components/registry.ts` | `upsertRegistryEntry`, `mergeRegistryEntry`, `buildRegistryEntry`, `buildRegistryAuditRows`; UI: `loadRegistryFromGitHub` in `registryExport.ts` |

  **Done when:** grep or import confirms each symbol exists at build time; otherwise build agent exits with checklist of missing deps.

### Message contract (define before orchestrator)

- [x] **Step 1** — Create `src/io/messages/scaffold.ts` with types and guards (ES2017-safe — no optional chaining in guards used from `src/main.ts`):

  ```ts
  import type {
    AuditReportV1,
    ComponentSpecV1,
    RegistryV1,
  } from '@detroitlabs/figmint-contracts';
  import type { ApplyBindingsResult } from '@/core/components/scaffold/applyBindings';
  import type { ApplyPropertiesResult } from '@/core/components/scaffold/applyProperties';
  import type { ScaffoldResult } from '@/core/components/scaffold';

  export type ScaffoldStepId =
    | 'scaffold-geometry'
    | 'apply-bindings'
    | 'apply-properties'
    | 'build-usage-frame'
    | 'update-registry'
    | 'audit-component'
    | 'complete';

  export type ScaffoldStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

  export interface ScaffoldRunMessage {
    type: 'scaffold/run';
    spec: ComponentSpecV1;
    options?: {
      registry?: RegistryV1;
      skipUsageFrame?: boolean;
      skipRegistry?: boolean;
    };
  }

  export interface ScaffoldProgressMessage {
    type: 'scaffold/progress';
    step: ScaffoldStepId;
    status: ScaffoldStepStatus;
    label: string;
    detail?: string;
    elapsedMs?: number;
    audit?: AuditReportV1;
  }

  export interface ScaffoldResultMessage {
    type: 'scaffold/result';
    ok: boolean;
    totalDurationMs: number;
    componentSetId: string;
    componentSetName: string;
    registry: RegistryV1;
    audits: AuditReportV1[];
    scaffold: ScaffoldResult;
    bindings?: ApplyBindingsResult;
    properties?: ApplyPropertiesResult;
  }

  export interface ScaffoldErrorMessage {
    type: 'scaffold/error';
    message: string;
    failedStep?: ScaffoldStepId;
  }

  export type ScaffoldUiMessage =
    | ScaffoldProgressMessage
    | ScaffoldResultMessage
    | ScaffoldErrorMessage;

  export const SCAFFOLD_STEPS: Array<{ id: ScaffoldStepId; label: string }> = [
    { id: 'scaffold-geometry', label: 'Building variant matrix' },
    { id: 'apply-bindings', label: 'Applying variable bindings' },
    { id: 'apply-properties', label: 'Adding component properties' },
    { id: 'build-usage-frame', label: 'Creating usage examples' },
    { id: 'update-registry', label: 'Updating registry document' },
    { id: 'audit-component', label: 'Running component audit' },
    { id: 'complete', label: 'Done' },
  ];
  ```

  Export guards: `isScaffoldRunMessage`, `isScaffoldProgressMessage`, `isScaffoldResultMessage`, `isScaffoldErrorMessage`.

  Run-message validation: `spec.v === 1 && spec.kind === 'component-spec'`, `Array.isArray(spec.props)`, `Array.isArray(spec.bindings)`.

  **Done when:** `tests/unit/io/messages/scaffold.test.ts` passes; guards reject malformed payloads; `SCAFFOLD_STEPS.length === 7`.

- [x] **Step 2** — Add canonical VQA fixture `tests/fixtures/component-spec-button-canonical.json`:

  - Valid `component-spec` v1 with locked WO-023 selector grammar (`root.fill`, not `.button`).
  - Variable refs without illegal collection prefixes (no `Theme/color/...` drift).
  - Variant matrix producing **12 variants** (3×2×2 or equivalent — document axes in fixture comment).
  - **Do not** use `src/io/formats/__fixtures__/component-spec-button.json` for scaffold tests.

  **Done when:** fixture validates against `packages/contracts/schemas/componentSpec.v1.schema.json`; Vitest import in Step 28 loads it.

### Main-thread orchestrator

- [x] **Step 3** — Create `src/core/components/scaffold/runScaffold.ts`:

  ```ts
  export async function runScaffoldComponent(
    spec: ComponentSpecV1,
    options?: ScaffoldRunMessage['options'],
  ): Promise<void>;
  ```

  Internal helpers:

  - `postProgress(step, status, extras?)` → `figma.ui.postMessage` as `ScaffoldProgressMessage`.
  - `ensureComponentsPage(): PageNode` — find or create page named **`Components`** via `figma.root.findOne(n => n.type === 'PAGE' && n.name === 'Components')`; if missing, `figma.createPage()` + rename. Mirror idempotent pattern from `ensureStyleGuideScaffold.ts`.
  - `collectComponentAudits(...)` — merge audit rows from bindings/properties/usage into `AuditReportV1[]` with `meta.scope === 'component'`.

  **Done when:** file compiles; exports `runScaffoldComponent`; no direct ExportSheet or sink calls inside.

- [x] **Step 4** — Implement pipeline step **`scaffold-geometry`** inside `runScaffoldComponent`:

  | Call | Input |
  | ---- | ----- |
  | `scaffold(spec, targetPage, { registry: options?.registry })` | WO-022 `ScaffoldOptions.registry` when `options.registry` present |

  On success: post `scaffold/progress` `done` with `detail` = variant count from `ScaffoldResult`.
  On throw: post `scaffold/error` `{ failedStep: 'scaffold-geometry', message }`, return early.
  `pluginLog('[main] scaffold-geometry', ...)`.

  **Done when:** mock WO-022 in unit test receives `registry` when passed in options.

- [x] **Step 5** — Implement step **`apply-bindings`**:

  - Resolve `ComponentSetNode` from `ScaffoldResult.componentSetId` (or direct reference returned by WO-022).
  - Call `applyBindings(spec, componentSet)`.
  - If result includes audit payload, attach to progress message `audit` field.
  - Hard abort on fatal failure (bindings step cannot proceed).

  **Done when:** progress emits `apply-bindings` running → done; bindings audit appears in UI reducer test (Step 13).

- [x] **Step 6** — Implement step **`apply-properties`**:

  - Call `applyProperties(spec, componentSet)`.
  - Continue on partial failures per WO-024 semantics; attach audit when present.
  - Abort only if WO-024 returns unrecoverable error (throw).

  **Done when:** step transitions recorded in orchestrator integration test (Step 30).

- [x] **Step 7** — Implement step **`build-usage-frame`**:

  - Skip with `status: 'skipped'` when `options?.skipUsageFrame === true` (dev flag only).
  - Else call `buildUsageFrame(componentSet, spec, { targetPage })` where `targetPage` is the Components page from `ensureComponentsPage()`.
  - Post done with `detail` = instance count from `UsageFrameResult`.

  **Done when:** skipped path posts correct status; happy path posts instance count.

- [x] **Step 8** — Implement steps **`update-registry`**, **`audit-component`**, **`complete`**, terminal **`scaffold/result`**:

  | Step | Action |
  | ---- | ------ |
  | `update-registry` | Use `options.registry ?? createEmptyRegistry(figma.fileKey)` (registry pre-loaded by UI in Steps 17–18 — **no** `loadRegistryFromGitHub` on main thread); `buildRegistryEntry` from scaffold result; `upsertRegistryEntry({ registry, spec, scaffold, targetPage })` |
  | `audit-component` | Merge audits from bindings/properties/usage **plus** `buildRegistryAuditRows(registry, spec.name, entry)` from WO-026; failed rules bubble to result |
  | `complete` | Post progress done |
  | Terminal | `figma.ui.postMessage({ type: 'scaffold/result', ok: true, totalDurationMs, componentSetId, componentSetName, registry, audits, scaffold, bindings, properties })` |

  Record `totalDurationMs = Date.now() - startedAt` at start of `runScaffoldComponent`.
  On any uncaught error: `scaffold/error` + `pluginLog('[main] scaffold/run unhandled', ...)`.

  **Done when:** result message includes `totalDurationMs > 0`; registry validates as `RegistryV1`; G2 field present for VQA.

- [x] **Step 9** — Wire `src/main.ts` dispatch (after `isBootstrapRunMessage` block):

  ```ts
  if (isScaffoldRunMessage(message)) {
    runScaffoldComponent(message.spec, message.options).catch(function (error: unknown) {
      figma.ui.postMessage({
        type: 'scaffold/error',
        message: extractErrorMessage(error),
      });
      pluginLog('[main] scaffold/run unhandled', extractErrorMessage(error));
    });
    return;
  }
  ```

  **Done when:** manual smoke: postMessage from devtools triggers handler without syntax error.

### Progress UI (Bootstrap clone)

- [x] **Step 10** — Create `src/ui/components/scaffold/scaffoldProgressReducer.ts`:

  ```ts
  export interface ScaffoldStepState {
    id: ScaffoldStepId;
    label: string;
    status: ScaffoldStepStatus;
    detail?: string;
    elapsedMs?: number;
    audit?: AuditReportV1;
  }

  export interface ScaffoldProgressState {
    steps: ScaffoldStepState[];
    audits: AuditReportV1[];
    running: boolean;
    result: ScaffoldResultMessage | null;
    error: string | null;
    failedStep: ScaffoldStepId | null;
  }

  export type ScaffoldProgressAction =
    | { type: 'scaffold/reset' }
    | { type: 'scaffold/start' }
    | ScaffoldProgressMessage
    | ScaffoldResultMessage
    | ScaffoldErrorMessage;
  ```

  Reducer behavior (mirror `bootstrapProgressReducer.ts`):

  | Action | State change |
  | ------ | ------------ |
  | `scaffold/reset` | `createInitialScaffoldProgressState()` |
  | `scaffold/start` | `running: true`, all steps pending except none running |
  | `scaffold/progress` | upsert step row; merge `audit` by `meta.scope` |
  | `scaffold/result` | `running: false`, store result, mark `complete` done |
  | `scaffold/error` | `running: false`, set `error`, optionally `failedStep` |

  Export `countCompletedSteps(state): number` for progress bar numerator.

  **Done when:** `tests/unit/ui/scaffold/scaffoldProgressReducer.test.ts` covers start → progress ×3 → result → reset.

- [x] **Step 11** — Create `src/ui/components/scaffold/ScaffoldStepList.tsx`:

  - Props: `{ steps: ScaffoldStepState[]; failedStep?: ScaffoldStepId | null }`.
  - Render ordered list matching `SCAFFOLD_STEPS`; failed step row gets `#fde8e8` background (match Bootstrap error styling).
  - Wrap progress region in container with `role="progressbar"`, `aria-valuemin={0}`, `aria-valuemax={steps.length}`, `aria-valuenow={countCompletedSteps}`.
  - Reuse `ProgressBar` from `@/ui/components/ProgressBar` if compatible.

  **Done when:** component test renders 7 rows; progressbar attrs present.

### Pure UI helpers

- [x] **Step 12** — Create `src/ui/components/variantMatrixPreview.ts`:

  ```ts
  export function countVariantCrossProduct(
    matrix: ComponentSpecV1['variantMatrix'],
  ): number;

  export function detectCssSelectorWarnings(
    bindings: ComponentSpecV1['bindings'],
  ): string[];
  ```

  - Cross-product = ∏ axis option lengths (empty axis → factor 1).
  - Warning if any `binding.selector.startsWith('.')`.

  **Done when:** unit test: 12-variant canonical fixture returns 12; `.button` triggers warning.

- [x] **Step 13** — Create `src/ui/components/scaffold/validateSpecDraft.ts`:

  ```ts
  export type SpecValidationResult =
    | { ok: true }
    | { ok: false; errors: string[] };

  export async function validateComponentSpecDraft(
    draft: ComponentSpecV1,
  ): Promise<SpecValidationResult>;
  ```

  - Validate against JSON Schema (import schema from contracts package or AJV precompiled in test-only path — **bundle decision:** use `@detroitlabs/figmint-contracts` validator export if exists; else dynamic `fetch` of schema in UI is forbidden; prefer shared `validateComponentSpecV1` from contracts if available).
  - Parse-editable JSON fields: if user edits matrix/props/bindings textareas, `JSON.parse` errors surface as `{ ok: false, errors: ['Invalid JSON in bindings'] }`.

  **Done when:** invalid draft disables Scaffold CTA in component test; canonical fixture passes.

### Tab shell + App integration

- [x] **Step 14** — Update `src/ui/App.tsx`:

  ```ts
  type AppTab = 'bootstrap' | 'components' | 'export' | 'settings';
  ```

  Nav button order: **Bootstrap** → **Components** → **Export** → **Settings** (PRD §7.3).

  | Button | `aria-current` | Active bg |
  | ------ | -------------- | --------- |
  | Each tab | `'page'` when active | `#f0f0f0` |

  Conditional render:

  ```tsx
  {activeTab === 'components' ? <Components /> : ...}
  ```

  Keep App-level `registerSinkMessageListener()` + `registerExportMessageListener()` unchanged.

  **Done when:** Vitest or manual: four tabs visible; Components renders placeholder then full tab.

- [x] **Step 15** — Accessibility pass on `App.tsx` nav:

  - `nav` retains `aria-label="Figmint tabs"`.
  - Tab buttons keyboard-focusable; `aria-current` toggles per active tab.
  - **Done when:** ticket AC row 9 satisfied in VQA checklist.

### Components tab — registry path (UC-2)

- [x] **Step 16** — Extend `StoredGitHubConfig` in `src/io/github/storage.ts`:

  ```ts
  export interface StoredGitHubConfig {
    tokensPath: string;
    registryPath?: string; // default applied at read sites
    defaultBranch?: string;
    exportBasePath?: string;
  }
  ```

  Default registry path constant: `DEFAULT_REGISTRY_PATH = '.figmint-registry.json'` in new `src/ui/components/scaffold/constants.ts`.

  Settings UI field for `registryPath` is **optional in WO-027** — if omitted, Components tab uses default. Document in Step 16 comment.

  **Done when:** typecheck passes; existing Settings save/load still works when `registryPath` absent.

- [x] **Step 17** — Create `src/ui/components/scaffold/loadRegistryFromRepo.ts` (UI-side, wraps existing IO):

  ```ts
  export async function loadRegistryForComponentsTab(
    repoUrl: string,
    registryPath: string,
  ): Promise<
    | { ok: true; registry: RegistryV1 }
    | { ok: false; message: string }
  >;
  ```

  - Calls `loadFromGitHub(repoUrl, registryPath)` from `@/io/sources/github`.
  - Parse + validate `kind === 'registry'`.
  - Surface relay/OAuth errors as actionable strings.

  **Done when:** unit test mocks `loadFromGitHub` success/failure.

- [x] **Step 18** — Create `src/ui/components/scaffold/resolveComponentSpec.ts`:

  ```ts
  export const SPEC_RESOLUTION_PATHS = [
    (key: string) => `design/components/${key}.component-spec.v1.json`,
    (key: string) => `design/component-specs/${key}.v1.json`,
  ] as const;

  export async function resolveComponentSpecFromRepo(
    repoUrl: string,
    componentKey: string,
  ): Promise<
    | { ok: true; spec: ComponentSpecV1; path: string }
    | { ok: false; message: string; triedPaths: string[] }
  >;
  ```

  Resolution order (research §3 table):

  | Priority | Path |
  | -------- | ---- |
  | 1 | `design/components/{key}.component-spec.v1.json` |
  | 2 | `design/component-specs/{key}.v1.json` |
  | 3 | Dev-only: `import.meta.env.DEV && loadBenchFixture('component-spec-button-canonical')` — **never** in production build |
  | 4 | Error: `"No component-spec on disk for {key}"` |

  `{key}` = registry map key (slug). Display sorted keys in UI.

  Pass loaded `registry` into `scaffold/run` options.

  **Done when:** missing spec shows blocking error with tried paths; success sets draft.

### Components tab — paste path (UC-3)

- [x] **Step 19** — In `Components.tsx`, wire WO-006 source ports (same imports as Bootstrap):

  - `SourcePasteTextarea`, `SourceFilePicker`, `SourceDropZone`, `ClipboardBanner` + `useClipboardSources`.
  - Section heading **"Paste or load spec"** — 13px semibold.

  **Done when:** paste path renders without duplicating IO logic.

- [x] **Step 20** — Implement `applyLoadedDocument` in `Components.tsx`:

  ```ts
  function applyLoadedDocument(doc: LoadedDocument) {
    if (doc.kind === 'component-spec') {
      setDraft(cloneSpec(doc.payload as ComponentSpecV1));
      setIngestError(null);
      setSourceLabel(`Loaded component-spec via ${doc.sourceMeta.port}`);
      return;
    }
    if (doc.kind === 'registry') {
      setRegistry(doc.payload as RegistryV1);
      setIngestError(null);
      setSourceLabel(`Loaded registry via ${doc.sourceMeta.port}`);
      return;
    }
    setIngestError(
      `Expected component-spec or registry, got "${doc.kind}". Token files belong on the Bootstrap tab.`,
    );
  }
  ```

  Reject `tokens-dtcg`, `tokens-legacy`, `ops-program`, etc. with actionable copy.

  **Done when:** Vitest ingest kind filter test passes; tokens show error string.

### Spec preview panel

- [x] **Step 21** — Create `src/ui/components/scaffold/SpecPreviewPanel.tsx`:

  Props:

  ```ts
  export interface SpecPreviewPanelProps {
    draft: ComponentSpecV1 | null;
    variantCount: number;
    selectorWarnings: string[];
    validation: SpecValidationResult | null;
    onEditVariantMatrix: (json: string) => void;
    onEditProps: (json: string) => void;
    onEditBindings: (json: string) => void;
  }
  ```

  Display (read-only header): `name`, `framework`, `archetype`, `layout`.
  Editable monospace textareas (min height 80px) for `variantMatrix`, `props`, `bindings`.
  Badge: **`{variantCount} variants`**.
  Show first 3 binding selectors + total count.
  Validation errors list in `#b00020`.

  **Done when:** component test renders preview for canonical fixture; edit callbacks update draft in parent.

- [x] **Step 22** — Scaffold CTA enablement in `Components.tsx`:

  ```ts
  const canScaffold =
    draft !== null &&
    validation?.ok === true &&
    !progressState.running;
  ```

  Button label **"Scaffold component"**; disabled styling `opacity: 0.5`, `cursor: 'not-allowed'`.

  **Done when:** invalid JSON keeps CTA disabled; valid canonical enables.

- [x] **Step 23** — On Scaffold click:

  ```ts
  dispatchProgress({ type: 'scaffold/start' });
  setShowAudit(true);
  setShowRegistryExport(false);
  parent.postMessage(
    {
      pluginMessage: {
        type: 'scaffold/run',
        spec: draft,
        options: { registry: registry ?? undefined },
      },
    },
    '*',
  );
  console.debug('[ui] scaffold/run', { name: draft.name, variantCount });
  ```

  **Done when:** integration test mocks listener and asserts postMessage shape.

### Components tab — progress, audit, errors

- [x] **Step 24** — `useEffect` message listener in `Components.tsx` (pattern from `Bootstrap.tsx` L142+):

  ```ts
  useEffect(function () {
    function onMessage(event: MessageEvent) {
      const msg = (event.data as { pluginMessage?: unknown }).pluginMessage;
      if (isScaffoldProgressMessage(msg)) {
        console.debug('[ui] scaffold/progress', msg.step, msg.status);
        dispatchProgress(msg);
      }
      if (isScaffoldResultMessage(msg)) {
        dispatchProgress(msg);
        setShowRegistryExport(true);
      }
      if (isScaffoldErrorMessage(msg)) {
        dispatchProgress(msg);
      }
    }
    window.addEventListener('message', onMessage);
    return function () {
      window.removeEventListener('message', onMessage);
    };
  }, []);
  ```

  **Done when:** progress steps advance in integration test.

- [x] **Step 25** — Audit + error surfacing:

  - Render `<AuditPanel audits={progressState.audits} defaultExpandedFailed />` when `showAudit && audits.length > 0`.
  - `AuditPanel` failed rules expanded first (pass prop if exists; else sort audits with failures first).
  - Global error banner below CTA when `progressState.error` set: red border, include `failedStep` label from `getScaffoldStepLabel`.
  - Partial canvas preserved on error — no UI rollback messaging needed.

  **Done when:** failed audit rows visible; error banner shows step name.

### ExportSheet integration (Settings-adjacent patterns)

- [x] **Step 26** — Post-success registry export block in `Components.tsx`:

  Match Export tab sandbox pattern (`App.tsx` L100–131) — **inline** below progress, not modal.

  ```tsx
  {showRegistryExport && resultRegistry && (
    <section aria-label="Registry export">
      <p style={{ fontSize: 11, color: '#666' }}>
        Scaffold complete — export the updated registry to sync your repo. Nothing is committed until you confirm.
      </p>
      <ExportSheet
        document={{ kind: 'registry', payload: resultRegistry }}
        title="Update registry"
        defaultSinks={
          github.connected ? ['download', 'github-pr'] : ['download']
        }
        onComplete={function () {
          setShowRegistryExport(false);
        }}
        onCancel={function () {
          setShowRegistryExport(false);
        }}
      />
    </section>
  )}
  ```

  Pre-fill path: pass initial path via ExportSheet state — use `defaultExportBasename` → `.figmint-registry` + user-editable `.json` extension in path field (WO-020 `exportSheetReducer`).

  Use `prepareRegistryExport(resultRegistry, { defaultSinks: github.connected ? ['download', 'github-pr'] : ['download'] })` from WO-026 — **not** `runRegistryExportFlow` (registry already merged on main thread).

  Registry kind: Markdown checkbox hidden (`isRegistry` branch in ExportSheet).

  **Done when:** integration test opens ExportSheet on `scaffold/result`; FR-SCAF-6 no auto-PR; export CTA keyboard-focusable (`tabIndex={0}` or native button).

- [x] **Step 27** — GitHub disconnected registry section UX:

  When `!github.connected`:

  - Registry pick panel `opacity: 0.6`, `pointerEvents: 'none'`.
  - Hint: `"Connect GitHub in Settings to pick components from your repo."` with button **"Open Settings"** calling `onNavigateSettings?.()` prop OR document that user switches tab manually (prefer callback prop drilled from App: `onOpenSettings={() => setActiveTab('settings')}`).

  Paste path remains enabled (UC-3 without GitHub).

  ExportSheet: `github-pr` sink hidden via `availableSinks()` when disconnected (existing WO-020 behavior).

  **Done when:** disconnected state renders hint; paste still works; export sheet omits PR sink.

### Primary tab assembly

- [x] **Step 28** — Implement `src/ui/tabs/Components.tsx` layout sections:

  | Section | Content |
  | ------- | ------- |
  | **Registry** (UC-2) | Load registry button, sorted key `<select>`, spec resolve status |
  | **Paste or load** (UC-3) | Source ports |
  | **Preview** | `SpecPreviewPanel` |
  | **Actions** | Scaffold CTA |
  | **Progress** | `ScaffoldStepList` + optional `ProgressBar` |
  | **Audit** | `AuditPanel` |
  | **Export** | `ExportSheet` block |

  Use `useGitHubConnect` with `repoUrl` + `tokensPath` from Settings clientStorage read pattern (mirror Settings.tsx — read config on mount).

  Style tokens (inline until design system chrome):

  ```ts
  const SECTION_HEADING: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    margin: '0 0 8px',
  };
  const SECTION_BORDER: React.CSSProperties = {
    border: '1px solid #ccc',
    borderRadius: 4,
    padding: 12,
  };
  ```

  **Done when:** file <500 lines preferred; all sections render; ticket FR-1 satisfied.

### Tests + CI

- [x] **Step 29** — Vitest message guards: `tests/unit/io/messages/scaffold.test.ts` (Step 1).

  **Done when:** guards cover all four message types; `SCAFFOLD_STEPS.length === 7`; test file green in CI.

- [x] **Step 30** — Integration test `tests/unit/ui/tabs/Components.scaffold.integration.test.tsx`:

  - Mock `window.addEventListener` + simulate `scaffold/progress` × N + `scaffold/result`.
  - Assert ExportSheet region appears (`getByLabelText('Registry export')` or title "Update registry").
  - Use `@testing-library/react` (already in repo from WO-020).

  **Done when:** test passes in CI.

- [x] **Step 31** — Ingest + preview unit tests:

  - `tests/unit/ui/scaffold/variantMatrixPreview.test.ts`
  - `tests/unit/ui/scaffold/ingestKindFilter.test.ts` — token rejection copy
  - `tests/unit/ui/scaffold/resolveComponentSpec.test.ts` — path order

  **Done when:** `npm run test` green.

- [ ] **Step 32** — Manual VQA + SPK-027-1 (**deferred to `/vqa`** — procedure documented below; SPK-027-1 G2 timing not run in this build):

  | Step | Action |
  | ---- | ------ |
  | 1 | Plugin Sandbox `file_key=cVdPraIafWFBRZnzMPhtrW` |
  | 2 | Bootstrap tab → load `bootstrap-complete` bench fixture → Bootstrap run |
  | 3 | Components tab → registry pick Button OR paste `component-spec-button-canonical.json` |
  | 4 | Scaffold → record `totalDurationMs` from result (target p50 < 5000 ms over 3 runs) |
  | 5 | ExportSheet → download `.figmint-registry.json` → validate schema |

  Update ticket VQA table rows 1–11 during `/vqa`.
  Design mock `node_id`: **N/A — panel-only VQA** until Figmint design file linked.

  **Done when:** SPK-027-1 logged in VQA report; G2 gate recorded.

- [x] **Step 33** — CI gate: `npm run lint && npm run typecheck && npm run test && npm run build`.

  **Done when:** all commands pass on PR branch.

---

## Build Agents

### Phase 0 (sequential — gate)

- `code-build` — **Step 0**: Verify WO-022..026 exports exist; abort build if stub plans or missing modules.

### Phase 1 (parallel — contracts + fixtures)

- `code-build` — **Steps 1–2**: `scaffold.ts` message contract + canonical fixture.

### Phase 2 (parallel — main thread)

- `code-build` — **Steps 3–9**: `runScaffold.ts` pipeline + `main.ts` dispatch.

### Phase 3 (parallel — UI primitives)

- `code-build` — **Steps 10–13**: progress reducer, step list, variant preview, spec validation.

### Phase 4 (parallel — tab shell)

- `code-build` — **Steps 14–15**: `App.tsx` tab integration + a11y.

### Phase 5 (parallel — data paths)

- `code-build` — **Steps 16–20**: GitHub registry config, resolve/load helpers, ingest wiring.

### Phase 6 (parallel — preview + orchestration UI)

- `code-build` — **Steps 21–25**: SpecPreviewPanel, CTA, listener, audit/error UX.

### Phase 7 (parallel — export + assembly)

- `code-build` — **Steps 26–28**: ExportSheet block, disconnected guards, full `Components.tsx`.

### Phase 8 (sequential — verification)

- `code-build` — **Steps 29–33**: Vitest suite + CI + VQA procedure handoff.

---

## Dependencies & Tools

| Dependency | Role in WO-027 |
| ---------- | -------------- |
| WO-006 | `loadFromPaste`, `loadFromFile`, `detectContract`, source UI widgets |
| WO-016 | GitHub OAuth + `loadFromGitHub` contents relay |
| WO-020 | `ExportSheet`, `runExport`, `defaultExportBasename`, sink guards |
| WO-022 | `scaffold()` step 1 |
| WO-023 | `applyBindings()` step 2 |
| WO-024 | `applyProperties()` step 3 |
| WO-025 | `buildUsageFrame()` step 4 |
| WO-026 | `mergeRegistryEntry`, `buildRegistryEntry`, `buildRegistryAuditRows`; UI: `prepareRegistryExport`, `loadRegistryFromGitHub` |
| WO-010 | `AuditPanel`, `AuditReportV1` display |
| WO-015 | Bootstrap orchestration pattern (reference only) |

| Tool | Usage |
| ---- | ----- |
| Vitest + Testing Library | UI/reducer/integration tests |
| `@detroitlabs/figmint-contracts` | `ComponentSpecV1`, `RegistryV1`, schema validation |
| Figma Plugin Sandbox | SPK-027-1 manual VQA |
| `pluginLog()` / `console.debug` | Telemetry per ticket |

**No MCP required for build.** Figma VQA at `/vqa` may use Figma MCP read-only for screenshot compare.

---

## Open Questions

| ID | Question | Resolution |
| -- | -------- | ---------- |
| OQ-1 | Design mock `node_id` for Components tab | **Deferred** — panel-only VQA on Plugin Sandbox until design file linked; fill `ticket.md` VQA table during `/vqa` |
| OQ-2 | Structured editors vs JSON textareas | **RESOLVED:** JSON textareas v1 (research D4) |
| OQ-3 | Settings `registryPath` input field | **RESOLVED:** optional — default `.figmint-registry.json` in Components tab; Settings field follow-on if needed |
| OQ-4 | ExportSheet inline vs modal | **RESOLVED:** inline below progress (matches Export tab sandbox + research D6) |
| OQ-5 | Repo spec path convention | **RESOLVED:** ordered list in Step 18; document in `Docs/` only if ticket explicitly requires — otherwise constants in code |

---

## Notes

### Build agent (WO-027 code-build, 2026-05-28)

- Steps 0–31, 33 complete on `main` (uncommitted). Step 32 + sandbox VQA deferred to `/vqa`.
- Vitest: 22 tests in `tests/unit/io/messages/scaffold.test.ts`, `tests/unit/ui/scaffold/*`, `tests/unit/ui/tabs/Components.scaffold.integration.test.tsx` — all green.
- Registry contract: UI `loadRegistryForComponentsTab` → `options.registry` on `scaffold/run`; main `upsertRegistryEntry`; UI `prepareRegistryExport(result.registry)` (not `runRegistryExportFlow`).

- **ES2017:** No optional chaining in `src/main.ts` guards; UI bundle may use modern syntax per Vite config.
- **Logging:** `console.debug('[ui] scaffold/...')` in iframe; `pluginLog('[main] scaffold/...')` on main thread — never `console.log` in plugin sandbox production paths.
- **Wrong vs correct:**

  | Wrong | Correct |
  | ----- | ------- |
  | Scaffold from UI via Figma MCP | `scaffold/run` postMessage → main thread |
  | Auto-open GitHub PR after scaffold | ExportSheet confirmation gate |
  | Use `component-spec-button.json` IO fixture for VQA | `tests/fixtures/component-spec-button-canonical.json` |
  | Silent ignore token paste on Components tab | Actionable error directing to Bootstrap |
  | Duplicate paste IO logic | Reuse `@/ui/sources/*` widgets |
  | `loadRegistryFromGitHub` on main thread | UI loads registry (Steps 17–18); passes `options.registry` on `scaffold/run` |
  | `runRegistryExportFlow` after every scaffold | `prepareRegistryExport(result.registry)` — merge already on main |

- **Extract vs greenfield (reuse map):**

  | Pattern | Reuse from | WO-027 usage |
  | ------- | ---------- | ------------ |
  | Tab shell + inline styles | `App.tsx` Bootstrap/Export tabs | Steps 14–15, 28 |
  | Progress reducer + step list | `bootstrapProgressReducer.ts`, Bootstrap step UI | Steps 10–11 |
  | Paste/file ingest | WO-006 `@/ui/sources/*` | Steps 19–20 |
  | GitHub contents read | WO-016 `loadFromGitHub` | Steps 17–18 via `loadRegistryFromGitHub` |
  | ExportSheet block | WO-020 Export tab sandbox (`App.tsx` L100–131) | Steps 26–27 |
  | Main-thread orchestrator | WO-015 `runBootstrap` pattern | Steps 3–9 `runScaffoldComponent` |

- **Module tree (new files):**

  ```
  src/io/messages/scaffold.ts
  src/core/components/scaffold/runScaffold.ts
  src/ui/tabs/Components.tsx
  src/ui/components/scaffold/
    constants.ts
    scaffoldProgressReducer.ts
    ScaffoldStepList.tsx
    SpecPreviewPanel.tsx
    validateSpecDraft.ts
    loadRegistryFromRepo.ts
    resolveComponentSpec.ts
  src/ui/components/variantMatrixPreview.ts
  tests/fixtures/component-spec-button-canonical.json
  tests/unit/io/messages/scaffold.test.ts
  tests/unit/ui/scaffold/*.test.ts
  tests/unit/ui/tabs/Components.scaffold.integration.test.tsx
  ```

- **Bibliography:** `ticket.md`, `research/components-tab-forward-flow.md`, WO-015 bootstrap orchestration research, WO-020 export sheet research.

- **Phase 2 exit:** WO-027 is last Phase 2 ticket — merge only after WO-022..026 land on `main` or feature branch stack.

### Remediation research (2026-05-28 — manual SPK-027-1 failures)

Manual sandbox VQA confirmed **panel PASS**, **canvas FAIL**. See [scaffold-canvas-failure-remediation.md](research/scaffold-canvas-failure-remediation.md).

| Symptom | Root cause (locked) | Fix owner |
| ------- | ------------------- | --------- |
| Registry message for `registry.v1.schema.json` | Path points at JSON Schema, not RegistryV1 instance | WO-027 UX validation |
| Property audit 4/6 fail, 48 add failures | `applyProperties` runs **post-`combineAsVariants`**; all `addComponentProperty` throws | **WO-024** — move pre-combine (legacy timing) |
| Button 1×1 px masters | Chip archetype missing `layoutSizing*`; mocks don't reset sizing at combine | **WO-022** — post-combine hug normalization |
| Usage/doc "wrong page" | FR-SCAF-5 gallery on Components page by design; v60 Foundations doc out of scope | WO-025 copy + future doc ticket |
| Push stats 0/0/0 beside component audit | `AuditPanel` always shows variable summary | WO-027 hide for component scope |

**Blockers before re-VQA:** SPK-027-2 (property API timing), SPK-027-3 (variant geometry). WO-027 Step 32 remains blocked.

**Tab persistence:** resolved separately — `TabPanel` keep-alive in `App.tsx` (all tabs mounted).

### Registry UX intent (2026-05-28 — defer build)

Designer expected **Load registry** = codebase component catalog + multiselect scaffold. Actual = **sync ledger** (`.figmint-registry.json`). Captured in [registry-ux-intent.md](research/registry-ux-intent.md): rename/copy, empty states, move registry path to **Settings**, future WO-044 / spec-discovery. See ticket **Deferred product intent** section.
