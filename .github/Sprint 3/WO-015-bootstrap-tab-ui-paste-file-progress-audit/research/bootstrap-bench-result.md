# Bootstrap bench result (WO-015 / G1)

**Date:** 2026-05-27 (VQA refresh)  
**Environment:** FigHub community build, Figma desktop, [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox) (`file_key=cVdPraIafWFBRZnzMPhtrW`)  
**Target:** G1 full bootstrap **< 30 000 ms**

## Run 1 — Full bootstrap (primary VQA evidence)

| Field | Value |
| ----- | ----- |
| **Fixture** | `bootstrap-complete` (167 tokens, all 5 collections) |
| **Run type** | Fresh bootstrap on cleaned file (post-scaffold + Documentation collection) |
| **`totalDurationMs`** | **~17 500 ms** (Bootstrap completion banner / console) |
| **All 12 steps** | `done` (including `prepare-style-guide`, all 6 canvas builds, `audit-canvas`) |
| **`ok`** | `true` |
| **Designer sign-off** | "done looks good" (2026-05-27 session) |

### Step phases (approximate, from progress UI + console)

| Step | Status | Notes |
| ---- | ------ | ----- |
| `push-variables` | done | 5 collections + Documentation chrome published |
| `publish-typography` | done | `_Doc/*` + 27 slot styles |
| `prepare-style-guide` | done | 6 pages + effect styles + token-overview scaffold |
| `build-primitives` … `build-overview` | done | All canvas builders returned `durationMs` on progress rows |
| `audit-canvas` | done | Canvas-scope audit passed |

## Run 2 — spike-400 G1 anchor (push latency)

| Field | Value |
| ----- | ----- |
| **Fixture** | `spike-400` (400 primitive colors) |
| **Reference** | WO-005 median push **606 ms**; WO-008 idempotent re-push **490 ms** |
| **Extrapolated full bootstrap** | Push + 6 canvas pages + audit **well under 30 s** (WO-005 §3.1 budget ~904 ms push + ~18 s canvas headroom) |

## Verdict

| Criterion | Result |
| --------- | ------ |
| AC1 — E2E paste + bootstrap | **PASS** |
| AC4 — G1 < 30 s | **PASS** (17.5 s measured on `bootstrap-complete`; spike-400 push anchor << 30 s) |
