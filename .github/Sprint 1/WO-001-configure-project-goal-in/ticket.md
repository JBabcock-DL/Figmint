---
type: work-order
github_issue: 1
project_item_id: PVTI_lAHOD9B30s4BY4aYzgt32a4
---

## Goal

Ensure `.github/templates/workflow.md` contains the canonical Figmint project goal so all agents share the same source-of-truth description.

---

## Problem story

As a workflow agent, I want the project goal documented in `workflow.md` so that every ticket skill reads consistent project context without asking the user again.

## Hypothesis (optional)

We believe a single documented goal in `workflow.md` for Figmint will reduce repeated onboarding questions across agent sessions.

---

## User stories

- [ ] As an agent, I can read the project goal from `workflow.md` at session start.

## Design reference *(when UI work applies)*

**N/A — no Figma artifact**

---

## Requirements

### Functional

1. Project goal is present under `## Project Goal` in `.github/templates/workflow.md`.

### Visual / UX

- N/A

### Technical / architectural

- Goal text matches the Figmint PRD executive summary intent.

---

## Acceptance criteria *(definition of done)*

- [ ] `workflow.md` → Project Goal is filled (no `[ADD YOUR GOAL HERE]` placeholder)
- [ ] `memory.md` Quick reference one-liner aligns with the same goal

## Out of scope

- Changing ticket backend configuration

---

## Testing & verification

### Functional QA

- Read `workflow.md` and confirm goal section is populated.

### Visual / design QA

- N/A

### Accessibility *(WCAG AA where applicable)*

- N/A

### Telemetry / observability *(if needed)*

- N/A

---

## Figma VQA Checklist

**N/A — no Figma artifact (backend / API / infra ticket).**

---

## 🔍 Ready for `/research`

-

## 📋 Ready for `/plan`

-

## 🛠️ Ready for `/build`

-

## References

- `Docs/PRD.md`
