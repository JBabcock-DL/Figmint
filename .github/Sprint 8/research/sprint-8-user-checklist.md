# Sprint 8 — Figma plugin VQA checklist (Phase 4a)

> **Agent status (2026-05-29):** Build + automated VQA complete. User sandbox sign-off received — all checklist flows pass. Tickets on Project #9 → **Completed**.

## Before you start

1. `npm run build`
2. **Re-import** the dev plugin from `dist/manifest.json` (Plugins → Development → Import plugin from manifest…) — required after manifest/build changes; reload alone is not enough.
3. Open [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) (`file_key=cVdPraIafWFBRZnzMPhtrW`)
4. Settings → connect GitHub to **FigHub** (or a repo containing [sandbox fixtures](../../tests/fixtures/sandbox-import/README.md))

### Sandbox sample sources (in repo)

| Use case | GitHub path (FigHub repo) |
|----------|---------------------------|
| Full Button import (24 variants) | `tests/fixtures/sandbox-import/components/ui/button.tsx` |
| Registered + unknown deps | `tests/fixtures/sandbox-import/components/ui/alert.tsx` |
| Token resolver CSS detect | `tests/fixtures/sandbox-import/app/globals.css` |
| Repo registry supplement | `tests/fixtures/sandbox-import/.fighub-registry.json` |

Copy instructions: [tests/fixtures/sandbox-import/README.md](../../tests/fixtures/sandbox-import/README.md)

Golden Button spec (compare preview): [tests/fixtures/component-spec-button-canonical.json](../../tests/fixtures/component-spec-button-canonical.json)

---

## 0 — Plugin shell (required first)

### 0.1 Plugin opens

- [ ] Run plugin — **no** console error `SyntaxError: possible import expression rejected`
- [ ] FigHub window renders (not blank white box)
- [ ] Version label visible in header

### 0.2 UTF-8 copy (text helpers / UI strings)

- [ ] Settings or Components tab → GitHub status shows middle dot correctly: `Connected · scope=repo` (not `Connected Â· scope`)
- [ ] Repo sync card helper text shows arrows: `→ Commit → Push` (not `â†'` / `âŸ`)
- [ ] Em dashes render: `Not detected — using defaults` (not `â€"`)

**If mojibake returns:** rebuild and re-import plugin; confirm `dist/code.js` passes build guard (no literal `import(`).

---

## WO-039 — Interfaces (no sandbox required)

- [ ] Skim `src/core/import/index.ts` + `src/core/codeconnect/index.ts` exports
- [ ] Optional: confirm downstream tickets compile (CI)

**VQA:** [WO-039/research/vqa-report.md](../WO-039-mapping-template-and-import-template-interfaces/research/vqa-report.md) — **Ship (automated)**

---

## WO-042 — Token resolver

**Fixture:** `tests/fixtures/sandbox-import/app/globals.css` on connected repo default branch.

- [ ] Settings → Token resolver shows detected source (Tailwind v4 `@theme` or similar label)
- [ ] Save override JSON: `{"bg-primary":"color/primary/default"}` → re-import **button.tsx** → bindings resolve in preview
- [ ] Clear override → auto-detect from repo CSS still works

**VQA:** [WO-042/research/vqa-report.md](../WO-042-token-resolver-tailwind-css-vars/research/vqa-report.md) — **Ship (automated)**

---

## WO-043 — Dependency scanner

**Fixture:** `alert.tsx` + `.fighub-registry.json` (registers `icon`, not `badge`).

- [ ] Import **alert.tsx** → dependency tree shows **Icon** ✓ registered
- [ ] Same tree flags **Badge** ⚠ unknown (action choices visible)
- [ ] After scaffolding **button.tsx**, re-import alert → **Button** shows registered

**VQA:** [WO-043/research/vqa-report.md](../WO-043-dependency-scanner-subcomponent-handling/research/vqa-report.md) — **Ship (automated)**

---

## WO-041 — React parser

**Fixture:** `tests/fixtures/sandbox-import/components/ui/button.tsx`

- [ ] Import **button.tsx** → parse completes (spinner then preview; no main-thread crash)
- [ ] Spec preview: name **Button**, archetype **chip**
- [ ] Variant matrix **6 × 4 = 24** variants (`variant` × `size`)
- [ ] Props include `loading`, `disabled`, `variant`, `size`
- [ ] Edit preview (FR-IMP-7) → **Scaffold** enabled → ComponentSet on canvas

**VQA:** [WO-041/research/vqa-report.md](../WO-041-react-importfromcode-parser-ts-ast/research/vqa-report.md) — **Ship (automated)**

---

## WO-040 — Code Connect stubs

- [ ] Select unmapped scaffolded **Button** on canvas → Code Connect section lists it
- [ ] Multiselect → **Emit PR** → single GitHub PR with `*.figma.tsx` stub(s)
- [ ] Optional: `FIGMA_CONNECT_VALIDATE=1` + PAT → `npx figma connect validate` in [code-connect-consumer](../../tests/fixtures/code-connect-consumer)

**VQA:** [WO-040/research/vqa-report.md](../WO-040-react-code-connect-stub-generator/research/vqa-report.md) — **Ship (automated)**

---

## WO-056 — Catalog + batch scaffold

- [ ] Components tab → **Browse repo components** lists ≥1 `*.component-spec.v1.json` (or spec JSON in repo) without paste
- [ ] Multiselect 2–3 specs → **Scaffold selected** → progress per item
- [ ] Export tab → registry export includes scaffolded keys
- [ ] Tree fetch feels responsive (<3s on your network)

**VQA:** [WO-056/research/vqa-report.md](../WO-056-component-catalog-discovery-batch-scaffold/research/vqa-report.md) — **Ship (automated); sandbox required for closure**

---

## WO-044 — Import + Code Connect UI (E2E)

**Primary path:** Import **button.tsx** end-to-end.

- [ ] Components tab section order: Paste → Browse repo → **Import from repo** → **Code Connect** → Re-scaffold
- [ ] **Import from repo:** list files under `tests/fixtures/sandbox-import/components/ui/` → pick **button.tsx**
- [ ] Dependency tree → spec preview → edit → scaffold → registry updated
- [ ] Optional: post-scaffold Code Connect checkbox → stub PR
- [ ] **Code Connect:** detect unmapped → multiselect → single PR
- [ ] Framework picker: **React** enabled; Vue / WC / SwiftUI / Compose disabled with tooltip

**VQA:** [WO-044/research/vqa-report.md](../WO-044-components-tab-ui-import-cc-pr-flows/research/vqa-report.md) — **Ship (automated); sandbox E2E required for closure**

---

## Sign-off summary

| Ticket | Sandbox required | Check when done |
|--------|------------------|-----------------|
| WO-039 | No | Skim exports |
| WO-042 | Yes (CSS + import) | § WO-042 |
| WO-043 | Yes (alert.tsx) | § WO-043 |
| WO-041 | Yes (button.tsx) | § WO-041 |
| WO-040 | Yes (canvas + PR) | § WO-040 |
| WO-056 | Yes (catalog) | § WO-056 |
| WO-044 | Yes (full E2E) | § WO-044 |

---

## After sign-off

Move verified tickets to **Completed** on [FigHub Project #9](https://github.com/users/JBabcock-DL/projects/9) (drag cards or use `gh` GraphQL per ticket).

**Commit:** Review uncommitted Sprint 8 diff on `main` and commit when satisfied.

---

## Ignore (platform noise)

- `/api/custom_tools/owned_by_user` 404
- Permissions-policy violations (camera, microphone, clipboard)
- `[Local fonts] using agent`
