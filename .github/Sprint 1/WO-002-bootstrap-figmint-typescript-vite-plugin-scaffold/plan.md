# Plan — WO-002: Bootstrap Figmint TypeScript + Vite plugin scaffold

> Authoritative plan. Toolchain locked by [`research/scaffold-choice.md`](research/scaffold-choice.md); cross-ticket reconciliation decisions in `memory.md` (2026-05-27). Build agents work on `main` and leave changes uncommitted for the user to review.

## Approach

Stand up the Figmint plugin source tree on **raw Vite 8** (NOT `create-figma-plugin`), using `@figma/plugin-typings`, `vite-plugin-singlefile`, React 19, TypeScript 6, and Node ≥22 LTS. A single `vite.config.ts` reads `process.env.BUILD_TARGET` (`community` | `org`) and runs a two-thread build: `src/main.ts` → `dist/code.js` via Vite **library mode** (Plugin API sandbox thread, no DOM lib), and `src/ui/index.tsx` → `dist/ui.html` via `@vitejs/plugin-react` + `vite-plugin-singlefile` (UI iframe thread, JS+CSS inlined per Figma's single-file rule). Two `scripts/build-{community,org}.mjs` Node scripts set the env, invoke the Vite builds, and copy the matching `manifest.{community,org}.json` into `dist/manifest.json`. The `src/` tree matches PRD §7.3 exactly; the real contracts package lives separately at `packages/contracts/` per WO-003 — `src/contracts/` is left as an empty placeholder. Root `package.json` declares an npm workspace (`"workspaces": ["packages/*"]`) so WO-003 can drop its package in without further wiring. Scaffold delivers a 320×240 "Figmint" placeholder UI only — no variable push, canvas, or component logic.

## Steps

- [x] **Step 1** — Initialize root `package.json` with `"workspaces": ["packages/*"]`, `"engines": { "node": ">=22.0.0" }`, and scripts: `build:community` (`node scripts/build-community.mjs`), `build:org` (`node scripts/build-org.mjs`), `dev` (`node scripts/dev.mjs` or `concurrently` chain — see Step 11), `typecheck` (`tsc --noEmit`).
- [ ] **Step 2** — Install pinned dev/runtime deps at the exact versions from `research/scaffold-choice.md` § Pinned versions:
  - **Dev deps:** `typescript@^6.0.3`, `vite@^8.0.14`, `@vitejs/plugin-react@^6.0.2`, `vite-plugin-singlefile@^2.3.3`, `@types/react@^19.0.0`, `@types/react-dom@^19.0.0`, `@figma/plugin-typings@^1.127.0`, `concurrently` (latest — see OQ-F).
  - **Runtime deps:** `react@^19.2.6`, `react-dom@^19.2.6`.
  - Verify `npm install` reports zero peer-dep warnings (ticket Acceptance Criterion).
- [ ] **Step 3** — Create `tsconfig.json` at root with strict mode (`strict`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`), `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "Bundler"`, `jsx: "react-jsx"`, `typeRoots: ["./node_modules/@types", "./node_modules/@figma"]` (so `@figma/plugin-typings` is picked up as ambient globals per the official typings file setup), and `paths` aliases (`@/*` → `src/*`, plus `@/config/flags` left unbound — Vite resolves it via the `BUILD_TARGET` alias in Step 4). `include: ["src/**/*", "scripts/**/*"]`, `exclude: ["dist", "node_modules"]`.
- [ ] **Step 4** — Create `vite.config.ts` with **two build entries driven by `BUILD_TARGET` + a second env flag** (`VITE_BUILD_THREAD=main|ui`) selected by `scripts/build-*.mjs`:
  - **Main thread branch:** Vite **library mode** (`build.lib.entry = "src/main.ts"`, `formats: ["iife"]`, `fileName: () => "code.js"`), no `@vitejs/plugin-react` plugin, output to `dist/`.
  - **UI thread branch:** `@vitejs/plugin-react` + `vite-plugin-singlefile`, `build.rollupOptions.input = "src/ui/index.html"`, output `dist/ui.html` with JS+CSS inlined.
  - Both branches share a `resolve.alias` that maps `@/config/flags` → `src/config/flags.community.ts` or `src/config/flags.org.ts` based on `process.env.BUILD_TARGET`, and `@/` → `src/`.
  - `define` block exposes `import.meta.env.BUILD_TARGET` to the bundle.
- [ ] **Step 5** — Create `src/` tree per PRD §7.3: `src/core/`, `src/ops/`, `src/io/`, `src/contracts/`, `src/ui/`, `src/config/`. Each is empty except for a `.gitkeep` (so the tree is committable; build agents leave `.gitkeep` files only for empty dirs). `src/contracts/` carries a one-line `README.md` noting that the published contracts package lives at `packages/contracts/` per WO-003.
- [ ] **Step 6** — Create `src/main.ts` (Plugin API sandbox entry):
  ```ts
  figma.showUI(__html__, { width: 320, height: 240 });
  ```
  Wrap in a minimal `figma.on("run", ...)` if needed; no message handlers, no closeUI logic — placeholder only.
- [ ] **Step 7** — Create `src/ui/index.html` (Vite entry HTML referencing `index.tsx`), `src/ui/index.tsx` (React 19 root mount via `createRoot`), and `src/ui/App.tsx` (functional component rendering centered "Figmint" + version from `import.meta.env.PACKAGE_VERSION` — exposed via `vite.config.ts`'s `define`). Inline minimal CSS (no separate file needed for placeholder; Tailwind / design system arrives in later sprints).
- [ ] **Step 8** — Create `src/config/flags.community.ts` and `src/config/flags.org.ts`. Both export `const flags = { ... } as const` with the **same shape** but different values. Initial shape (minimal — expanded by Sprint 2+ tickets):
  ```ts
  export const flags = {
    buildTarget: 'community' | 'org',
    githubOAuth: boolean, // false in community, true in org
    componentImport: boolean, // false in community, true in org
    codeConnectPR: boolean, // false in community, true in org
    evcProjector: boolean, // false in community, true in org (Enterprise-tier only at runtime)
  } as const;
  ```
  Vite alias from Step 4 picks the right file at build time; consumers do `import { flags } from "@/config/flags"` without knowing which is loaded.
- [ ] **Step 9** — Create `manifest.community.json` and `manifest.org.json` at repo root. Required fields per Figma manifest spec: `name` ("Figmint" community, "Figmint (Org)" org), `id` (use temporary placeholder IDs — Figma assigns real ones at publish time; both manifests share schema but differ on `name` and on `networkAccess.allowedDomains`), `api: "1.0.0"`, `main: "code.js"`, `ui: "ui.html"`, `editorType: ["figma"]`, `networkAccess: { allowedDomains: ["none"] }` for community / `{ allowedDomains: ["https://api.github.com", "https://github.com"] }` for org (GitHub-only per PRD §11.3 and `memory.md` Conventions).
- [ ] **Step 10** — Create `scripts/build-community.mjs` and `scripts/build-org.mjs`. Each script: (a) sets `process.env.BUILD_TARGET = "community"|"org"`, (b) shells out to Vite twice — once with `VITE_BUILD_THREAD=main` and once with `VITE_BUILD_THREAD=ui` — (c) copies the matching `manifest.{community,org}.json` to `dist/manifest.json` via `fs.copyFileSync`, (d) prints a one-line success summary. Use `node:child_process.spawnSync("npx", ["vite", "build"], { stdio: "inherit", env: { ...process.env, BUILD_TARGET, VITE_BUILD_THREAD } })` for portability.
- [ ] **Step 11** — Create `scripts/dev.mjs` using `concurrently` (default per OQ-F) to run both build threads in parallel watch mode. Invocation pattern:
  ```js
  concurrently(
    [
      {
        command: 'vite build --watch',
        env: { BUILD_TARGET: 'community', VITE_BUILD_THREAD: 'main' },
        name: 'main',
      },
      {
        command: 'vite build --watch',
        env: { BUILD_TARGET: 'community', VITE_BUILD_THREAD: 'ui' },
        name: 'ui',
      },
    ],
    { prefix: 'name', killOthers: ['failure'] },
  );
  ```
  Also handle manifest copy on first run. Figma desktop's built-in plugin hot-reload picks up `dist/` changes.
- [ ] **Step 12** — **Smoke test (manual — flagged for the user since build agents don't drive Figma desktop):** `npm install` → `npm run build:community` → load `dist/` in Figma desktop dev mode (Plugins → Development → Import plugin from manifest → pick `dist/manifest.json`) → verify the 320×240 placeholder UI appears with "Figmint" text + version. Build agent documents the steps and exit conditions in this step's checklist comment; user runs the manual load.
- [ ] **Step 13** — Verify `npx tsc --noEmit` passes with zero errors under strict mode (Acceptance Criterion). Verify `npm run build:org` produces a distinct `dist/manifest.json` (differs from community on `name` + `networkAccess.allowedDomains`) and that the bundle compiles cleanly. Confirm no file references `DesignOps-plugin` paths in production code (documentation references only — Acceptance Criterion).

## Build Agents

<!-- Every step assigned. Phases sequential, agents within a phase parallel. Git strategy: main (uncommitted; user reviews). Domains grouped by what each agent owns — TS authoring vs JS scripting/config. -->

### Phase 1 (parallel)

- **`code-build`** — Steps **1, 2, 3, 5, 6, 7, 8**: Root `package.json` + npm workspaces config + dependency install + `tsconfig.json` (strict + `typeRoots` for `@figma/plugin-typings`) + `src/` tree per PRD §7.3 + `src/main.ts` Plugin API entry + React 19 UI components (`src/ui/index.html`, `src/ui/index.tsx`, `src/ui/App.tsx`) + `src/config/flags.{community,org}.ts`. Owns all TypeScript authoring + `package.json` + `tsconfig.json`. Should leave a `.gitkeep` in each empty `src/{core,ops,io,contracts}` directory; do NOT seed those with code.
- **`script-build`** — Steps **4, 9, 10, 11**: `vite.config.ts` (two-thread, env-driven), `manifest.community.json` + `manifest.org.json` at repo root, `scripts/build-community.mjs` + `scripts/build-org.mjs`, `scripts/dev.mjs` using `concurrently`. Owns all `.mjs` build scripting + Vite config + JSON manifests. Coordinate the `@/config/flags` alias shape with `code-build` (Step 8 source files, Step 4 alias consumer) — both will share the same import key.

### Phase 2 (sequential, after Phase 1)

- **`code-build`** — Steps **12, 13**: Smoke test (documents the manual Figma desktop load steps + acceptance gates), then verify `tsc --noEmit` passes and `npm run build:org` produces a distinct bundle from community. Phase 1 must be complete because both depend on a fully assembled scaffold + working build scripts. Flag any compile failure against `@figma/plugin-typings` (would trigger the TS 6 → TS 5.9 fallback in OQ-D below).

## Dependencies & Tools

- **Node 22 LTS** — locally installed; verify with `node --version` before `npm install` (PRD §11.5 bumped from Node 20 during Sprint 1 reconciliation; Node 20 EOL'd 2026-04-30; locked in `memory.md`).
- **npm** — Figmint locks `main` git strategy; no Yarn / no pnpm. Root `package.json` declares the workspace.
- **Figma desktop app** — required for Step 12's manual smoke test (load `dist/manifest.json` via Plugins → Development → Import plugin from manifest).
- **MCP servers** — none required for this ticket. Figma MCP is plugin-level config (Sprint 2+ for canvas work); GitHub backend is already configured per `workflow.md`.
- **External APIs** — none consumed by this ticket. (Org manifest declares `networkAccess.allowedDomains` for GitHub but no code calls it yet — that wires up in Sprint 2+.)

## Open Questions

- **OQ-E (carried from research):** Confirm `vite-plugin-singlefile`'s single-HTML output loads cleanly in the Figma sandbox. Multiple community boilerplates (`CoconutGoodie/figma-plugin-react-vite`, `the-dataface/figma-plugin-svelte-vite`) use this exact stack in production, and Figma's `manifest.ui` field accepts any single HTML file with inlined assets — so the expected answer is yes. **Validation gate:** Step 12 manual load. **Fallback if it fails:** write a small post-build script that bundles UI JS + CSS into the HTML manually (e.g. via `cheerio` or string concat), or split into a `ui.html` + sibling assets bundle if Figma's sandbox rejects the inlined `<script>` block. Either fallback is local to `scripts/build-*.mjs` and does not affect `src/` source.
- **OQ-F (new, runner choice):** Should the dev runner use `npm-run-all -p` instead of `concurrently`? **Default: `concurrently`** (more explicit prefix/name controls, kill-on-failure semantics out of the box). Flip if the team has a stated preference — both work, no architectural impact. Locking the default here so `script-build` does not invent a runner.
- **OQ-D (carried from research, low risk):** TypeScript 6 is ~6 weeks old. `@figma/plugin-typings` ships pure `.d.ts` declarations with no API surface that TS 6 should break, but if `tsc --noEmit` in Step 13 surfaces a compile error against the typings, fall back to `typescript@^5.9.3`. Build agent should flag the error and pause before downgrading so the user can review.

## Notes

- **Toolchain locked** by [`research/scaffold-choice.md`](research/scaffold-choice.md) — read for full rationale (dual-manifest, React vs Preact, CLI shell future-compat).
- **Do NOT use `create-figma-plugin`.** Its single-manifest-from-`package.json` model fights PRD §13.2 dual-manifest builds, and its Preact-by-default fights PRD §7.3 React shell. Rejected with full reasoning in the research file.
- **Git strategy: `main`** (locked in `memory.md` 2026-05-27 — uncommitted changes, user reviews + commits manually). Build agents must NOT run `git commit`, `git push`, or `gh pr create`. Leave all changes uncommitted. No per-agent branches, no worktrees.
- **PRD §11.5 Node 22 LTS** — bumped from Node 20 during Sprint 1 cross-ticket research reconciliation (Node 20 EOL'd 2026-04-30; WO-003's `ts-json-schema-generator@2.x` + WO-004's ESLint 10 / typescript-eslint v8 both require Node ≥22). This is the new floor; `engines.node` must be `">=22.0.0"`.
- **Scaffold delivers a placeholder UI only.** No actual variable push, canvas building, or component logic — those land in Sprint 2+ per the breakdown plan. `src/{core,ops,io,contracts}` stay empty (with `.gitkeep`) until their owning tickets land.
- **`src/contracts/` is a placeholder.** The real published package is `@detroitlabs/figmint-contracts` at `packages/contracts/` per WO-003. The root `package.json` `"workspaces": ["packages/*"]` declaration is the wiring; WO-003 drops the package in without needing to touch WO-002 deliverables.
- **`src/config/flags` selection** happens at Vite build time via `resolve.alias`. Same import path (`@/config/flags`) resolves to a different file per `BUILD_TARGET`. Consumers stay tree-shakeable and never branch at runtime.
- **No third-party network calls beyond GitHub API + Figma Plugin API** (PRD §11.3 + `memory.md` Conventions). The community `manifest.networkAccess.allowedDomains` is `["none"]`; the org variant whitelists GitHub only.
- **Downstream unblocks:** After this plan is approved and BUILD runs, **WO-003** (contracts package — depends on workspace root + tsconfig) and **WO-005** (Phase 0 spike — depends on the scaffold) can BUILD in parallel. **WO-004** (CI) depends on both WO-002 and WO-003 being merged.
- **Reference for sub-agents:** `Docs/lift-sources.md` exists but is **not directly needed for this ticket** — WO-002 builds fresh scaffolding rather than porting from `DesignOps-plugin`. The legacy `DesignOps-plugin/package.json` is informational only (it's a skill pack, not a Figma plugin); none of its dev deps carry forward.
- **References:**
  - Ticket: [`./ticket.md`](./ticket.md)
  - Research: [`research/scaffold-choice.md`](research/scaffold-choice.md)
  - PRD anchors: `Docs/PRD.md` §7.3 (Repo layout), §11.5 (Node 22 LTS), §13 (Distribution + feature gating), §13.1 (EVC = Enterprise-tier only)
  - Sprint roadmap: `C:\Users\jbabc\.claude\plans\breakdown-the-plan-and-mellow-whale.md`
  - Cross-ticket memory: `memory.md`
