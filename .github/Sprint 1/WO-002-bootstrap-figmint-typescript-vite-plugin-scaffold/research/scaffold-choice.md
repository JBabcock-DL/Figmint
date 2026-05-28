# Scaffold choice — raw Vite vs create-figma-plugin

**Ticket:** [WO-002](../ticket.md) — Bootstrap FigHub TypeScript + Vite plugin scaffold
**Research date:** 2026-05-27
**Scope:** PRD §6.1, §7.3, §11.5, §13 — pick the toolchain for the plugin source tree.

## Summary

Two Figma-plugin scaffolders dominate as of May 2026: Yuanqing Liu's [`create-figma-plugin`](https://yuanqing.github.io/create-figma-plugin/) (v4.0.3, esbuild + Preact, opinionated end-to-end) and raw Vite with `@figma/plugin-typings` + `vite-plugin-singlefile` (the de-facto pattern used by every community React/Vue/Svelte boilerplate). For FigHub's specific constraints — dual `manifest.community.json` / `manifest.org.json` builds (PRD §13.2), a fixed `src/{core,ops,io,contracts,ui,config}` layout (PRD §7.3), a published workspace package `@detroitlabs/fighub-contracts` (PRD §7.4), React UI shell (PRD §7.3), and an eventual external CLI shell reading the same deterministic core (PRD §7.1) — the opinionated scaffolder fights us on every one of those requirements while the raw Vite path absorbs them with ~80 lines of additional `vite.config.ts` + script glue.

**Recommendation: raw Vite + `@figma/plugin-typings` + `vite-plugin-singlefile`, React 19, TypeScript 6.0.3, Node ≥ 20.**

## Key Findings

### Raw Vite + `@figma/plugin-typings`

