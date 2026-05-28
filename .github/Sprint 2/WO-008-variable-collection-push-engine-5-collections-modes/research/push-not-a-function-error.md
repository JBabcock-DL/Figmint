# Research: `TypeError: not a function` on spike-400 UI push

**Date:** 2026-05-27  
**Ticket:** WO-008  
**Repro:** Load bench fixture `spike-400` → **Push variables** → UI shows red `not a function` (`push/error` from main thread).  
**Figma console (user):** `unhandled promise rejection: TypeError: not a function` with internal frames `createVariableHandle` → `resolveValue`.

---

## Summary

The failure is **not** explained by spike-400 token shape (400 primitives-only COLOR tokens, single `Default` mode, no aliases, valid rgba + codeSyntax). WO-005 proved the same fixture at 400 vars in ~606 ms using a **primitives-only, single-collection, no-audit** path. WO-008 adds **five collections, full mode reconciliation on all five before any variables are written, scopes, codeSyntax, and post-push audit** — that delta is where investigation should focus.

Fixes **#3, #4, #5** (in-memory audit snapshot, `createVariableAlias`, safer skip/scopes) are restored in `src/` as hardening for alias pushes, re-push idempotency, and avoiding a second Figma variable fetch. They are **not proven** to fix spike-400 first-push on their own. Fixes **#1, #2** (token-aware modes) were **not** applied — full WO-008 mode table remains.

**Status:** Root cause **confirmed** (2026-05-27): bare `not a function` with no `[phase]` prefix was caused by **`console.debug` on the Figma main-thread sandbox**, which only implements `console.log` / `warn` / `error` / `info` — not `debug`. After a **successful** `pushTokens()`, `main.ts` called `console.debug('[main] push/variables done', …)` which threw `TypeError: not a function`; the catch block posted that as `push/error` to the UI. Fix: `pluginLog()` → `console.log` in main-thread code (`src/core/pluginLog.ts`).

---

## Key findings

### 1. Error path in FigHub

| Symptom                                   | Meaning                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Red `not a function` in Variables section | `main.ts` posted `{ type: 'push/error', message }` — **`pushTokens()` threw** before returning |
| Per-token failures                        | Would appear in `push/result.result.errors[]`, push would still complete                       |
| `[phase] not a function`                  | `runPhase` wrapper in `push.ts` — pinpoints step                                               |
| Bare `not a function`                     | Either throw before `runPhase`, or **stale `dist/` / plugin not fully reloaded**               |

Push flow: `App.tsx` → `postMessage({ type:'push/variables', tokens })` → `main.ts` → `pushTokens()` phases:

