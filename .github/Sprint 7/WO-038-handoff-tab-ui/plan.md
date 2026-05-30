# Plan — WO-038: Handoff tab UI

## Approach

Add the **Handoff** tab — Phase 3 GA surface — wiring canvas selection awareness, capture trigger, markdown preview, and inline **`ExportSheet`** (WO-020). Mirror **`ExportSandbox.tsx`** + **`Components.tsx`** patterns: UI sends **`handoff/capture`** to main; main returns **`handoff/capture-result`** with markdown + serializable `HandoffContextV1`; preview renders markdown in scrollable **`<pre>`** (no new markdown parser dependency).

Selection state syncs via **`handoff/selection`** postMessages broadcast from main (WO-037 Step 8). **Capture** button disabled when `count === 0`.

**In scope:** `Handoff.tsx`, `App.tsx` tab wiring, hooks, listener registration, Vitest component tests, VQA checklist prep.

**Out of scope:** In-plugin LLM ticket drafting, core capture logic (WO-034–037), new export sinks.

---

## Acceptance criteria traceability

| Ticket AC | Plan steps |
| --------- | ---------- |
| Select frame → Handoff tab → Capture → preview → Export → clipboard | Steps 3–8, 12, 15, 17 |
| End-to-end <1s capture (depends WO-037) | Steps 7, 16 |
| Vitest unit + integration | Steps 9–11, 14 |
| a11y: disabled capture, labeled preview | Steps 5, 10, 11 |

---

## Design reference (VQA prep)

| Field | Value |
| ----- | ----- |
| `file_key` | `cVdPraIafWFBRZnzMPhtrW` |
| `node_id` | **N/A** — panel-only code VQA (Vitest mock; no Figma design frame) |
| Frame / scope | Plugin window — Handoff tab (Capture, preview, ExportSheet) |
| Fallback styling | Match Bootstrap tab spacing tokens until token-bound UI chrome ships |

Update `ticket.md` Figma VQA Checklist when node id confirmed (Step 18).

---

## Steps

- [x] **Step 1** — Extend `AppTab` union in `src/ui/App.tsx`:

```typescript
type AppTab = 'bootstrap' | 'components' | 'handoff' | 'export' | 'settings';
```

- Add tab button **Handoff** between **Components** and **Export** (research D-038-1).
- Add `TAB_PANEL_IDS.handoff = 'fighub-tabpanel-handoff'`.
- Import and mount `<Handoff />` in `TabPanel`.
- **Done when:** tab renders; keyboard roving matches existing tabs.

- [x] **Step 2** — Create hook `src/ui/handoff/useHandoffSelection.ts`:

```typescript
export interface HandoffSelectionState {
  count: number;
  names: string[];
}

export function useHandoffSelection(): HandoffSelectionState;
```

- Subscribe to `handoff/selection` via `registerHandoffMessageListener`.
- Initial state `{ count: 0, names: [] }`.
- Request initial broadcast: on mount post `{ pluginMessage: { type: 'handoff/selection-request' } }` **if** main adds optional refresh message — otherwise rely on main init broadcast from WO-037.
- **Done when:** hook test updates count on mocked message.

- [x] **Step 3** — Create capture hook `src/ui/handoff/useHandoffCapture.ts`:

```typescript
export interface HandoffCaptureState {
  capturing: boolean;
  markdown: string;
  document: HandoffContextV1 | null;
  warnings: string[];
  error: string;
}

export function useHandoffCapture(): {
  state: HandoffCaptureState;
  capture: () => void;
  reset: () => void;
};
```

- `capture()` posts `{ pluginMessage: { type: 'handoff/capture', requestId: uuid() } }`.
- Listen for `handoff/capture-result` matching requestId.
- Set `capturing true` until result; block double-submit while capturing.
- **Done when:** hook test completes happy + error paths.

- [x] **Step 4** — Wire listeners in `src/ui/App.tsx` or `Handoff.tsx`:

```typescript
useEffect(function () {
  registerHandoffMessageListener({ … });
}, []);
```

- Ensure registered once (App-level alongside existing export/sink listeners).
- **Done when:** no duplicate handlers on tab switch.

