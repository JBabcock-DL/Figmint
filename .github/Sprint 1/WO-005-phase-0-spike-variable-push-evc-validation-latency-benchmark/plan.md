# WO-005 — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

*To be filled during `/plan`.*

Recommended skeleton:

1. Strip MCP wrapper from `step-15a-primitives.mcp.js` → distill to plain Plugin API code.
2. Drop into a `spike/` directory in the plugin scaffold (WO-002 product).
3. Wire up paste UI → push → instrumented latency capture.
4. Run EVC verification script as a separate plugin run; record findings.
5. Capture baseline MCP latency from DesignOps-plugin (separate session or committed logs).
6. Write three research docs.

## Tasks

1. *TBD*

## Build Agents

*Required section for `/build` orchestration — define parallel phases before invoking `/build`.*

### Phase 1

- *TBD — likely a single `/code-build` for the spike + `/doc-build` for research outputs in parallel.*

## Open questions

- Which Figma sandbox file should the spike target? (Designer to provide a fresh test file URL during `/plan`.)
- Should the spike's latency capture be automated or manual stopwatch? (Console.time recommended.)
- Where does the MCP baseline come from — fresh DesignOps-plugin session or existing logs?

## References

- Ticket: `./ticket.md`
- PRD anchors: `Docs/PRD.md` §12 (Phase 0), §6.1 FR-BOOT-3..6, §14 (G1), §16 OQ-1 / OQ-2
- **Critical lift source:** `c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js`
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
