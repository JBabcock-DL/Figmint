# Research quality bar — FigHub (mandatory for `/research`)

> **Who must read this:** any agent running `/research`, `/plan`, or reviewing whether a ticket is ready to move from **In Research** → **In Planning**.

## Purpose

`research/*.md` is the **evidence base for `/plan`**. A plan agent should be able to lock decisions, file paths, and API contracts **without re-investigating** the same questions. Thin summaries, hand-wavy recommendations, and "validate during build" without a spike checklist are **not research-complete**.

If research is a stub, `/plan` will re-open the same external docs, re-read the repo, and drift from the parent ticket.

---

## Ground every research doc in the parent ticket

Before writing findings, read the **parent** `.github/Sprint {N}/{TICKET-ID}-*/ticket.md` in full:

| Ticket section                     | Must appear in research as                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| **Goal / Problem story**           | Summary — same scope boundaries                                                  |
| **Requirements** (all subsections) | Key findings mapped to requirement IDs or bullets                                |
| **Acceptance criteria**            | **Pre-plan spike checklist** + test/VQA matrix where AC depends on runtime proof |
| **Out of scope**                   | Explicit "will not research / will not implement"                                |
| **Dependencies**                   | Cross-ticket matrix + upstream research links                                    |
| **Lift reference / References**    | Lift map when port work; official doc URLs with retrieved date                   |

**Traceability rule:** every requirement bullet on the ticket should map to **at least one** validated finding (repo citation, official API quote, or spike result).

**Plan rule:** research **informs** the plan; it is **not** a substitute for step-level execution detail (that is `plan-quality-bar.md`).

---

## Required sections (all work orders)

1. **`## Summary`** — 3–8 sentences; **locked recommendation** (not "could use X or Y" without a default)
2. **`## Key Findings`** — numbered subsections; each finding cites **evidence**
3. **`## Validated evidence`** — repo inventory + official API facts + cross-ticket constraints (see below)
4. **`## Decision log`** — ADR-style table: decision, rationale, alternatives rejected, owner
5. **`## Pre-plan spikes`** — mandatory runtime proofs before `/plan` (or explicit "none — fully validated from repo/docs")
6. **`## Risk register`** — severity × likelihood × mitigation
7. **`## Recommendations`** — ordered actions for `/plan`
8. **`## Open questions`** — only what blocks planning; mark **RESOLVED** when decided during research

---

## Required content in `## Validated evidence`

Each research doc must include **all** that apply:

### Repo inventory

| Category               | Required                                                                |
| ---------------------- | ----------------------------------------------------------------------- |
| **Exists today**       | File paths with one-line role (grep-verified)                           |
| **Does not exist**     | Explicit "greenfield" paths the ticket will create                      |
| **Patterns to mirror** | Existing module + line-range citation (message guards, page find, etc.) |

Use code citations or tables — not "see src/io".

### Official API / platform facts

| Category           | Required                                                                       |
| ------------------ | ------------------------------------------------------------------------------ |
| **Endpoint / API** | Method, URL, headers, request/response shape (minimal JSON example)            |
| **Limits**         | Documented caps (pluginData 100 kB, manifest networkAccess, etc.) with doc URL |
| **Security**       | Token storage thread, scopes, manifest domains                                 |

Quote or paraphrase from **retrieved** official docs; include URL + access date in References.

### Cross-ticket matrix

When the ticket depends on or blocks others, include:

| Ticket | Interface / artifact | This ticket consumes or produces |
| ------ | -------------------- | -------------------------------- |

---

## Pre-plan spikes (when mandatory)

Run spikes **during research** when any of these apply:

- Figma desktop vs browser behavior differs (OAuth, clipboard, network)
- Official docs contradict a proposed approach (e.g. relay server vs Device Flow)
- No repo precedent and no authoritative doc
- Acceptance criteria require proof on sandbox file

Each spike entry:

```markdown
| Spike ID  | Procedure                                                         | Pass criteria                                | Status    |
| --------- | ----------------------------------------------------------------- | -------------------------------------------- | --------- |
| SPK-016-1 | Org build in Figma desktop: POST device token poll from UI iframe | 200 + access_token or documented error shape | ☐ pending |
```

**Research-complete gate:** all spikes marked ✅ or explicitly deferred with product sign-off in Open Questions.

---

## How detailed is "detailed enough"?

Prefer **validated completeness over brevity**. Expand until:

- Every ticket requirement has a finding + evidence row
- API sequences are copy-pasteable for `/plan` step authors
- Cross-ticket ownership conflicts are resolved (one owner per module)
- No "TBD" in Decision log unless tracked in Open Questions with owner

Use line count as a sanity check: multi-integration tickets (OAuth + I/O + UI) below **~200 lines** are almost always insufficient. WO-006 `io-subsystem-design.md` (~500 lines) is the reference depth for platform-constraint research.

Report `wc -l research/*.md` in the `/research` handoff.

---

## Verification before In Planning

- [ ] Re-read `ticket.md` side-by-side with research — scope matches; out-of-scope not researched as in-scope
- [ ] Every requirement has validated evidence (repo, doc, or spike)
- [ ] Decision log has a default for every architecture fork
- [ ] Pre-plan spikes complete or explicitly deferred
- [ ] Cross-ticket matrix updated for Sprint-level dependencies
- [ ] `ticket.md` Requirements refined; References link research files
- [ ] Sprint research index updated when batch-researching a sprint (`.github/Sprint {N}/research/`)

If any box fails, **expand research** — do not move to In Planning with thin artifacts.

---

## Anti-patterns

| Bad                                                                 | Why                                       |
| ------------------------------------------------------------------- | ----------------------------------------- |
| Summary-only doc (~50 lines) for OAuth + REST + UI                  | Plan agent re-reads GitHub/Figma docs     |
| "Use Device Flow" without API sequence + Figma doc tension resolved | Wrong build path                          |
| "Clipboard should work on click" without WO-006 cross-ref           | Repeats invalidated read path assumptions |
| "100k char limit on text nodes" without doc citation                | Conflates pluginData vs TextNode          |
| Parallel tickets each invent conflicting `Sink` shapes              | WO-017 vs WO-020 drift                    |
| "Validate in VQA" with no spike when AC is platform-dependent       | Research pushes risk into build           |

---

## Where this lives

- **This file:** `.github/templates/research-quality-bar.md`
- **Plan counterpart:** `.github/templates/plan-quality-bar.md`
- **Pointer:** `memory.md`, `workflow.md`, `.claude/skills/research/SKILL.md`
- Do **not** paste the full bar into `memory.md` — link here.
