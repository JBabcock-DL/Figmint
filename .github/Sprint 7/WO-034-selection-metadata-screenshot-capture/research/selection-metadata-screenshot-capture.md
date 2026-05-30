# Selection metadata + screenshot capture (WO-034)

> **Status:** Research complete — ready for `/plan`  
> **Date:** 2026-05-29  
> **Ticket:** WO-034 (GitHub #37)  
> **PRD anchors:** §6.6 FR-HAND-1, §8.5 `handoff-context.v1.frames[]`

---

## Summary

WO-034 introduces **`src/core/handoff/capture.ts`** — the first greenfield module under `src/core/handoff/`. The locked implementation reads `figma.currentPage.selection`, filters to exportable scene nodes (frames and component instances at minimum), exports each selection as PNG via `exportAsync`, and returns structured metadata matching `HandoffFrame` in `@detroitlabs/fighub-contracts`.

Deep links use the canonical Figma design URL form: `https://www.figma.com/design/{fileKey}/{encodeURIComponent(fileName)}?node-id={id-with-dashes}`. Multi-selection returns one entry per selected node. Performance target (<1s typical) is achievable with parallel `exportAsync` calls for 1–3 frames at 1× scale; document 2× scale as out-of-scope unless `/plan` adds an explicit quality toggle.

**Default recommendation:** implement capture in the **main thread only** (no new UI message type until WO-038 wires the tab). Unit tests use mock `SceneNode` + stubbed `exportAsync`; one integration-style test uses committed PNG bytes fixture.

---

## Key findings

### 1. Greenfield module — nothing exists yet

| Path | Status |
|------|--------|
| `src/core/handoff/` | **Does not exist** — create `capture.ts`, `index.ts`, `types.ts` |
| `HandoffContextV1` contract | **Exists** — `packages/contracts/src/handoffContext.v1.ts` |
| Markdown renderer for handoff | **Exists** — `src/io/formats/markdown/handoffContext.ts` (WO-019) |
| Export sheet + sinks | **Exists** — WO-020 (`ExportSheet`, `runExport`, five sinks) |

### 2. Selection + export API (Figma Plugin API)

| API | Use |
|-----|-----|
| `figma.currentPage.selection` | Source list (`readonly SceneNode[]`) |
| `node.exportAsync({ format: 'PNG', constraint?: { type: 'SCALE', value: number } })` | Returns `Uint8Array` → base64 → `data:image/png;base64,...` |
| `figma.fileKey` | Required for deep link; **empty string on unsaved/Untitled files** (memory.md — validate in Plugin Sandbox only) |
| `figma.root.name` | URL segment for file name in deep link |

**Node filter (locked):** accept `FRAME`, `COMPONENT`, `INSTANCE`, `SECTION` (Figma sections behave like frames for export). Skip `GROUP` unless user selects it explicitly (groups export but rarely used as handoff unit — include if selected). Reject zero-area or invisible nodes with a typed skip reason in debug log.

### 3. Deep link construction

```text
https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId.replace(/:/g, '-')}
```

- `fileName` from `figma.root.name`; encode URI segments that contain spaces.
- When `figma.fileKey === ''`, set `deepLink` to empty string and surface a **capture warning** in the aggregate result (WO-037 can fold into `meta.frameUrl` fallback using file name only).

Matches legacy `/dev-handoff` Step 2 and PRD §8.5 example.

### 4. Performance and payload size

| Factor | Finding |
|--------|---------|
| Parallel export | `Promise.all` over selection (cap at **10** nodes — reject overflow with clear error) |
| Scale | Default **1×** PNG; 1440×900 frame ≈ 50–150 KB PNG → base64 ≈ 70–200 KB per frame |
| Contract | `HandoffContextV1` embeds full data URLs — acceptable for clipboard markdown + download; **pluginData sink** may exceed 100 kB (`PLUGIN_DATA_MAX_BYTES`) — WO-037 should default clipboard and warn on plugin-data for large screenshots |
| Target | 1 frame @ 1× < 300 ms typical; 3 frames < 1 s on desktop |

### 5. Patterns to mirror

| Pattern | Location |
|---------|----------|
| Main-thread orchestration + UI postMessage | `src/main.ts` drift/export handlers |
| Error extraction | `extractErrorMessage` in `main.ts` |
| Logging | `pluginLog()` — **never `console.debug`** on main thread (memory.md) |
| Strict types for contract output | `packages/contracts/src/handoffContext.v1.ts` |

---

## Validated evidence

### Repo inventory

- `packages/contracts/src/handoffContext.v1.ts` — `HandoffFrame`, `HandoffScreenshot`, `HandoffContextMeta`
- `tests/fixtures/io/sources/handoff-context.json` — minimal valid envelope (empty frames)
- `src/io/formats/markdown/handoffContext.ts` — consumes `frames[].screenshot.dataUrl` in GFM image syntax
- No `src/core/handoff/**` today (grep 2026-05-29)

### Official API

- Figma Plugin API: `exportAsync` on `ExportMixin` nodes — [Export settings](https://developers.figma.com/docs/plugins/api/ExportSettings/) (retrieved 2026-05-29)
- `figma.fileKey` empty on local files — confirmed project memory + prior sandbox VQA

### Cross-ticket matrix

| Ticket | Interface | This ticket |
|--------|-----------|-------------|
| WO-035 | `SelectionCapture` root nodes | Consumes same selected nodes (or shared selection snapshot) |
| WO-036 | Same | Same |
| WO-037 | `captureSelection(): SelectionCapture` | **Produces** |
| WO-038 | UI triggers capture | **Consumer** (via WO-037 pipeline) |
| WO-019 | Markdown renderer | Downstream — no change |
| WO-020 | Export sinks | Downstream — no change |

---

## Decision log

| ID | Decision | Rationale | Rejected |
|----|----------|-----------|----------|
| D-034-1 | Module path `src/core/handoff/capture.ts` | Matches PRD §7.3 + ticket | `src/ops/handoff` |
| D-034-2 | PNG @ 1× default | Meets AC performance | SVG (no raster screenshot) |
| D-034-3 | Cap multi-select at 10 nodes | Prevents UI freeze / huge payloads | Unlimited |
| D-034-4 | `dataUrl` in contract | PRD §8.5 + WO-019 markdown embed | Separate blob sink |
| D-034-5 | Include INSTANCE + FRAME | Designer handoff targets screens | Selection of raw vectors only |

---

## Pre-plan spikes

| Spike | Owner | Pass criteria |
|-------|-------|---------------|
| SPK-034-1 | `/plan` or `/build` | In Plugin Sandbox (`cVdPraIafWFBRZnzMPhtrW`), select one frame → capture → PNG dataUrl non-empty, deep link opens node |
| SPK-034-2 | `/build` | Multi-select 2 frames → array length 2, <1 s |

No blocking spikes before `/plan` — API surface is documented; runtime proof deferred to build VQA.

---

## Risk register

| Risk | Sev | Likelihood | Mitigation |
|------|-----|------------|------------|
| Empty `fileKey` on Untitled file | Med | Med | Warning + empty deepLink; document sandbox requirement |
| Large PNG blows clipboard/export | Med | Low | 10-node cap; WO-037 defaults md to clipboard without embedding huge images in pluginData |
| `exportAsync` throws on locked node | Low | Med | try/catch per node; partial capture array + error summary |

---

## Recommendations

1. Define `SelectionCapture` / `CapturedFrame` types in `src/core/handoff/types.ts` aligned 1:1 with `HandoffFrame` minus contract envelope fields.
2. Export `captureSelection()` async function; export pure helpers `buildDeepLink(fileKey, fileName, nodeId)` and `pngToDataUrl(bytes)` for unit tests.
3. Add Vitest mocks for `exportAsync` returning small fixed PNG bytes (1×1 pixel).
4. Export `src/core/handoff/index.ts` barrel for WO-037.

---

## Open questions

- **RESOLVED:** Multi-selection returns array (ticket AC).
- **RESOLVED:** Use PNG not JPEG (lossless UI chrome).
