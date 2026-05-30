# Figma file key resolution for handoff deep links (WO-059)

> **Status:** Research complete — ready for `/build`  
> **Date:** 2026-05-29  
> **Depends on:** WO-034, WO-037, WO-038  
> **Trigger:** Manual Plugin Sandbox smoke showed `figmaFileKey: unknown` and empty deep links in exported handoff markdown.

---

## Summary

Handoff deep links require a Figma **file key**. The plugin reads it from `figma.fileKey` on the main thread, but that API is gated and FigHub's manifest does not enable it today. For **Community (public) GA**, the API will never be available — designers must supply a file key or paste a Figma design URL once per file.

**Locked recommendation:** dual resolution — (1) automatic via `enablePrivatePluginApi` on dev/org manifests, (2) manual override stored in `figma.root` pluginData, editable in Settings, with URL-or-key parsing. Centralize resolution in `src/core/figma/resolveFileKey.ts` and wire capture/build + drift/audit call sites incrementally.

---

## Key findings

### 1. Current behavior

| Location | Behavior |
| -------- | -------- |
| `src/core/handoff/capture.ts` | `figma.fileKey ?? ''` → empty deep links + generic warning |
| `src/core/handoff/build.ts` | `figmaFileKey: 'unknown'` when blank |
| `manifest.json` | No `enablePrivatePluginApi` → `figma.fileKey` always `undefined` in dev |
| `manifest.community.json` | Must **not** add private API flag (public plugin security boundary) |

### 2. Figma API gates

| Condition | `figma.fileKey` | Fix |
| --------- | ----------------- | --- |
| Dev/org + `enablePrivatePluginApi: true` + saved cloud file | Non-empty string | Automatic |
| Untitled / unsaved file | `''` | Save file; re-capture |
| Public Community plugin | `undefined` | Manual override only |

Official docs: [figma.fileKey](https://developers.figma.com/docs/plugins/api/figma/#filekey), [enablePrivatePluginApi](https://developers.figma.com/docs/plugins/manifest/#enableprivatepluginapi).

### 3. Manual override storage

| Store | Scope | Verdict |
| ----- | ----- | ------- |
| `figma.root.setPluginData('fighub.figmaFileKey', …)` | Per file, travels with duplicate | **Use** — matches handoff per-file semantics |
| `figma.clientStorage` | Per user/device | Reject — wrong scope for deep links |
| `fighub.json` in repo | Repo-linked only | Future optional (WO-058); not required for v1 |

Accept **file key** or **full design URL** in Settings; parse with regex:

```text
figma.com/design/{fileKey}/...
```

Validate file key charset: `[a-zA-Z0-9]+` (Figma keys are alphanumeric).

### 4. Resolution precedence (locked)

1. Native `figma.fileKey` when non-empty string (**source: `api`**)
2. Manual override from root pluginData (**source: `override`**)
3. Empty (**source: `none`**) → meta `unknown`, empty deep links, contextual warning

When both native and override exist, **native wins** (override ignored silently or debug-logged).

### 5. Warning copy (split by cause)

| `figma.fileKey` | Override | Warning |
| --------------- | -------- | ------- |
| non-empty | any | none |
| `undefined` | none | Deep links need a file key — set one in Settings (Community) or enable private plugin API (dev/org builds). |
| `''` | none | Save this file to Figma cloud, or set a file key in Settings. |
| `undefined` or `''` | set | none (override satisfies) |

Handoff tab: compact status line — "File key: from Figma" / "File key: manual (Settings)" / "File key: not set — deep links disabled".

### 6. Manifest / build matrix

| Manifest | `enablePrivatePluginApi` |
| -------- | ------------------------ |
| `manifest.json` (default dev import) | `true` |
| `manifest.org.json` | `true` |
| `manifest.community.json` | absent / `false` |

`scripts/build.mjs` today copies root `manifest.json` only. Step: copy correct manifest per `build:org` / `build:community` when dual-build is revisited (WO-021 deferred); for WO-059, add flag to root + org manifests and document community omission.

### 7. Call sites to migrate (WO-059 scope)

**In scope (handoff path):**

- `src/core/handoff/capture.ts`
- `src/core/handoff/build.ts`

**Follow-up (same helper, separate PR optional):**

- `src/core/drift/reportMeta.ts`
- `src/core/components/scaffold/runScaffold.ts`
- `src/core/sync/snapshotStore.ts`
- `src/main.ts` `figmaFileUrl()`

WO-059 migrates handoff only; export `resolveFigmaFileKey()` for later drift/scaffold adoption.

---

## Decision log

| ID | Decision | Rationale | Rejected |
| -- | -------- | --------- | -------- |
| D-059-1 | Root pluginData key `fighub.figmaFileKey` | Per-file, no network | clientStorage |
| D-059-2 | Accept URL or raw key in Settings | Lower friction than key-only | Separate URL + key fields |
| D-059-3 | Settings section, not Handoff-only | Reusable when drift/scaffold adopt helper | Handoff inline-only |
| D-059-4 | Native API beats override | Trust Figma when available | Override always wins |
| D-059-5 | Private API on dev/org manifests only | Community GA constraint | Global flag on all manifests |

---

## Validation (Plugin Sandbox)

1. Dev build with `enablePrivatePluginApi`, saved Plugin Sandbox → capture → `figmaFileKey: cVdPraIafWFBRZnzMPhtrW`, deep link opens node.
2. Community manifest (or mock `figma.fileKey = undefined`) + Settings paste URL → same deep link output.
3. Untitled file + no override → split warning; with override → deep links work despite unsaved file (key is user-supplied).
