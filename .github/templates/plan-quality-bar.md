# Plan quality bar — Figmint (mandatory for `/plan`)

> **Who must read this:** any agent running `/plan`, `/build`, or reviewing whether a ticket is ready to build.

## Purpose

`plan.md` is the **execution contract for build sub-agents**. A sub-agent spawned by `/build` (or a domain skill) should be able to complete its assigned steps **using only `plan.md` + the files it creates** — not by re-reading `ticket.md`, re-opening `research/`, or improvising scope.

If the plan is a stub, an outline, or “TBD”, sub-agents will drift from the parent ticket.

---

## Ground every plan in the parent ticket

Before writing steps, read the **parent** `.github/Sprint {N}/{TICKET-ID}-*/ticket.md` in full:

| Ticket section                     | Must appear in plan as                                                     |
| ---------------------------------- | -------------------------------------------------------------------------- |
| **Goal / Problem story**           | `## Approach` — same scope, same boundaries                                |
| **Requirements** (all subsections) | One or more numbered steps each; nothing extra                             |
| **Acceptance criteria**            | **Done when** on final steps + manual VQA/bench steps where AC requires it |
| **Out of scope**                   | Explicit “do not implement” bullets in Approach or Notes                   |
| **Dependencies**                   | `## Dependencies & Tools` table                                            |
| **Lift reference / References**    | Lift map, drift guards, source paths (for port work)                       |
| **Testing & verification**         | Dedicated test/CI/VQA steps                                                |

**Traceability rule:** every requirement bullet and acceptance criterion on the ticket should map to **at least one** plan step. If something on the ticket has no step, the plan is incomplete.

**Research rule:** `research/` informs the plan; it is **not** a substitute for the plan. Lock decisions from research into steps (signatures, paths, constants) — do not write “see research”.

---

## Required sections (all work orders)

1. **`## Approach`** — strategy tied to the ticket Goal; call out in-scope vs out-of-scope from the ticket verbatim where it prevents drift
2. **`## Steps`** — numbered checklist `- [ ] **Step N** — …` (see per-step rules)
3. **`## Build Agents`** — phased parallel domains; **every step assigned exactly once** to the sub-agent that will run it
4. **`## Dependencies & Tools`** — from ticket Dependencies + tools needed to execute steps
5. **`## Open Questions`** — only what the ticket leaves ambiguous; mark **RESOLVED** when decided during planning
6. **`## Notes`** — project constraints (ES2017, logging), manual procedures, links to `ticket.md` and `research/` (as bibliography only)

---

## Required content per step (sub-agent-ready)

Each step must be executable **without interpretation**. Include **all** that apply:

- **Exact file path(s)** to create or edit
- **Function / type / message signatures** (copy-paste-ready blocks when non-obvious)
- **Behavior table or bullet spec** tied to ticket requirement text
- **Lift-source pointer** (legacy path → repo path) when ticket cites lift sources
- **Done when:** concrete acceptance — test file name, CI command, grep gate, manual checkpoint

**Forbidden step patterns:**

- “Implement feature X” / “Port the builder” / “Add tests”
- “TBD” / “fill during build” / “see ticket” / “see research”
- Steps that restate the ticket title without file paths or acceptance

**Good step pattern:**

```markdown
- [ ] **Step 7** — Implement `src/core/example/collections.ts` — `ensureCollections(snapshot)`:
  - Create missing collections using display names from ticket Requirements §Functional item 3
  - **Done when:** `tests/unit/core/example/collections.test.ts` passes; ticket AC “collections exist by name” satisfied
```

---

## Sub-agent / Build Agents section

`/build` spawns sub-agents from `## Build Agents`. Write this section for **parallel workers with no shared context**:

- **Phases sequential; agents within a phase parallel**
- Each line: `` `{domain}-build` — Steps X–Y: [one-line scope mirroring ticket slice] ``
- Sub-agent prompt should be able to copy **only its step range** and succeed
- Hard deps (another ticket’s code must exist) stated on the **phase**, not only in Notes
- No step in two phases; no unassigned steps

