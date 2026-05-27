# Bootstrap Phase 1 manual smoke (WO-015)

> **Status:** Stub — no live Figma plugin session in CI. Vitest covers message guards, progress reducer, and audit sort utilities.
> **Date:** 2026-05-27

## Automated coverage (Vitest)

| Area              | Test file                                        | What is verified                                                                                                |
| ----------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Message contract  | `tests/unit/io/messages/bootstrap.test.ts`       | `bootstrap/run`, `bootstrap/progress`, `bootstrap/result`, `bootstrap/error` guards; `BOOTSTRAP_STEPS` manifest |
| Progress reducer  | `tests/unit/ui/bootstrapProgressReducer.test.ts` | Step state transitions, audit attachment, result/error handling                                                 |
| Audit panel utils | `tests/unit/ui/auditPanelUtils.test.ts`          | Failed-first rule sort order                                                                                    |

## Manual steps (designer / developer in Figma)

1. Open Figmint plugin in a blank or Foundations file.
2. In dev build, use **Load bench fixture → foundations-minimal** (or paste the same JSON).
3. Confirm **Preview** shows collection counts and mode names.
4. Click **Bootstrap design system**.
5. Confirm progress bar advances and step rows update (`push-variables` → …).
6. Confirm **Audit panel** shows variables audit after push completes.
7. With `skipCanvas: true` option (dev only), confirm canvas steps show **skipped** with detail text.

## Expected Phase 1 outcome

- Variables push completes with inline audit.
- Canvas steps either run (full bootstrap) or show `skipped` when `skipCanvas` is set.
- No silent failures — errors appear on step rows and in audit panel.

## Screenshot

_Add screenshot after manual run in Figma._
