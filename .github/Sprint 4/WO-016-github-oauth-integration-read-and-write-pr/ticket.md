---
type: work-order
github_issue: 19
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt5JCY
---

## Goal

Add GitHub OAuth as a first-class input source AND output sink (PR creation), gated to the Org build per PRD §13.1. Designer authenticates once per repo; plugin can read `tokens.json` and write PR commits.

PRD anchors: `Docs/PRD.md` §10 (Sources/Sinks), §13.1 (feature gating), §11.3 (Security).

---

## Problem story

*Derived from Goal — see ticket-level scope.*

## User stories

- [ ] *See Requirements section below.*

## Design reference *(when UI work applies)*

**N/A — no Figma artifact (subsystem ticket).**

---

## Requirements

### Functional

1. OAuth flow in plugin UI iframe (auth happens in iframe, token passed to plugin thread for API calls).
2. Scopes: `repo` (read+write for the configured repo paths only).
3. Token stored in `figma.clientStorage` scoped per repo URL.
4. `src/io/sources/github.ts` — reads files from a configured path.
5. `src/io/sinks/githubPR.ts` — opens a PR with one or more committed files.
6. Settings UI panel for connecting / disconnecting repos.
7. Feature flag: only enabled in Org build (Community build hides UI).

### Visual / UX

*See ticket-level scope. Most subsystem tickets surface UI in a separate tab-UI ticket.*

### Technical / architectural

- **Lift reference (DesignOps-plugin):**
  - *None — new code designed in PRD.*
- **Dependencies:** WO-002

---

## Acceptance criteria *(definition of done)*

- [ ] OAuth flow completes end-to-end against a test repo.
- [ ] Plugin can read `design/tokens.json` from a connected repo.
- [ ] Plugin can open a PR with a single file change against a connected repo.
- [ ] Token persists across plugin re-opens; revocation clears stored token.
- [ ] Community build does not show GitHub UI affordances.

## Out of scope

- Per-file granular auth (one OAuth per repo).
- GitHub App vs OAuth App tradeoff (use OAuth App for MVP; revisit).
- Multi-repo simultaneous connections (single connected repo per project for now).

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

N/A — no Figma artifact (subsystem ticket)

---

## 🔍 Ready for `/research`

- Optional, time-boxed.

## 📋 Ready for `/plan`

- Dependencies: WO-002.
- `plan.md` should lock implementation details before `/build`.

## 🛠️ Ready for `/build`

- `/code-build` single domain unless plan adds others.

## References

- PRD: `Docs/PRD.md` §10 (Sources/Sinks), §13.1 (feature gating), §11.3 (Security)
- Lift reference:
  - *None — new code designed in PRD.*
- Plan source: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
