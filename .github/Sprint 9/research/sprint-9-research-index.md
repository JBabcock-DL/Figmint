# Sprint 9 research index — Vue + Web Components (Phase 4b)

> **Status:** ✅ Plans ready for `/build` (2026-05-30)
> **PRD:** §6.3 FR-IMP-*, §6.7 FR-CC-*, §6.9 FR-CONF-*, §12 Phase 4b
> **All tickets:** In Planning on Project #9

---

## Build order (locked)

```
WO-045 (Vue SFC parser + CC) ──┐
                                 ├── WO-047 (shared web token resolver)
WO-046 (WC CEM parser + CC) ───┘
```

**Parallel windows:**

- WO-045 and WO-046 can build in parallel after Sprint 8 (WO-039..044) is complete
- WO-047 merges resolver hardening after both parsers land (needs Vue scoped + WC shadow fixtures)
- Framework picker: enable `vue` and `wc` when respective templates register (no WO-044 UI ticket — extend existing Components tab)

**Upstream (Sprint 8 — Completed):** WO-039 interfaces, WO-040 React CC stub, WO-041 React parser, WO-042 token resolver, WO-043 dependency scanner, WO-044 import UI shell.

---

## Cross-ticket matrix

| Ticket | Produces | Consumes | Blocks |
| ------ | -------- | -------- | ------ |
| **WO-045** | `VueImportTemplate`, `VueMappingTemplate`, `.vue` parse pipeline | WO-039, 040, 041, 042 | WO-047 Vue fixtures |
| **WO-046** | `WebComponentsImportTemplate`, `WCMappingTemplate`, CEM reader | WO-039, 040, 041, 042 | WO-047 WC fixtures |
| **WO-047** | `webTokenResolver.ts` facade, scoped/shadow CSS token paths | WO-042, 045, 046 | — |

---

## Shared infrastructure

| Concern | Owner | Path |
| ------- | ----- | ---- |
| Import parse (UI iframe) | WO-045/046 | Extend `runImportParseExec.ts` + `ImportParseExecMessage.framework` |
| Code Connect HTML parser | WO-045/046 | `@figma/code-connect/html`, stub ext `.figma.ts` |
| Token resolver (Tailwind) | WO-042 (unchanged) | `src/core/import/shared/tokenResolver/` |
| Web-family CSS resolver | WO-047 | `src/core/import/shared/webTokenResolver.ts` |
| Framework picker gating | WO-045/046 | `src/ui/components/codeconnect/FrameworkPicker.tsx` |
| Stub path resolver | WO-045/046 | Extend `resolveStubPath.ts` for `.figma.ts` |

---

## Research artifacts

| Ticket | File | Plan-ready |
| ------ | ---- | ---------- |
| WO-045 | [vue-sfc-parser-code-connect-import-template](../WO-045-vue-sfc-parser-cc-generator-import-template/research/vue-sfc-parser-code-connect-import-template.md) | ✅ |
| WO-046 | [web-components-parser-cem-code-connect](../WO-046-web-components-parser-cem-cc-import/research/web-components-parser-cem-code-connect.md) | ✅ |
| WO-047 | [shared-web-token-resolver-hardening](../WO-047-shared-web-token-resolver-hardening/research/shared-web-token-resolver-hardening.md) | ✅ |

---

## Locked product decisions

1. **Phase 4b scope:** Vue + Web Components only — SwiftUI/Compose remain Sprint 10.
2. **Code Connect for Vue/WC:** HTML parser (`@figma/code-connect/html`), stub extension **`.figma.ts`** (not `.figma.tsx`).
3. **CEM is required for WC import** — no auto-generation; fallback `customElements.define` scan is best-effort when manifest missing.
4. **Parse runs in UI iframe** — same constraint as React (TypeScript AST + `@vue/compiler-sfc` stay out of main QuickJS thread).
5. **WO-047 is a refactor ticket** — extract shared web resolver after 045/046 define concrete CSS edge cases.

---

## Pre-plan spikes (sprint-wide)

| Spike | Ticket | Blocks plan? |
| ----- | ------ | ------------ |
| SPK-045-1 `@vue/compiler-sfc` bundle size in UI build | WO-045 | Plan must note accept/gate |
| SPK-045-2 `npx figma connect validate` on Vue `.figma.ts` fixture | WO-045 | Build phase |
| SPK-046-1 CEM 2.1.0 fixture parse → ComponentSpecV1 | WO-046 | ✅ validated in research |
| SPK-046-2 `npx figma connect validate` on WC `.figma.ts` fixture | WO-046 | Build phase |
| SPK-047-1 Vue scoped + WC shadow token resolution unit tests | WO-047 | After 045/046 fixtures exist |

---

## `/plan` entry checklist

- [x] AC traceability table per ticket
- [x] **Build Agents** phases with file paths
- [x] `framework` on `ImportParseExecMessage` (WO-045 Steps 1–3)
- [x] Dependencies explicit — WO-047 after 045/046
- [x] `wc -l plan.md` — WO-045: 390, WO-046: 379, WO-047: 303

**Build:** WO-045 ∥ WO-046 (land WO-045 Phase 1 first for shared protocol) → WO-047

---

## References

- PRD §12 Phase 4b (`Docs/PRD.md` lines 776–780)
- Sprint 8 index: [sprint-8-research-index.md](../Sprint%208/research/sprint-8-research-index.md)
- Figma Code Connect HTML: https://developers.figma.com/docs/code-connect/html/ (retrieved 2026-05-30)
- CEM spec: https://github.com/webcomponents/custom-elements-manifest (schema 2.1.0)
