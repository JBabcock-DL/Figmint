---
type: work-order
github_issue: 62
project_item_id: PVTI_lAHOD9B30s4BY4aYzguFtLg
absorbs: WO-028, WO-033
supersedes: WO-026
blocked_by: WO-057
note: Phase 1 of this WO must implement the snapshot mechanism originally scoped as WO-028 (closed absorbed). Settings GitHub-Desktop card collapses what WO-033 (closed absorbed) was scoping as a separate Sync tab. 2026-05-28 architectural lock.
---

## Goal

Figmint behaves like GitHub Desktop for designers. The user connects GitHub once (existing OAuth Device Flow + relay), then fetches / pulls / pushes repos that hold design systems, components, updates, or any Figmint contract document. Users never see internal paths (tokens path, Figma sync file path, registry file path). All in-repo configuration lives in a single `figmint.json` at repo root (convention-driven, optional, sensible defaults when absent). Canvas pluginData snapshots (PRD §6.4 FR-DRIFT-1) become the single source of truth for registry state — `.figmint-registry.json` is deleted at the root.

---

## Problem story

As a designer, I want to connect my GitHub once and then fetch/pull/push my design system repo from inside Figmint — without managing tokens-path / Figma-sync-file-path / registry-path inputs — so syncing a design system feels like clicking Fetch in GitHub Desktop, not configuring a build pipeline.

**Problem today (2026-05-28 designer rejection):** Settings tab requires three user-managed paths. Components tab requires a "Load sync registry" action. WO-026 emits `.figmint-registry.json` into the repo. The scaffold attempt on `Dw8NkEiG91NhjYqRPNTOOu` fired `comp/registry-envelope` (`expected v=1 kind=registry`) and `comp/registry-filekey` (`fileKey must be non-empty`) — both direct symptoms of the duplicate registry state (repo JSON + canvas pluginData) AND of `figma.fileKey` being empty in Untitled / unsaved files. Both go away when the registry JSON is removed.

**Opportunity:** Collapse Settings to "Connect GitHub" + per-repo Fetch/Pull/Push card; sync becomes implicit and event-driven; canvas pluginData becomes the only registry record; audit gate stops failing on a layer that should not exist.

---

## Locked architectural decisions (do not re-decide at planning)

1. **Repo role = two-way GitHub-Desktop style.** Pull (fetch design system + tokens + component specs) AND push (write back specs, Code Connect mappings, doc updates). Auth via existing GitHub OAuth + relay (WO-016 SPK-016-1). Clone-or-pull semantics analogous to GitHub Desktop's Fetch / Pull / Push.
2. **`.figmint-registry.json` envelope deleted.** Canvas pluginData snapshots (PRD §6.4 FR-DRIFT-1, hidden node on the Figmint Output page) are the SINGLE source of truth. `comp/registry-envelope` and `comp/registry-filekey` audit rules are dropped (or repurposed against pluginData if drift detection still wants them). WO-026 'Registry update emission' is reverted — its emitted file path and audit rows are removed from the codebase. WO-026 ticket gets closed as 'Won't Do (superseded by WO-058)'.
3. **`figmint.json` at repo root** is the only repo-side config the plugin reads. Schema TBD in `/research`, minimum: `{ v: 1, tokensPath: string (default 'tokens/'), specsPath: string (default 'components/'), designSystemBranch?: string }`. Absent `figmint.json` → fall back to conventional defaults; never block.
4. **Settings tab UX collapses** to: "Connect GitHub" (existing OAuth Device Flow), then per-repo card showing repo name + Fetch/Pull/Push buttons + last-synced timestamp. No path inputs. No "Load sync registry" button on Components tab — sync is implicit and event-driven.
5. **Component scaffold + variable push remain the deterministic-canvas-emit core**; only the I/O layer (`src/io/github/*`, `src/io/messages/github.ts`, `src/ui/tabs/Settings.tsx`, `src/ui/components/AuditPanel.tsx`) changes. PRD G5 still holds (zero LLM in plugin runtime).

---

## User stories

