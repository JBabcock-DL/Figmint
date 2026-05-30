---
type: work-order
github_issue: 73
project_item_id: PVTI_lAHOD9B30s4BY4aYzguMvvk
---

## Goal

Enable reliable handoff deep links via **automatic** `figma.fileKey` (dev/org private API) and a **manual file-key fallback** (Settings) required for public Community builds.

PRD anchors: `Docs/PRD.md` §6.6 FR-HAND-1, §8.5 `handoff-context.v1.meta`.

---

## Problem story

WO-038 manual smoke exported handoff markdown with `figmaFileKey: unknown` and empty frame deep links. Root causes: (1) `manifest.json` lacks `enablePrivatePluginApi`, so `figma.fileKey` is always `undefined` in dev; (2) public Community plugins cannot access `figma.fileKey` at all — a designer-supplied file key is required.

---

## User stories

- As a designer on **Org/dev FigHub**, I want deep links populated automatically when my file is saved to Figma cloud.
- As a designer on **Community FigHub**, I can paste my file's design URL (or file key) once in Settings so handoff exports include working deep links.
- As an engineer reading handoff markdown, I want `meta.figmaFileKey` and per-frame `deepLink` URLs that open the exact frame in Figma.

---

## Design reference _(when UI work applies)_

**Panel-only code VQA** — Settings file-key field + Handoff status line; match existing Settings input chrome (`Settings.tsx` `inputStyle`, 11px labels).

---

## Requirements

### Functional

1. **`enablePrivatePluginApi: true`** on `manifest.json` and `manifest.org.json` (not on `manifest.community.json`).
2. **`src/core/figma/resolveFileKey.ts`** — parse user input (URL or key), read/write root pluginData override, `resolveFigmaFileKey()` with precedence native → override → none.
3. **Settings** — "Figma file key" section: text input (URL or key), Save, clear optional; persist via main-thread handler.
4. **Handoff capture/build** — use resolved key for `buildDeepLink`, `meta.figmaFileKey`, `meta.frameUrl`; split warnings by cause (see research D-059 warnings table).
5. **Handoff tab** — status line showing file-key source (`api` / `override` / `none`).

### Visual / UX

- Settings field placeholder: `https://www.figma.com/design/… or file key`
- Handoff warning links user to Settings when key missing

### Technical / architectural

- PluginData key: `fighub.figmaFileKey` on `figma.root`
- Main-thread handlers + UI bridge mirroring GitHub session load/save pattern
- **Dependencies:** WO-034, WO-037, WO-038

---

## Acceptance criteria _(definition of done)_

- [ ] Dev import (`manifest.json` + saved Plugin Sandbox): Capture → export shows real `figmaFileKey` and non-empty deep links without manual entry.
- [ ] Community path (mock or community manifest): with Settings override set, Capture → export shows override key and working deep links.
- [ ] Invalid Settings input rejected with inline error; empty override clears stored key.
- [ ] Vitest covers parse, precedence, capture warnings, Settings save/load.

## Out of scope

- Migrating drift/scaffold/snapshot call sites (use shared helper in follow-up)
- `fighub.json` repo-side `figmaFileUrl` field
- WO-021 dual-build manifest copy automation (document manual matrix only)

---

## Testing & verification

### Functional QA

- Unit tests for `parseFigmaFileKeyInput`, `resolveFigmaFileKey`, updated capture/build tests
- Manual: Plugin Sandbox saved file + community override path

### Visual / design QA

- Settings + Handoff status via Vitest (panel-only VQA)

---

## Figma VQA Checklist

**Panel-only code VQA** — no dedicated Figma mock. Settings + Handoff status verified via Vitest (WO-027 / WO-038 precedent).

**Figma source:** N/A — no design frame; functional surfaces are plugin panels only.

**Assertions** _(implementation + Vitest):_

| #   | Category      | Property                         | Design (spec)                              | Build (implemented)                                                                 | Result |
| --- | ------------- | -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- | ------ |
| 1   | Manifest      | `enablePrivatePluginApi` dev/org | `true` on manifest.json + manifest.org.json | Both manifests; absent from manifest.community.json                               | PASS   |
| 2   | Core          | Resolution precedence            | api → override → none                      | `resolveFigmaFileKey.ts` — `resolveFileKey.test.ts`                                 | PASS   |
| 3   | Core          | URL + bare key parse             | Figma design URL or ≥10 char alphanumeric  | `parseFigmaFileKeyInput` — 4 parse cases                                            | PASS   |
| 4   | Handoff       | Capture uses resolved key        | deepLink + warnings from resolver          | `capture.ts` + override path test                                                   | PASS   |
| 5   | Handoff       | Build meta uses capture key      | `figmaFileKey` not hardcoded unknown       | `build.test.ts` override meta case                                                  | PASS   |
| 6   | Settings UI   | File key section                 | input, Save, Clear, helper text            | `Settings.tsx` — placeholder, buttons, 11px labels                                  | PASS   |
| 7   | Settings UI   | Invalid input rejected           | inline error on bad save                   | `figmaFileKeyHandlers.test.ts` + hook                                               | PASS   |
| 8   | Handoff UI    | File-key status line             | source api / override / none                 | `Handoff.tsx` + `Handoff.test.tsx` status case                                      | PASS   |
| 9   | Handoff UI    | Settings hint when none          | link text when source none                 | `Handoff.tsx` — "Set a file key in Settings"                                        | PASS   |
| 10  | Messages      | load/save/clear/changed          | main ↔ UI contract                         | `figmaFileKeyHandlers.test.ts` + `figmaFileKey.ts`                                  | PASS   |

**Per-row deviations:** Figma MCP skipped — no design mock. Dev auto-path + Community override path require manual Plugin Sandbox smoke (optional pre-GA).

---

## References

- Research: `research/figma-file-key-resolution.md`
- WO-034 capture, WO-037 build, WO-038 Handoff tab
- Figma: [fileKey API](https://developers.figma.com/docs/plugins/api/figma/#filekey)