- **Stack maturity (2026-05-27):** Vite 8.0.14 (released 2026-05-21), `@vitejs/plugin-react` 6.0.2 (2026-05-14), `@figma/plugin-typings` 1.127.0 (2026-05-22), `vite-plugin-singlefile` 2.3.3 (2026-04-17), TypeScript 6.0.3 (2026-04-16), React 19.2.6 (~2 weeks old). All current, all actively maintained.
- **Two-thread split:** Figma plugins require exactly two compiled outputs — `code.js` (sandbox / Plugin API thread) and `ui.html` (iframe, inlined JS+CSS+assets per Figma's single-file rule). Standard pattern: one Vite build (library mode → `dist/code.js`) for the main thread, one Vite build with `vite-plugin-singlefile` (→ `dist/ui.html`) for the UI thread. Many community templates (CoconutGoodie/figma-plugin-react-vite, gnchrv/figma-plugin-boilerplate, the-dataface/figma-plugin-svelte-vite) demonstrate this exact split.
- **Manifest handling:** Author manifests as plain JSON files at repo root; build script copies the right one into `dist/manifest.json`. Trivial dual-build support.
- **Hot reload:** Figma desktop has built-in plugin hot-reload — when `code.js` / `ui.html` change on disk, Figma auto-reloads. Combine with `vite build --watch` for both threads (or run them in parallel via npm-run-all / parallel scripts).
- **TypeScript strict:** Native — Vite uses esbuild for transpile and lets `tsc --noEmit` do the strict type-check pass. No framework adapter.
- **React UI shell:** `@vitejs/plugin-react` 6.0.2 is the canonical setup. React 19 is the latest stable (19.2.6). Direct dependency, no compat shim.
- **Workspace layout compatibility:** PRD §7.3's `src/{core,ops,io,contracts,ui,config}` layout works as-is. The `packages/contracts/` workspace is added via npm `workspaces` in root `package.json`; Vite resolves it via TypeScript path aliases or via npm-link semantics.
- **Bundle size / startup:** Vite + esbuild produces tight bundles. Figma plugins generally tolerate ~1–3 MB UI bundles; the main thread should stay < 200 KB. Both achievable without framework overhead.
- **Lock-in:** None. Every config file (`vite.config.ts`, `tsconfig.json`, `package.json`) is hand-rolled; future tool migration costs nothing.
- **Drawbacks:** ~80 lines more boilerplate than the scaffolder (two Vite configs, two build scripts, manual manifest copy). One-time cost.

### `create-figma-plugin` (Yuanqing)

- **Maturity:** v4.0.3 (released 2025-10, ~7 months old at time of research). Repo last pushed 2026-03-21 — actively maintained, 1.1 k stars, ~20 contributors. Node v22 + npm v11 required (newer than our Node 20+ target). Not abandoned.
- **What ships:** Single `npx create-figma-plugin` scaffolds project with `package.json`-driven config under `"figma-plugin": { ... }` key, an opinionated build CLI (`build-figma-plugin --typecheck --minify --watch`), a Preact-based UI component library (`@create-figma-plugin/ui`) styled to match Figma UI3, an `@create-figma-plugin/utilities` event helper (`emit` / `on` / `once`), and pre-baked templates: `hello-world`, `preact-rectangles`, `preact-resizable`, `preact-tailwindcss`, `react-editor`, `widget/notepad`.
- **Manifest handling:** Generates `manifest.json` from `package.json`'s `"figma-plugin"` key on every build. **Manual edits to `manifest.json` are overwritten.** All manifest fields must be declared in `package.json`.
- **Dual-manifest builds (community + org):** No first-class support. Two workarounds, both ugly:
  1. Pre-build, swap two different `package.json` files (rewrites the entire package.json, including dev deps — high blast radius).
  2. Write a build wrapper that mutates the `"figma-plugin"` block in memory, regenerates the manifest, then renames the output. Either approach fights the tool.
- **Workspace layout compatibility:** Source entry points (`main`, `ui`) are configurable to any path (e.g. `src/main.ts`, `src/ui/index.tsx`). However, the `build-figma-plugin` CLI is opinionated about everything else — output directory naming, build artifact layout, asset handling, etc. Mapping PRD §7.3's deep `src/{core,ops,io,contracts,ui,config}` tree is technically possible but the scaffolder doesn't help you maintain it.
- **TypeScript strict:** Supported (`--typecheck` flag runs `tsc`). Strict-mode flags go in `tsconfig.json` as normal.
- **React UI shell:** Default is **Preact**, not React. The CLI auto-rewrites `react` / `react-dom` imports to `preact/compat` at build time. To use real React, designers must (a) follow the `react-editor` template, (b) add a `paths` shim in `tsconfig.json` pointing `react`/`react-dom` at `node_modules/preact/compat`, or (c) opt out of the auto-swap via a `build-figma-plugin.ui.js` overrides file. All three add friction for engineers used to plain React semantics. (See the Recipes page in the official docs.)
- **Build output:** Produces loadable Figma plugin bundles (`manifest.json` + `build/main.js` + `build/ui.html`). Suitable for both Community and Org channels.
- **Bundle size:** esbuild-powered, sub-second builds, very small Preact UI bundles. Marginal win vs Vite + React 19 (Preact is ~3 KB vs React 19's ~45 KB), but Figma plugins don't ship bundles over the network so cold-start cost is minor.
- **Lock-in:** Medium. Tearing out `build-figma-plugin` post-Sprint 4 means writing a custom Vite/esbuild config and porting any `@create-figma-plugin/ui` and `@create-figma-plugin/utilities` usage. Workspace-package wiring and an external CLI shell (PRD §7.1) both require leaving the scaffolder's happy path eventually.
- **Drawbacks for FigHub specifically:**
  - Fights dual-manifest (the single biggest architectural reason this scaffold exists).
  - Preact-by-default conflicts with PRD §7.3's React `.tsx` shell directories.
  - `@create-figma-plugin/ui` is Figma UI3 — useful, but PRD doesn't mention any UI3 dependency, and lock-in to a Preact component library is worse than rolling our own ~10 controls.
  - The eventual CLI shell (PRD §7.1) needs to import core modules directly — `build-figma-plugin`'s plugin-only build assumes only two entry points, so a third "CLI" build would need a separate config and probably a different bundler.

### Other options considered

- **praizjosh/create-figma-react-plugin** — Community wrapper that scaffolds Vite + React + TS specifically, with optional Tailwind / shadcn. Closer match to FigHub's stack than the Yuanqing scaffolder, but it's a project-bootstrapper (one-shot generator), not a maintained framework. Its output is the same shape as the raw Vite path below, so adopting it would mean accepting one one-shot scaffold and then hand-tuning everything afterwards. No reason to use it over raw Vite when we already know the target layout from PRD §7.3.
- **CoconutGoodie/figma-plugin-react-vite** — Community boilerplate (template repo); good reference for the dual-thread Vite split and the `vite-plugin-singlefile` configuration. Use it as a reference, not a dependency. Cited below.
- **gnchrv/figma-plugin-boilerplate** — Similar reference; demonstrates the two-tsconfig pattern (one per logical side) which is a useful refinement when the main thread and UI thread need different DOM lib targets.
- **Webpack + ts-loader** (official Figma docs example) — Works but Vite is significantly faster (esbuild transpile vs ts-loader) and has better DX. No reason to choose Webpack in 2026.

## Comparison matrix

| Dimension                                                     | Raw Vite + `@figma/plugin-typings`                                                         | `create-figma-plugin`                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **Manifest handling**                                         | Plain `manifest.*.json` files at repo root; build script copies the right one into `dist/` | Generated from `package.json` `"figma-plugin"` key on every build; manual edits overwritten |
| **Dual-manifest builds (community + org)**                    | Trivial — separate JSON files, separate scripts                                            | No first-class support; requires `package.json` mutation or a custom wrapper                |
| **PRD §7.3 layout (`src/{core,ops,io,contracts,ui,config}`)** | Native — author whatever folder layout you want                                            | Compatible (configurable `main`/`ui` paths) but scaffolder doesn't enforce or help          |
| **Workspace package (`packages/contracts/`) compat**          | Native (npm workspaces; resolved by Vite via TS paths)                                     | Workable, but `build-figma-plugin` doesn't know about workspaces — extra wiring             |
| **TypeScript strict**                                         | Native                                                                                     | Supported via `--typecheck` flag                                                            |
| **React UI shell**                                            | Native (`@vitejs/plugin-react` 6.0.2 + React 19.2.6)                                       | Preact by default; React via `preact/compat` shim or opt-out config                         |
| **Hot reload (dev experience)**                               | `vite build --watch` for both threads + Figma desktop's built-in plugin reload             | `build-figma-plugin --watch` (same end result)                                              |
| **Build output**                                              | `dist/{code.js, ui.html, manifest.json}` per build                                         | `build/{main.js, ui.html}` + generated `manifest.json`                                      |
| **Bundle size / startup**                                     | React 19 ~45 KB gzipped; Vite minifies via esbuild                                         | Preact ~3 KB; esbuild minified                                                              |
| **CLI shell (PRD §7.1) future-compat**                        | Add a third Vite/esbuild config; core modules import directly                              | Scaffolder owns build pipeline; CLI build lives outside it                                  |
| **Active maintenance**                                        | All deps actively released in May 2026                                                     | v4.0.3 published Oct 2025; repo pushed Mar 2026                                             |
| **Lock-in / escape hatch**                                    | None — hand-rolled configs                                                                 | Medium — moving off means rewriting the build CLI + UI library                              |
| **Lines of config to bootstrap**                              | ~80 (two `vite.config.ts` calls + build script + two manifests + two flag files)           | ~10 (just `package.json` + tsconfig)                                                        |

## Recommendation

**Use raw Vite 8.0.14 + `@figma/plugin-typings` 1.127.0 + `vite-plugin-singlefile` 2.3.3, with React 19.2.6 and TypeScript 6.0.3 on Node ≥ 20.** This is the option that costs ~80 lines more boilerplate upfront and zero compromises afterwards. Every PRD constraint that pushes against the toolchain — dual `manifest.community.json` / `manifest.org.json` (PRD §13.2), the fixed `src/{core,ops,io,contracts,ui,config}` layout (PRD §7.3), the published `@detroitlabs/fighub-contracts` workspace package (PRD §7.4), real React 19 (not Preact), and an eventual CLI shell sharing the same deterministic core (PRD §7.1) — is a feature of raw Vite and a workaround in `create-figma-plugin`. The legacy `DesignOps-plugin/package.json` is informational only (esbuild 0.24 + terser); none of its dev deps carry forward.

The headline cost of `create-figma-plugin` is that its core selling point — generating `manifest.json` from `package.json` — is exactly the surface that PRD §13.2 needs to vary by build target. Twisting the scaffolder to emit two manifests would burn more time than just writing the 30-line Node script that copies `manifest.community.json` or `manifest.org.json` into `dist/` based on an environment variable. Add the React-vs-Preact mismatch, the lock-in risk against a future CLI shell, and the fact that we're not gaining a UI component library we plan to use (PRD doesn't depend on UI3), and the scaffolder's wins (one fewer config file, Figma-themed components, opinionated dev script) don't pay for the architectural friction.

## Pinned versions (for `/plan`)

All versions verified via npm registry on 2026-05-27.

| Package                  | Version                     | Source                                                                                      |
| ------------------------ | --------------------------- | ------------------------------------------------------------------------------------------- |
| `typescript`             | `^6.0.3`                    | npm latest stable; published 2026-04-16                                                     |
| `vite`                   | `^8.0.14`                   | npm latest stable; published 2026-05-21                                                     |
| `@vitejs/plugin-react`   | `^6.0.2`                    | npm latest stable; published 2026-05-14; requires Vite 8                                    |
| `vite-plugin-singlefile` | `^2.3.3`                    | npm latest stable; published 2026-04-17; required to inline UI assets into single `ui.html` |
| `react`                  | `^19.2.6`                   | npm latest stable; published ~2026-05-12                                                    |
| `react-dom`              | `^19.2.6`                   | npm latest stable; matches `react` version                                                  |
| `@types/react`           | `^19.0.0` (latest matching) | DefinitelyTyped                                                                             |
| `@types/react-dom`       | `^19.0.0` (latest matching) | DefinitelyTyped                                                                             |
| `@figma/plugin-typings`  | `^1.127.0`                  | npm latest stable; published 2026-05-22                                                     |
| `engines.node`           | `>=20.0.0`                  | PRD §11.5 baseline; ticket Acceptance Criteria                                              |

> `/plan` should also pick lint/format/test tooling (ESLint, Prettier, Vitest) per **WO-004**, not here — WO-002 is build-tooling only.

## Open Questions

- **OQ-A:** Should the main-thread (`code.ts`) build use Vite library mode or a separate esbuild invocation? Both work; community boilerplates split (e.g. gnchrv uses esbuild for plugin, Vite for UI). Recommend Vite library mode for both threads to keep one bundler / one config family — but `/plan` can lock the final answer.
- **OQ-B:** How are `flags.community.ts` vs `flags.org.ts` selected at build time? Two options: (1) `vite.config.ts` consumes a `BUILD_TARGET` env var and aliases `@/config/flags` to the right file; (2) two separate `vite.config.community.ts` / `vite.config.org.ts` files. Option 1 is leaner. `/plan` to lock.
- **OQ-C:** Hot-reload story for both threads. Figma desktop auto-reloads on file change in `dist/`, but ensure `npm run dev` runs both watchers concurrently (e.g. via `concurrently` or `npm-run-all -p`). `/plan` to pick the runner — minor decision but should not be left to build agents to invent.
- **OQ-D:** TypeScript 6 is brand new (April 2026). Risk of incompatibility with `@figma/plugin-typings` is theoretically possible but the typings file is just `.d.ts` declarations — no API surface to break. Recommend TS 6.0.3; fallback to 5.9.3 if the spike surfaces a compile error.
- **OQ-E:** `vite-plugin-singlefile` inlines everything into one HTML. Confirm Figma plugin sandbox accepts the inlined output (it should — `ui` field in manifest just points at one HTML file, content is unrestricted). Verify in the WO-005 Phase 0 spike if not earlier.

## Sources

- [create-figma-plugin on npm](https://www.npmjs.com/package/create-figma-plugin) — v4.0.3, published Oct 2025
- [create-figma-plugin Quick start](https://yuanqing.github.io/create-figma-plugin/quick-start/) — Node v22 / npm v11 requirements, template list, build CLI
- [create-figma-plugin UI library docs](https://yuanqing.github.io/create-figma-plugin/ui/) — Preact-first; React via preact/compat shim
- [create-figma-plugin Configuration](https://yuanqing.github.io/create-figma-plugin/configuration/) — `package.json` `"figma-plugin"` key spec
- [create-figma-plugin CHANGELOG](https://github.com/yuanqing/create-figma-plugin/blob/main/CHANGELOG.md) — v4.0.0 dropped UI2 icons, bumped Node to v22
- [yuanqing/create-figma-plugin GitHub](https://github.com/yuanqing/create-figma-plugin/) — Last push 2026-03-21, 1.1k stars, 29 open issues
- [@figma/plugin-typings on npm](https://registry.npmjs.org/@figma/plugin-typings) — v1.127.0, published 2026-05-22
- [figma/plugin-typings GitHub](https://github.com/figma/plugin-typings) — Setup instructions, `typeRoots` config
- [Figma Plugin API — The Typings File](https://developers.figma.com/docs/plugins/api/typings/) — Official setup + strict-mode recommendation
- [Figma Plugin Manifest docs](https://developers.figma.com/docs/plugins/manifest/) — Manifest schema, plugin ID assignment
- [Figma Plugin Libraries and Bundling docs](https://developers.figma.com/docs/plugins/libraries-and-bundling/) — Webpack + esbuild + Vite patterns; mentions `create-figma-plugin` as community toolkit
- [Figma Plugin Quickstart](https://developers.figma.com/docs/plugins/plugin-quickstart-guide/) — Hot reload behavior
- [vite on npm](https://registry.npmjs.org/vite) — v8.0.14, published 2026-05-21
- [Vite CHANGELOG](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md) — 8.0.0 released 2026-03-12
- [@vitejs/plugin-react on npm](https://www.npmjs.com/package/@vitejs/plugin-react) — v6.0.2, published 2026-05-14; requires Vite 8
- [vite-plugin-singlefile on npm](https://www.npmjs.com/package/vite-plugin-singlefile) — v2.3.3, published 2026-04-17
- [richardtallent/vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) — Repository / README
- [typescript on npm](https://www.npmjs.com/package/typescript) — v6.0.3, published 2026-04-16
- [react on npm](https://www.npmjs.com/package/react) — v19.2.6
- [react-dom on npm](https://www.npmjs.com/package/react-dom) — v19.2.6
- [CoconutGoodie/figma-plugin-react-vite](https://github.com/CoconutGoodie/figma-plugin-react-vite) — Community boilerplate; demonstrates dual-thread Vite split + `vite-plugin-singlefile`
- [gnchrv/figma-plugin-boilerplate](https://github.com/gnchrv/figma-plugin-boilerplate) — Two-tsconfig pattern (per logical side)
- [the-dataface/figma-plugin-svelte-vite](https://github.com/the-dataface/figma-plugin-svelte-vite) — Same pattern, Svelte UI
- [Evil Martians — How to make next-level Figma plugins](https://evilmartians.com/chronicles/how-to-make-next-level-figma-plugins-auth-routing-storage-and-more) — Production-plugin manifest, build, and publish workflow
- [praizjosh/create-figma-react-plugin](https://github.com/praizjosh/create-figma-react-plugin) — Alternative React + Vite scaffolder (one-shot)
- [DesignOps-plugin/package.json](file:///c:/Users/jbabc/Documents/GitHub/DesignOps-plugin/package.json) — Legacy lift reference (esbuild 0.24, terser 5.46.2; informational only — that repo is a skill pack, not a plugin)
