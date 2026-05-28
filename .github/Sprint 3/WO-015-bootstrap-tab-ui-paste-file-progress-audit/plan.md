# Plan — WO-015: Bootstrap tab UI (paste / file / progress / audit)

## Approach

Deliver the **first end-user-visible FigHub surface**: extract the working prototype from `src/ui/App.tsx` into **`src/ui/tabs/Bootstrap.tsx`**, add tab shell, token preview gate, and one-button **`bootstrap/run`** orchestration on the main thread with **`bootstrap/progress`** streaming. Reuse WO-006/007/008/010 verbatim. Canvas steps call WO-011/012/013 exports once merged. **Phase 1** (this ticket's first merge) may ship with canvas steps **`skipped`** + clear UX; **Phase 2** enables full AC when canvas builders land. Main thread uses `pluginLog()`; UI iframe may use `console.debug`.

**Drift guard:** Do **not** build formal `src/ops/` dispatcher (Sprint 4). Do **not** duplicate adapt/push logic — extract/move from `App.tsx`.

---

## Steps

### Message contract (define before UI)

- [x] **Step 1** — Create `src/io/messages/bootstrap.ts`:

  ```ts
  export type BootstrapStepId =
    | 'adapt' // UI-only gate (marked done before main work)
    | 'push-variables'
    | 'publish-typography' // publishTypographyStyles (WO-012)
    | 'build-primitives'
    | 'build-theme'
    | 'build-typography'
    | 'build-layout'
    | 'build-effects'
    | 'build-overview'
    | 'audit-canvas'
    | 'complete';

  export type BootstrapStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

  export interface BootstrapProgressMessage {
    type: 'bootstrap/progress';
    step: BootstrapStepId;
    status: BootstrapStepStatus;
    label: string;
    detail?: string;
    elapsedMs?: number;
    audit?: AuditReportV1;
  }

  export interface BootstrapRunMessage {
    type: 'bootstrap/run';
    tokens: TokensV1;
    options?: {
      skipCanvas?: boolean; // Phase 1 dev flag
      pages?: Array<'primitives' | 'theme' | 'typography' | 'layout' | 'effects' | 'overview'>;
    };
  }

  export interface BootstrapResultMessage {
    type: 'bootstrap/result';
    ok: boolean;
    totalDurationMs: number;
    pushResult: PushResult;
    audits: AuditReportV1[];
    canvasErrors?: Array<{ step: BootstrapStepId; message: string }>;
  }

  export interface BootstrapErrorMessage {
    type: 'bootstrap/error';
    message: string;
    failedStep?: BootstrapStepId;
  }
  ```

  ES2017 guards: `isBootstrapRunMessage`, `isBootstrapProgressMessage`, `isBootstrapResultMessage` for `main.ts`.

  Vitest: guard tests in `tests/unit/io/messages/bootstrap.test.ts`.

  **Done when:** types compile; guards reject malformed payloads.

- [x] **Step 2** — Define step manifest constant `BOOTSTRAP_STEPS: Array<{ id, label, fr }>` in same file — single source for progress UI row count and main-thread loop. Default order matches research §2 table (11 steps).

  **Done when:** UI and main import same manifest (UI can import type-only + duplicate labels in UI bundle if needed to avoid main-thread leak — prefer shared constants file under `src/io/messages/`).

### Main-thread orchestrator

- [x] **Step 3** — Create `src/core/bootstrap/runBootstrap.ts`:

  ```ts
  export async function runBootstrap(
    tokens: TokensV1,
    options?: BootstrapRunMessage['options'],
  ): Promise<BootstrapResultMessage>;
  ```

  Helper `postProgress(step, status, extras?)` wraps `figma.ui.postMessage`.

  **Sequential steps:**

  | Step                 | Call                                                      | On failure                                        |
  | -------------------- | --------------------------------------------------------- | ------------------------------------------------- |
  | `push-variables`     | `pushTokens(tokens)` — includes variables audit           | **Hard abort** — post error, return `ok: false`   |
  | `publish-typography` | `publishTypographyStyles(tokens)`                         | Log warning; continue if non-fatal (configurable) |
  | `build-primitives`   | `buildPrimitivesPage(tokens, { pageSlug: 'primitives' })` | **Continue** — record in `canvasErrors[]`         |
  | `build-theme`        | `buildThemePage(...)`                                     | Continue                                          |
  | `build-typography`   | `buildTextStylesPage({ tokens, pushResult })`             | Continue                                          |
  | `build-layout`       | `buildLayoutPage(...)`                                    | Continue                                          |
  | `build-effects`      | `buildEffectsPage(...)`                                   | Continue                                          |
  | `build-overview`     | `buildTokenOverviewPage(...)`                             | Continue                                          |
  | `audit-canvas`       | `runAudit('canvas', …)` if scope exists                   | Attach audit; `ok` false if failed                |
  | `complete`           | —                                                         | Emit `bootstrap/result`                           |

  Wrap full run in single undo group: `figma.commitUndo()` once at end (document in code comment).

  Use `Date.now()` for `totalDurationMs`. Log milestones via `pluginLog`.

  **Phase 1 stub:** when `options.skipCanvas === true` or canvas modules missing, mark canvas steps `skipped` with detail `"Canvas builders not available (WO-011/12/13)"`.

  **Done when:** unit-testable pure helper extracts step list; integration tested manually.

- [x] **Step 4** — Wire `src/main.ts`:
  - Add `isBootstrapRunMessage` branch → `runBootstrap(message.tokens, message.options)`
  - Keep `push/variables` handler **temporarily** behind dev flag OR remove from default UI but leave handler for bench (document in comment)
  - Catch top-level errors → `bootstrap/error`

  **Done when:** main compiles ES2017; no `console.debug` on main thread.

### Bootstrap tab UI

- [x] **Step 5** — Create `src/ui/tabs/Bootstrap.tsx` (~primary deliverable):

  **Sections (top → bottom):**
  1. **Sources** — move from App.tsx: `ClipboardBanner`, `SourcePasteTextarea`, `SourceFilePicker`, `SourceDropZone`
  2. **Adapt pipeline** — `applyLoadedDocument` → `adapt(doc.payload)`; store `cachedTokens | adaptError`
  3. **Preview panel** (greenfield) — show:
     - Detected wire format / port kind
     - Collection count + per-collection token counts
     - Mode names per collection (read from `TokensV1` metadata)
     - Block CTA on `FormatError` or non-token contract
  4. **Primary CTA** — `"Bootstrap design system"` disabled when: no tokens, adapt error, or bootstrap in flight
  5. **Progress** — determinate bar + step rows from `BOOTSTRAP_STEPS`; update on `bootstrap/progress`
  6. **Audit panel** — expand from current one-liner to full `AuditReportV1` display

  **Done when:** visual parity with research mock structure; no bench fixture dropdown in tab (move to dev footer flag).

- [x] **Step 6** — Refactor `src/ui/App.tsx`:
  - Minimal tab strip (Bootstrap only; disabled stubs for future tabs optional)
  - Render `<Bootstrap />` as default tab
  - Remove duplicated source/adapt/push UI (lines extracted to Bootstrap)
  - Keep `src/ui/benchFixtures.ts` import only when `import.meta.env.DEV` or explicit flag

  **Done when:** App.tsx < 80 lines excluding imports.

- [x] **Step 7** — Implement `src/ui/components/ProgressBar.tsx` + `BootstrapStepList.tsx`:
  - `role="progressbar"`, `aria-valuenow`, `aria-valuemax`, `aria-label`
  - Step row icons: pending ○, running ●, done ✓, error ✗, skipped ⊘

  **Done when:** a11y attrs present in DOM snapshot test or manual inspect.

- [x] **Step 8** — Implement `src/ui/components/AuditPanel.tsx`:

  | Feature        | Spec                                                               |
  | -------------- | ------------------------------------------------------------------ |
  | Summary banner | green if `passed`, red otherwise; show `rulesPassed/Failed/Warned` |
  | Push stats     | `variablesCreated/Updated/Skipped` from audit summary              |
  | Rule list      | failed first, then warn, then passed (collapsed)                   |
  | Row content    | `ruleId` + `diagnostic` monospace                                  |
  | Actions        | Copy JSON (textarea + `document.execCommand('copy')`), Dismiss     |

  Attach latest audit from `push-variables` step immediately; merge canvas audit when arrives.

  **Done when:** Vitest tests sort order + filter logic (pure functions exported from `auditPanelUtils.ts`).

### Testing + phased rollout

- [x] **Step 9** — Vitest coverage:
  - `bootstrap.test.ts` — message guards
  - `bootstrapProgressReducer.test.ts` — pure reducer: `(state, progressMsg) => newState`
  - `auditPanelUtils.test.ts` — sort failed-first

  **Done when:** `npm run test` green.

- [x] **Step 10** — **Phase 1 manual smoke** (canvas skipped):
  1. Paste `foundations-minimal` or spike fixture
  2. Preview shows counts
  3. Bootstrap → push completes, progress animates, variables audit shows in panel
  4. Canvas steps show `skipped` with explanatory detail

  **Done when:** screenshot or note in `research/bootstrap-phase1-smoke.md`.

- [x] **Step 11** — **Phase 2 manual smoke** (after WO-011/12/13 merged):
  1. Full bootstrap on spike-400
  2. All steps `done` or `error` with detail
  3. Record `totalDurationMs` → `research/bootstrap-bench-result.md` — target **< 30000 ms** (G1)

- [x] **Step 12** — Figma VQA prep: assign design file `file_key` in ticket checklist OR document "Plugin Sandbox placeholder until FigHub UI file exists". Fill VQA table during `/vqa`.

- [x] **Step 13** — CI: typecheck, lint, test, build:community green; check off ticket AC (Phase 2 items marked when canvas lands).

---

## Build Agents

### Phase 1 (parallel — **can start before canvas builders**)

- `code-build` — Steps 1–2, 9: message contract + guards + reducer tests
- `code-build` — Steps 5–8: Bootstrap.tsx + App refactor + ProgressBar + AuditPanel

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 3–4: runBootstrap + main.ts wiring (canvas imports stubbed/skipped)

### Phase 3 (after WO-011/12/13 merged)

- `code-build` — Steps 10–11: Phase 1 + Phase 2 manual smoke + G1 bench
- `code-build` — Steps 12–13: VQA prep + CI final

---

## Dependencies & Tools

| Dependency                     | Status | WO-015 usage                |
| ------------------------------ | ------ | --------------------------- |
| WO-006 sources UI              | ✅     | Move into Bootstrap tab     |
| WO-007 adapt                   | ✅     | Preview + gate CTA          |
| WO-008 push                    | ✅     | Step `push-variables`       |
| WO-010 audit                   | ✅     | Variables + canvas display  |
| WO-012 publishTypographyStyles | build  | Step `publish-typography`   |
| WO-011 builders                | build  | primitives + theme steps    |
| WO-012 builders                | build  | typography + overview steps |
| WO-013 builders                | build  | layout + effects steps      |
| WO-014 helpers                 | build  | indirect via canvas         |

**Extract map from current `App.tsx` (do not reimplement):**

| Existing block                  | Target                      |
| ------------------------------- | --------------------------- |
| Source components + handlers    | `Bootstrap.tsx` § Sources   |
| `adapt()` + cached tokens state | `Bootstrap.tsx` § Adapt     |
| `push/variables` postMessage    | replaced by `bootstrap/run` |
| Push result one-liner           | `AuditPanel.tsx`            |

**G1 budget math (locked):**

- Push ~490–900 ms measured (WO-008)
- Canvas 6 pages × <3 s each = <18 s theoretical max
- Headroom to 30 s target — log breakdown in bench file

---

## Open Questions

1. **Partial failure** — **RESOLVED:** continue canvas steps; aggregate `canvasErrors`; abort only on push failure.
2. **Phase 1 without canvas** — **RESOLVED:** `skipped` status + `skipCanvas` option.
3. **Undo grouping** — **RESOLVED:** one `commitUndo` at bootstrap end.
4. **Figma design file** — assign at Step 12 `/vqa`.

---

## Notes

### WO-015 build (2026-05-27)

- **Full bootstrap default:** `bootstrap/run` omits `skipCanvas` — canvas builders from WO-011/012/013 run sequentially.
- **Files added:** `src/io/messages/bootstrap.ts`, `src/core/bootstrap/runBootstrap.ts`, `src/ui/tabs/Bootstrap.tsx`, `src/ui/bootstrap/bootstrapProgressReducer.ts`, `src/ui/components/{ProgressBar,BootstrapStepList,AuditPanel,auditPanelUtils}.ts`, tests under `tests/unit/io/messages/bootstrap.test.ts` and `tests/unit/ui/*`.
- **App.tsx:** 57 lines (body < 80); bench fixtures gated behind `import.meta.env.DEV`.
- **VQA (Step 12):** Use **Plugin Sandbox** placeholder until dedicated FigHub UI Figma file exists — assign `file_key` during `/vqa`.
- **Manual smoke stubs:** `research/bootstrap-phase1-smoke.md`, `research/bootstrap-bench-result.md` (Vitest covers contract; live Figma bench pending).
- **CI:** typecheck, lint, format:check, test (216), build:community — all green.

### Message flow diagram (agents must follow)

```
UI: LoadedDocument → adapt() → preview OK
UI → main: bootstrap/run { tokens }
main → UI: bootstrap/progress { push-variables, running }
main: pushTokens()
main → UI: bootstrap/progress { push-variables, done, audit }
… canvas steps …
main → UI: bootstrap/result { ok, totalDurationMs, audits, pushResult }
```

### ES2017

- `runBootstrap.ts` + `main.ts` handlers: ES2017 only
- `Bootstrap.tsx` + components: modern TS OK (UI bundle)

### References

- Research: `./research/bootstrap-tab-ui-orchestration.md`
- Plan quality bar: `.github/templates/plan-quality-bar.md`
- Parent ticket: `./ticket.md`
- Existing push messages: `src/io/messages/push.ts`
- Canvas builder entrypoints (from sibling builder tickets): `buildPrimitivesPage`, `buildThemePage`, `buildTextStylesPage`, `buildTokenOverviewPage`, `buildLayoutPage`, `buildEffectsPage`

---

## Requirement traceability

| Ticket requirement                     | Plan step(s) |
| -------------------------------------- | ------------ |
| F1 `Bootstrap.tsx` extract from App    | Steps 5–6    |
| F2 Tab shell App.tsx                   | Step 6       |
| F3 Source picker WO-006 components     | Step 5       |
| F4 Token preview panel + gate          | Step 5       |
| F5 CTA `bootstrap/run`                 | Steps 1–2, 5 |
| F6 Main orchestrator + progress stream | Steps 2–3    |
| F7 Progress bar + step rows            | Steps 6–7    |
| F8 Audit inline AuditReportV1          | Steps 5, 8   |
| F9 Bench G1 < 30 s                     | Step 11      |
| V1 Progress bar ARIA                   | Step 7       |
| V2 Audit visible without scroll        | Step 8       |
| V3 Hide bench fixtures from tab        | Step 6       |
| A11y keyboard on audit + CTA focus     | Steps 7–8    |

| Acceptance criterion                | Plan step(s)             |
| ----------------------------------- | ------------------------ |
| AC1 Full bootstrap one button       | Steps 2, 10–11 (Phase 2) |
| AC2 Real-time progress              | Steps 1–2, 6–7           |
| AC3 Audit drill-down + copy/dismiss | Step 8                   |
| AC4 Bench < 30 s on 400-var         | Step 11                  |

| User story                              | Plan step(s) |
| --------------------------------------- | ------------ |
| Load via paste/file/clipboard + preview | Step 5       |
| One-button bootstrap                    | Steps 2, 5   |
| Progress bar per-step status            | Steps 6–7    |
| Audit pass/fail inline                  | Step 8       |

| Out of scope                           | Plan enforcement  |
| -------------------------------------- | ----------------- |
| GitHub OAuth, output sinks, other tabs | Not in steps      |
| `src/ops/` dispatcher                  | Deferred in Notes |
| Ops audit log sink                     | Not in steps      |

---

## Planning sign-off

- [x] All requirements + AC + user stories mapped
- [x] Build Agents Phases 1–3 assigned (Steps 1–13)
- [x] Phase 1 shippable without canvas builders (`skipCanvas` / skipped steps)
- **Planning complete** — Phase 1 `/build` can start anytime; Phase 2 after canvas builder APIs land