- [x] **Step 5** — Implement `src/ui/tabs/Handoff.tsx`:

```typescript
export interface HandoffProps {
  github?: GitHubConnectState; // optional — for PR sink via ExportSheet
  repoUrl?: string;
}

export function Handoff(props: HandoffProps): JSX.Element;
```

Layout (top → bottom):

1. **Capture selection** primary button
   - `disabled={selection.count === 0 || capturing}`
   - `aria-disabled={selection.count === 0}`
   - `onClick={capture}`
2. Status line: `{count === 0 ? 'Select one or more frames in the canvas.' : `${count} frame(s) selected — ${names.join(', ')}`}`
3. Warnings list (if any) — small amber text
4. Preview region:
   - `<pre aria-label="Handoff preview" style={{ overflow: 'auto', maxHeight: '240px', … }}>{markdown || 'Capture a selection to preview handoff markdown.'}</pre>`
5. **ExportSheet** (inline, visible when `document !== null`):
   - `document={prepareHandoffExport(document).doc}`
   - Pass `defaultSinks={['clipboard']}` via prepareHandoffExport
   - `title="Export handoff"`

- **Done when:** RTL render test snapshot stable.

- [x] **Step 6** — Loading state on Capture:

- While `capturing`, button label **Capturing…** + `aria-busy={true}`.
- Disable ExportSheet while capturing.
- **Done when:** test asserts label change.

- [x] **Step 7** — Integrate `prepareHandoffExport` from WO-037:

```typescript
import { prepareHandoffExport } from '@/ui/handoff/prepareHandoffExport';
```

- Default formats md-only, clipboard sink on.
- **Done when:** ExportSheet receives correct `ContractDocument` kind.

- [x] **Step 8** — Clipboard export smoke in component test:

- Mock `runExport` / clipboard sink success.
- Click Export → assert clipboard path invoked with markdown content containing `# handoff-context v1`.
- **Done when:** test passes with mocked sinks.

- [x] **Step 9** — Vitest `tests/unit/ui/tabs/Handoff.test.tsx`:

| Case | Assert |
| ---- | ------ |
| count 0 | Capture disabled, hint text visible |
| count 2 | Capture enabled, names in status |
| capture success | preview shows markdown |
| capture error | error message, no ExportSheet |
| capturing | button busy state |

- Use `@testing-library/react` + mocked postMessage.
- **Done when:** all green.

- [x] **Step 10** — Accessibility tests in same file:

- Capture button `aria-disabled` when no selection.
- Preview `aria-label="Handoff preview"`.
- Tab order: Capture → Export sheet controls.
- **Done when:** axe optional or manual assertion list documented.

- [x] **Step 11** — Hook tests `tests/unit/ui/handoff/useHandoffSelection.test.ts` + `useHandoffCapture.test.ts`:

- Isolated hook tests with `renderHook` pattern if available, else component wrapper.
- **Done when:** both files green.

- [x] **Step 12** — Message contract alignment test `tests/unit/ui/handoff/messageContract.test.ts`:

- Assert UI sends `handoff/capture` shape matches `src/io/messages/handoff.ts`.
- Assert expected result fields consumed by hooks.
- **Done when:** compile-time + runtime guard.

- [x] **Step 13** — Optional main message `handoff/selection-request` — **skipped** (WO-037 init broadcast sufficient; see Notes).

- If selection desync reported on tab focus: Handoff tab `useEffect` on active posts refresh request; main re-broadcasts.
- Only implement if WO-037 init broadcast insufficient during manual test.
- **Done when:** documented in Notes as implemented or skipped.

- [x] **Step 14** — ExportSheet GitHub PR sink:

- Pass `github` + `repoUrl` props from App (same as Components tab) so PR sink available when OAuth connected — remains **off** by default.
- **Done when:** ExportSheet renders github-pr checkbox when flags allow.

- [ ] **Step 15** — Manual E2E checklist **SPK-038-1** (Plugin Sandbox):

1. Open Handoff tab
2. Select frame on canvas
3. Capture → preview populated < 1s
4. Export → paste in Slack/external → screenshot + tables visible
- **Done when:** `/vqa` log.