**Detail bar for sub-agents:** if you cannot paste a step range into a fresh agent and expect a correct build, add more detail to those steps.

---

## Extra requirements by ticket shape

**Port / lift tickets** (ticket cites DesignOps or `Docs/lift-sources.md`):

- Drift guard — what **not** to copy (bundles, wrong source files)
- Lift map table — legacy → Figmint module
- Wrong vs correct table when lift-sources documents common mistakes

**Code-build tickets:**

- Module tree (directory scaffold) at least once
- ES2017 + main-thread logging rules in Notes when touching plugin sandbox code
- Final CI gate step matching ticket Testing section

**UI / integration tickets:**

- Message contracts (UI ↔ main types + guards)
- Extract vs greenfield map from existing code
- Phased delivery if ticket dependencies not yet merged
- Manual smoke aligned with ticket Acceptance criteria

---

## How detailed is “detailed enough”?

Prefer **completeness over brevity**. Expand until:

- Each sub-agent phase has enough specificity to implement without clarifying questions
- Every ticket requirement and AC is traceable to a step
- Port work names exact source files from the ticket’s Lift reference
- No step relies on unstated assumptions

Use line count only as a sanity check: thin outlines (~50 lines) for multi-file work orders are almost always insufficient. When in doubt, **add another step** rather than merge vague work.

### Minimum line-count gates (Figmint default — do not move to In Planning below these)

| Ticket shape | Minimum `plan.md` lines | Must include |
| ------------ | ------------------------ | ------------ |
| Multi-file code WO (3+ modules) | **≥200** | AC traceability table, typed message/API blocks, test file paths per step |
| Platform / integration WO (OAuth, sinks, Figma API) | **≥350** | Wrong vs correct table, thread-split matrix, manual VQA steps |
| UI + orchestration WO | **≥300** | Component props, reducer actions, style tokens |
| Stub / placeholder | **0** — forbidden | `_TBD_`, “see research”, “implement feature” |

**Reference depth:** `.github/Sprint 2/WO-006-*/plan.md` (~98 lines but ultra-dense per step). Sprint 4 plans should match or exceed that **information density** even when line count is higher.

### `/plan` persistence (mandatory)

1. Write the **full approved plan** to `{ticket-folder}/plan.md` with the Write tool — not only to an IDE plan sidecar.
2. **Re-read** `{ticket-folder}/plan.md` and confirm all required sections exist byte-for-byte.
3. Report `wc -l plan.md` in the handoff.
4. **`/build` agents read only `{ticket-folder}/plan.md`** — if the user sees a plan in the IDE but the repo file is still a stub, `/build` must stop and `/plan` must re-run.

Report `wc -l plan.md` in the `/plan` handoff.

---

## Verification before In Planning

- [ ] Re-read `ticket.md` side-by-side with `plan.md` — scope matches; out-of-scope not planned
- [ ] Every requirement + AC on the ticket has a matching step
- [ ] Every step has **Done when** (or equivalent)
- [ ] `## Build Agents` assigns every step; sub-agent slices are self-contained
- [ ] Open questions resolved or explicitly deferred with reason

If any box fails, **expand the plan** — do not move to In Planning with a stub.

---

## Anti-patterns

| Bad                                                 | Why                                                  |
| --------------------------------------------------- | ---------------------------------------------------- |
| Plan shorter than the ticket’s Requirements section | Sub-agents re-derive scope                           |
| Generic steps not tied to ticket text               | Drift from parent acceptance criteria                |
| “See research” instead of locked decisions          | Sub-agents re-investigate                            |
| Build Agents phase says “implement ticket”          | No parallelizable, auditable units                   |
| Batch-planning many tickets as thin outlines        | Each parent ticket still needs its own full contract |

---

## Where this lives

- **This file:** `.github/templates/plan-quality-bar.md`
- **Pointer:** `memory.md`, `workflow.md`, `agent-handoff.md`
- Do **not** paste the full bar into `memory.md` — link here.
