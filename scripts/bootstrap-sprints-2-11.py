#!/usr/bin/env python3
"""
Bootstrap FigHub sprints 2-11 tickets.

One-off batch creator: writes ticket.md + plan.md per ticket, creates GitHub
issues, adds them to Project #9, and sets Status = Context Backlog.

Run from fighub repo root: `python scripts/bootstrap-sprints-2-11.py`
Idempotency: this script is NOT idempotent. It creates new GitHub issues on
every run. Designed for one-time execution after Sprint 1 land.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

# --- config (from .github/templates/workflow.md) -----------------------------

REPO = "JBabcock-DL/FigHub"
PROJECT_NUM = 9
PROJECT_ID = "PVT_kwHOD9B30s4BY4aY"
STATUS_FIELD_ID = "PVTSSF_lAHOD9B30s4BY4aYzhT7CAM"
STATUS_BACKLOG = "38fea6b7"
REPO_ROOT = Path("c:/Users/jbabc/Documents/GitHub/fighub")
PLAN_PATH = r"C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md"
DESIGNOPS = "c:/Users/jbabc/Documents/GitHub/DesignOps-plugin"

PLAN_STUB_TEMPLATE = """# {ticket_id} — plan.md (stub)

> Stub — fill before `/build` runs. Reference `ticket.md` for full scope.

## Approach

*To be filled during `/plan`.*

## Tasks

1. *TBD*

## Build Agents

### Phase 1

- *TBD*

## References

- Ticket: `./ticket.md`
- Plan source: `{plan_path}`
"""

# --- ticket body helper ------------------------------------------------------

def body(*, goal, requirements, acceptance, out_of_scope, lift_refs,
         deps, prd_refs, vqa="N/A — no Figma artifact (subsystem ticket)",
         design_ref="**N/A — no Figma artifact (subsystem ticket).**"):
    lift_block = "\n".join(f"  - {l}" for l in lift_refs) if lift_refs else "  - *None — new code designed in PRD.*"
    deps_block = ", ".join(deps) if deps else "none"
    prd_block = ", ".join(prd_refs)
    req_block = "\n".join(f"{i+1}. {r}" for i, r in enumerate(requirements))
    acc_block = "\n".join(f"- [ ] {a}" for a in acceptance)
    oos_block = "\n".join(f"- {o}" for o in out_of_scope)
    return f"""## Goal

{goal}

PRD anchors: {prd_block}.

---

## Problem story

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

{design_ref}

---

## Requirements

### Functional

{req_block}

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
{lift_block}
- **Dependencies:** {deps_block}

---

## Acceptance criteria *(definition of done)*

{acc_block}

## Out of scope

{oos_block}

---

## Testing & verification

### Functional QA

- Vitest unit + integration tests cover the acceptance criteria above.

### Visual / design QA

- See ticket-level scope; most subsystem tickets have visual QA in their UI counterpart.

### Accessibility

- See ticket-level scope; UI tickets carry the a11y burden.

### Telemetry / observability

- Console.debug per major event; production telemetry deferred.

---

## Figma VQA Checklist

{vqa}

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: {deps_block}.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: {prd_block}
- Lift reference:
{lift_block}
- Plan source: `{PLAN_PATH}`
"""


def vqa_table_stub():
    """Full Figma VQA Checklist for UI tickets (filled by /vqa later)."""
    return """**Figma source (filled before `/vqa` runs):**

| Field | Value |
| --- | --- |
| `file_key` | `<!-- filled during /plan or /vqa -->` |
| `node_id` | `<!-- filled during /plan or /vqa -->` |
| Figma deep link | `<!-- filled -->` |
| Frame / scope | `<!-- e.g. FigHub plugin window — Bootstrap tab -->` |
| Captured at | `<!-- ISO date -->` |

**Assertions** *(agent fills `Design (Figma)` and `Build (implemented)` columns during `/vqa`):*

| # | Category | Property | Design (Figma) | Build (implemented) | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | Layout | Frame width × height | | | |
| 2 | Layout | Auto-layout direction / gap | | | |
| 3 | Layout | Padding (T/R/B/L) | | | |
| 4 | Typography | Font family / size / weight | | | |
| 5 | Color | Background fill (token) | | | |
| 6 | Color | Foreground fill (token) | | | |
| 7 | Spacing | Margin / gap tokens | | | |
| 8 | Effects | Border radius / shadow | | | |
| 9 | Accessibility | Contrast ratio | | | |
| 10 | Accessibility | Focus ring + hit target | | | |

**Per-row deviations:**