1. `[snapshot]` — `getLocalVariableCollectionsAsync` + `getLocalVariablesAsync`
2. `[ensureCollections]` — create/find 5 collections
3. `[ensureModes]` — **full** `COLLECTION_MODES` on **all** collections (`modes.ts`; `_tokens` unused for gating)
4. `[pass:primitives]` … `[pass:effects]` — create/update variables
5. `commitUndo()` — soft-fail
6. `buildFigmaVariableStateFromLocalSnapshot(snapshot)` — soft-fail (fix #3)
7. `[runAudit]` — pure JS

### 2. spike-400 vs WO-005 spike

|             | WO-005 spike-400 | WO-008 engine                                                                            |
| ----------- | ---------------- | ---------------------------------------------------------------------------------------- |
| Collections | 1 (`Primitives`) | 5 always                                                                                 |
| Modes       | `Default` only   | Theme `Light`+`Dark`, Typography ×8, Effects `Light`+`Dark` on **empty** collections too |
| Audit       | None             | 16 rules + snapshot                                                                      |
| Scopes      | Not set          | `ALL_SCOPES` on every token (fix #5 wraps setter)                                        |
| Aliases     | None in fixture  | N/A for spike-400                                                                        |

Adapted tokens: `collection: 'primitives'`, `name: 'color/primary/25'`, `type: 'COLOR'`, `valuesByMode: { Default: { r,g,b,a } }`, optional `codeSyntax` triple. Canonical `collections[]` still lists all five collection defs (UI shows “400 tokens across 5 collections”).

### 3. Ranked hypotheses

**H1 — `[ensureModes]` throws synchronously (unconfirmed)**  
~10 `addMode` calls on empty Theme/Typography/Effects before primitives pass. WO-005 never did this. Would abort whole push; should show `[ensureModes] not a function` if `runPhase` + fresh bundle are active.

**H2 — Figma async `resolveValue` during property reads (partially mitigated)**  
Internal stack points here. Triggers when reading `variable.valuesByMode` or setting `scopes`. Fix #3 avoids second API fetch but still reads `valuesByMode` on handles. Fix #5 catches **sync** throws on skip/scopes; **does not** catch async vendor-core rejections.

**H3 — Stale plugin / bundle (possible)**  
User confirmed reload; latest `dist/code.js` includes `runPhase`, audit snapshot, and fix #5 debug strings. Rebuild + **close plugin panel completely** before retest.

**H4 — `applyScopes` / `ALL_SCOPES` on 400 COLOR vars (unconfirmed)**  
WO-005 never set scopes. Fix #5 soft-fails sync errors only.

**H5 — postMessage / audit serialization (unlikely)**  
`push/result` payload is plain JSON; Figma stack is variable engine, not structured-clone errors.

### 4. Restored fixes (3, 4, 5) — intent

| Fix    | What                                                                    | Why keep                                                                                        |
| ------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **#3** | `buildFigmaVariableStateFromLocalSnapshot`                              | Avoids redundant `getLocalVariablesAsync` after push; aligns audit with handles we already hold |
| **#4** | `figma.variables.createVariableAlias(variable)` when target in snapshot | Figma-recommended alias shape for Theme→Primitive pushes (`foundations-minimal`)                |
| **#5** | try/catch on `shouldSkipVariable` + `applyScopes`                       | Re-push idempotency when Figma throws on `valuesByMode` / `scopes` reads                        |

These do **not** change WO-008 mode reconciliation (#1 rejected) or empty-collection behavior.

---

## Recommendations

### Immediate diagnostics (no behavior change)

1. Rebuild (`npm run build:community`), **close** FigHub plugin, reopen from `dist/manifest.json`.
2. Note exact red text: **`[phase] …` or bare?**
3. Fresh Figma file → spike-400 → **first push only**. Do 400 variables appear in Primitives before the error?
4. Repeat with **foundations-minimal** bench fixture (multi-collection, ~few tokens).
5. Figma console: filter `[push] phase failed`, `[fighub] skip variable snapshot`, `[push] applyScopes failed`.

### Fix options (only after phase confirmed — **ask user before implementing**)

| Option | When                          | Tradeoff                                                                                      |
| ------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| **A**  | `[ensureModes]` confirmed     | Defensive try/catch per `addMode` **or** product decision on mode setup for empty collections |
| **B**  | `[pass:primitives]` confirmed | Bisect: no-op `applyScopes`, skip codeSyntax, single collection                               |
| **C**  | Post-push / async only        | Defer audit to flag; or snapshot metadata without `valuesByMode` reads                        |
| **D**  | Bench-only fast path          | WO-005 parity for primitives-only docs — **scope change**, needs approval                     |

---

## Open questions

1. After latest rebuild, does the error include a **`[phase]`** prefix? Which one?
2. **First push or re-push?** Do variables land in Figma before the error?
3. Does **foundations-minimal** push succeed through the same UI?
4. Figma plan tier (Starter vs Pro/Org) — mode limits?
5. File state: fresh vs leftover Theme/Typography collections from prior attempts?

---

## References

- WO-005 spike runbook: `.github/Sprint 1/WO-005-…/research/spike-runbook.md`
- WO-005 latency (606 ms @ 400): `.github/Sprint 1/WO-005-…/research/latency-benchmark.md`
- Push engine design: [variable-push-engine-design.md](variable-push-engine-design.md)
- Code: `src/core/variables/push.ts`, `modes.ts`, `src/main.ts`, `src/ui/App.tsx`