- [ ] As a designer, I click **Connect GitHub** once and never have to enter a tokens path or Figma sync file path.
- [ ] As a designer, I see a per-repo card with **Fetch**, **Pull**, **Push** buttons and a `last-synced` timestamp — like GitHub Desktop.
- [ ] As a designer, I open the Components tab and the active repo's registry is already loaded (no "Load sync registry" button).
- [ ] As a developer, I commit a `figmint.json` at the repo root to tell Figmint where my tokens and component specs live; if I don't commit one, Figmint uses sensible defaults.
- [ ] As a designer, my scaffold attempt on a Figma file no longer fails `comp/registry-envelope` / `comp/registry-filekey` audits.

---

## Design reference

**N/A — vision capture only at this stage.** UI sketch will be produced during `/research` and confirmed before `/plan`.

The Settings tab redesign should evoke [GitHub Desktop](https://desktop.github.com/) repository list + Fetch/Pull/Push button affordance. The Components tab simply drops the "Load sync registry" button; no new UI is introduced there.

---

## Requirements

### Functional

#### Phase 1 — Snapshot + registry migration (absorbs WO-028)

1. **Add `packages/contracts/src/snapshot.v1.ts`** — envelope with `keys`, `registry.components`, `fileKey`, `updatedAt` (see WO-028 research).
2. **Add `src/core/sync/snapshotStore.ts`** — `getSnapshot()`, `persistSnapshot()`, `getRegistryFromSnapshot()`, `upsertSnapshotRegistryEntry()`, hidden frame `_FigmintSnapshotStore` on Figmint Output page, pluginData key `figmint:snapshot:v1`.
3. **Delete `.figmint-registry.json` read/write paths** — no GitHub fetch or ExportSheet emission of registry to repo.
4. **Delete audit rules `comp/registry-envelope` and `comp/registry-filekey`** from `registryAuditRows.ts`; keep entry-level rows (present, nodeId, key, version).
5. **Revert WO-026 production path** — remove registry PR flow from Components tab; Export sandbox sample may remain dev-only.
6. **Migrate scaffold** — `runScaffold.ts` upserts snapshot registry; `Components.tsx` loads registry from snapshot on mount (no "Load sync registry").

#### Phase 2 — `figmint.json` + Settings collapse

7. **Add `packages/contracts/src/figmintJson.v1.ts`** — `{ v: 1, kind: 'figmint-config', tokensPath?, specsPath?, designSystemBranch?, exportBasePath? }`.
8. **Add `src/io/formats/figmintJson.ts`** — parse + `FIGMINT_JSON_DEFAULTS` (`design/tokens.json`, `components/`, `docs/figmint/`); absent file → defaults; malformed → `{ ok: false }` + non-blocking warning.
9. **Fetch on connect** — `github/repo/fetch` loads `figmint.json` at default branch HEAD, resolves branch, caches config + `lastFetchedAt`.
10. **Collapse Settings UI** — replace path inputs with repo card: repo name, last-synced, **Fetch latest**, **Pull design system**, **Push updates**; keep Connect/Disconnect OAuth.
11. **Remove from session/storage/messages:** `tokensPath`, `registryPath` user-editable fields — paths resolved only from `figmint.json` defaults.
12. **Pull** — download tokens from resolved `tokensPath`; cache per repo; update `lastPulledAt`.

#### Phase 3 — Push + gates

13. **Push** — stage files under resolved `exportBasePath`; open PR via OAuth relay (`createPullRequestFlow`); PR body via `buildPrBody()`; commit author = authenticated user.
14. **Extend WO-057 preflight** — fail on **malformed** `figmint.json`; pass on absent file.
15. **Drift badge placeholder** on repo card (WO-033 tail) — stub counts until WO-029 lands.
16. **Close WO-026 (#29)** as Won't Do when this WO ships.

#### Cross-cutting

17. All Sprint 5 callers read registry from canvas snapshot, not repo file.
18. No reference to `.figmint-registry.json` in `src/` or `packages/contracts/src/` after merge.

### Visual / UX

- Settings tab repo card affordance evokes GitHub Desktop: repo name top-left, last-synced timestamp under it, action buttons (Fetch / Pull / Push) right-aligned.
- No path-input fields anywhere in Settings.
- Components tab gains no new UI; it loses the "Load sync registry" button.
- All copy uses designer vocabulary, not developer vocabulary: "Fetch latest", "Pull design system", "Push updates" — not "Sync registry envelope".

### Technical / architectural

- **Phase 1:** `packages/contracts/src/snapshot.v1.ts`, `src/core/sync/snapshotStore.ts`, `src/io/messages/snapshot.ts`
- **Phase 2:** `packages/contracts/src/figmintJson.v1.ts`, `src/io/formats/figmintJson.ts`, `src/ui/components/RepoSyncCard.tsx`, `src/ui/sync/useRepoSync.ts`
- **Edits:** `src/io/github/storage.ts`, `src/io/github/githubUiBridge.ts`, `src/io/messages/github.ts`, `src/ui/tabs/Settings.tsx`, `src/ui/tabs/Components.tsx`, `src/core/components/registryAuditRows.ts`, `src/core/components/scaffold/runScaffold.ts`, `src/ui/components/registryExport.ts` (rewrite → snapshot-only)
- **Deletes:** `src/ui/components/scaffold/loadRegistryFromRepo.ts` GitHub registry fetch (or gut to snapshot loader)
- **Removes:** `.figmint-registry.json` paths, `comp/registry-envelope`, `comp/registry-filekey`, Settings path inputs, Components "Load sync registry"
- Push uses OAuth relay; branch `figmint/push-{date}`; main-only
- PRD G5 preserved

---

## Acceptance criteria _(definition of done)_

- [ ] `.figmint-registry.json` is not written, read, or referenced anywhere in `src/` or `packages/contracts/src/`.
- [ ] `comp/registry-envelope` and `comp/registry-filekey` audit rules are removed (or explicitly repurposed against pluginData with a passing unit test).
- [ ] `packages/contracts/src/figmintJson.v1.ts` exists with `v: 1` discriminator and the locked schema.
- [ ] `src/io/formats/figmintJson.ts` parses valid `figmint.json`, returns defaults on absence, surfaces a non-blocking warning on malformed content.
- [ ] Settings tab shows: `Connect GitHub` action + per-repo card (name, last-synced, Fetch, Pull, Push). No tokens-path or Figma-sync-file-path inputs remain.
- [ ] Components tab has no "Load sync registry" button.
- [ ] All Sprint 5 callers (WO-022..027) read registry state from canvas pluginData, not from a repo file.
- [ ] Push flow writes a PR to the active repo via the OAuth relay; PR title + body identify Figmint as the author.
- [ ] WO-057 audit gate fails fast on malformed `figmint.json` and passes on absent `figmint.json`.
- [ ] WO-026 GitHub issue (#29) closed as "Won't Do (superseded by WO-058)".
- [ ] Designer scaffold attempt on `Dw8NkEiG91NhjYqRPNTOOu` no longer raises `comp/registry-envelope` or `comp/registry-filekey` FAIL (confirmed in Plugin Sandbox `cVdPraIafWFBRZnzMPhtrW`).
- [ ] All four CI legs (typecheck, lint, format, dual build) green.

---

## Out of scope

- Reverse-path Code Connect emission deep-work (Sprint 7 **WO-040..046**) — Push wiring here is shallow; the deep encoders / parsers live there.
- Multi-repo / repo-switching UX (Sprint 6+).
- CLI for fetch/pull/push outside the plugin (different surface).
- Conflict resolution UX for push (Sprint 6+).
- Branch-aware sync — this WO is main-only.

---

## Testing & verification

### Functional QA

- Connect GitHub flow still works end-to-end (OAuth Device Flow + relay, per WO-016/017/018).
- Fetch button updates the per-repo card's `last-synced` timestamp.
- Pull button refreshes tokens + component specs from the active repo into the plugin.
- Push button opens a PR on the active repo and surfaces the PR URL.
- Scaffold on Plugin Sandbox (`cVdPraIafWFBRZnzMPhtrW`) reports zero registry-envelope / registry-filekey FAILs.

### Visual / design QA

- Settings tab matches the GitHub-Desktop-style repo card vision (no path inputs anywhere).
- Components tab no longer shows the "Load sync registry" button.

### Accessibility _(WCAG AA where applicable)_

- Fetch / Pull / Push buttons reach minimum hit target (44×44 pt) and have visible focus rings using Figmint's existing token-based focus style.

### Telemetry / observability _(if needed)_

- Push action logs `push/started`, `push/pr-opened`, `push/error` via `pluginLog()` — never `console.debug` (sandbox throws — memory.md "Do not repeat").

---

## Figma VQA Checklist

**N/A — no Figma artifact (the UI lives in the plugin UI iframe; verification is captured in Functional QA above).**

The downstream BUG/WO that polishes the visual design of the Settings repo card (post-vision-capture) will carry its own Figma source + assertions.

---

## Dependencies / blocks

- **BLOCKED BY WO-057** — **Shipped 2026-05-28.** `/research` complete; ready for `/plan`.
- **BLOCKS** designer workflow simplification milestone (designer-facing UX rework).
- **SUPERSEDES WO-026** (#29) — that ticket will be closed Won't Do once WO-058 lands.

---

## 🔍 Ready for `/research`

**Complete (2026-05-28).** See [github-desktop-style-sync.md](research/github-desktop-style-sync.md).

## 📋 Ready for `/plan`

WO-057 shipped. Research signed off. `/plan` writes three-phase execution contract per `.github/templates/plan-quality-bar.md` (target ≥350 lines).

## 🛠️ Ready for `/build`

After `/plan` — phased: Phase 1 snapshot → Phase 2 UI + figmint.json → Phase 3 Push.

---

## Notes for build agent

- **Designer rejection motivation:** 2026-05-28 scaffold attempt on `Dw8NkEiG91NhjYqRPNTOOu` raised `comp/registry-envelope` + `comp/registry-filekey` FAIL — both caused by the now-redundant `.figmint-registry.json` layer. Removing the file at the root removes the audit failures at the root.
- **`figma.fileKey` is empty on Untitled / unsaved files** (memory.md "Do not repeat" — `comp/registry-filekey` audit will spuriously fail there). Validate all forward-scaffold flows in Plugin Sandbox (`cVdPraIafWFBRZnzMPhtrW`), not in a fresh Untitled file.
- **Do not use `console.debug` in `code.js`** — main-thread sandbox throws. Use `pluginLog()` (memory.md "Do not repeat").
- **GitHub OAuth requires the HTTPS relay** (WO-016 SPK-016-1) — Push code must hit `FIGMINT_OAUTH_RELAY_URL`, never `api.github.com` directly from the plugin.
- **Bundle code path safety:** scaffold output never uses `String.prototype.replace` with the bundle as the replacement string (memory.md "Do not repeat" — `$` patterns expand backreferences and corrupt React 19 bundles). If Push needs to template a PR body containing JSON literals, build the string with `slice`/concat or a function callback.

---

## References

- [GitHub-Desktop-style sync research](research/github-desktop-style-sync.md)
- [Snapshot mechanism (WO-028 absorbed)](../Sprint%206/WO-028-snapshot-mechanism-canvas-plugindata/research/snapshot-mechanism-canvas-plugindata.md)
- [Sprint 6 drift/sync index](../Sprint%206/research/sprint-6-drift-sync-research-index.md)
- [Sync tab UX absorbed (WO-033)](../Sprint%206/WO-033-sync-tab-ui-on-open-badge/research/sync-tab-ui-on-open-badge.md)
- Supersedes: **WO-026 Registry update emission** (#29)
- Related: **WO-016/017/018/019/020** — `src/io/github/*`
- Related: **WO-022..027** — scaffold callers to migrate
- PRD §6.4 FR-DRIFT-1, PRD G5 / §11.2
- GitHub Desktop UX: https://desktop.github.com/
- Plugin Sandbox: https://www.figma.com/design/cVdPraIafWFBRZnzMPhtrW/Plugin-Sandbox?node-id=0-1