- *Filled by `/vqa` with FAIL rationale.*"""


# --- tickets -----------------------------------------------------------------

TICKETS = [
    # =========== SPRINT 2 (remaining) ===========
    {
        "id": "WO-008", "sprint": 2,
        "slug": "variable-collection-push-engine-5-collections-modes",
        "title": "WO-008: Variable collection push engine (5 collections + modes)",
        "body": body(
            goal="Implement the deterministic engine that pushes a canonical `TokensV1` into Figma as the 5 variable collections (Primitives, Theme, Typography, Layout, Effects) with the correct modes per collection. This is the core of Phase 1 — every other bootstrap feature feeds into or depends on this engine.",
            requirements=[
                "`src/core/variables/collections.ts` — creates/updates the 5 collections idempotently.",
                "`src/core/variables/modes.ts` — handles per-collection modes (Light/Dark on Theme; Android-scale modes on Typography per Detroit Labs Foundations).",
                "`src/core/variables/push.ts` — orchestration entry; accepts `TokensV1`, returns `{ created, updated, skipped, errors }`.",
                "Extended Variable Collections (Jan 2026) support behind a feature flag — gated by WO-005 spike findings.",
                "Idempotent: running the same input twice yields zero changes on the second run.",
            ],
            acceptance=[
                "A canonical `TokensV1` input with all 5 collections populated → all 5 collections appear in the Figma file with correct modes.",
                "Re-running the same input is a no-op (no duplicate variables or collections).",
                "Bench: 400-variable push completes <2s on a fresh file.",
                "Audit hook (WO-010) is invoked after push; failures bubble up.",
                "`tsc --noEmit` clean.",
            ],
            out_of_scope=[
                "Style-guide canvas building (Sprint 3 WO-011..WO-013).",
                "codeSyntax mapping (WO-009).",
                "Audit reporting (WO-010).",
                "I/O sources (WO-006).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` — strip MCP wrapper, port the `figma.variables.createVariableCollection` / `setValueForMode` sequence",
                f"`{DESIGNOPS}/skills/create-design-system/conventions/01-collections.md` — 5-collection model",
                "WO-005 spike code (throwaway, but extracted patterns survive)",
            ],
            deps=["WO-002", "WO-003", "WO-007"],
            prd_refs=["`Docs/PRD.md` §6.1 FR-BOOT-3..6"],
        ),
    },
    {
        "id": "WO-009", "sprint": 2,
        "slug": "codesyntax-mapping-per-platform-web-android-ios",
        "title": "WO-009: codeSyntax mapping per platform (Web/Android/iOS)",
        "body": body(
            goal="Attach `codeSyntax` to every pushed variable per platform (Web, Android, iOS) so consumer codebases reference variables by their platform-native token names. Removes the need for platform-specific alias collections.",
            requirements=[
                "`src/core/variables/codeSyntax.ts` — pure mapper from `TokensV1` token → `{ WEB, ANDROID, iOS }` codeSyntax triple.",
                "Naming conventions per platform (CSS custom property / Android resource / iOS asset) — match Detroit Labs Foundations precedent.",
                "Applied as part of the variable push (WO-008) via `setVariableCodeSyntax`.",
                "Unit tests for each platform's naming transformation.",
            ],
            acceptance=[
                "Every pushed variable has codeSyntax set for all three platforms.",
                "Spot-check: a `Theme/Primary` token resolves to `--theme-primary` (Web), `R.color.theme_primary` (Android), `Color.themePrimary` (iOS).",
                "`tsc --noEmit` clean.",
            ],
            out_of_scope=[
                "Per-component codeSyntax (Code Connect handles that — Sprint 8).",
                "Platform-specific value adaptation (e.g. iOS color profiles).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-design-system/conventions/02-codesyntax.md` — per-platform mapping conventions",
            ],
            deps=["WO-008"],
            prd_refs=["`Docs/PRD.md` §6.1 FR-BOOT-5"],
        ),
    },
    {
        "id": "WO-010", "sprint": 2,
        "slug": "audit-reporter-post-build-validation",
        "title": "WO-010: Audit reporter (post-build validation + inline reporting)",
        "body": body(
            goal="Implement the audit pass that runs after every variable push (and later, every canvas build and component scaffold). Reports counts, drift, and rule violations inline so designers see failures immediately rather than silently passing.",
            requirements=[
                "`src/core/audit/runAudit.ts` — accepts an audit scope (`variables` | `canvas` | `component`) + the post-operation Figma state, returns `AuditReport` JSON.",
                "Audit rules encoded as code (not prompt rules) — port from DesignOps-plugin convention shards.",
                "Each rule returns pass/fail + a one-line diagnostic.",
                "Audit is called from `push.ts` (WO-008) and surfaces results back to the caller.",
            ],
            acceptance=[
                "After a variable push, audit returns at minimum: total variables created/updated, mode coverage per collection, codeSyntax coverage per platform.",
                "A simulated rule failure (e.g. missing mode value) shows up as FAIL with diagnostic.",
                "Audit output serializes via the standard JSON+Markdown formatter (Sprint 4 WO-019).",
                "`tsc --noEmit` clean.",
            ],
            out_of_scope=[
                "Component-scaffold audit (Sprint 5 WO-022..WO-027 reuses this engine).",
                "Canvas audit (Sprint 3 reuses this).",
                "Realtime audit while building — runs only at the end of an operation.",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-design-system/conventions/14-audit.md` — audit checklist + rule set to port as code",
                f"`{DESIGNOPS}/skills/create-component/conventions/06-audit-checklist.md` — component-scaffold audit rules (reused in Sprint 5)",
            ],
            deps=["WO-008"],
            prd_refs=["`Docs/PRD.md` §6.1 FR-BOOT-8"],
        ),
    },

    # =========== SPRINT 3 — Style-guide canvas builders + Bootstrap tab UI ===========
    {
        "id": "WO-011", "sprint": 3,
        "slug": "color-and-theme-canvas-builders",
        "title": "WO-011: Color & Theme canvas builders (port 15a + 15b from DesignOps-plugin)",
        "body": body(
            goal="Port the step-15a (Primitives color tables) and step-15b (Theme tables) canvas builders from DesignOps-plugin into fighub as deterministic TypeScript modules. Together these build the foundational color portion of the style-guide canvas.",
            requirements=[
                "`src/core/canvas/colorTables.ts` — port of `step-15a-primitives.mcp.js` (~1314 lines source).",
                "`src/core/canvas/themeTables.ts` — port of `step-15b-theme.mcp.js`.",
                "Both consume `TokensV1` + a target Figma page; produce auto-layout frames with all color swatches + value labels per mode.",
                "Use the auto-layout helpers library (WO-014).",
                "Idempotent on re-run.",
            ],
            acceptance=[
                "Running both builders against a sample design system produces visually correct Primitives and Theme canvas pages matching the DesignOps-plugin reference output.",
                "Output frames pass the audit (WO-010) — no 1px masters, correct counter-axis behavior per `00-gotchas.md`.",
                "Bench: each builder completes <3s for ~100 swatches.",
            ],
            out_of_scope=[
                "Typography / Layout / Effects builders (WO-012, WO-013).",
                "Token overview specimen (WO-012).",
                "Bootstrap tab UI invocation (WO-015).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-design-system/canvas-templates/bundles/step-15a-primitives.mcp.js` — primary source",
                f"`{DESIGNOPS}/skills/create-design-system/canvas-templates/bundles/step-15b-theme.mcp.js` — primary source",
                f"`{DESIGNOPS}/skills/create-design-system/conventions/00-gotchas.md`, `08-hierarchy-and-09-autolayout.md`, `10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`",
            ],
            deps=["WO-008", "WO-014"],
            prd_refs=["`Docs/PRD.md` §6.1 FR-BOOT-7"],
        ),
    },
    {
        "id": "WO-012", "sprint": 3,
        "slug": "typography-and-token-overview-builders",
        "title": "WO-012: Typography text styles + Token overview builders (port 15c-text-styles + 17)",
        "body": body(
            goal="Port the typography text-styles builder (step-15c-text-styles) and the token overview builder (step-17) from DesignOps-plugin. The text-styles builder renders the typography specimen; the token overview builder renders the cross-collection summary.",
            requirements=[
                "`src/core/canvas/textStyles.ts` — port of `step-15c-text-styles.mcp.js`.",
                "`src/core/canvas/tokenOverview.ts` — port of `step-17-token-overview.mcp.js`.",
                "Both produce auto-layout frames; consume `TokensV1`.",
                "Use the auto-layout helpers library (WO-014).",
            ],
            acceptance=[
                "Typography page shows all text styles per Android-scale modes (per Detroit Labs Foundations).",
                "Token overview page lists tokens grouped by collection with values and codeSyntax visible.",
                "Both pass audit; bench <3s each.",
            ],
            out_of_scope=[
                "Color/Theme/Layout/Effects builders.",
                "Bootstrap tab UI (WO-015).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-design-system/canvas-templates/bundles/step-15c-text-styles.mcp.js`",
                f"`{DESIGNOPS}/skills/create-design-system/canvas-templates/bundles/step-17-token-overview.mcp.js`",
            ],
            deps=["WO-008", "WO-014"],
            prd_refs=["`Docs/PRD.md` §6.1 FR-BOOT-7"],
        ),
    },
    {
        "id": "WO-013", "sprint": 3,
        "slug": "layout-and-effects-canvas-builders",
        "title": "WO-013: Layout + Effects canvas builders (port 15c-layout + 15c-effects)",
        "body": body(
            goal="Port the Layout (spacing, grids, radii) and Effects (shadows, blurs) canvas builders from DesignOps-plugin. Completes the style-guide canvas trio alongside WO-011 and WO-012.",
            requirements=[
                "`src/core/canvas/layout.ts` — port of `step-15c-layout.mcp.js`.",
                "`src/core/canvas/effects.ts` — port of `step-15c-effects.mcp.js`.",
                "Both produce auto-layout frames; consume `TokensV1`.",
            ],
            acceptance=[
                "Layout page shows spacing scale, radii, grids with samples.",
                "Effects page shows shadow + blur tokens with rendered previews.",
                "Both pass audit; bench <3s each.",
            ],
            out_of_scope=[
                "Other style-guide pages (WO-011, WO-012).",
                "Bootstrap tab UI (WO-015).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-design-system/canvas-templates/bundles/step-15c-layout.mcp.js`",
                f"`{DESIGNOPS}/skills/create-design-system/canvas-templates/bundles/step-15c-effects.mcp.js`",
            ],
            deps=["WO-008", "WO-014"],
            prd_refs=["`Docs/PRD.md` §6.1 FR-BOOT-7"],
        ),
    },
    {
        "id": "WO-014", "sprint": 3,
        "slug": "auto-layout-helpers-library",
        "title": "WO-014: Auto-layout helpers library (encode gotchas as code, not prompt rules)",
        "body": body(
            goal="Encode the auto-layout gotchas + invariants from DesignOps-plugin's convention shards as a typed helper library in `src/core/canvas/helpers/`. Every canvas builder uses these helpers so the gotchas (e.g. `resize()` resetting sizing modes, matrix specimen counter-axis AUTO) disappear from prompt rules and become unit-tested functions.",
            requirements=[
                "`src/core/canvas/helpers/autoLayout.ts` — `resizeWithAutoLayout(node, w, h, sizing)` that calls `resize` then sets sizing modes correctly per `00-gotchas.md` §0.10.",
                "`src/core/canvas/helpers/matrixSpecimen.ts` — counter-axis AUTO + minHeight per `03-auto-layout-invariants.md` §10–10.2.",
                "`src/core/canvas/helpers/columnSpec.ts` — column widths + cell recipes from `10-column-spec.md`.",
                "`src/core/canvas/helpers/buildOrder.ts` — table build-order rules from `11-cells-12-bindings-13-build-order.md`.",
                "Every helper has unit tests asserting the rules.",
            ],
            acceptance=[
                "Every canvas builder (WO-011, WO-012, WO-013) imports from these helpers — no inline `resize()` calls.",
                "Unit tests cover the resize-then-sizing ordering, counter-axis AUTO assertion, no-1px-masters rule.",
                "`tsc --noEmit` clean.",
            ],
            out_of_scope=[
                "Component-specific auto-layout (Sprint 5 reuses these helpers).",
                "UI thread helpers (these are plugin-thread Figma API helpers only).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-design-system/conventions/00-gotchas.md` §0.10 — resize/sizing ordering",
                f"`{DESIGNOPS}/skills/create-design-system/conventions/08-hierarchy-and-09-autolayout.md` — counter-axis AUTO rules",
                f"`{DESIGNOPS}/skills/create-design-system/conventions/10-column-spec.md`, `11-cells-12-bindings-13-build-order.md`",
                f"`{DESIGNOPS}/skills/create-component/conventions/03-auto-layout-invariants.md` §10–10.2 — matrix specimen rules",
            ],
            deps=["WO-002"],
            prd_refs=["`Docs/PRD.md` §6.2 FR-SCAF-7"],
        ),
    },
    {
        "id": "WO-015", "sprint": 3,
        "slug": "bootstrap-tab-ui-paste-file-progress-audit",
        "title": "WO-015: Bootstrap tab UI (paste/file flows + progress + audit display)",
        "body": body(
            goal="Wire up the Bootstrap tab of the plugin UI: paste / file picker / clipboard sources flow into the push engine + canvas builders, with progress reporting and inline audit display. This is the first end-user-visible Sprint 1 → Sprint 3 integration.",
            requirements=[
                "`src/ui/tabs/Bootstrap.tsx` — full tab UI.",
                "Source picker invoking WO-006 sources (paste / file / clipboard).",
                "Detect token format (WO-007 adapters) and preview the loaded document.",
                '"Push to Figma" button orchestrates: WO-008 variable push → WO-011/12/13 canvas builders → WO-010 audit.',
                "Progress bar with per-step status.",
                "Audit results display: pass/fail counts, drill-down to per-rule diagnostics.",
            ],
            acceptance=[
                "Designer can paste a `tokens.json` and complete a full bootstrap (5 collections + style guide canvas) in one button press.",
                "Progress bar updates in real-time.",
                "Audit failures appear inline; designer can dismiss or copy.",
                "Bench: full bootstrap on a 400-variable input completes <30s (PRD G1 target).",
            ],
            out_of_scope=[
                "GitHub OAuth source (Sprint 4 WO-016).",
                "Output sinks (Sprint 4 WO-017+).",
                "Components / Sync / Handoff tabs.",
            ],
            lift_refs=[],
            deps=["WO-006", "WO-007", "WO-008", "WO-010", "WO-011", "WO-012", "WO-013"],
            prd_refs=["`Docs/PRD.md` §6.1 FR-BOOT-*, §6.8 FR-IO-*"],
            vqa=vqa_table_stub(),
            design_ref="Bootstrap tab UI mock — first end-user-visible FigHub surface. Design lives in the FigHub design file (file_key to be assigned during /plan).",
        ),
    },

    # =========== SPRINT 4 — GitHub OAuth + remaining I/O + feature gating → Phase 1 GA ===========
    {
        "id": "WO-016", "sprint": 4,
        "slug": "github-oauth-integration-read-and-write-pr",
        "title": "WO-016: GitHub OAuth integration (read tokens, write PRs)",
        "body": body(
            goal="Add GitHub OAuth as a first-class input source AND output sink (PR creation), gated to the Org build per PRD §13.1. Designer authenticates once per repo; plugin can read `tokens.json` and write PR commits.",
            requirements=[
                "OAuth flow in plugin UI iframe (auth happens in iframe, token passed to plugin thread for API calls).",
                "Scopes: `repo` (read+write for the configured repo paths only).",
                "Token stored in `figma.clientStorage` scoped per repo URL.",
                "`src/io/sources/github.ts` — reads files from a configured path.",
                "`src/io/sinks/githubPR.ts` — opens a PR with one or more committed files.",
                "Settings UI panel for connecting / disconnecting repos.",
                "Feature flag: only enabled in Org build (Community build hides UI).",
            ],
            acceptance=[
                "OAuth flow completes end-to-end against a test repo.",
                "Plugin can read `design/tokens.json` from a connected repo.",
                "Plugin can open a PR with a single file change against a connected repo.",
                "Token persists across plugin re-opens; revocation clears stored token.",
                "Community build does not show GitHub UI affordances.",
            ],
            out_of_scope=[
                "Per-file granular auth (one OAuth per repo).",
                "GitHub App vs OAuth App tradeoff (use OAuth App for MVP; revisit).",
                "Multi-repo simultaneous connections (single connected repo per project for now).",
            ],
            lift_refs=[],
            deps=["WO-002"],
            prd_refs=["`Docs/PRD.md` §10 (Sources/Sinks), §13.1 (feature gating), §11.3 (Security)"],
        ),
    },
    {
        "id": "WO-017", "sprint": 4,
        "slug": "output-sinks-download-clipboard-output-page-plugindata",
        "title": "WO-017: Output sinks — download + clipboard + Output page + frame pluginData",
        "body": body(
            goal="Implement the four non-GitHub output sinks: download as file, copy to clipboard, write to a labeled text node on the DesignOps Output page (renamed: FigHub Output page), and write to a selected frame's pluginData. All sinks share the same `LoadedDocument` input shape.",
            requirements=[
                "`src/io/sinks/download.ts` — browser-native file download (.json or .md).",
                "`src/io/sinks/clipboard.ts` — write to OS clipboard via `navigator.clipboard.writeText()`.",
                "`src/io/sinks/outputPage.ts` — find-or-create a `FigHub Output` page, write a labeled text node with the document content.",
                "`src/io/sinks/pluginData.ts` — `setPluginData(key, value)` on a target node.",
                "All four implement the same `Sink` interface for use by the unified export sheet (WO-020).",
            ],
            acceptance=[
                "Each sink works against a sample drift-report.v1 document.",
                "Output page auto-created on first use; subsequent writes append text nodes (or update by label).",
                "pluginData sink uses a stable namespace prefix (`fighub:` for collision avoidance).",
                "Unit tests for each sink (mock Figma + clipboard APIs where needed).",
            ],
            out_of_scope=[
                "GitHub PR sink (WO-018).",
                "Format conversion (handled by WO-019 serializer).",
                "Unified export sheet UI (WO-020).",
            ],
            lift_refs=[],
            deps=["WO-002", "WO-003"],
            prd_refs=["`Docs/PRD.md` §6.8 FR-IO-2, §10.2"],
        ),
    },
    {
        "id": "WO-018", "sprint": 4,
        "slug": "github-pr-output-sink",
        "title": "WO-018: GitHub PR output sink (commits + opens PR with one or more files)",
        "body": body(
            goal="GitHub PR as a configured output sink. Designer picks a target repo + branch + commit message; plugin commits the contract document(s) and opens a PR. Gated to Org build (depends on WO-016 OAuth).",
            requirements=[
                "`src/io/sinks/githubPR.ts` — accepts list of `{ path, content }` + commit message + base branch; creates new branch, commits files, opens PR.",
                "Default branch naming pattern: `fighub/{contractKind}-{date}` (configurable).",
                "PR body includes a `Generated by FigHub` footer with plugin version.",
                "Implements the standard `Sink` interface (WO-017).",
                "Org build only.",
            ],
            acceptance=[
                "A drift-report.v1 PR opens against a connected repo with the .json + .md siblings committed.",
                "PR body links back to the source Figma file URL.",
                "Failure modes (auth expired, branch conflict, network error) surface clear error messages.",
            ],
            out_of_scope=[
                "Multi-file PR with extensive review metadata (just commit + open).",
                "Updating existing PRs (always creates new).",
            ],
            lift_refs=[],
            deps=["WO-016", "WO-017"],
            prd_refs=["`Docs/PRD.md` §6.8 FR-IO-2, §10.2"],
        ),
    },
    {
        "id": "WO-019", "sprint": 4,
        "slug": "dual-format-serialization-json-and-gfm-markdown",
        "title": "WO-019: Dual-format serialization (JSON + GFM markdown per contract type)",
        "body": body(
            goal="Every output document gets a JSON form AND a GFM markdown form, both derived from the same canonical TS object. Markdown rendering uses plain GFM tables + headings — readable in chat, GitHub, and Figma canvas text nodes.",
            requirements=[
                "`src/io/formats/json.ts` — serialize canonical → JSON (just JSON.stringify with stable key order).",
                "`src/io/formats/markdown.ts` — serialize canonical → GFM markdown per contract type (5 renderers: ops-program, tokens preview, component-spec preview, drift-report, handoff-context).",
                "Markdown uses the `↑ Push` / `↓ Pull` / `⚠ Conflict` glyphs and section headings from the PRD §8.4 + §10.3.",
                "`format(doc, 'json' | 'md')` is the entry point.",
                "Round-trip: never authoring markdown directly — always derived from JSON.",
            ],
            acceptance=[
                "A drift-report.v1.json with 4 push, 2 pull, 1 conflict renders as markdown with three sections and correct counts.",
                "A handoff-context.v1 renders as markdown with screenshot embed + components-used table + tokens-used list.",
                "Unit tests per contract type, fixtures committed.",
            ],
            out_of_scope=[
                "Format conversion the other direction (markdown → JSON not supported; markdown is read-only output).",
                "Schema validation (handled at adapter layer).",
            ],
            lift_refs=[],
            deps=["WO-003"],
            prd_refs=["`Docs/PRD.md` §6.8 FR-IO-3, §10.3"],
        ),
    },
    {
        "id": "WO-020", "sprint": 4,
        "slug": "unified-export-sheet-ui",
        "title": "WO-020: Unified export sheet UI (one component used across all flows)",
        "body": body(
            goal="A single React component that asks the designer: which format(s)? which sink(s)? what file path (when applicable)? Used by every flow that emits a contract document — drift reports, handoff, registry updates, ops-program audits, etc.",
            requirements=[
                "`src/ui/components/ExportSheet.tsx` — props: `{ document: ContractDocument, defaultSinks?: Sink[] }`.",
                "Format checkboxes: JSON / Markdown / both.",
                "Sink checkboxes: download / clipboard / Output page / pluginData / GitHub PR (Org only).",
                "When GitHub PR selected: path input field with sensible default based on document kind.",
                "Submit invokes the chosen sinks in parallel; reports per-sink success/failure.",
            ],
            acceptance=[
                "Component renders in Storybook (or equivalent) with all 5 contract document kinds.",
                "All 5 sinks are reachable; selecting multiple sinks writes to all of them.",
                "GitHub PR sink hidden in Community build via feature flag.",
            ],
            out_of_scope=[
                "Per-sink customization beyond path (e.g. PR labels, commit author override).",
                "Cancel-in-flight (assume sinks are fast enough).",
            ],
            lift_refs=[],
            deps=["WO-017", "WO-018", "WO-019"],
            prd_refs=["`Docs/PRD.md` §6.8 FR-IO-4, §10.4"],
            vqa=vqa_table_stub(),
            design_ref="Export sheet design lives in the FigHub design file (file_key TBD).",
        ),
    },
    {
        "id": "WO-021", "sprint": 4,
        "slug": "feature-gating-dual-manifest-builds-community-vs-org",
        "title": "WO-021: Feature gating + dual manifest builds (Community vs Org) → Phase 1 GA cut",
        "body": body(
            goal="Lock in the Community vs Org build separation. Same source tree, two manifests, build-time feature flags. Org build adds GitHub OAuth + multi-file batch via REST + Code Connect PR emission. Community build is the public-listing version.",
            requirements=[
                "`src/config/flags.community.ts` and `src/config/flags.org.ts` define the exported `flags` object with the gated capabilities per PRD §13.1.",
                "`scripts/build-community.mjs` and `scripts/build-org.mjs` switch the flag import + manifest at build time.",
                "Every gated UI affordance reads from `flags.xxx` (no conditional imports per build).",
                "`manifest.community.json` and `manifest.org.json` differ in plugin id, name suffix, and any other publish metadata.",
                "Phase 1 GA cut: Community build supports bootstrap + style-guide canvas + paste/file/clipboard sources + download/clipboard/Output page/pluginData sinks. Org build adds GitHub OAuth + GitHub PR sink.",
            ],
            acceptance=[
                "Both builds produce loadable plugin bundles.",
                "Community build does not expose GitHub UI.",
                "Org build exposes full I/O including GitHub.",
                "Single `npm run build` runs both targets.",
                "Phase 1 GA: bootstrap path benchmarked end-to-end vs MCP baseline (target: ≥10× speedup).",
            ],
            out_of_scope=[
                "Variables REST API path (deferred — see PRD §11.5).",
                "Pre-configured token templates per client (later add-on).",
            ],
            lift_refs=[],
            deps=["WO-002", "WO-016", "WO-017", "WO-018", "WO-019", "WO-020"],
            prd_refs=["`Docs/PRD.md` §13 (Distribution & feature gating), §12 Phase 1 exit"],
        ),
    },

    # =========== SPRINT 5 — Component scaffold engine (forward path) → Phase 2 GA ===========
    {
        "id": "WO-022", "sprint": 5,
        "slug": "componentset-variant-matrix-scaffolder",
        "title": "WO-022: ComponentSet + variant matrix scaffolder",
        "body": body(
            goal="Implement the core component-scaffold engine: given a `ComponentSpecV1`, create a ComponentSet on the canvas with the full variant matrix (cross-product of variant axes). Port the multi-call canvas dance from DesignOps-plugin into a single deterministic function.",
            requirements=[
                "`src/core/components/scaffold/index.ts` — entry point: `scaffold(spec: ComponentSpecV1, target: PageNode): ScaffoldResult`.",
                "`src/core/components/scaffold/archetypes/` — per-archetype implementations: chip, composed, container, control, field, row-item, surface-stack, tiny. Ports from DesignOps-plugin `component-*.mcp.js` bundles.",
                "Variant matrix: cross-product of variant axes from spec; each cell is a Component child of the ComponentSet.",
                "Uses auto-layout helpers (WO-014).",
            ],
            acceptance=[
                "A spec with 3 variant axes (3 × 2 × 2) produces a ComponentSet with 12 component children, correctly named per Figma convention.",
                "Each archetype passes its own integration test against a sample spec.",
                "Re-running with the same spec is idempotent.",
                "Audit (WO-010 / component-scaffold mode) reports cleanly.",
            ],
            out_of_scope=[
                "Variable bindings (WO-023).",
                "Property definitions (WO-024).",
                "Usage frame (WO-025).",
                "Registry write (WO-026).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-chip.mcp.js`",
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-composed.mcp.js`",
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-container.mcp.js`",
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-control.mcp.js`",
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-field.mcp.js`",
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-row-item.mcp.js`",
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-surface-stack.mcp.js`",
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-tiny.mcp.js`",
                f"`{DESIGNOPS}/skills/create-component/conventions/02-archetype-routing.md` — archetype dispatch logic",
                f"`{DESIGNOPS}/skills/create-component/EXECUTOR.md` — step-by-step build pipeline",
            ],
            deps=["WO-008", "WO-014", "WO-003"],
            prd_refs=["`Docs/PRD.md` §6.2 FR-SCAF-1..2"],
        ),
    },
    {
        "id": "WO-023", "sprint": 5,
        "slug": "variable-bindings-application",
        "title": "WO-023: Variable bindings application (fill, stroke, radius, padding, gap, text styles)",
        "body": body(
            goal="Apply variable bindings to scaffolded components per the spec — `setBoundVariable` / `setBoundVariableForPaint` per the binding definitions in `ComponentSpecV1.bindings`. Implements FR-SCAF-3.",
            requirements=[
                "`src/core/components/scaffold/applyBindings.ts` — applies all bindings from a spec to the scaffolded component tree.",
                "Supports: fill, stroke, radius, padding, gap, text-style bindings.",
                "Resolves variable references by name → Variable node via `figma.variables.getLocalVariablesAsync()` (or equivalent).",
                "Unbound selectors flagged in audit, not silent-failed.",
            ],
            acceptance=[
                "A spec with 10 bindings applied to a scaffolded component leaves every selector bound to its variable.",
                "Missing variable references surface in audit as FAIL with the selector path.",
                "Integration test against a sample shadcn component spec.",
            ],
            out_of_scope=[
                "Property definitions (WO-024).",
                "Token resolution from CSS classes (Sprint 8 token resolver).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-component/conventions/07-token-paths.md` — binding paths convention",
            ],
            deps=["WO-022", "WO-008"],
            prd_refs=["`Docs/PRD.md` §6.2 FR-SCAF-3"],
        ),
    },
    {
        "id": "WO-024", "sprint": 5,
        "slug": "component-property-definitions",
        "title": "WO-024: Component property definitions (Boolean, Text, Variant, InstanceSwap)",
        "body": body(
            goal="Add component property definitions to the scaffolded ComponentSet per the spec's `props` field — Boolean, Text, Variant, and InstanceSwap types. Implements FR-SCAF-4.",
            requirements=[
                "`src/core/components/scaffold/applyProperties.ts` — calls `addComponentProperty` on the ComponentSet with the correct type per spec prop.",
                "Variant props auto-derived from variant matrix axes; explicit `props[]` entries cover Boolean/Text/InstanceSwap.",
                "Default values applied per spec.",
            ],
            acceptance=[
                "A spec with `props: [{ name: 'loading', type: 'boolean', default: false }]` results in a Boolean component property on the ComponentSet with default false.",
                "Variant matrix axes appear as Variant properties (auto-derived).",
                "Integration test against a sample shadcn component spec.",
            ],
            out_of_scope=[
                "Instance-level prop overrides (designer authors those manually).",
                "Property descriptions (cosmetic; defer).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-component/conventions/01-config-schema.md`",
                f"`{DESIGNOPS}/skills/create-component/shadcn-props.schema.json` — source of prop shapes",
            ],
            deps=["WO-022"],
            prd_refs=["`Docs/PRD.md` §6.2 FR-SCAF-4"],
        ),
    },
    {
        "id": "WO-025", "sprint": 5,
        "slug": "usage-frame-generator",
        "title": "WO-025: Usage frame generator (example instances)",
        "body": body(
            goal="Generate a 'usage' frame next to the scaffolded ComponentSet showing example instances across variant combinations. Implements FR-SCAF-5.",
            requirements=[
                "`src/core/components/scaffold/usageFrame.ts` — produces an auto-layout frame containing instance examples (one per variant combination or a curated subset).",
                "Uses auto-layout helpers (WO-014).",
                "Label each instance with its variant tuple.",
            ],
            acceptance=[
                "After scaffolding a Button with `variant × size × disabled`, the usage frame shows representative instances (e.g. 4-6 curated combos, not all 12).",
                "Frame passes audit.",
            ],
            out_of_scope=[
                "Designer-customizable usage examples beyond the default curation.",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-component/canvas-templates/bundles/component-*.mcp.js` — `_usage-runner.fragment.js` patterns",
            ],
            deps=["WO-022", "WO-014"],
            prd_refs=["`Docs/PRD.md` §6.2 FR-SCAF-5"],
        ),
    },
    {
        "id": "WO-026", "sprint": 5,
        "slug": "registry-update-emission",
        "title": "WO-026: Registry update emission (.fighub-registry.json)",
        "body": body(
            goal="After each successful scaffold, emit an updated `.fighub-registry.json` (or stage one for emission via export sheet) so the consumer repo stays in sync with what exists in Figma. Implements FR-SCAF-6.",
            requirements=[
                "`src/core/components/registry.ts` — read existing registry (if any from connected repo), merge in new component metadata, return the updated registry document.",
                "New entry includes: name, archetype, variant matrix, props, Figma node id, optional Code Connect mapping URL.",
                "Output via WO-020 unified export sheet — defaulting to GitHub PR for Org builds, download for Community.",
            ],
            acceptance=[
                "Scaffolding a new Button updates the registry with a new entry referencing the Figma ComponentSet's node id.",
                "Re-scaffolding the same Button updates (not duplicates) the entry.",
                "Registry document validates against `RegistryV1` schema (WO-003).",
            ],
            out_of_scope=[
                "Removing entries on component delete (Sprint 6 drift detection handles).",
                "Multi-file registry support.",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-component/registry.schema.json` — existing registry shape reference",
            ],
            deps=["WO-022", "WO-003", "WO-020"],
            prd_refs=["`Docs/PRD.md` §6.2 FR-SCAF-6, §8.6"],
        ),
    },
    {
        "id": "WO-027", "sprint": 5,
        "slug": "components-tab-ui-forward-flow",
        "title": "WO-027: Components tab UI (forward flow: registry pick OR paste spec) → Phase 2 GA",
        "body": body(
            goal="Build the Components tab UI for the forward-scaffold flow. Designer picks from the registry OR pastes a `ComponentSpecV1`; plugin scaffolds + binds + adds props + builds usage frame; registry export sheet appears. Phase 2 GA cut.",
            requirements=[
                "`src/ui/tabs/Components.tsx` — full tab UI.",
                "Two entry paths: 'Add from registry' (browses connected repo's `.fighub-registry.json`) and 'Paste/load spec' (uses WO-006 sources).",
                "Spec preview + edit (variant matrix, prop list, binding overrides) before scaffold.",
                "'Scaffold' button orchestrates WO-022 → WO-023 → WO-024 → WO-025 → WO-026 → export sheet.",
                "Progress + audit display.",
            ],
            acceptance=[
                "Designer can scaffold a known shadcn component (e.g. Button) in <5s from registry pick.",
                "Designer can paste a custom spec and scaffold it.",
                "Phase 2 GA criteria met: component scaffold latency p50 <5s (PRD G2).",
            ],
            out_of_scope=[
                "Import-from-repo flow (Sprint 8).",
                "Code Connect PR emission (Sprint 8).",
                "Bulk scaffold (one component per run).",
            ],
            lift_refs=[],
            deps=["WO-006", "WO-022", "WO-023", "WO-024", "WO-025", "WO-026"],
            prd_refs=["`Docs/PRD.md` §6.2, §12 Phase 2 exit"],
            vqa=vqa_table_stub(),
            design_ref="Components tab UI mock lives in the FigHub design file.",
        ),
    },

    # =========== SPRINT 6 — Drift detection + Sync tab UI ===========
    {
        "id": "WO-028", "sprint": 6,
        "slug": "snapshot-mechanism-canvas-plugindata",
        "title": "WO-028: Snapshot mechanism (canvas pluginData — the 3-way common ancestor)",
        "body": body(
            goal="Implement the per-key snapshot that serves as the 'common ancestor' for 3-way drift detection (push/pull/conflict). Stored in pluginData on a hidden node in the FigHub Output page; updated per-key after every successful push or pull.",
            requirements=[
                "`src/core/drift/snapshot.ts` — read/write snapshot from pluginData.",
                "Per-key entries: `{ key: string, value: unknown, source: 'push' | 'pull', timestamp: ISO }`.",
                "API: `getSnapshot()`, `updateSnapshotKey(key, value, source)`, `clearSnapshot()`.",
                "Snapshot survives across plugin re-opens and Figma file forks.",
                "Stable namespace prefix (`fighub:snapshot:`).",
            ],
            acceptance=[
                "After a variable push, the snapshot reflects the pushed values per key.",
                "After a manual edit to a variable, the snapshot remains stale (correct — that's the drift signal).",
                "Clearing snapshot resets the 'last synced' baseline (used after rebase / migrate operations).",
                "Unit tests cover read/write/update.",
            ],
            out_of_scope=[
                "Multi-file snapshot synchronization.",
                "Snapshot history / undo.",
            ],
            lift_refs=[],
            deps=["WO-002"],
            prd_refs=["`Docs/PRD.md` §6.4 FR-DRIFT-1"],
        ),
    },
    {
        "id": "WO-029", "sprint": 6,
        "slug": "variable-drift-detector-3-way",
        "title": "WO-029: Variable drift detector (Figma ↔ tokens.json 3-way)",
        "body": body(
            goal="Implement variable drift detection: pull current repo `tokens.json`, walk current Figma local variables, compare both against the snapshot (common ancestor). Classify each diff as push / pull / conflict / synced.",
            requirements=[
                "`src/core/drift/variables.ts` — `detectVariableDrift(repoTokens, figmaVars, snapshot): VariableDrift[]`.",
                "Per-token classification:",
                "  - Figma ≠ snapshot, repo = snapshot → **push**",
                "  - Repo ≠ snapshot, Figma = snapshot → **pull**",
                "  - Both ≠ snapshot and disagree → **conflict**",
                "  - Both = snapshot OR both ≠ snapshot but agree → **synced**",
                "Output integrates into `drift-report.v1` (WO-031).",
            ],
            acceptance=[
                "Test fixture: 10 variables, 3 pushed in Figma, 2 pulled in repo, 1 conflict — detector classifies all 10 correctly.",
                "Performance: 400-variable comparison <2s.",
                "Integration test against a sample repo + Figma file.",
            ],
            out_of_scope=[
                "Component drift (WO-030).",
                "Resolution UI (WO-032).",
                "PR emission (WO-031).",
            ],
            lift_refs=[],
            deps=["WO-028", "WO-008"],
            prd_refs=["`Docs/PRD.md` §6.4 FR-DRIFT-2..3"],
        ),
    },
    {
        "id": "WO-030", "sprint": 6,
        "slug": "component-drift-detector-3-way",
        "title": "WO-030: Component drift detector (Figma ↔ component-spec/registry 3-way)",
        "body": body(
            goal="Same 3-way classification as WO-029, but for components. Compares current Figma ComponentSets against repo `.fighub-registry.json` and per-component specs in the connected repo, using the snapshot as common ancestor.",
            requirements=[
                "`src/core/drift/components.ts` — `detectComponentDrift(repoSpecs, figmaComponents, snapshot): ComponentDrift[]`.",
                "Detects: new variants in Figma, removed variants, changed bindings, prop additions, prop removals.",
                "Classification rules same as WO-029.",
                "Each drift entry includes the granular diff (which variant / which binding / which prop).",
            ],
            acceptance=[
                "Test fixture: Button with `loading` variant added in Figma → push drift detected with correct granular delta.",
                "Test fixture: Button with new prop in repo spec → pull drift detected.",
                "Both-sides-changed → conflict.",
                "Performance: 20-component file <2s.",
            ],
            out_of_scope=[
                "Code-side spec validation (assume repo specs are well-formed).",
                "Auto-resolution suggestions.",
            ],
            lift_refs=[],
            deps=["WO-028", "WO-022"],
            prd_refs=["`Docs/PRD.md` §6.4 FR-DRIFT-2..3"],
        ),
    },
    {
        "id": "WO-031", "sprint": 6,
        "slug": "push-pull-conflict-classification-drift-report-v1-emission",
        "title": "WO-031: Push/Pull/Conflict classification + drift-report.v1 emission",
        "body": body(
            goal="Aggregate variable + component drift into a `DriftReportV1` document with the push/pull/conflict classification and granular per-drift entries. Emit via WO-020 export sheet (download / clipboard / Output page / pluginData / GitHub PR).",
            requirements=[
                "`src/core/drift/report.ts` — aggregator: takes variable + component drifts, builds `DriftReportV1`.",
                "Summary fields: total push, total pull, total conflicts, total synced.",
                "Markdown rendering via WO-019: three sections (`## Push (N)`, `## Pull (N)`, `## Conflicts (N)`), each with table of drifts.",
                "JSON form per `DriftReportV1` schema (WO-003).",
                "Markdown PR title pattern: `DesignOps drift: N push, M pull, K conflicts (sprint X)`.",
            ],
            acceptance=[
                "End-to-end: drift detected on a sample file produces a `drift-report.v1.json` AND `drift-report.v1.md` with correct counts.",
                "Markdown renders cleanly in GitHub PR preview.",
                "JSON validates against `DriftReportV1` schema.",
            ],
            out_of_scope=[
                "Resolution UI (WO-032).",
            ],
            lift_refs=[],
            deps=["WO-029", "WO-030", "WO-019", "WO-020", "WO-003"],
            prd_refs=["`Docs/PRD.md` §6.4 FR-DRIFT-3..4, §8.4"],
        ),
    },
    {
        "id": "WO-032", "sprint": 6,
        "slug": "resolution-ui-per-drift-bulk-conflict-resolver",
        "title": "WO-032: Resolution UI (per-drift + bulk + conflict resolver)",
        "body": body(
            goal="Build the resolution UX: list of drifts with filter chips (All / Push / Pull / Conflict), per-row Push/Pull/Skip actions, bulk Push / Pull buttons (disabled while any conflict is unresolved), and a 3-column conflict resolver (Last synced / Figma / Repo) for conflicts.",
            requirements=[
                "`src/ui/components/DriftList.tsx` — list + chips + filters.",
                "`src/ui/components/ConflictResolver.tsx` — 3-column compare + 'Keep Figma' / 'Keep Repo' / 'Custom value' / 'Skip' actions.",
                "Per-row actions update an in-memory `resolutions` map keyed by drift id.",
                "Bulk actions: 'Push selected → PR' (invokes WO-018 PR sink), 'Pull selected → apply' (invokes WO-008 push engine or component scaffold with the repo values).",
                "Snapshot updates per-resolved drift (WO-028).",
            ],
            acceptance=[
                "Designer can resolve a 10-drift report (4 push, 3 pull, 3 conflict) end-to-end without leaving the plugin.",
                "Bulk Push action opens a single PR with all push-resolutions committed.",
                "Bulk Pull action applies all pull-resolutions to Figma and updates snapshots.",
                "Conflict row stays disabled in bulk until explicitly resolved.",
            ],
            out_of_scope=[
                "Undo of applied resolutions (use Figma's native undo).",
                "Saving partial resolution state across plugin sessions.",
            ],
            lift_refs=[],
            deps=["WO-031", "WO-008", "WO-018", "WO-028"],
            prd_refs=["`Docs/PRD.md` §6.5"],
            vqa=vqa_table_stub(),
            design_ref="Sync tab resolution UI mock lives in the FigHub design file.",
        ),
    },
    {
        "id": "WO-033", "sprint": 6,
        "slug": "sync-tab-ui-on-open-badge",
        "title": "WO-033: Sync tab UI + on-open badge",
        "body": body(
            goal="Wire the Sync tab: on plugin open, run lightweight drift detection, show badge `Sync · N↑ M↓` (+ `·K⚠` if conflicts) on the tab nav. Tab itself houses WO-032's resolution UI.",
            requirements=[
                "`src/ui/tabs/Sync.tsx` — full tab UI hosting WO-032 components.",
                "On plugin mount: run quick variable + component drift check; cache result.",
                "Badge shows on tab nav with counts.",
                "'Detect drift' button to re-run on demand.",
            ],
            acceptance=[
                "Open plugin in a file with 4 push + 2 pull drifts → badge shows `Sync · 4↑ 2↓` within 2s.",
                "Open Sync tab → resolution UI populated.",
                "Re-detect after manual edit refreshes counts.",
            ],
            out_of_scope=[
                "Continuous background detection (Figma plugins can't background; on-open only).",
            ],
            lift_refs=[],
            deps=["WO-029", "WO-030", "WO-032"],
            prd_refs=["`Docs/PRD.md` §6.4 FR-DRIFT-5"],
            vqa=vqa_table_stub(),
            design_ref="Sync tab + badge design lives in the FigHub design file.",
        ),
    },

    # =========== SPRINT 7 — Handoff capture → Phase 3 GA ===========
    {
        "id": "WO-034", "sprint": 7,
        "slug": "selection-metadata-screenshot-capture",
        "title": "WO-034: Selection metadata + screenshot capture",
        "body": body(
            goal="When designer selects a frame and triggers handoff capture, extract: node id, frame name, deep link with `node-id` query param, and a PNG export of the frame. Foundation for the rest of the handoff bundle (WO-035, WO-036).",
            requirements=[
                "`src/core/handoff/capture.ts` — `captureSelection(): SelectionCapture`.",
                "Uses `figma.currentPage.selection` + `node.exportAsync({ format: 'PNG' })`.",
                "Deep link constructed from current file key + node id.",
                "Multiple selection supported: returns array.",
            ],
            acceptance=[
                "With a frame selected, capture returns node id, name, deep link, PNG data URL.",
                "Multi-selection captures all selected frames.",
                "Performance: <1s for typical frames.",
            ],
            out_of_scope=[
                "Components-used enumeration (WO-035).",
                "Tokens-used (WO-036).",
                "UI (WO-038).",
            ],
            lift_refs=[],
            deps=["WO-002"],
            prd_refs=["`Docs/PRD.md` §6.6 FR-HAND-1"],
        ),
    },
    {
        "id": "WO-035", "sprint": 7,
        "slug": "components-used-code-connect-url-enumeration",
        "title": "WO-035: Components-used + Code Connect URL enumeration",
        "body": body(
            goal="Walk the selected frame's subtree, enumerate every component instance, and include the Code Connect URL when one is mapped (via Figma's mapping API).",
            requirements=[
                "`src/core/handoff/components.ts` — `enumerateComponents(node: SceneNode): ComponentUsage[]`.",
                "Each usage: `{ name: string, instances: number, codeConnectUrl: string | null }`.",
                "Walks Component / Instance nodes; aggregates by Component name.",
            ],
            acceptance=[
                "A frame with 4 Button instances + 2 Card instances returns `[{ name: 'Button', instances: 4, ... }, { name: 'Card', instances: 2, ... }]`.",
                "Code Connect URLs included where mapped.",
                "Unit + integration tests against fixture frames.",
            ],
            out_of_scope=[
                "Code Connect creation (Sprint 8).",
            ],
            lift_refs=[],
            deps=["WO-034"],
            prd_refs=["`Docs/PRD.md` §6.6 FR-HAND-2"],
        ),
    },
    {
        "id": "WO-036", "sprint": 7,
        "slug": "tokens-used-auto-layout-metadata-extraction",
        "title": "WO-036: Tokens-used + auto-layout metadata extraction",
        "body": body(
            goal="Walk the selected frame, collect every Variable referenced (via `boundVariables`), and capture auto-layout metadata (direction, gap, padding, sizing modes) for handoff context.",
            requirements=[
                "`src/core/handoff/tokens.ts` — `enumerateTokensAndLayout(node: SceneNode): { tokens: string[], autoLayout: AutoLayoutMeta }`.",
                "Walks the tree collecting unique variable names from `boundVariables`.",
                "Extracts auto-layout metadata from the root frame.",
            ],
            acceptance=[
                "A frame using `Theme/Primary` + `Layout/spacing/3` + `Typography/Body/medium` returns those three token names.",
                "Auto-layout metadata correctly captures vertical/horizontal + gap + padding.",
                "Unit + integration tests.",
            ],
            out_of_scope=[
                "Token value resolution (only names matter for handoff).",
            ],
            lift_refs=[],
            deps=["WO-034"],
            prd_refs=["`Docs/PRD.md` §6.6 FR-HAND-3..4"],
        ),
    },
    {
        "id": "WO-037", "sprint": 7,
        "slug": "handoff-context-v1-emission-to-all-sinks",
        "title": "WO-037: handoff-context.v1 emission to all sinks",
        "body": body(
            goal="Aggregate WO-034/35/36 outputs into a `HandoffContextV1` document; emit via the WO-020 export sheet with all 5 sinks. Default to clipboard (most common use case).",
            requirements=[
                "`src/core/handoff/build.ts` — combines selection capture + components + tokens + layout into `HandoffContextV1`.",
                "Markdown rendering via WO-019: includes screenshot, frame URL, components used (table with Code Connect links), tokens-used list, auto-layout meta.",
                "Export sheet integration.",
            ],
            acceptance=[
                "Capture a 'Checkout' frame → resulting markdown opens cleanly in Slack / Claude / GitHub PR.",
                "JSON validates against `HandoffContextV1` schema.",
                "Latency: capture-to-clipboard <1s.",
            ],
            out_of_scope=[
                "Auto-creation of GitHub issues from handoff (manual; designer routes via clipboard or PR).",
            ],
            lift_refs=[],
            deps=["WO-034", "WO-035", "WO-036", "WO-019", "WO-020", "WO-003"],
            prd_refs=["`Docs/PRD.md` §6.6 FR-HAND-5, §8.5"],
        ),
    },
    {
        "id": "WO-038", "sprint": 7,
        "slug": "handoff-tab-ui",
        "title": "WO-038: Handoff tab UI → Phase 3 GA",
        "body": body(
            goal="Wire the Handoff tab: 'Capture selection' button → runs WO-037 pipeline → preview the handoff document → export sheet. Phase 3 GA cut.",
            requirements=[
                "`src/ui/tabs/Handoff.tsx` — full tab UI.",
                "Selection-aware button (disabled with no selection).",
                "Preview pane shows markdown rendering.",
                "Export sheet defaults to clipboard.",
            ],
            acceptance=[
                "Designer selects frame → opens Handoff tab → clicks Capture → previews handoff → clicks Export → markdown lands in clipboard.",
                "Phase 3 GA: end-to-end handoff <1s capture, designer-mediated routing to consumer works.",
            ],
            out_of_scope=[
                "In-plugin LLM call to draft ticket description (Figma Agent territory).",
            ],
            lift_refs=[],
            deps=["WO-037"],
            prd_refs=["`Docs/PRD.md` §6.6, §12 Phase 3 exit"],
            vqa=vqa_table_stub(),
            design_ref="Handoff tab UI mock lives in the FigHub design file.",
        ),
    },

    # =========== SPRINT 8 — Code Connect + Import (React) → Phase 4a ===========
    {
        "id": "WO-039", "sprint": 8,
        "slug": "mapping-template-and-import-template-interfaces",
        "title": "WO-039: MappingTemplate + ImportTemplate interfaces (shared per-framework infra)",
        "body": body(
            goal="Define the two shared TypeScript interfaces every per-framework generator + parser implements: `MappingTemplate` (Figma → code mapping stub generator) and `ImportTemplate` (code → component-spec parser). All Sprint 8/9/10 frameworks plug into these two interfaces.",
            requirements=[
                "`src/core/codeconnect/MappingTemplate.ts` — interface for stub generators.",
                "`src/core/import/ImportTemplate.ts` — interface for code parsers.",
                "Shared utilities: `propTypeMapper`, `layoutInferrer`, `dependencyScanner` skeletons in `src/core/import/shared/`.",
                "Registry-driven framework dispatch.",
            ],
            acceptance=[
                "Both interfaces compile and have at least one stub implementation (React) referenced.",
                "Per-framework template factories return implementations.",
                "Unit tests for the shared utilities.",
            ],
            out_of_scope=[
                "Per-framework implementations (WO-040+).",
            ],
            lift_refs=[],
            deps=["WO-003"],
            prd_refs=["`Docs/PRD.md` §6.3, §6.7, §12 Phase 4a"],
        ),
    },
    {
        "id": "WO-040", "sprint": 8,
        "slug": "react-code-connect-stub-generator",
        "title": "WO-040: React Code Connect stub generator",
        "body": body(
            goal="Implement the React `MappingTemplate` — generates `.figma.tsx` Code Connect stub files for unmapped Figma components. Stubs include Figma node ids + component prop metadata. Engineer reviews + fills implementation references; CI publishes.",
            requirements=[
                "`src/core/codeconnect/templates/react.ts` — implements `MappingTemplate`.",
                "Output: one `.figma.tsx` per unmapped component, following the official `@figma/code-connect` package conventions.",
                "PR emission via WO-018 GitHub PR sink.",
            ],
            acceptance=[
                "Detect 5 unmapped React components on canvas → generate 5 `.figma.tsx` stubs → open a single PR.",
                "Stubs follow `figma.connect()` API correctly.",
                "Integration test: generated stubs pass `npx figma connect validate`.",
            ],
            out_of_scope=[
                "Other frameworks (WO-045+).",
                "Auto-implementation-reference filling (engineer's job).",
            ],
            lift_refs=[
                f"`{DESIGNOPS}/skills/create-component/conventions/05-code-connect.md` — Code Connect conventions",
            ],
            deps=["WO-039", "WO-018"],
            prd_refs=["`Docs/PRD.md` §6.7 FR-CC-*"],
        ),
    },
    {
        "id": "WO-041", "sprint": 8,
        "slug": "react-importfromcode-parser-ts-ast",
        "title": "WO-041: React importFromCode parser (TS AST → ComponentSpecV1)",
        "body": body(
            goal="Implement the React `ImportTemplate` — parses a `.tsx` component file via TypeScript compiler AST, extracts props/variants/bindings, produces a `ComponentSpecV1` ready for scaffolding (WO-022).",
            requirements=[
                "`src/core/import/templates/react.ts` — implements `ImportTemplate`.",
                "Uses `typescript` compiler API to parse `.tsx` source.",
                "Extracts: prop interface, default values, variant-typed props, layout hints from JSX, className-derived bindings.",
                "Reads existing `.figma.tsx` mapping if present for higher-fidelity prop mapping.",
                "Token resolution via WO-042 token resolver.",
                "Confidence flags on uncertain layout inferences (per PRD FR-IMP-7 'never silent-apply').",
            ],
            acceptance=[
                "Parse a sample shadcn Button.tsx → `ComponentSpecV1` with correct variant matrix + props + bindings.",
                "Unresolvable className (e.g. `bg-muted/40` without resolver match) flagged as confidence: low.",
                "Round-trip: parse → scaffold (WO-022) produces a valid ComponentSet.",
            ],
            out_of_scope=[
                "Other frameworks.",
                "Auto-resolution of low-confidence flags (designer must accept in preview).",
            ],
            lift_refs=[],
            deps=["WO-039", "WO-042"],
            prd_refs=["`Docs/PRD.md` §6.3 FR-IMP-*"],
        ),
    },
    {
        "id": "WO-042", "sprint": 8,
        "slug": "token-resolver-tailwind-css-vars",
        "title": "WO-042: Token resolver (Tailwind + CSS vars + auto-detect from repo)",
        "body": body(
            goal="Implement the token resolver that maps CSS class names / CSS variables to Figma Variables. Auto-detect from connected repo: Tailwind config first, then `tokens.css`, then Style Dictionary config, then Tokens Studio JSON. Manual override available.",
            requirements=[
                "`src/core/import/shared/tokenResolver.ts` — `resolve(className: string): { variable: string } | { unresolved: true }`.",
                "Detection priority (PRD FR-CONF-2): Tailwind config → tokens.css → Style Dictionary config → Tokens Studio.",
                "Settings panel for manual override (PRD FR-CONF-3).",
                "Per-project cache in clientStorage scoped per repo URL.",
            ],
            acceptance=[
                "`resolve('bg-primary')` against a Tailwind v4 config containing `--theme-primary` → `{ variable: 'Theme/Primary' }`.",
                "`resolve('bg-mystery')` → `{ unresolved: true }`.",
                "Detection auto-finds Tailwind v3/v4 configs.",
                "Manual override in Settings overrides detection.",
            ],
            out_of_scope=[
                "Native platform asset catalogs (Sprint 10 separate resolver).",
                "Reverse: Figma variable → className.",
            ],
            lift_refs=[],
            deps=["WO-016"],
            prd_refs=["`Docs/PRD.md` §6.9 FR-CONF-*, §6.3 FR-IMP-5"],
        ),
    },
    {
        "id": "WO-043", "sprint": 8,
        "slug": "dependency-scanner-subcomponent-handling",
        "title": "WO-043: Dependency scanner + sub-component handling",
        "body": body(
            goal="Pre-scan a component file's sub-component references; check registry for each; surface a dependency tree before any parse/scaffold work. Sub-components found in registry get instance references; unknowns prompt the designer to import dependencies first (per locked decision in plan).",
            requirements=[
                "`src/core/import/shared/dependencyScanner.ts` — `scanDependencies(file: string): DependencyTree`.",
                "Pre-scan via regex / lightweight AST (don't full-parse if not needed).",
                "Check `.fighub-registry.json` from connected repo for each ref.",
                "Returns a tree: each node = { name, status: 'registered' | 'unknown' | 'circular' }.",
                "UI integration: dependency tree preview before import (WO-044).",
            ],
            acceptance=[
                "Importing `Button.tsx` that uses `<Icon>` and `<Box>` → tree shows Icon (registered ✓), Box (registered ✓).",
                "Importing component with unknown sub-component → tree flags it with options (import first / placeholder / cancel).",
                "Circular dependencies surfaced as error.",
            ],
            out_of_scope=[
                "Batch import of whole folders (manual one-by-one for v1).",
                "Auto-import sub-components without designer confirmation.",
            ],
            lift_refs=[],
            deps=["WO-039", "WO-026"],
            prd_refs=["`Docs/PRD.md` §6.3 FR-IMP-3"],
        ),
    },
    {
        "id": "WO-044", "sprint": 8,
        "slug": "components-tab-ui-import-cc-pr-flows",
        "title": "WO-044: Components tab UI — Import + Code Connect PR flows → Phase 4a",
        "body": body(
            goal="Add the Import-from-repo flow and the 'Emit Code Connect PR' flow to the Components tab. Phase 4a cut (React-only).",
            requirements=[
                "Extend `src/ui/tabs/Components.tsx` with: 'Import from repo' button + repo file browser (filtered to React component files initially).",
                "Dependency tree display (WO-043).",
                "Import preview + edit (per FR-IMP-7 'never silent-apply').",
                "'Emit Code Connect PR' button when unmapped components exist on canvas.",
                "Framework picker (visible but only React enabled in Phase 4a).",
            ],
            acceptance=[
                "Designer imports a React component end-to-end: pick file → scan deps → preview spec → scaffold + add to registry → optional CC PR.",
                "Designer emits CC PR for 5 unmapped components → single PR opens in connected repo.",
                "Phase 4a GA: full React import + CC roundtrip works.",
            ],
            out_of_scope=[
                "Vue/WC/SwiftUI/Compose flows (later sprints).",
            ],
            lift_refs=[],
            deps=["WO-040", "WO-041", "WO-042", "WO-043"],
            prd_refs=["`Docs/PRD.md` §6.3, §6.7, §12 Phase 4a"],
            vqa=vqa_table_stub(),
            design_ref="Components tab Import + CC PR UI mock lives in the FigHub design file.",
        ),
    },

    # =========== SPRINT 9 — Vue + Web Components → Phase 4b ===========
    {
        "id": "WO-045", "sprint": 9,
        "slug": "vue-sfc-parser-cc-generator-import-template",
        "title": "WO-045: Vue SFC parser + Vue Code Connect generator + ImportTemplate",
        "body": body(
            goal="Add Vue Single File Component support: parser (template + script setup + style block), Code Connect stub generator, ImportTemplate. Re-use the shared web token resolver (WO-042).",
            requirements=[
                "`src/core/import/templates/vue.ts` — implements `ImportTemplate` for `.vue` SFCs.",
                "`src/core/codeconnect/templates/vue.ts` — Vue Code Connect stub generator.",
                "Uses Vue compiler (`@vue/compiler-sfc`) for AST.",
                "Extends framework picker in Components tab to enable Vue.",
            ],
            acceptance=[
                "Parse a sample Vue Button.vue → ComponentSpecV1.",
                "Generate Vue Code Connect stub passing `npx figma connect validate`.",
                "End-to-end Vue import + CC PR works.",
            ],
            out_of_scope=[
                "Vue Composition API quirks beyond standard patterns.",
            ],
            lift_refs=[],
            deps=["WO-039", "WO-040", "WO-041", "WO-042"],
            prd_refs=["`Docs/PRD.md` §12 Phase 4b"],
        ),
    },
    {
        "id": "WO-046", "sprint": 9,
        "slug": "web-components-parser-cem-cc-import",
        "title": "WO-046: Web Components parser (Custom Elements Manifest) + WC Code Connect + Import",
        "body": body(
            goal="Add Web Components support: parser reads Custom Elements Manifest (`custom-elements.json` per CEM spec), Code Connect stub generator, ImportTemplate.",
            requirements=[
                "`src/core/import/templates/webcomponents.ts` — implements `ImportTemplate` reading CEM data.",
                "`src/core/codeconnect/templates/webcomponents.ts` — WC Code Connect stub generator.",
                "Detects `customElements.define` in source files when no CEM available.",
                "Extends framework picker to enable Web Components.",
            ],
            acceptance=[
                "Parse a sample Lit component + CEM → ComponentSpecV1.",
                "Generate WC Code Connect stub passing validation.",
                "End-to-end WC import + CC PR works.",
            ],
            out_of_scope=[
                "Auto-generating missing CEM (out of scope; assume CEM exists).",
            ],
            lift_refs=[],
            deps=["WO-039", "WO-040", "WO-041", "WO-042"],
            prd_refs=["`Docs/PRD.md` §12 Phase 4b"],
        ),
    },
    {
        "id": "WO-047", "sprint": 9,
        "slug": "shared-web-token-resolver-hardening",
        "title": "WO-047: Shared web token resolver hardening (for Vue + WC + future web frameworks)",
        "body": body(
            goal="Generalize WO-042's token resolver beyond React: handle Vue scoped styles, Web Components Shadow DOM, and any future web-family quirks. Single resolver instance serves all web frameworks.",
            requirements=[
                "Extract shared resolver logic into `src/core/import/shared/webTokenResolver.ts`.",
                "Handle Vue `<style scoped>` blocks.",
                "Handle WC Shadow DOM CSS.",
                "Configuration override per-framework if needed.",
            ],
            acceptance=[
                "Vue component using scoped styles resolves tokens correctly.",
                "WC component using Shadow DOM CSS resolves tokens correctly.",
                "React import (WO-041) still passes after refactor.",
            ],
            out_of_scope=[
                "Native platform resolvers (Sprint 10 separate).",
            ],
            lift_refs=[],
            deps=["WO-042", "WO-045", "WO-046"],
            prd_refs=["`Docs/PRD.md` §6.9 FR-CONF-*"],
        ),
    },

    # =========== SPRINT 10 — SwiftUI + Compose → Phase 4c GA ===========
    {
        "id": "WO-048", "sprint": 10,
        "slug": "swift-parser-swiftui-cc-import",
        "title": "WO-048: Swift parser + SwiftUI Code Connect generator + ImportTemplate",
        "body": body(
            goal="Add SwiftUI support: parser walks Swift sources for `View` declarations, extracts props (initializer parameters), generates SwiftUI Code Connect stubs, imports as ComponentSpecV1.",
            requirements=[
                "`src/core/import/templates/swiftui.ts` — implements `ImportTemplate`.",
                "`src/core/codeconnect/templates/swiftui.ts` — SwiftUI Code Connect stubs.",
                "Lightweight Swift parser (regex + structural detection — full Swift AST not required for prop extraction).",
                "Native asset catalog resolver via WO-050.",
            ],
            acceptance=[
                "Parse a sample SwiftUI Button view → ComponentSpecV1.",
                "Generate SwiftUI Code Connect stub.",
                "End-to-end SwiftUI import + CC PR works.",
            ],
            out_of_scope=[
                "Full Swift AST (use lightweight parsing).",
                "Combine / state property mapping (out of scope for v1).",
            ],
            lift_refs=[],
            deps=["WO-039", "WO-040", "WO-041", "WO-050"],
            prd_refs=["`Docs/PRD.md` §12 Phase 4c"],
        ),
    },
    {
        "id": "WO-049", "sprint": 10,
        "slug": "kotlin-parser-compose-cc-import",
        "title": "WO-049: Kotlin parser + Compose Code Connect generator + ImportTemplate",
        "body": body(
            goal="Add Jetpack Compose support: parser walks Kotlin sources for `@Composable` functions, extracts params (signature), generates Compose Code Connect stubs, imports as ComponentSpecV1.",
            requirements=[
                "`src/core/import/templates/compose.ts` — implements `ImportTemplate`.",
                "`src/core/codeconnect/templates/compose.ts` — Compose Code Connect stubs.",
                "Lightweight Kotlin parser (regex + structural detection for @Composable signatures).",
                "Native Android resource resolver via WO-050.",
            ],
            acceptance=[
                "Parse a sample Compose Button composable → ComponentSpecV1.",
                "Generate Compose Code Connect stub.",
                "End-to-end Compose import + CC PR works.",
            ],
            out_of_scope=[
                "Full Kotlin AST.",
                "State / remember mapping.",
            ],
            lift_refs=[],
            deps=["WO-039", "WO-040", "WO-041", "WO-050"],
            prd_refs=["`Docs/PRD.md` §12 Phase 4c"],
        ),
    },
    {
        "id": "WO-050", "sprint": 10,
        "slug": "native-asset-catalog-token-resolver",
        "title": "WO-050: Native asset catalog token resolver → Phase 4c GA",
        "body": body(
            goal="Resolver for native platforms: iOS Asset Catalog (`.xcassets`) and Android resources (`res/values/colors.xml`, etc.). Different token model than CSS — colors/dimensions live in catalog files, not class names. Phase 4c GA cut.",
            requirements=[
                "`src/core/import/shared/nativeTokenResolver.ts` — `resolve(reference: NativeRef): { variable: string } | { unresolved: true }`.",
                "iOS: parse `.xcassets/Colors/*` directories.",
                "Android: parse `res/values/colors.xml` + `dimens.xml`.",
                "Auto-detect path conventions from connected repo.",
                "Phase 4c GA: all 5 frameworks shipping with full import + CC capability.",
            ],
            acceptance=[
                "iOS asset reference `Color.themePrimary` → `{ variable: 'Theme/Primary' }`.",
                "Android resource `R.color.theme_primary` → `{ variable: 'Theme/Primary' }`.",
                "Auto-detect catalog/res paths.",
                "Phase 4c GA: SwiftUI + Compose end-to-end import + CC works.",
            ],
            out_of_scope=[
                "Watch-mode asset catalog updates.",
            ],
            lift_refs=[],
            deps=["WO-016", "WO-048", "WO-049"],
            prd_refs=["`Docs/PRD.md` §6.9, §12 Phase 4c"],
        ),
    },

    # =========== SPRINT 11 — Sunset PR for DesignOps-plugin ===========
    {
        "id": "WO-051", "sprint": 11,
        "slug": "delete-hard-sunset-items-in-designops-plugin",
        "title": "WO-051: Delete hard-sunset items in DesignOps-plugin repo (canvas-bundle-runner, payload scripts, sync-cache)",
        "body": body(
            goal="Execute the hard-delete portion of the DesignOps-plugin sunset plan (PRD §17). Removes the MCP transport machinery that has no purpose in the plugin-sandbox world.",
            requirements=[
                "Delete `skills/canvas-bundle-runner/` (entire skill folder).",
                "Delete `scripts/check-payload.mjs`, `check-use-figma-mcp-args.mjs`, `probe-parent-transport.mjs`.",
                "Delete `scripts/sync-cache.sh`, `scripts/measure-sigma.mjs`.",
                "Delete `canvas-templates/bundles/*.min.mcp.js` files (keep `.mcp.js` source).",
                "Remove `AGENTS.md` MCP anti-spiral section (most of it).",
                "Single PR with all deletions; descriptive PR body explaining the sunset.",
            ],
            acceptance=[
                "PR opened in DesignOps-plugin repo with all hard-sunset deletions.",
                "Repo still builds / verify scripts pass after deletions.",
                "PR description links to FigHub PRD §17 and this ticket.",
            ],
            out_of_scope=[
                "Skill rewrites (WO-052).",
                "Meta-doc updates (WO-053).",
            ],
            lift_refs=[],
            deps=["WO-027", "WO-038"],
            prd_refs=["`Docs/PRD.md` §17.2"],
        ),
    },
    {
        "id": "WO-052", "sprint": 11,
        "slug": "rewrite-surviving-skills-as-fighub-output-consumers",
        "title": "WO-052: Rewrite surviving DesignOps-plugin skills as FigHub-output consumers",
        "body": body(
            goal="Rewrite the DesignOps-plugin skills that survive sunset (`sync-design-system`, `dev-handoff`) as thin Claude-side companions that consume FigHub's output JSON/markdown documents — no more Figma MCP calls in those flows.",
            requirements=[
                "Rewrite `skills/sync-design-system/SKILL.md` to: consume `drift-report.v1.md` from the plugin → run `AskUserQuestion` for conflicts → guide the user to apply via FigHub plugin.",
                "Rewrite `skills/dev-handoff/SKILL.md` to: consume `handoff-context.v1.md` from the plugin → create the ticket via `gh` or Atlassian MCP.",
                "Mark other agent-side skills with deprecation pointers as needed.",
                "Add a redirect note in `skills/new-project/`, `skills/create-design-system/`, `skills/create-component/`, `skills/code-connect/` pointing to FigHub.",
            ],
            acceptance=[
                "Both rewritten skills work end-to-end against a FigHub-generated document.",
                "Old MCP-heavy paths removed from those skills.",
                "Redirect pointers in the obsoleted skills.",
            ],
            out_of_scope=[
                "Deleting the old skill folders (kept for redirect; explicit deletion later when adoption is universal).",
            ],
            lift_refs=[],
            deps=["WO-027", "WO-031", "WO-037", "WO-051"],
            prd_refs=["`Docs/PRD.md` §17.1"],
        ),
    },
    {
        "id": "WO-053", "sprint": 11,
        "slug": "update-designops-plugin-meta-docs-agent-side-companion",
        "title": "WO-053: Update DesignOps-plugin meta docs as agent-side companion to FigHub",
        "body": body(
            goal="Update `CLAUDE.md`, `memory.md`, and `AGENTS.md` in DesignOps-plugin to reflect its new role as the **agent-side companion** to FigHub — orchestration + ticket workflows + Claude-side decisioning, no more Figma MCP / canvas-build code paths.",
            requirements=[
                "Rewrite `CLAUDE.md` to point at FigHub as the canvas authority.",
                "Trim `memory.md` of MCP / payload / canvas-bundle entries.",
                "Trim `AGENTS.md` to keep only host-specific notes + ticket-workflow conventions.",
                "Add a top-of-repo banner: 'This repo is the agent-side companion to FigHub. Canvas work lives in FigHub.'",
            ],
            acceptance=[
                "Meta docs read coherently as agent-side companion role.",
                "No remaining references to canvas-bundle-runner or MCP payload budgets.",
                "FigHub repo + PRD linked prominently.",
            ],
            out_of_scope=[
                "Skill rewrites (WO-052 owns).",
            ],
            lift_refs=[],
            deps=["WO-051", "WO-052"],
            prd_refs=["`Docs/PRD.md` §17"],
        ),
    },
    {
        "id": "WO-054", "sprint": 11,
        "slug": "deprecate-new-language-and-accessibility-check-skills",
        "title": "WO-054: Deprecate /new-language and /accessibility-check skills (redirect to Figma Agent)",
        "body": body(
            goal="Mark the `new-language` and `accessibility-check` skills as deprecated; redirect users to Figma Agent which now handles translation and a11y on-canvas.",
            requirements=[
                "Add deprecation banner to `skills/new-language/SKILL.md` pointing to Figma Agent for translation.",
                "Add deprecation banner to `skills/accessibility-check/SKILL.md` pointing to Figma Agent for a11y audits.",
                "Update `README.md` in DesignOps-plugin to reflect deprecations.",
                "Leave skill folders in place for at least 1 release cycle; remove in a follow-up cleanup.",
            ],
            acceptance=[
                "Both skill SKILL.md files show clear deprecation notice + Figma Agent pointer.",
                "Designers running `/new-language` or `/accessibility-check` see the redirect prominently.",
                "DesignOps-plugin README acknowledges the deprecations.",
            ],
            out_of_scope=[
                "Hard-deletion of the skill folders (later cleanup).",
                "Migration tooling (Figma Agent handles directly).",
            ],
            lift_refs=[],
            deps=["WO-053"],
            prd_refs=["`Docs/PRD.md` §3.2 N1-N3, §17.1"],
        ),
    },
]


# --- driver ------------------------------------------------------------------

def run(cmd, **kw):
    # Force UTF-8 for both stdin and capture — many ticket bodies contain
    # arrows, glyphs, and other non-cp1252 chars.
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", **kw)


def create_one(t: dict, repo_root: Path) -> tuple[bool, str]:
    # All Sprint 2-11 tickets in this batch are work orders. CTX-002 already exists from Sprint 1.
    label = t.get("label", "work-order")
    t["label"] = label  # back-fill so downstream code can rely on it

    sprint_dir = repo_root / ".github" / f"Sprint {t['sprint']}" / f"{t['id']}-{t['slug']}"
    sprint_dir.mkdir(parents=True, exist_ok=True)
    ticket_path = sprint_dir / "ticket.md"

    # Write ticket.md (TBD frontmatter + body)
    frontmatter = f"---\ntype: {label}\ngithub_issue: TBD\nproject_item_id: TBD\n---\n\n"
    ticket_path.write_text(frontmatter + t["body"], encoding="utf-8")

    # Create issue (body excludes frontmatter)
    r = run(
        ["gh", "issue", "create", "--repo", REPO,
         "--title", t["title"], "--label", t["label"],
         "--body-file", "-"],
        input=t["body"],
    )
    if r.returncode != 0:
        return False, f"gh issue create failed: {r.stderr.strip()}"
    issue_url = r.stdout.strip()
    m = re.search(r"/(\d+)$", issue_url)
    if not m:
        return False, f"could not parse issue number from: {issue_url}"
    issue_num = m.group(1)

    # Add to project
    r = run(
        ["gh", "project", "item-add", str(PROJECT_NUM),
         "--owner", "JBabcock-DL", "--url", issue_url,
         "--format", "json"],
    )
    if r.returncode != 0:
        return False, f"project item-add failed: {r.stderr.strip()}"
    try:
        item_id = json.loads(r.stdout)["id"]
    except Exception as e:
        return False, f"could not parse project item id: {e}; stdout={r.stdout[:200]}"

    # Set status
    query = (
        f'mutation {{ updateProjectV2ItemFieldValue(input: {{ '
        f'projectId: "{PROJECT_ID}" itemId: "{item_id}" '
        f'fieldId: "{STATUS_FIELD_ID}" '
        f'value: {{ singleSelectOptionId: "{STATUS_BACKLOG}" }} '
        f'}}) {{ projectV2Item {{ id }} }} }}'
    )
    r = run(["gh", "api", "graphql", "-f", f"query={query}"])
    if r.returncode != 0:
        # not fatal — log and continue
        print(f"  WARN: status set failed for {t['id']}: {r.stderr.strip()}")

    # Fill frontmatter
    text = ticket_path.read_text(encoding="utf-8")
    text = text.replace("github_issue: TBD", f"github_issue: {issue_num}")
    text = text.replace("project_item_id: TBD", f"project_item_id: {item_id}")
    ticket_path.write_text(text, encoding="utf-8")

    # plan.md stub (WOs only)
    if t["label"] == "work-order":
        plan_path = sprint_dir / "plan.md"
        plan_path.write_text(
            PLAN_STUB_TEMPLATE.format(ticket_id=t["id"], plan_path=PLAN_PATH),
            encoding="utf-8",
        )

    return True, f"issue=#{issue_num} item={item_id}"


def main():
    repo_root = REPO_ROOT
    if not repo_root.is_dir():
        print(f"ERROR: fighub repo not found at {repo_root}")
        sys.exit(1)

    print(f"Creating {len(TICKETS)} tickets across sprints "
          f"{sorted(set(t['sprint'] for t in TICKETS))}\n")

    results = []
    for i, t in enumerate(TICKETS, 1):
        print(f"[{i:>2}/{len(TICKETS)}] {t['id']} (Sprint {t['sprint']}): ", end="", flush=True)
        ok, msg = create_one(t, repo_root)
        if ok:
            print(f"OK ({msg})")
            results.append({"id": t["id"], "sprint": t["sprint"], **dict(item.split("=", 1) for item in msg.split())})
        else:
            print(f"FAIL — {msg}")
            results.append({"id": t["id"], "sprint": t["sprint"], "error": msg})

    print("\n=== Summary ===")
    ok_n = sum(1 for r in results if "error" not in r)
    print(f"  Created: {ok_n} / {len(TICKETS)}")
    failed = [r for r in results if "error" in r]
    if failed:
        print("  Failed:")
        for r in failed:
            print(f"    {r['id']}: {r['error']}")


if __name__ == "__main__":
    main()