- [ ] **Step 16** — Performance assertion during manual E2E:

- Observe `durationMs` in capture-result — should be `< 1000` for single frame.
- **Done when:** recorded in VQA.

- [x] **Step 17** — Component props + reducer actions map (documentation in test file):

| UI state | Source | Action |
| -------- | ------ | ------ |
| `selection.count` | `handoff/selection` | passive |
| `capturing` | local hook | `capture()` |
| `markdown` | `handoff/capture-result` | passive |
| `document` | capture-result | drives ExportSheet |
| Export formats/sinks | ExportSheet reducer | user toggle |

- **Done when:** table in `Handoff.test.tsx` header.

- [ ] **Step 18** — Update `ticket.md` Figma VQA Checklist with design node ids when mock located:

- Fill `file_key`, `node_id`, deep link, `Captured at` ISO date.
- **Done when:** ticket table no longer placeholder TBD.

- [x] **Step 19** — CI gate:

```bash
npm run lint && npm run typecheck && npm run test -- tests/unit/ui/tabs/Handoff.test.tsx tests/unit/ui/handoff
```

- **Done when:** all green.

- [x] **Step 20** — Regression guard: existing tabs unaffected

- Run full UI test suite: `npm run test -- tests/unit/ui/tabs`.
- Assert Bootstrap, Components, Export, Settings tests still pass after App.tsx changes.
- **Done when:** no regressions in CI.

- [ ] **Step 21** — Document build order in PR description template (for human reviewers):

```
Build order: WO-034 → WO-035 + WO-036 (parallel) → WO-037 → WO-038
```

- **Done when:** noted in PR body when WO-038 merges — no code change required in this step beyond checklist completion.

---

## Build Agents

### Phase 1 (parallel) — blocked on WO-037 message contract merged

- `code-build` — Steps 1–4: App tab, hooks, listener wiring

### Phase 2 (parallel, after Phase 1)

- `code-build` — Steps 5–8: Handoff.tsx layout, loading, export integration

### Phase 3 (parallel, after Phase 2)

- `code-build` — Steps 9–14: component, a11y, hook, contract tests, GitHub props

### Phase 4 (after Phase 3)

- `code-build` — Steps 15–21: manual E2E checklist, VQA table update, CI, regression guard

---

## Dependencies & Tools

| Dependency | Role |
| ---------- | ---- |
| WO-037 | `handoff/capture`, `handoff/capture-result`, `handoff/selection`, `prepareHandoffExport` |
| WO-020 | `ExportSheet`, `runExport` |
| WO-016 | Optional GitHub PR sink |
| `@testing-library/react` | Component tests (already in devDeps from WO-020) |
| Plugin Sandbox | SPK-038-1 manual VQA |

---

## Open Questions

- **RESOLVED:** Preview in `<pre>` not full MD renderer (research D-038-2).
- **RESOLVED:** Selection via postMessage (research D-038-3).
- **RESOLVED:** No in-plugin LLM (ticket out of scope).
- **TBD at build:** Exact Figma mock `node_id` — fill Step 18 during implementation.

---

## Notes

- All panels stay mounted per `App.tsx` pattern — Handoff tab must not unmount hooks on tab switch.
- Style tokens: reuse inline styles from Bootstrap/Components tabs (11px labels, `#666` secondary text, 4px radius buttons) until design mock linked.
- Do not import `@/core/handoff/build` in UI — messages only.
- Step 13 (`handoff/selection-request`): skipped — relies on WO-037 main init `handoff/selection` broadcast.
- Bibliography: `research/handoff-tab-ui.md`, `src/ui/tabs/ExportSandbox.tsx`, `src/ui/components/ExportSheet.tsx`.

---

## Phased delivery if WO-037 not merged

If WO-037 lands after WO-038 UI shell:

1. Ship tab with Capture disabled + banner “Handoff pipeline unavailable”.
2. Enable Capture when `handoff/capture-result` handler detected (feature flag or version check).

Prefer **WO-037 before WO-038 build** per sprint dependency order.
