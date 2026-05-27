# Canvas bench — WO-012 Typography + Token Overview

> **Status:** Deferred — manual VQA requires Figma Plugin Sandbox run after full Foundations push.
> **Date:** 2026-05-27
> **Sandbox:** [Plugin Sandbox](https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1) (`file_key=cVdPraIafWFBRZnzMPhtrW`)

## Prerequisites (not run in this build session)

1. Push canonical tokens (`pushTokens`) — WO-008
2. `publishTypographyStyles(tokens)` — WO-012 prep module
3. Scaffold pages present (`↳ Text Styles`, `↳ Token Overview` from `/new-project` 05d)

## Target

| Builder                  | p50 budget | Result               |
| ------------------------ | ---------- | -------------------- |
| `buildTextStylesPage`    | < 3000 ms  | _pending manual run_ |
| `buildTokenOverviewPage` | < 3000 ms  | _pending manual run_ |

## Commands (Plugin Sandbox)

```text
canvas/build-page → page: text-styles
canvas/build-page → page: token-overview
canvas/bench → page: text-styles
canvas/bench → page: token-overview
runAudit('canvas', …) after each build — expect pass on clean file
```

## Notes

- Figma MCP was not available in the automated build agent session; bench timings will be filled after manual `/vqa` on the sandbox file.
- CI grep gate: `textStyles.ts` / `tokenOverview.ts` must contain zero inline `.resize(` calls (WO-014 helpers only).
